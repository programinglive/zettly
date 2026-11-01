import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/**
 * Zettly journal plugin for OpenCode.
 *
 * Records AI work into Zettly so notes, tasks and agent logs live in one place.
 * The Codex hook (`scripts/codex_journal.py`) already owns the hard parts —
 * secret redaction, category inference, the offline outbox and its replay — so
 * this plugin does not reimplement any of it. It only translates OpenCode
 * events into the hook's stdin payload and lets the hook do the rest.
 *
 * Event mapping:
 *   chat.message         -> UserPromptSubmit   (session upsert + prompt event)
 *   tool.execute.after   -> PostToolUse        (recorded only when the tool failed)
 *   session.idle         -> Stop               (status/outcome + outbox flush)
 *
 * Why spawn the hook rather than POST directly: the hook is the single source
 * of truth, so a fix there fixes both harnesses, and a failure still lands in
 * the same outbox that `flush_spool()` drains on the next run.
 *
 * Everything here is best-effort. A journal failure must never break a chat
 * turn, block a tool, or surface an error to the model.
 */

const HOOK_TIMEOUT_MS = 5000

type Payload = Record<string, unknown>

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function projectName(directory: string): string {
  const trimmed = directory.replace(/[\\/]+$/, "")
  const parts = trimmed.split(/[\\/]/)
  return parts[parts.length - 1] || "Workspace"
}

function resolvePython(): string {
  const explicit = process.env.ZETTLY_JOURNAL_PYTHON
  if (explicit && existsSync(explicit)) return explicit

  const known =
    process.platform === "win32"
      ? [
          "C:/Program Files/Python311/python.exe",
          "C:/Program Files/Python312/python.exe",
          "C:/Program Files/Python310/python.exe",
        ]
      : ["/usr/bin/python3", "/usr/local/bin/python3"]

  for (const candidate of known) {
    if (existsSync(candidate)) return candidate
  }

  return process.platform === "win32" ? "python.exe" : "python3"
}

function resolveHook(): string | null {
  const explicit = process.env.ZETTLY_JOURNAL_HOOK
  if (explicit && existsSync(explicit)) return explicit

  const known = [
    "D:/works/mine/code/zettly/scripts/codex_journal.py",
    join(homedir(), "code/zettly/scripts/codex_journal.py"),
    join(homedir(), "works/mine/code/zettly/scripts/codex_journal.py"),
  ]

  return known.find((candidate) => existsSync(candidate)) ?? null
}

let cachedHook: string | null | undefined

function hookPath(): string | null {
  if (cachedHook === undefined) {
    cachedHook = resolveHook()
    if (!cachedHook) {
      console.warn("[zettly-journal] codex_journal.py not found — journaling disabled")
    }
  }
  return cachedHook
}

function runHook(payload: Payload): Promise<void> {
  const hook = hookPath()
  if (!hook) return Promise.resolve()

  return new Promise((done) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      done()
    }

    try {
      const child = spawn(resolvePython(), [hook, "hook"], {
        stdio: ["pipe", "ignore", "ignore"],
        windowsHide: true,
        env: process.env,
      })

      const timer = setTimeout(() => {
        try {
          child.kill()
        } catch {
          /* already gone */
        }
        finish()
      }, HOOK_TIMEOUT_MS)

      child.on("error", () => {
        clearTimeout(timer)
        finish()
      })
      child.on("close", () => {
        clearTimeout(timer)
        finish()
      })

      // EPIPE when the child exits before reading stdin; `close` settles it.
      child.stdin?.on("error", () => {})
      child.stdin?.end(JSON.stringify(payload))
    } catch {
      finish()
    }
  })
}

/**
 * Last assistant text per session, so `Stop` can classify the outcome
 * (completed / blocked / in progress) instead of always guessing. Fed by
 * `experimental.text.complete`, with a session.messages fallback.
 */
const lastText = new Map<string, string>()

export const ZettlyJournalPlugin = {
  id: "zettly-journal",

  async server({ client, directory }: any) {
    const cwd = asString(directory) || process.cwd()
    const project = projectName(cwd)

    const fetchLastAssistantText = async (sessionID: string): Promise<string> => {
      try {
        const result: any = await client.session.messages({
          path: { id: sessionID },
          query: { limit: 20 },
        })
        const list: any[] = (result?.data ?? result ?? []) as any[]
        if (!Array.isArray(list)) return ""

        for (let i = list.length - 1; i >= 0; i--) {
          const entry = list[i]
          if (entry?.info?.role !== "assistant") continue

          const parts: any[] = entry?.parts ?? []
          const text = parts
            .filter((part) => part?.type === "text" && !part?.synthetic && !part?.ignored)
            .map((part) => asString(part.text))
            .join("\n")
            .trim()

          if (text) return text.slice(0, 3000)
        }
      } catch {
        /* journaling is best-effort */
      }
      return ""
    }

    return {
      // A user turn starts (or continues) a journal session.
      "chat.message": async (input: any, output: any) => {
        try {
          const sessionID = asString(input?.sessionID)
          if (!sessionID) return

          let prompt = ""
          for (const part of Array.isArray(output?.parts) ? output.parts : []) {
            if (part?.type === "text" && !part?.synthetic && !part?.ignored) {
              prompt += (prompt ? "\n" : "") + asString(part.text)
            }
          }

          await runHook({
            hook_event_name: "UserPromptSubmit",
            session_id: sessionID,
            cwd,
            project,
            prompt: prompt.slice(0, 3000),
            turn_id: asString(output?.message?.id) || asString(input?.messageID),
            source: "opencode",
          })
        } catch {
          /* never break the turn */
        }
      },

      // Only failures are worth an event; successes would flood the journal.
      "tool.execute.after": async (input: any, output: any) => {
        try {
          const sessionID = asString(input?.sessionID)
          if (!sessionID) return

          const meta: Payload = (output?.metadata ?? {}) as Payload
          const exitCode = typeof meta.exit === "number" ? (meta.exit as number) : undefined
          const failed =
            meta.isError === true ||
            meta.is_error === true ||
            (exitCode !== undefined && exitCode !== 0)

          if (!failed) return

          await runHook({
            hook_event_name: "PostToolUse",
            session_id: sessionID,
            cwd,
            project,
            tool_name: asString(input?.tool) || "tool",
            is_error: true,
            tool_response: { isError: true, exit_code: exitCode ?? 1 },
            turn_id: asString(input?.callID),
            source: "opencode",
          })
        } catch {
          /* never break the tool */
        }
      },

      // The session went idle: close out the turn and flush any spooled events.
      event: async (input: any) => {
        try {
          const event = input?.event
          if (event?.type !== "session.idle") return

          const sessionID = asString(event?.properties?.sessionID)
          if (!sessionID) return

          const text = lastText.get(sessionID) || (await fetchLastAssistantText(sessionID))
          lastText.delete(sessionID)

          await runHook({
            hook_event_name: "Stop",
            session_id: sessionID,
            cwd,
            project,
            last_assistant_message: text,
            source: "opencode",
          })
        } catch {
          /* journaling is best-effort */
        }
      },

      "experimental.text.complete": async (input: any, output: any) => {
        try {
          const sessionID = asString(input?.sessionID)
          const text = asString(output?.text)
          if (sessionID && text) lastText.set(sessionID, text.slice(0, 3000))
        } catch {
          /* ignore */
        }
      },
    }
  },

  // OpenCode 2.x entrypoint. The 2.x tool hook exposes only the tool name and
  // input (no result), so tool failures are captured via the 1.x shape above.
  async setup(_ctx: any) {
    hookPath()
  },
}

export default ZettlyJournalPlugin
