# 18 — Strategi uji dan gate produksi

Uji perilaku dan risiko dengan fixture sintetis. Data mahasiswa nyata hanya dalam pilot yang disetujui.

## Lapisan
- Unit domain (`backend/tests/unit`, 33 test): aturan kesiapan tim 3 lapis + bipartite role matching, validasi file magic-byte, CSV formula neutralization, resolusi IP anti-spoofing, bounded LRU rate limiter, Argon2id concurrency guard, `LocalStorageService` path safety & `BoundedReadCache`, serta backup/restore & retensi storage archive.
- Integrasi (`backend/tests/integration`, 11 suite): Elysia + MySQL test + storage, transaksi pengajuan gabung/kode undangan/keputusan (`FOR UPDATE`), RBAC `/system/*` khusus `super_admin`, SMTP fail-closed `K-13`, streaming + `ETag`/`304`, pagination, kuota/revisi, serta maintenance TTL pruning & Orphan GC.
- Kontrak: request/response API docs/16, validasi, pagination, error, `Retry-After` / `X-RateLimit-*`.
- End-to-end (`tests/e2e`, 4 suite Playwright): J1–J5 pada mobile (`390×844`), tablet (`768×1024`), dan desktop (`1440×900`) serta tiap role.
- Keamanan & DDoS: IDOR, eskalasi peran, brute force, spoofing `X-Forwarded-For`, CSRF/cookie, upload berbahaya, XSS, kebocoran respons/log, serta validasi `nginx -t` & multi-stage Dockerfile non-root.
- Operasi: backup/restore (`backup-db.sh --test-restore`, `backup-storage.ts`), `maintenance.ts --dry-run`, migration gagal, Compose pull/up, rollback, Tunnel HTTPS.
- Aksesibilitas: keyboard, fokus, label, error form, kontras, zoom dan reduced motion.

## Kasus risiko tinggi
1. NIM/email sama didaftarkan serentak: satu berhasil, satu konflik aman.
2. Mahasiswa mengakses profil/bukti/pengajuan gabung/kode undangan tim orang lain atau validator mengakses `/admin/sistem`: ditolak (`403`/`404`) tanpa metadata bocor.
3. Dua pengajuan gabung/kode undangan diterima saat satu slot tersisa: kapasitas tidak terlewati (`users → teams FOR UPDATE`).
4. Dua validator memutuskan versi sama (atau pemilik membatalkan serentak saat diputuskan): hanya satu berlaku, lainnya mendapat konflik.
5. File palsu/terlalu besar/di luar jumlah atau melebihi kuota pengguna: ditolak sebelum alokasi buffer besar; objek yatim dibersihkan.
6. Pengajuan non-lomba/belum disetujui: poin nol; koreksi membalik poin seluruh anggota kelompok sekali.
7. Periode berganti: ranking baru mulai dari nol, histori lama utuh.
8. Bobot poin berubah: periode lama tetap memakai versi lama.
9. Migrasi gagal: API tidak ready; pemulihan teruji.
10. MySQL/RustFS/SMTP mati: error jelas (`503`), tidak ada sukses palsu.
11. Serangan flood/DDoS atau penumpukan berkas/sesi: ditahan rate limiter Nginx & bounded LRU backend, Argon2id dibatasi maks 4 konkurensi, dan maintenance worker membersihkan baris TTL & objek yatim tanpa menyentuh bukti aktif.

## Gate
Stage 1: demo build/lint/typecheck dan prototipe tiga ukuran. Stage 2: auth/RBAC/migrasi. Stage 3: J1/J3 dan concurrency tim. Stage 4: J2/J4, bukti privat, ledger. Stage 5: aksesibilitas, keamanan, restore. Stage 6: deploy staging dari image dan runbook. Stage 7: pilot nyata dan penerimaan pemilik produk.

## Bukti
Catat commit/digest, CI, hasil tes, versi schema, dataset, screenshot utama, hasil uji pengguna, temuan, hasil restore, serta pengesahan keputusan docs/14. Temuan keamanan/data kritis dan dasar publikasi ranking yang belum disahkan memblokir go-live.

Bukti gate Stage 1 dicatat di docs/19-validasi-stage-1.md. Bukti tersebut hanya mengesahkan fondasi frontend/prototipe; tidak menggantikan pengujian backend, keamanan data nyata, storage, atau operasi produksi pada stage berikutnya.
