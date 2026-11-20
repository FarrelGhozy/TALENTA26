# 16 — Kontrak API awal

Endpoint produksi berada di /api/v1 pada origin yang sama. JSON UTF-8; timestamp ISO 8601 UTC; ID opaque; pagination dan filter konsisten. Kontrak dikunci bersama implementasi Stage 2–4.

## Konvensi
Sukses: HTTP sesuai aksi dan body {data, meta?}. Gagal: {error:{code,message,fieldErrors?,requestId}} tanpa stack/SQL/rahasia. 401 belum login, 403 tak berwenang, 404 tak ditemukan/tak boleh diketahui, 409 konflik/versi, 422 validasi, 429 rate limit. Mutasi berbasis cookie memakai CSRF. Operasi rentan klik ganda memakai idempotency key dan/atau version.

## Auth dan pengguna
| Metode/rute | Aktor | Fungsi |
|---|---|---|
| POST /auth/register | publik | mahasiswa manual; NIM/email unik |
| POST /auth/login | publik | sesi email/password |
| POST /auth/logout | login | cabut sesi |
| GET /auth/me | login | user, role, status, periode |
| POST /auth/forgot-password | publik | reset tanpa enumerasi |
| POST /auth/reset-password | token | ganti password |
| GET/PATCH /me/profile | mahasiswa | profil sendiri |
| GET/POST /me/targets | mahasiswa | target/riwayat |
| GET /me/dashboard | mahasiswa | ringkasan diri |

## Kompetisi dan pembinaan
Prefix /admin pada API adalah ruang kelola konten yang dapat diakses validator dan super admin; prefix /system khusus super admin. Nama prefix tidak memberikan izin otomatis.

GET /competitions, GET /competitions/:slug, GET /periods/current hanya menampilkan konten terbit ke publik. Validator: POST/PATCH /admin/competitions, POST /admin/competitions/:id/publish, POST /admin/competitions/:id/archive, serta subresource /schedules, /team-rules, /roadmaps, /consultants, /selections. Perubahan terbit memakai version.

Mahasiswa: GET /matching/candidates, GET /me/invites, POST /teams, POST /teams/:id/invites, POST /invites/:id/respond, POST /teams/:id/leave; GET /roadmaps/:editionId dan PUT /me/roadmap-progress/:taskId. Backend menyimpulkan owner dari sesi.

## Prestasi dan bukti
GET/POST /me/achievements; GET /me/achievements/:id; PATCH /me/achievements/:id/draft; POST /me/achievements/:id/submit; POST /me/achievements/:id/revisions. POST /me/achievements/:id/evidence menerima multipart dan meneruskan stream ke RustFS setelah otorisasi; GET /evidence/:id/download mengalirkan bukti melalui API setelah otorisasi. RustFS tidak perlu endpoint publik.

Validator: GET /admin/achievements dengan filter; GET /admin/achievements/:id; POST /admin/achievements/:id/decisions dengan action approve/request_changes/reject dan alasan; POST /admin/achievements/:id/corrections dengan alasan/version. Keputusan memiliki idempotency key dan audit.

## Ranking dan sistem
GET /ranking?periodId=... memberi nama tampilan, poin, posisi, metadata periode/aturan; GET /ranking/lifetime terpisah. Super admin: /system/users, /system/staff, /system/roles, /system/periods, /system/point-rules, /system/audit, /system/health-summary. Internal: /health/live dan /health/ready tanpa data sensitif.

## Batas data
Achievement response tidak berisi URL bukti permanen. Objek mutable mempunyai version/updatedAt. Setiap list punya limit dan cursor/page yang jelas. Otorisasi objek dijalankan sebelum serialisasi. OpenAPI Elysia dicocokkan dengan contoh tiap role dan uji kontrak.
