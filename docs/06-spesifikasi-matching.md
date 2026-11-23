# 06 — Rekrutmen tim, kode undangan, dan kesiapan seleksi

Diselaraskan dengan Keputusan `K-19` (revisi) dan `K-23` (23 November 2026).

## Tujuan
Menyediakan alur pembentukan tim yang sederhana, realistis, dan bebas jalan buntu untuk lomba beregu melalui **rekrutmen berbasis pengajuan (*open recruitment*)** dan **kode undangan acak**, sementara lomba individu langsung menuju ruang persiapan tanpa melewati fitur tim. Algoritma *automatic matchmaking* dan AI ditunda dari alur wajib rilis pertama.

## Tiga jalur lomba beregu
Setelah melengkapi profil dan memilih target lomba beregu (`format === 'beregu'`), mahasiswa masuk ke Hub *Cara Mengikuti Lomba* (`/app/tim`) dengan 3 pilihan:
1. **Buat Tim Baru**: mahasiswa menjadi ketua tim (`leaderId`), mengisi nama tim, deskripsi proyek, kebutuhan posisi/skill (`neededRoles`), batas anggota maksimal (tidak melebihi `competition.maxTeamMembers`), dan tipe rekrutmen (`terbuka` atau `privat`).
2. **Cari Tim Terbuka**: mahasiswa menjelajahi direktori tim berstatus `terbuka` & `isRecruiting = true` untuk target kompetisi yang sama (`/app/tim/cari`), memfilter berdasarkan pencarian/peran, lalu mengirim pengajuan bergabung (`TeamJoinRequest` status `menunggu`). Jika daftar kosong, sistem menampilkannya sebagai keadaan normal disertai tombol membuat tim sendiri.
3. **Sudah Punya Tim**: mahasiswa yang sudah sepakat tim di luar aplikasi memasukkan kode undangan acak (`TLN-XXXX-XXXX`) yang dibagikan ketua untuk bergabung langsung (*direct join*) dalam satu transaksi tervalidasi.

## Otorisasi dan pemisahan tugas
- **Ketua Tim (`team.leaderId === auth.user.id`)** adalah satu-satunya aktor yang berhak: menyetujui/menolak `TeamJoinRequest`, mengubah pengaturan tim (`terbuka`/`privat`, `isRecruiting`, deskripsi, kebutuhan peran, target maksimal), memutar ulang `inviteCode`, mengeluarkan anggota sebelum `terkunci_seleksi`, dan mengajukan *Daftar Seleksi Internal*.
- **Pengelola Lomba (`/validator/konten?tab=kompetisi`)** mengatur aturan tiap lomba (`format`, `minTeamMembers`, `maxTeamMembers`, `registrationStatus`, `internalSelectionDeadline`, `requireRoles`, `requireCrossStudyProgram`, `singleTeamPerCompetition`, tautan pedoman).
- **Verifikator Prestasi (`/validator/prestasi`)** fokus memeriksa bukti prestasi, tidak ikut campur persetujuan anggota tim.

## Tiga lapis kesiapan tim (`evaluateTeamReadiness`)
Sistem membedakan secara tegas tiga keadaan tim:
1. **Tim Dibuat (`dibuat`)**: memiliki minimal 1 anggota aktif. Mahasiswa **tetap dapat membuka roadmap dan materi persiapan**, tetapi belum dinyatakan siap mengikuti seleksi.
2. **Anggota Cukup (`anggota_cukup`)**: jumlah anggota aktif memenuhi `[minTeamMembers, effectiveMax]` (`Team.status = 'terbentuk'`). Sistem tetap memeriksa syarat tambahan kompetisi (tidak otomatis siap seleksi).
3. **Siap Seleksi (`siap_seleksi`)**: `hasEnoughMembers` terpenuhi, `registrationStatus === 'buka'` (dan belum lewat `internalSelectionDeadline` bila diisi), serta seluruh syarat wajib yang diaktifkan admin pada lomba tersebut terpenuhi (`requireRoles`, `requireCrossStudyProgram`). Pada level ini ketua dapat klik *Daftar Seleksi Internal* (`InternalSelection` status `menunggu`).

## Transaksi, konkurensi, dan siklus hidup
- **Buat tim (`POST /teams`)**: cek format `beregu`, `registrationStatus === 'buka'`, belum ada tim aktif pada kompetisi sama, `targetMaxMembers` dalam `[minTeamMembers, maxTeamMembers]`. Generate `inviteCode` acak kriptografis (`crypto.randomBytes`). Otomatis batalkan `TeamJoinRequest` berstatus `menunggu` milik pembuat pada kompetisi sama.
- **Ajukan gabung (`POST /teams/:id/join-requests`)**: cek tim `terbuka` & `isRecruiting`, target aktif pelamar sama dengan kompetisi tim, belum ada tim aktif pada kompetisi sama, belum ada pengajuan `menunggu` ke tim sama, dan kapasitas belum penuh.
- **Keputusan ketua (`POST /join-requests/:id/decide`)**: cek `leaderId === auth.user.id` (`403` untuk non-ketua). Saat `disetujui`: kunci baris tim (`SELECT ... FOR UPDATE`), cek kapasitas maksimal & konflik keanggotaan ganda, aktifkan/buat `TeamMember`, perbarui status tim (`terbentuk` jika mencapai `minTeamMembers`), batalkan `TeamJoinRequest` menunggu lain milik pelamar pada kompetisi sama, dan bila tim mencapai batas maksimal otomatis set `isRecruiting = false` serta tandai sisa `TeamJoinRequest` menunggu di tim tersebut `kedaluwarsa`.
- **Gabung via kode (`POST /teams/join-by-code`)**: transaksi `FOR UPDATE`; cek kode valid pada institusi sama, `registrationStatus === 'buka'`, bukan `terkunci_seleksi`/`arsip`, kapasitas tersedia, bebas tim aktif ganda pada kompetisi sama; bila mahasiswa belum punya target aktif, otomatis setel target aktif ke kompetisi tim (bila punya target aktif *berbeda*, tolak `409` agar tidak menimpa target/tim lama diam-diam).
- **Keluar tim (`POST /teams/:id/leave`)**: diblokir jika `terkunci_seleksi`. Jika ketua keluar dan masih ada anggota aktif lain, `leaderId` otomatis dipindahkan ke anggota aktif paling awal (`joinedAt ASC`) dan dicatat di audit. Jika tidak ada anggota tersisa, tim diarsipkan (`arsip`) dan seluruh pengajuan `menunggu` menjadi `kedaluwarsa`.
- **Ganti target & pergantian periode**: arsipkan/keluar tim lama secara atomik (dengan aturan transfer ketua yang sama) dan batalkan/kedaluwarsakan `TeamJoinRequest` yang masih `menunggu`.

## Privasi
Direktori tim dan panel pelamar hanya mengirimkan profil aman (`fullName`, `studyProgram`, `faculty`, `enrollmentYear`, `rolesCapable`, `skills`, `bio`, `experience`). NIM, email, nomor WhatsApp/telepon, `passwordHash`, dan bukti prestasi tidak pernah dikirim API atau ditampilkan. Daftar pelamar tertunda serta `inviteCode` pada `/teams/my` hanya dikirim kepada ketua tim (`leaderId`).

## Uji wajib
Kapasitas tepat batas & penerimaan serentak (`FOR UPDATE`), non-ketua mencoba approve/rotate/remove (`403`), satu mahasiswa dua tim aktif (`409`), kode undangan salah & setelah rotasi, pengajuan ulang pasca ditolak, transfer ketua saat ketua keluar, 3 lapis evaluasi kesiapan tim (termasuk toggle `requireRoles` dan `requireCrossStudyProgram`), daftar kosong, serta lomba individu melewati fitur tim.
