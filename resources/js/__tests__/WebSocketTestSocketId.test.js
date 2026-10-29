import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Sebelumnya tes ini memeriksa literal hardcoded di halaman debug
// `Pages/Draw/WebSocketTest.jsx`. Halaman itu dihapus 29 Oktober 2026 karena
// rute debug-nya terbuka tanpa autentikasi, sehingga tes ini jadi menunjuk
// berkas yang tidak ada.
//
// Nilai tesnya tetap dipertahankan, tetapi sasarannya dipindah ke kode
// produksi: `socket_id` untuk otorisasi channel HARUS berasal dari callback
// Pusher (format "angka.angka"), bukan literal tebakan. Kalau literal
// dikembalikan, otorisasi channel akan gagal dan realtime mati diam-diam.

const testDir = dirname(fileURLToPath(import.meta.url));
const websocketPath = join(testDir, '..', 'websocket.js');
const source = readFileSync(websocketPath, 'utf8');

test('socket_id diambil dari callback Pusher, bukan literal', () => {
  assert.match(
    source,
    /socket_id:\s*socketId\b/,
    'socket_id harus memakai nilai dari callback authorize(socketId, callback)',
  );
});

test('tidak ada socket_id literal yang di-hardcode', () => {
  assert.ok(
    !/socket_id:\s*['"]\d+\.\d+['"]/.test(source),
    'socket_id tidak boleh berupa literal "angka.angka" yang di-hardcode',
  );
  assert.ok(
    !source.includes("'test.socket.id'"),
    'placeholder socket id lama tidak boleh kembali',
  );
});

test('Echo dinonaktifkan bila pengguna belum login', () => {
  // Ini yang membuat halaman publik tidak mencoba berlangganan channel privat.
  assert.match(
    source,
    /if\s*\(!isAuthenticated\)[\s\S]{0,200}window\.Echo\s*=\s*null/,
    'Echo harus di-null-kan saat tidak terautentikasi',
  );
});
