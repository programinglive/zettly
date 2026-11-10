# Kenari.id Free Models

Coding agent jobs are executed through the Kenari.id API (Responses-compatible OpenAI endpoint at `https://kenari.id/v1`). The available models are all free-tier Kenari models, configured as `openai-custom` model provider in the worker bootstrap (`agent_worker/bootstrap.sh`).

## Supported Models

| Model ID | Notes |
| --- | --- |
| `agnes-3-0-flash:free` | Default model; fast and lightweight, used for most coding agent jobs |
| `gpt-4o-mini:free` | OpenAI GPT-4o mini via Kenari |
| `agnes-3-0-pro:free` | Higher-capability Agnes 3.0 pro variant |
| `llama-3.3-70b:free` | Llama 3.3 70B open-weight model via Kenari |

## Configuration

- Default model: `agnes-3-0-flash:free`
- Config source: `config/coding_agent.php`
  - `models` — list of allowed model IDs (from env `CODING_AGENT_MODELS`)
  - `default_model` — fallback when a job does not specify a model (from env `CODING_AGENT_DEFAULT_MODEL`)
- Environment:
  ```
  CODING_AGENT_MODELS='["agnes-3-0-flash:free","gpt-4o-mini:free","agnes-3-0-pro:free","llama-3.3-70b:free"]'
  CODING_AGENT_DEFAULT_MODEL=agnes-3-0-flash:free
  ```
- Model selection is validated on job creation: a submitted model must be one of `config('coding_agent.models')`; otherwise the default is used.
- Worker: `agent_worker/bootstrap.sh` writes a Codex `config.toml` with `model_provider = "openai-custom"`, `model = "agnes-3-0-flash:free"`, and `[model_providers.openai-custom]` pointing at `https://kenari.id/v1` using `KENARI_API_KEY`.

## Notes

- All four models carry the `:free` suffix — no per-token billing, but subject to Kenari rate limits.
- Adding or removing a model requires updating `CODING_AGENT_MODELS` (keep `.env` and `.env.example` in sync).
