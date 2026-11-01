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
