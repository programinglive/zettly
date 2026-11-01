# Jurnal Konsolidasi → Zettly (2026-11-01)

Dokumen ini mencatat **bagaimana** `daily-activity-journal` dikonversi menjadi Zettly,
**apa yang harus di-setup di setiap device** setelah migrasi, dan **kapan repo lama boleh dihapus**.

> Tujuan: siapa pun yang memegang device baru bisa menjalankan Codex hook dan melihat
> semua catatan kerja di Zettly **tanpa** perlu `daily-activity-journal` sebagai sumber.

---

## 1. Apa yang berubah

| Sebelum (per device) | Sesudah (sentral) |
|---|---|
| Setiap device menjalankan hook Codex → menulis ke SQLite `events.sqlite3` lokal | Hook Codex (di setiap device) → `POST` ke API Zettly |
| `ACTIVE.md` + `daily/*.md` di repo sebagai sumber kebenaran | Task list di Zettly (via `Todo`) + `JournalEntry`; sesi di `AgentSession` |
| Report digenerate per device oleh Python task terjadwal | Report digenerate + dikirim oleh Zettly (job queue + scheduler) |
| Data tersebar di `programinglive/daily-activity-journal` + `mahatmamahardhikach/…` | Satu database di Zettly; semua device mengirim ke sana |

**Repo lama `daily-activity-journal` tidak lagi menjadi sumber data kerja.**
Ia hanya di-pull untuk panduan `CODEX_KENARI_GEMINI_SETUP.md` dan untuk migrasi data historis
sekali pakai (melalui `journal:import-legacy`, sudah selesai).

---

## 2. Setup per device (checklist)

Untuk setiap komputer/laptop yang menjalankan Codex dan ingin mencatat ke Zettly:

### a. Zettly instance + token

Zettly harus bisa dijangkau. Token CLI dibuat **sekali** (di device yang sudah ada
akun + Sanctum), lalu bisa dipindahkan ke device lain lewat clipboard/paste.

```bash
# 1. Masuk ke Zettly di browser device utama, salin token CLI dari profile screen,
#    atau bikin via API:
curl -X POST https://zettly.example.com/api/v1/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"...","abilities":["zettly:cli"]}'
# Response berisi { "token": "pt-XXXX" }
```

### b. Environment variables Codex

Di shell/config tiap device, set dua var, **jangan commit ke repo mana pun**:

```bash
export ZETTLY_API_BASE="https://zettly.example.com"   # tanpa trailing /
export ZETTLY_CLI_TOKEN="pt-XXXX"                     # token Sanctum zettly:cli
```

Windows PowerShell (persist via User env):

```powershell
[Environment]::SetEnvironmentVariable("ZETTLY_API_BASE","https://zettly.example.com","User")
[Environment]::SetEnvironmentVariable("ZETTLY_CLI_TOKEN","pt-XXXX","User")
```

Mac/Linux (persist via `~/.zshrc` / `~/.bashrc`):

```bash
echo 'export ZETTLY_API_BASE="https://zettly.example.com"' >> ~/.zshrc
echo 'export ZETTLY_CLI_TOKEN="pt-XXXX"'                    >> ~/.zshrc
```

### c. Hook Codex

File hook tinggal satu, masih di repo `daily-activity-journal` (`scripts/codex_journal.py`).
Rekomendasi: pindahkan file ini ke repo Zettly (`scripts/codex_journal.py`) sebelum
repo lama dihapus, supaya satu sumber per device tidak bergantung dua repo.

- **Path hook (di device):** `scripts/codex_journal.py` (repo asal, atau salinan local)
- **Diaktifkan Codex** lewat konfigurasi Codex (`codex` TUI → settings → hooks →
  "PostToolUse / Stop / UserPromptSubmit" → panggil `python3 codex_journal.py hook`).
- Format stdin = JSON hook payload Codex (field `hook_event_name`, `session_id`,
  `turn_id`, `cwd`, dst.)
- Jika network turun, setiap payload masuk `outbox.jsonl` lokal di
  `%LOCALAPPDATA%\DailyActivityJournal\outbox.jsonl` (Windows) atau
  `~/.local/share/DailyActivityJournal/outbox.jsonl` (Linux). Replay otomatis
  di run hook berikutnya.

### d. Scheduler (hanya di device utama, atau di server deploy)

Zettly punya dua command terjadwal (Laravel scheduler):

```bash
php artisan schedule:run   # di cron tiap menit
```

Atau di OS cron:
```
* * * * * cd /path/zettly && php artisan schedule:run >> /dev/null 2>&1
```

Yang di-schedule:
- `journal:generate-reports` — generate semua report yang jatuh tempo
- `journal:deliver-reports`  — dispatch delivery jobs untuk report pending

Channel delivery (Discord/Telegram) dikonfigurasi **via API Zettly**, bukan via env
di device:
```
POST /api/v1/report-channels  { channel, webhook_url, chat_id? }
GET  /api/v1/report-channels
```

### e. Migrasi data lama (sudah selesai, jangan ulang kecuali ada sumber baru)

Command:
```bash
cd /path/zettly
php artisan journal:import-legacy \
  --db="%LOCALAPPDATA%\DailyActivityJournal\events.sqlite3" \
  --journal-root="D:\works\mine\code\daily-activity-journal\activity" \
  --user-id=<owner-id>          # default: user_id terkecil = owner
```

Sudah di-run satu kali. Idempoten (aman dijalankan ulang — tidak akan
memduplikasi sesi/event/report/todo/journal entry).

---

## 3. Alur data setelah integrasi

```
 Codex device (A, B, C, …)
      │
      │  POST /api/v1/agent/sessions           (create/update sesi)
      │  POST /api/v1/agent/sessions/{sid}/events  (prompt/error/outcome)
      ▼
 Zettly (Sanctum zettly:cli, AgentSessionIngestor)
      │  redact + categorize di server, dedup by event_key
      ▼
 Laravel DB: agent_sessions + agent_events + journal_entries + todos + reports
      │
      │  schedule: journal:generate-reports → generate semua period due
      │           journal:deliver-reports  → dispatch DeliverReport jobs
      ▼
 Discord / Telegram webhook (per UserReportChannel yang enabled)
```

**Client owns:** state machine (status, duration, changed files, outcome detect).
**Server owns:** redaction + categorisation (konsisten di semua device).

---

## 4. Kapan `daily-activity-journal` boleh dihapus

Repo lama **boleh dihapus dari GitHub** hanya setelah **semua** kondisi ini terpenuhi:

- [x] 11 task konsolidasi selesai & di-review (critical/important fix sudah masuk)
- [x] Zettly + journal hook di-push ke `main` & ter-merge
- [x] `journal:import-legacy` sudah di-run sekali untuk semua sumber historis
- [ ] **Owner mengkonfirmasi** bahwa tidak ada device lain yang masih menulis ke
      `events.sqlite3` lokal (cek: `%LOCALAPPDATA%\DailyActivityJournal\` masih
      menerima write atau sudah read-only)
- [ ] Tidak ada `outbox.jsonl` tersisa berisi payload yang belum ter-flush
      (cek di tiap device: `type "%LOCALAPPDATA%\DailyActivityJournal\outbox.jsonl"`
      harus kosong / tidak ada)
- [ ] Semua device sudah memakai hook Zettly, bukan hook SQLite lama

Checklist 1–2 sudah hijau saat ini. **Tunggu konfirmasi owner + kosongnya outbox
di semua device** sebelum hapus repo `programinglive/daily-activity-journal`
dan `mahatmamahardhikach/daily-activity-journal`.

> Catatan: panduan `CODEX_KENARI_GEMINI_SETUP.md` tetap hidup di Zettly
> (`docs/`) jika diperlukan lintas device. Repo lama tidak harus dijaga
> untuk alasan itu.

---

## 5. Quick reference URL & endpoint

| Tujuan | Endpoint / command |
|---|---|
| Buat token CLI | `POST /api/v1/auth/token` (abilities: `["zettly:cli"]`) |
| Upsert sesi agent | `POST /api/v1/agent/sessions` |
| Append event | `POST /api/v1/agent/sessions/{session_id}/events` |
| List sesi | `GET /api/v1/agent/sessions?since=YYYY-MM-DDT00:00:00+07:00` |
| Generate report | `POST /api/v1/reports/generate` |
| Deliver report | `POST /api/v1/reports/deliver` (body: `report_key` opsional) |
| List report | `GET /api/v1/reports?period_kind=daily&from=…&to=…` |
| Manage channel | `POST/GET /api/v1/report-channels`, `DELETE /api/v1/report-channels/{channel}` |
| Import historis | `php artisan journal:import-legacy` |
| Generate due | `php artisan journal:generate-reports` |
| Deliver pending | `php artisan journal:deliver-reports` |

Waktu semua report dihitung dalam **WIB (Asia/Jakarta)**; cutoff daily adalah
23:00–23:55 WIB (report hari masih terbuka hingga 23:54, setelahnya pindah ke
hari berikutnya).
