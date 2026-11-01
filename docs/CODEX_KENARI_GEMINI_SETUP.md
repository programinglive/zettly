# Setup Codex dengan Kenari dan Gemini di Windows Linux dan macOS

Panduan ini menjelaskan setup Codex CLI agar model Gemini langsung dari Google dan model dari kenari.id muncul di `/model`. Perintah sehari-hari cukup `codex`; peluncur lokal menangani mode tanpa shared daemon secara otomatis.

Catatan canonical disimpan di jurnal bersama `mahatmamahardhikach/daily-activity-journal`. Setelah sinkronisasi repo di komputer tujuan, baca file ini dan ambil kode [gateway.cjs](../scripts/codex-custom-models/gateway.cjs) serta [launch.cjs khusus Windows](../scripts/codex-custom-models/launch.cjs). Salin kode ke direktori Codex user pada perangkat tujuan sesuai panduan; menjalankannya langsung dari folder repo mengubah lokasi katalog yang dihasilkan. Tidak ada API key atau file credential dalam kedua kode tersebut.

Baseline: Codex CLI 0.164.0 dan Node.js 24.20.0, diperiksa pada 25 Oktober 2026. Setup dan pengujian langsung dilakukan di Windows. Langkah Linux/macOS adalah adaptasi dari kode yang sama dan perlu diuji pada perangkat tujuan. Gunakan versi baseline saat mereproduksi masalah; periksa lagi kompatibilitas jika memakai versi berbeda.

## Cara kerja dan pilihan setup

Ada dua jalur yang berbeda:

```text
Codex -> penghubung lokal 127.0.0.1:47831
         |-> gemini/<id> -> Google Chat Completions -> Responses untuk Codex
         |-> kenari/<id> -> Kenari Responses
```

Codex pada versi ini membutuhkan Responses untuk custom provider. Endpoint Google yang dicoba, `https://generativelanguage.googleapis.com/v1beta/openai/responses`, mengembalikan 404; endpoint Chat Completions-nya menerima permintaan. Karena itu Google memerlukan adapter `gateway.cjs`. Mengganti `base_url` saja tidak menyelesaikan perbedaan protokol.

Katalog Codex juga berbeda dari daftar OpenAI biasa: Codex memerlukan objek `models` dengan metadata kemampuan, bukan sekadar `data[].id`. Adapter mengambil daftar provider dan membuat `catalog.json` yang sesuai.

Jika hanya membutuhkan Kenari, gunakan jalur Kenari langsung pada bagian terakhir. Adapter gabungan ini membutuhkan key Google, termasuk untuk autentikasi layanan lokalnya.

## Hasil yang sudah diuji

| Pemeriksaan Windows | Hasil baseline |
| --- | --- |
| Katalog yang dibaca Codex | 93 model terlihat: 20 Google dan 73 Kenari |
| Model default | `gemini/gemini-3.8-flash` |
| Inferensi Google melalui Codex | Berhasil menjawab `OK` |
| Tool melalui Google | Menjalankan PowerShell `173 * 257` dan membaca hasil `44461` |
| Menjalankan `codex` tanpa flag | Berhasil membuka TUI dan menu `/model` Gemini |
| Autentikasi gateway | Permintaan tanpa token ditolak 401; browser Origin ditolak 403 |
| Inferensi Kenari | Key yang tersimpan ditolak `401 invalid key` |

Jumlah model adalah snapshot, bukan jumlah yang harus selalu sama. Daftar bisa berubah. Keberhasilan membaca katalog publik Kenari tidak membuktikan bahwa key-nya valid untuk inferensi. Kenari belum terverifikasi bekerja end-to-end pada baseline ini.

## File dan lokasi

| Komponen | Windows | Linux atau macOS |
| --- | --- | --- |
| Direktori Codex standar | `%USERPROFILE%\.codex` | `~/.codex` |
| Konfigurasi utama | `.codex/config.toml` | `.codex/config.toml` |
| Adapter dan katalog | `.codex/custom-models/` | `.codex/custom-models/` |
| Profil | `.codex/<nama>.config.toml` | `.codex/<nama>.config.toml` |
| Credential OpenCode yang dibaca adapter | `%USERPROFILE%\.local\share\opencode\auth.json` | `~/.local/share/opencode/auth.json` |

Jalur OpenCode di tabel adalah lokasi yang dibaca kode ini. Jika perangkat menggunakan lokasi lain atau backend credential lain, ubah pembacaan `authPath` atau gunakan environment variable. Panduan ini mengasumsikan lokasi Codex standar; sesuaikan semua lokasi bila konfigurasi Codex Anda berbeda.

File yang diperlukan adalah `gateway.cjs` dan panduan ini. `launch.cjs` adalah peluncur khusus Windows dari setup asal. File `catalog.json` dan `provider-models.json` dibuat oleh perintah refresh. Profil `openai` mempertahankan akses OpenAI semula; profil `gemini`, `kenari`, dan `external-models` tersedia pada perangkat asal.

Jangan menyalin seluruh `.codex`, `auth.json`, folder secrets, atau environment pribadi ketika membagikan setup. Setiap penerima menggunakan key dan login miliknya sendiri. Paket panduan hanya menyertakan kode dan dokumentasi.

## Persiapan perangkat baru

1. Pastikan Node.js dan Codex CLI tersedia. Periksa `node --version` dan `codex --version`. Untuk mereproduksi baseline lewat npm, versi CLI-nya dapat dipilih dengan `npm install -g @openai/codex@0.164.0`.
2. Cadangkan `config.toml` yang sudah ada. Jangan menimpa konfigurasi MCP, plugin, permission, atau profil lain tanpa menggabungkannya.
3. Buat folder `custom-models`, lalu salin `gateway.cjs` dari paket ke sana.

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\custom-models"
Copy-Item "$env:USERPROFILE\.codex\config.toml" "$env:USERPROFILE\.codex\config.toml.before-custom-models.bak"
```

Jalankan baris pencadangan hanya jika file sumber ada. Gunakan nama backup baru agar backup lama tidak tertimpa.

Linux/macOS:

```sh
mkdir -p "$HOME/.codex/custom-models"
cp "$HOME/.codex/config.toml" "$HOME/.codex/config.toml.before-custom-models.bak"
```

## Menyediakan API key

Adapter memilih key dengan urutan berikut:

- Google: `GEMINI_API_KEY`, lalu `GOOGLE_API_KEY`, lalu `google.key` dari credential OpenCode.
- Kenari: `KENARI_API_KEY`, lalu `kenari.key` dari credential OpenCode.

Kunci dibaca dari sumber lokal yang sudah tersedia; kode tidak menyertakan nilai key. Key Google diperlukan untuk refresh katalog gabungan dan token gateway lokal. Key Kenari diperlukan saat mengirim permintaan Kenari.

Jika sudah login provider lewat OpenCode dan file JSON-nya sesuai, tidak perlu menyalin key. Untuk perangkat tanpa OpenCode, environment variable dapat dipakai. Masukkan key secara lokal, jangan lewat chat atau dokumen bersama.

PowerShell, untuk sesi terminal saat ini:

```powershell
$secret = Read-Host 'Google API key' -AsSecureString
$env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
# Opsional, jika memakai Kenari:
$secret = Read-Host 'Kenari API key' -AsSecureString
$env:KENARI_API_KEY = [System.Net.NetworkCredential]::new('', $secret).Password
Remove-Variable secret
```

Bash di Linux atau macOS:

```bash
read -r -s -p 'Google API key: ' GEMINI_API_KEY; printf '\n'
export GEMINI_API_KEY
# Opsional:
read -r -s -p 'Kenari API key: ' KENARI_API_KEY; printf '\n'
export KENARI_API_KEY
```

Zsh, shell bawaan banyak perangkat macOS:

```zsh
read -rs 'GEMINI_API_KEY?Google API key: '; printf '\n'
export GEMINI_API_KEY
# Opsional:
read -rs 'KENARI_API_KEY?Kenari API key: '; printf '\n'
export KENARI_API_KEY
```

Environment ini hanya bertahan pada terminal dan proses turunannya. Layanan gateway mewarisi environment saat mulai. Jika mengubah key di environment setelah gateway berjalan, tutup proses gateway yang benar lalu mulai ulang dari terminal yang memegang key baru. Perubahan credential OpenCode dibaca ulang dari file oleh adapter.

## Membuat katalog

Windows:

```powershell
node "$env:USERPROFILE\.codex\custom-models\gateway.cjs" refresh
node "$env:USERPROFILE\.codex\custom-models\gateway.cjs" start
```

Linux/macOS:

```sh
node "$HOME/.codex/custom-models/gateway.cjs" refresh
node "$HOME/.codex/custom-models/gateway.cjs" start
```

Refresh membuat katalog dari API provider. Pilih ID model Google yang benar-benar muncul pada hasil perangkat tujuan. Jika `gemini/gemini-3.8-flash` belum tersedia, gunakan ID lain dari `catalog.json` pada semua contoh konfigurasi di bawah.

## Konfigurasi provider gabungan

Pertama buat profil `.codex/external-models.config.toml` agar dapat diuji sebelum dijadikan default. Ganti tiga placeholder path dengan path absolut perangkat tujuan. Jangan membiarkan `<...>` sebagai teks literal.

```toml
model = "gemini/gemini-3.8-flash"
model_provider = "local_models"
model_catalog_json = "<PATH_ABSOLUT_CUSTOM_MODELS>/catalog.json"
model_reasoning_effort = "none"
model_reasoning_summary = "none"

[model_providers.local_models]
name = "Google Gemini + Kenari"
base_url = "http://127.0.0.1:47831/v1"
wire_api = "responses"
requires_openai_auth = false
stream_idle_timeout_ms = 240000

[model_providers.local_models.auth]
command = "<PATH_ABSOLUT_NODE>"
args = ["<PATH_ABSOLUT_GATEWAY_CJS>", "auth"]
timeout_ms = 10000
refresh_interval_ms = 0
```

Temukan executable Node dengan `node -p "process.execPath"`. Contoh path:

| Nilai | Windows | Linux | macOS |
| --- | --- | --- | --- |
| Node | `C:/Program Files/nodejs/node.exe` | `/usr/bin/node` atau path instalasi sendiri | `/opt/homebrew/bin/node` atau path instalasi sendiri |
| Folder adapter | `C:/Users/<USER>/.codex/custom-models` | `/home/<USER>/.codex/custom-models` | `/Users/<USER>/.codex/custom-models` |

Gunakan hasil perangkat Anda, terutama jika memakai nvm atau instalasi Node lain. Dalam string TOML Windows, gunakan slash `/`, atau escape setiap backslash menjadi `\\`.

Uji dengan:

```sh
codex --profile external-models
```

Buka `/model`, pilih model dengan label `[Google]` atau `[Kenari]`, lalu coba satu pesan singkat. ID `gemini/...` dirutekan ke Google; `kenari/...` dirutekan ke Kenari. Model Gemini dengan awalan `kenari/` memakai key dan billing Kenari, bukan Google.

Setelah profil berhasil, gabungkan lima pengaturan model di atas ke bagian paling atas `config.toml`, sebelum header tabel pertama. Tambahkan blok `model_providers.local_models` dan `auth` jika belum ada. Ubah blok yang sudah ada jika namanya sama; jangan menduplikasi tabel TOML.

Profil sekarang memakai file `<nama>.config.toml`, bukan tabel lama `[profiles.<nama>]`. Konfigurasi provider harus berada di konfigurasi user atau profilnya, bukan semata-mata `.codex/config.toml` di proyek.

## Menjadikan perintah codex sebagai default

Mode ini menghindari shared daemon lama yang mungkin masih memegang konfigurasi sebelumnya. Penghubung model lokal tetap merupakan proses terpisah dan mulai otomatis saat helper autentikasi dipanggil.

### Windows

Pada perangkat asal, ketiga shim npm `codex.ps1`, `codex.cmd`, dan `codex` di `%APPDATA%\npm` sudah diarahkan ke `.codex/custom-models/launch.cjs`. Peluncur menambahkan `--no-daemon` hanya untuk sesi interaktif lokal serta `resume` dan `fork`. Perintah administrasi dan koneksi remote tetap memakai perilaku biasa.

Untuk mengulang pada Windows baru:

1. Salin `launch.cjs` ke folder `custom-models`.
2. Cari lokasi CLI lewat `Get-Command codex -All` dan `npm prefix -g`. Peluncur yang disertakan mengasumsikan paket berada di `%APPDATA%\npm\node_modules\@openai\codex`; sesuaikan `entry` di kode bila lokasi npm berbeda.
3. Cadangkan ketiga shim. Di masing-masing shim, ganti target Node `node_modules/@openai/codex/bin/codex.js` dengan path absolut `launch.cjs`. Pertahankan penerusan argumen, stdin, dan exit code dari shim. Pada `.cmd`, contoh targetnya `%USERPROFILE%\.codex\custom-models\launch.cjs`.
4. Buka terminal baru, jalankan `codex`, lalu `/model`.

Jika PowerShell menolak `codex.ps1`, gunakan `codex.cmd`. Tidak perlu melonggarkan execution policy seluruh sistem hanya untuk menjalankan CLI.

Update/reinstall npm bisa membuat ulang shim. Jika default kembali berubah setelah update, periksa target shim dan terapkan ulang perubahan setelah backup.

### Linux dan macOS

Jangan menyalin shim Windows. Untuk terminal interaktif, alias shell berikut merupakan padanan paling sederhana:

```sh
alias codex='codex --no-daemon'
```

Simpan di `~/.bashrc` untuk Bash atau `~/.zshrc` untuk Zsh. Muat ulang file yang sesuai atau buka terminal baru. Pada macOS yang memakai Bash login shell, pastikan file startup login memuat file alias tersebut.

Alias bekerja di shell interaktif yang memuatnya. Aplikasi GUI, IDE, cron, dan shell noninteraktif tidak otomatis memakai alias. Untuk `codex agents`, koneksi `--remote`, atau administrasi yang perlu perilaku asli, gunakan `command codex ...` agar melewati alias. Jika ingin perilaku ini juga di luar shell interaktif, siapkan wrapper executable yang meneruskan argumen dan menangani pengecualian tersebut; jangan menganggap alias mengubah semua aplikasi.

## Mempertahankan OpenAI

Sebelum mengubah default, simpan ID model OpenAI semula dan login yang sudah ada. Pada perangkat asal ID-nya `gpt-6.1-sol`; perangkat lain harus memilih model yang memang tersedia bagi akunnya.

Simpan katalog bawaan ke `custom-models/openai-catalog.json` dengan encoding UTF-8:

PowerShell 7:

```powershell
codex debug models --bundled | Set-Content -Encoding utf8 "$env:USERPROFILE\.codex\custom-models\openai-catalog.json"
```

Linux/macOS:

```sh
command codex debug models --bundled > "$HOME/.codex/custom-models/openai-catalog.json"
```

Buat `.codex/openai.config.toml` dengan path absolut perangkat tujuan:

```toml
model = "gpt-6.1-sol"
model_provider = "openai"
model_catalog_json = "<PATH_ABSOLUT_CUSTOM_MODELS>/openai-catalog.json"
model_reasoning_effort = "medium"
```

Lalu gunakan `codex --profile openai`. Jangan menghapus login OpenAI yang ada. Katalog tidak memberikan akses model jika akun tidak memilikinya. Perangkat asal menyimpan snapshot katalog OpenAI yang sudah tersedia; snapshot lokal perlu diperbarui ketika daftar model berubah.

## Pemeriksaan setelah pemasangan

1. Jalankan `codex --version` dan pastikan executable yang dipakai sesuai.
2. Jalankan `codex --strict-config app-server --print-startup-config` untuk memeriksa validitas konfigurasi utama. Jangan menambahkan `--profile` pada perintah administrasi ini di versi baseline.
3. Setelah default dipasang, `codex debug models` harus menghasilkan katalog dengan model `gemini/` dan `kenari/`.
4. Jalankan `codex` tanpa argumen lalu `/model`. Pastikan label Google dan Kenari tersedia. Sesi lama mungkin tetap terikat ke provider semula; gunakan sesi baru.
5. Pilih Google dan minta jawaban singkat. Kemudian minta satu tool menghitung `173 * 257`, dengan hasil `44461`. Dua tes ini memeriksa inferensi serta putaran tool; permintaan API mengikuti tarif/kuota provider.
6. Uji Kenari terpisah. Membaca daftar model publik saja tidak cukup untuk menguji autentikasi.

Gateway hanya mendengarkan `127.0.0.1:47831`. `GET /health` tanpa token memang mengembalikan 401. Perintah `node gateway.cjs start` memeriksa kesehatan dengan autentikasi; `node gateway.cjs auth` menghasilkan token yang diperlukan Codex dan tidak perlu dijalankan untuk ditampilkan atau dibagikan.

## Penanganan masalah

| Gejala | Pemeriksaan dan tindakan |
| --- | --- |
| `/model` masih hanya GPT bawaan | Pastikan CLI dan user yang benar, `model_catalog_json` berada di level teratas, file katalog ada, lalu buka sesi baru. Periksa shim Windows atau alias shell agar tidak memakai daemon lama. |
| Model muncul tetapi permintaan menuju provider salah | Periksa `model_provider` dan awalan model. Katalog menentukan metadata, sedangkan provider/adapter menentukan rute. |
| Kenari `401 invalid key` | Ganti key Kenari di sumber credential yang benar. Periksa environment lama yang mengalahkan key OpenCode. Refresh katalog tidak memperbaiki key invalid. |
| Google `/responses` 404 | Provider harus menunjuk adapter lokal, bukan langsung ke endpoint Google dengan `wire_api = "responses"`. |
| Google 401 atau 403 | Periksa key Google, akun/project, izin model, dan pesan error dari provider. |
| Google 429 | Periksa kuota/rate limit/billing di Google; menambah katalog tidak menambah kuota. |
| Gateway gagal mulai | Pastikan Node ada di path absolut konfigurasi, credential Google tersedia, dan port 47831 tidak dipakai proses lain. |
| Key sudah diganti tetapi masih gagal | Environment gateway berasal dari saat proses mulai. Mulai ulang gateway dari terminal yang benar; jangan menghentikan proses lain yang kebetulan memakai port tersebut. |
| Adapter gagal setelah reboot | Helper `auth` seharusnya menyalakannya otomatis. Environment sementara dari terminal lama sudah hilang; sediakan credential lagi lewat sumber lokal yang benar. |
| `Could not find home directory` atau akses ditolak | Periksa home user dan izin baca/tulis konfigurasi pada lingkungan yang menjalankan CLI. Jika sedang memakai agen dengan sandbox, akses agen bisa berbeda dari akses terminal user. |
| `codex.ps1` diblokir | Gunakan `codex.cmd`; tidak perlu menonaktifkan kebijakan keamanan sistem. |
| Masalah setelah npm update | Periksa apakah shim kembali ke target asli dan apakah schema katalog masih cocok dengan versi CLI. Cadangkan, lalu terapkan ulang peluncur bila diperlukan. |
| Model tertentu ditolak atau kosong | Pastikan ID tersedia bagi key tersebut dan sesuai untuk text/tool, bukan audio/image-only. Coba model lain; jangan menambahkan ID yang hanya ditebak. |

Untuk inspeksi port di Windows, gunakan `Get-NetTCPConnection -LocalPort 47831 -State Listen` lalu cocokkan PID dan command line dengan `gateway.cjs serve`. Linux dapat memakai `ss -ltnp`; macOS dapat memakai `lsof -nP -iTCP:47831 -sTCP:LISTEN`. Periksa identitas proses sebelum menghentikannya.

## Batasan adapter dan hal yang tidak perlu disalin

Adapter ini adalah kode lokal, bukan dukungan native resmi Gemini di Codex. Google menghasilkan jawaban lengkap terlebih dahulu, lalu adapter mengirim event Responses SSE; teks tidak mengalir token per token. Kode menangani teks, gambar, function/custom tool calls, dan hasil tool. Audio, blok file-input, web search server-side, dan `previous_response_id` tidak didukung. Metadata katalog tidak menambah kemampuan model.

Token lokal diturunkan dari credential Google. Jangan membuka port gateway ke jaringan atau menghapus autentikasinya. Adapter tidak menyimpan isi percakapan atau key ke log sendiri, tetapi Codex dan provider tetap memiliki kebijakan penyimpanan masing-masing.

Jangan menyalin `check-model-menu.cjs` sebagai pemeriksa universal: versi perangkat asal menunjuk path binary Windows 0.164.0. Folder schema dan file diagnostik dari setup asal juga tidak diperlukan untuk perangkat baru.

## Alternatif Kenari langsung tanpa Google

Jika hanya memakai Kenari, adapter tidak diperlukan. Sediakan `KENARI_API_KEY` yang valid, buat katalog Codex khusus Kenari dengan schema yang sesuai, pilih ID model yang ada, lalu gunakan provider:

```toml
[model_providers.kenari]
name = "Kenari"
base_url = "https://kenari.id/v1"
wire_api = "responses"
env_key = "KENARI_API_KEY"
requires_openai_auth = false
```

Pada level teratas pilih `model_provider = "kenari"`. ID model untuk rute langsung adalah ID Kenari asli, misalnya `agnes-3-0-flash:free`, tanpa awalan `kenari/`. Jika membuat katalog langsung dari katalog gabungan, ambil hanya entri `kenari/` dan hapus awalan tersebut dari setiap `slug`. Jangan mengirim ID gabungan ke endpoint Kenari langsung.

Jangan memakai `https://kenari.id/v1/models` begitu saja sebagai `model_catalog_url`: respons publiknya memakai format `data`, bukan katalog metadata Codex. Pertahankan `model_catalog_json` lokal atau sediakan endpoint katalog Codex yang benar. Jalur ini masih memerlukan validasi inferensi dengan key Kenari yang diterima.

## Ringkasan untuk dikirim ke teknisi

“Setup ini memakai Codex CLI 0.164.0, katalog model lokal, dan gateway Node di 127.0.0.1:47831. Google Gemini lewat Chat Completions yang diterjemahkan menjadi Responses; Kenari lewat Responses asli. Periksa config user, path Node, katalog, credential, dan daemon lama secara terpisah. Sesi interaktif dibuat lokal secara default lewat peluncur/alias. Di Windows sudah terbukti Google menjawab dan menjalankan tool, serta 93 model muncul. Key Kenari yang lama ditolak 401, jadi katalog yang terlihat bukan bukti Kenari bisa dipakai. Linux/macOS perlu path dan peluncur yang sesuai OS, lalu diuji ulang.”

## Referensi

- [Katalog model Codex](https://learn.chatgpt.com/docs/model-catalogs)
- [Profil dan konfigurasi lanjutan Codex](https://learn.chatgpt.com/docs/config-file/config-advanced)
- [Referensi CLI Codex](https://learn.chatgpt.com/docs/cli/reference)
- [Kompatibilitas gateway Responses](https://learn.chatgpt.com/docs/enterprise/gateway-compatibility)
- [Kompatibilitas OpenAI Gemini](https://ai.google.dev/gemini-api/docs/openai)
- [Responses Kenari](https://kenari.id/docs/responses)
