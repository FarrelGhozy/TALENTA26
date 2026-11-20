# 18 — Strategi uji dan gate produksi

Uji perilaku dan risiko dengan fixture sintetis. Data mahasiswa nyata hanya dalam pilot yang disetujui.

## Lapisan
- Unit domain: aturan tim, status, versi poin, tie break, periode dan zona waktu.
- Integrasi: Elysia + MySQL test + RustFS test, transaksi undangan/keputusan, migration, upload/bukti.
- Kontrak: request/response API docs/16, validasi, pagination, error.
- End-to-end: J1–J5 pada mobile/desktop dan tiap role.
- Keamanan: IDOR, escalation, brute force, CSRF/cookie, upload berbahaya, XSS, kebocoran respons/log.
- Operasi: backup/restore, migration gagal, Compose pull/up, rollback, Tunnel HTTPS.
- Aksesibilitas: keyboard, fokus, label, error form, kontras, zoom dan reduced motion.

## Kasus risiko tinggi
1. NIM/email sama didaftarkan serentak: satu berhasil, satu konflik aman.
2. Mahasiswa mengakses profil/bukti/undangan orang lain: ditolak tanpa metadata bocor.
3. Dua undangan diterima saat satu slot tersisa: kapasitas tidak terlewati.
4. Dua validator memutuskan versi sama: hanya satu berlaku, lainnya mendapat konflik.
5. File palsu/terlalu besar/di luar jumlah: ditolak; objek yatim dibersihkan.
6. Pengajuan non-lomba/belum disetujui: poin nol; koreksi membalik poin sekali.
7. Periode berganti: ranking baru mulai dari nol, histori lama utuh.
8. Bobot poin berubah: periode lama tetap memakai versi lama.
9. Migrasi gagal: API tidak ready; pemulihan teruji.
10. MySQL/RustFS mati: error jelas, tidak ada sukses palsu.

## Gate
Stage 1: demo build/lint/typecheck dan prototipe tiga ukuran. Stage 2: auth/RBAC/migrasi. Stage 3: J1/J3 dan concurrency tim. Stage 4: J2/J4, bukti privat, ledger. Stage 5: aksesibilitas, keamanan, restore. Stage 6: deploy staging dari image dan runbook. Stage 7: pilot nyata dan penerimaan pemilik produk.

## Bukti
Catat commit/digest, CI, hasil tes, versi schema, dataset, screenshot utama, hasil uji pengguna, temuan, hasil restore, serta pengesahan keputusan docs/14. Temuan keamanan/data kritis dan dasar publikasi ranking yang belum disahkan memblokir go-live.

Bukti gate Stage 1 dicatat di docs/19-validasi-stage-1.md. Bukti tersebut hanya mengesahkan fondasi frontend/prototipe; tidak menggantikan pengujian backend, keamanan data nyata, storage, atau operasi produksi pada stage berikutnya.
