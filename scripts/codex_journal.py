import argparse,hashlib,json,os,re,socket,subprocess,sys,urllib.request
from datetime import datetime,timedelta,timezone
from pathlib import Path

WIB=timezone(timedelta(hours=7),"WIB")
STATE=Path(os.environ.get("LOCALAPPDATA",Path.home()))/"DailyActivityJournal"
OUTBOX=STATE/"outbox.jsonl"
CONFIG=STATE/"config.env"
SECRET=re.compile(r"(?i)https://discord(?:app)?\.com/api/webhooks/\S+|bearer\s+\S+|(?:api[_-]?key|token|password|secret|webhook)\s*[:=]\s*\S+")
DONE=re.compile(r"(?i)\b(completed|implemented|fixed|resolved|delivered|finished|verified successfully|all tests pass|berhasil diselesaikan)\b")
NOT_DONE=re.compile(r"(?i)\b(not completed|not done|incomplete|still in progress|tests? (failed|failing)|belum selesai)\b")
BLOCKED=re.compile(r"(?i)\b(blocked|blocker|terhambat|menunggu akses)\b")
CATS=[("Bug Fixing",r"(?i)\b(fix|bug|error|regression)\b"),("Testing",r"(?i)\b(test|validation|verify)\b"),("Debugging",r"(?i)\b(debug|trace|reproduce)\b"),("Documentation",r"(?i)\b(docs?|document|readme|guide)\b"),("Research",r"(?i)\b(research|compare|evaluate|inspect)\b"),("Planning",r"(?i)\b(plan|design|architecture)\b"),("Automation",r"(?i)\b(automation|scheduler|hook|workflow)\b"),("Deployment",r"(?i)\b(deploy|release|publish)\b"),("Maintenance",r"(?i)\b(maintain|upgrade|cleanup|update)\b")]

def clean(s,n=300):return re.sub(r"[\r\n\t]+"," ",SECRET.sub("[redacted]",str(s or ""))).strip()[:n]
def category(s):return next((x for x,p in CATS if re.search(p,s)),"Development")

def event_key(sid,kind,turn,source,identity,at):
    """Stable dedup key: same session+kind+turn+minute → same key."""
    minute=at[:16] if isinstance(at,str) else at.isoformat()[:16]
    return hashlib.sha256(f"{sid}|{kind}|{turn}|{source}|{identity}|{minute}".encode()).hexdigest()

def _config_value(key):
    """Env wins; otherwise read the per-user config file.

    Env alone is a trap: a hook spawned by an app that started before the User
    env var was set (or by a different harness entirely) silently loses the
    base URL and every event degrades to an outbox that is never flushed.
    """
    value=os.environ.get(key,"")
    if value:return value.strip()
    try:
        text=CONFIG.read_text(encoding="utf-8")
    except OSError:
        return ""
    for line in text.splitlines():
        line=line.strip()
        if not line or line.startswith("#") or "=" not in line:continue
        name,_,rest=line.partition("=")
        if name.strip()==key:return rest.strip()
    return ""

def post(path,body):
    """POST JSON to the Zettly API. Returns True on success, False on any failure (never raises)."""
    base=_config_value("ZETTLY_API_BASE").rstrip("/")
    token=_config_value("ZETTLY_CLI_TOKEN")
    if not base or not token:return False
    try:
        url=f"{base}{path}"
        req=urllib.request.Request(url,data=json.dumps(body,ensure_ascii=False).encode("utf-8"),headers={
            "Content-Type":"application/json",
            "Accept":"application/json",
            "Authorization":f"Bearer {token}",
        },method="POST")
        with _open(req) as response:
            return 200<=response.status<300
    except Exception:
        return False

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Refuse to follow a 3xx from the API.

    urllib follows redirects by default, and on a 302 it retries the request as
    GET. An unauthenticated API call answered 302 -> /login, so a revoked or
    expired token produced a 200 HTML login page and post() reported success:
    the event was dropped instead of being spooled. Asking for JSON makes auth
    failures 401, and refusing redirects keeps any other 3xx from masquerading
    as delivery.
    """

    def redirect_request(self,req,fp,code,msg,headers,newurl):
        return None

_OPENER=urllib.request.build_opener(_NoRedirect)

def _open(req):
    return _OPENER.open(req,timeout=8)

def spool(payload):
    """Append one JSON line to the offline outbox.

    Also records why the event could not be sent and leaves a durable marker, so
    a growing outbox is visible instead of silent. Before this, an event could
    sit in the outbox indefinitely with nothing to notice it.
    """
    STATE.mkdir(parents=True,exist_ok=True)
    with OUTBOX.open("a",encoding="utf-8") as f:
        f.write(json.dumps(payload,ensure_ascii=False)+"\n")
    try:
        with (STATE/"outbox-status.log").open("a",encoding="utf-8") as f:
            f.write(f"{datetime.now(timezone.utc).isoformat()} spooled path={payload.get('path','')} pending={outbox_size()+1}\n")
    except OSError:
        pass

def outbox_size():
    """Number of pending payloads, or 0 when the outbox is absent."""
    try:
        return sum(1 for line in OUTBOX.read_text(encoding="utf-8").splitlines() if line.strip())
    except OSError:
        return 0

def flush_spool():
    """Replay every spooled payload. Drops a line only after a successful post."""
    if not OUTBOX.exists():return
    kept=[]
    for line in OUTBOX.read_text(encoding="utf-8").splitlines():
        if not line.strip():continue
        try:
            payload=json.loads(line)
        except json.JSONDecodeError:
            continue
        if post(payload.get("path",""),payload.get("body",{})):
            pass  # drop on success
        else:
            kept.append(line)
    if kept:
        with OUTBOX.open("w",encoding="utf-8") as f:
            f.write("\n".join(kept)+"\n")
    else:
        OUTBOX.write_text("", encoding="utf-8")
    report_backlog(len(kept))

BACKLOG_WARN = 50

def report_backlog(pending):
    """Make a stuck outbox visible instead of silently growing.

    A backlog means events are not reaching Zettly. One line per run is cheap;
    staying silent is what let three devices look healthy while delivering
    nothing.
    """
    try:
        if pending >= BACKLOG_WARN:
            with (STATE/"outbox-alert.log").open("a",encoding="utf-8") as f:
                f.write(f"{datetime.now(timezone.utc).isoformat()} WARNING outbox backlog pending={pending} at {OUTBOX}\n")
            print(f"zettly: {pending} events pending in {OUTBOX}", file=sys.stderr)
    except OSError:
        pass

def changed(cwd):
    try:r=subprocess.run(["git","-C",cwd,"status","--porcelain","--untracked-files=normal"],capture_output=True,text=True,timeout=2)
    except (OSError,subprocess.TimeoutExpired):return []
    return sorted({clean(x[3:].strip().replace("\\","/"),160) for x in r.stdout.splitlines() if x[3:].strip() and not re.search(r"(?i)(^|/)(\.env|credentials?|secrets?|[^/]*\.(pem|key))($|/)",x[3:].strip())})[:100]

def session_payload(ident,sid,project,title,cat,status,start,last,machine,duration_seconds=None,files=None,errors=None,outcome=None):
    body={"session_id":sid,"project":project,"title":title,"category":cat,"status":status,"last_activity_at":last,"machine":machine}
    # started_at is only sent on the first write (create). A later update that
    # resends it would crush the recorded start to the stop time; the server
    # keeps the first write, so updates simply omit the key.
    if start is not None:body["started_at"]=start
    if duration_seconds is not None:body["duration_seconds"]=duration_seconds
    if files is not None:body["files_changed"]=files
    if errors is not None:body["errors"]=errors
    if outcome is not None:body["outcome"]=outcome
    return body

def event_payload(key,kind,occurred_at,detail=None):
    body={"event_key":key,"kind":kind,"occurred_at":occurred_at}
    if detail is not None:body["detail"]=detail
    return body

def machine_name():
    """Best-effort device identity.

    COMPUTERNAME only exists on Windows; on macOS/Linux every session was
    recorded as "unknown", which made per-machine reports useless.
    """
    for name in ("JOURNAL_MACHINE_ID", "COMPUTERNAME", "HOSTNAME"):
        value=os.environ.get(name,"")
        if value:return clean(value,80)
    try:
        return clean(os.uname().nodename,80)
    except (AttributeError,OSError):
        pass
    try:
        return clean(socket.gethostname() or "unknown",80)
    except OSError:
        return "unknown"

def ingest(e):
    now=datetime.now(timezone.utc);at=now.isoformat();kind=str(e.get("hook_event_name",""))
    sid=str(e.get("session_id","")).strip()
    if not kind or not sid:return
    source=str(e.get("source",""));turn=str(e.get("turn_id",""));identity=str(e.get("tool_call_id") or e.get("tool_use_id") or "")
    key=event_key(sid,kind,turn,source,identity,at)
    cwd=str(e.get("cwd",""));project=clean(Path(cwd).name or "Workspace",80)
    machine=machine_name()
    if project.lower() in {"admin","users","home"}:project="Personal workspace"
    prompt=clean(e.get("prompt",""),3000);answer=clean(e.get("last_assistant_message",""),3000)

    if kind=="UserPromptSubmit":
        title=clean(next((x for x in prompt.split(". ") if x.strip()),"Codex work"),180) or "Codex work"
        ident="ACT-"+now.astimezone(WIB).strftime("%Y%m%d").upper()+"-"+hashlib.sha256(sid.encode()).hexdigest()[:8].upper()
        sess=session_payload(ident,sid,project,title=title,cat=category(title),status="in_progress",start=at,last=at,machine=machine)
        if not post("/api/v1/agent/sessions",sess):
            spool({"path":"/api/v1/agent/sessions","body":sess})
        ev=event_payload(key,"prompt",at,"submitted")
        if not post(f"/api/v1/agent/sessions/{sid}/events",ev):
            spool({"path":f"/api/v1/agent/sessions/{sid}/events","body":ev})
    elif kind=="SessionStart" and source=="resume":
        ev=event_payload(key,"recovery",at,"session resumed")
        if not post(f"/api/v1/agent/sessions/{sid}/events",ev):
            spool({"path":f"/api/v1/agent/sessions/{sid}/events","body":ev})
    elif kind=="PostToolUse":
        response=e.get("tool_response",{})
        failed=bool(e.get("is_error") or (isinstance(response,dict) and (response.get("isError") or response.get("exit_code",0)!=0)))
        if failed:
            tool=clean(e.get("tool_name","tool"),80)
            ev=event_payload(key,"error",at,tool)
            if not post(f"/api/v1/agent/sessions/{sid}/events",ev):
                spool({"path":f"/api/v1/agent/sessions/{sid}/events","body":ev})
    elif kind=="Stop":
        status="blocked" if BLOCKED.search(answer) else "completed" if DONE.search(answer) and not NOT_DONE.search(answer) else "in_progress"
        files=changed(cwd)
        outcome=answer[-500:] if status=="completed" else None
        ident="ACT-"+now.astimezone(WIB).strftime("%Y%m%d").upper()+"-"+hashlib.sha256(sid.encode()).hexdigest()[:8].upper()
        # A completed session needs its completed_at, otherwise every report
        # counts 0 tasks completed: the generator requires the timestamp, not
        # just the status. started_at is intentionally omitted: the server
        # keeps the original start from the create call (first write wins).
        sess=session_payload(ident,sid,project,title="Development",cat="Development",status=status,start=None,last=at,machine=machine,files=files,outcome=outcome)
        if status=="completed":
            sess["completed_at"]=at
        if not post("/api/v1/agent/sessions",sess):
            spool({"path":"/api/v1/agent/sessions","body":sess})
        ev=event_payload(key,"outcome",at,status)
        if not post(f"/api/v1/agent/sessions/{sid}/events",ev):
            spool({"path":f"/api/v1/agent/sessions/{sid}/events","body":ev})

def main():
    p=argparse.ArgumentParser();p.add_argument("command",choices=("hook","hook-only"))
    cmd=p.parse_args().command
    if cmd=="hook":
        flush_spool()
        try:
            ingest(json.load(sys.stdin))
        except Exception as e:
            try:
                STATE.mkdir(parents=True,exist_ok=True)
                with (STATE/"sync-errors.log").open("a",encoding="utf-8") as f:
                    f.write(f"{datetime.now(timezone.utc).isoformat()} {type(e).__name__}\n")
            except OSError:pass
    return 0

if __name__=="__main__":
    raise SystemExit(main())
