import importlib.util
import json
import pathlib
import sys

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "codex_journal.py"


def load(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setenv("ZETTLY_API_BASE", "https://zettly.test")
    monkeypatch.setenv("ZETTLY_CLI_TOKEN", "tok-123")
    spec = importlib.util.spec_from_file_location("codex_journal", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules["codex_journal"] = module
    spec.loader.exec_module(module)
    return module


def test_post_sends_token_header_and_json_body(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    captured = {}

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self, *args):
            return b"{}"

    def fake_urlopen(request, timeout=0):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        captured["body"] = json.loads(request.data.decode("utf-8"))
        return FakeResponse()

    monkeypatch.setattr(module.urllib.request, "urlopen", fake_urlopen)

    assert module.post("/api/v1/agent/sessions", {"session_id": "s1"}) is True
    assert captured["url"] == "https://zettly.test/api/v1/agent/sessions"
    assert captured["headers"]["Authorization"] == "Bearer tok-123"
    assert captured["body"] == {"session_id": "s1"}


def test_post_returns_false_and_does_not_raise_on_failure(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)

    def boom(*args, **kwargs):
        raise OSError("network down")

    monkeypatch.setattr(module.urllib.request, "urlopen", boom)

    assert module.post("/api/v1/agent/sessions", {"session_id": "s1"}) is False


def test_spool_then_flush_replays_and_empties_the_outbox(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    sent = []

    monkeypatch.setattr(module, "post", lambda path, body: sent.append((path, body)) or True)

    module.spool({"path": "/api/v1/agent/sessions", "body": {"session_id": "s1"}})
    assert (module.STATE / "outbox.jsonl").exists()

    module.flush_spool()

    assert sent == [("/api/v1/agent/sessions", {"session_id": "s1"})]
    assert module.STATE.joinpath("outbox.jsonl").read_text(encoding="utf-8") == ""


def test_spool_survives_a_failed_replay(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    monkeypatch.setattr(module, "post", lambda path, body: False)

    module.spool({"path": "/api/v1/agent/sessions", "body": {"session_id": "s1"}})
    module.flush_spool()

    lines = module.STATE.joinpath("outbox.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1


def test_dedup_key_is_stable_for_the_same_event(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)

    first = module.event_key("sess", "UserPromptSubmit", "turn-1", "", "", "2026-11-01T10:00:30+00:00")
    second = module.event_key("sess", "UserPromptSubmit", "turn-1", "", "", "2026-11-01T10:00:59+00:00")
    third = module.event_key("sess", "UserPromptSubmit", "turn-2", "", "", "2026-11-01T10:00:30+00:00")

    assert first == second  # same minute
    assert first != third


def test_redaction_still_applies_before_posting(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)

    cleaned = module.clean("token: supersecretvalue", 300)

    assert "supersecretvalue" not in cleaned


def test_stop_event_builds_session_and_outcome_payloads(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    posted = []
    monkeypatch.setattr(module, "post", lambda path, body: posted.append((path, body)) or True)
    monkeypatch.setattr(module, "changed", lambda cwd: [])

    module.ingest({
        "hook_event_name": "Stop",
        "session_id": "sess-stop-1",
        "turn_id": "1",
        "cwd": "D:/works/mine/code/zettly",
        "last_assistant_message": "completed the fix; all tests pass",
    })

    paths = [p for p, _ in posted]
    assert "/api/v1/agent/sessions" in paths
    assert any("/events" in p for p in paths)

    session = next(body for p, body in posted if p == "/api/v1/agent/sessions")
    assert session["status"] == "completed"
    assert session["title"] == "Development"
    assert "all tests pass" in session["outcome"]
    # Regression: the positional-arg signature must not blow up (was a TypeError before the fix).
    assert "session_id" in session


def test_stop_event_without_a_matching_keyword_stays_in_progress(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    posted = []
    monkeypatch.setattr(module, "post", lambda path, body: posted.append((path, body)) or True)
    monkeypatch.setattr(module, "changed", lambda cwd: [])

    module.ingest({
        "hook_event_name": "Stop",
        "session_id": "sess-stop-2",
        "turn_id": "1",
        "cwd": "D:/works/mine/code/zettly",
        "last_assistant_message": "still working on the refactor",
    })

    session = next(body for p, body in posted if p == "/api/v1/agent/sessions")
    assert session["status"] == "in_progress"
    assert session.get("outcome") is None


def test_config_file_is_used_when_env_is_missing(tmp_path, monkeypatch):
    """A hook spawned by an app that never saw the User env vars must still sync.

    Regression: env-only lookup meant ZETTLY_API_BASE was "" and every event was
    silently spooled forever instead of reaching the API.
    """
    module = load(tmp_path, monkeypatch)
    module.STATE.mkdir(parents=True, exist_ok=True)
    module.CONFIG.write_text(
        "ZETTLY_API_BASE=https://zettly.test\nZETTLY_CLI_TOKEN=tok-file\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("ZETTLY_API_BASE", raising=False)
    monkeypatch.delenv("ZETTLY_CLI_TOKEN", raising=False)
    captured = {}

    class FakeResponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self, *args):
            return b"{}"

    def fake_urlopen(request, timeout=0):
        captured["url"] = request.full_url
        captured["headers"] = dict(request.header_items())
        return FakeResponse()

    monkeypatch.setattr(module.urllib.request, "urlopen", fake_urlopen)

    assert module.post("/api/v1/agent/sessions", {"session_id": "s1"}) is True
    assert captured["url"] == "https://zettly.test/api/v1/agent/sessions"
    assert captured["headers"]["Authorization"] == "Bearer tok-file"


def test_env_still_wins_over_the_config_file(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    module.STATE.mkdir(parents=True, exist_ok=True)
    module.CONFIG.write_text("ZETTLY_API_BASE=https://from-file.test\n", encoding="utf-8")

    assert module._config_value("ZETTLY_API_BASE") == "https://zettly.test"



def test_machine_name_falls_back_to_hostname_when_computername_is_absent(tmp_path, monkeypatch):
    """macOS/Linux have no COMPUTERNAME, so every session was recorded as "unknown"."""
    module = load(tmp_path, monkeypatch)
    monkeypatch.delenv("JOURNAL_MACHINE_ID", raising=False)
    monkeypatch.delenv("COMPUTERNAME", raising=False)
    monkeypatch.delenv("HOSTNAME", raising=False)
    monkeypatch.setattr(module.socket, "gethostname", lambda: "mahatmas-MacBook-Pro.local")

    assert module.machine_name() == "mahatmas-MacBook-Pro.local"


def test_machine_name_prefers_explicit_env(tmp_path, monkeypatch):
    module = load(tmp_path, monkeypatch)
    monkeypatch.setenv("JOURNAL_MACHINE_ID", "mmch")
    monkeypatch.setenv("COMPUTERNAME", "IGNORED")

    assert module.machine_name() == "mmch"
