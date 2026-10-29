# Product Requirements Document (PRD)

## TALENTA — Platform Pembinaan dan Prestasi Mahasiswa

**Versi dokumen:** 1.0  
**Status:** Draf PRD berdasarkan *Blueprint Induk Produk TALENTA*  
**Sumber utama:** `Blueprint_Induk_TALENTA(2).docx` yang diberikan pengguna  
**Tujuan dokumen:** Menjadi acuan kebutuhan produk untuk perancangan, implementasi, prototipe, pembagian tugas, dan pengujian.

> **Catatan pembacaan:** PRD ini merapikan isi blueprint menjadi kebutuhan produk yang lebih operasional. Hal yang secara eksplisit disebut sebagai usulan, opsional, dapat disesuaikan, atau perlu diputuskan tetap ditandai demikian. Dokumen ini tidak menetapkan teknologi implementasi, jadwal proyek, target angka, atau kebijakan kampus yang tidak disebutkan di blueprint.

---

## 1. Ringkasan Produk

TALENTA adalah platform pembinaan dan pendataan prestasi mahasiswa. Platform membantu mahasiswa mengenali potensi, memilih kompetisi yang relevan, menemukan partner tim, mempersiapkan diri melalui roadmap belajar mandiri, berkonsultasi dengan dosen atau konsultan jika diperlukan, dan mencatat hasil maupun prestasi.

Fokus awal pembinaan adalah kompetisi nasional Belmawa yang dipilih tim sebagai acuan program. Mahasiswa yang mengikuti kegiatan di luar jalur pembinaan tersebut tetap dapat mengajukan prestasi mandiri, seperti konferensi internasional, penghargaan *Best Delegate*, kejuaraan olahraga, nominasi, kompetisi eksternal, atau capaian lain yang sesuai kebijakan kampus.

TALENTA tidak hanya menjadi katalog kompetisi atau formulir pencatatan prestasi. Produk menghubungkan perjalanan mahasiswa dari pengenalan potensi, pemilihan target, pembentukan tim, persiapan, konsultasi opsional, hingga pencatatan capaian yang telah diverifikasi.

### 1.1 Tujuan produk

1. Membantu mahasiswa mengenali kompetisi yang relevan dengan minat, keterampilan, pengalaman, kesiapan, dan targetnya.
2. Membantu mahasiswa menemukan calon partner untuk kompetisi beregu berdasarkan kebutuhan kompetisi dan komposisi tim.
3. Memberikan panduan persiapan mandiri berupa materi, latihan, target, dan tenggat.
4. Menyediakan jalur konsultasi dosen atau konsultan tanpa menjadikan pelatihan langsung sebagai satu-satunya bentuk pembinaan.
5. Memungkinkan mahasiswa mengajukan prestasi dari program pembinaan maupun dari kegiatan di luar program tersebut.
6. Membantu pengelola memantau partisipasi, progres, seleksi internal, pengajuan prestasi, dan capaian yang telah diverifikasi.

### 1.2 Prinsip utama produk

- **Berpusat pada perjalanan mahasiswa:** fitur harus mendukung langkah dari menemukan target hingga mencatat capaian.
- **Mudah digunakan:** formulir sederhana, pilihan yang jelas, kolom singkat, dan petunjuk yang mudah dipahami.
- **Transparan:** alasan rekomendasi partner dan status pengajuan prestasi dapat dipahami pengguna.
- **Mendukung persiapan mandiri:** dosen atau konsultan berfungsi sebagai dukungan bila diperlukan dan sesuai kapasitas.
- **Adil dan aman:** data yang diminta dibatasi pada kebutuhan produk, akses data disesuaikan dengan peran, dan rekomendasi tidak diperlakukan sebagai peringkat mutlak.
- **Jujur terhadap kemampuan sistem:** fitur yang masih berupa simulasi atau rencana pengembangan tidak boleh dinyatakan telah berfungsi sepenuhnya.
- **Dapat diarahkan ke penggunaan lintas kampus:** pemisahan data dan pengaturan per institusi menjadi perhatian pengembangan lanjutan.

---

## 2. Latar Belakang dan Masalah

Masalah berikut merupakan rumusan awal di dalam blueprint dan masih perlu divalidasi dengan mahasiswa, dosen, dan pengelola.

| ID | Masalah pengguna | Implikasi kebutuhan produk |
|---|---|---|
| PRB-01 | Mahasiswa mungkin belum mengetahui kompetisi yang sesuai dengan minat, keterampilan, dan pengalamannya. | Menyediakan daftar kompetisi dan informasi yang membantu mahasiswa memilih target. |
| PRB-02 | Mahasiswa yang ingin mengikuti kompetisi beregu dapat kesulitan menemukan partner dengan target, kemampuan, dan ketersediaan yang cocok. | Menyediakan rekomendasi calon partner, undangan, dan status pembentukan tim. |
| PRB-03 | Persiapan kompetisi membutuhkan waktu serta arahan mengenai materi, latihan, target, dan jadwal. | Menyediakan roadmap persiapan dan informasi tenggat. |
| PRB-04 | Waktu dan anggaran dosen atau mentor terbatas. | Mendukung belajar mandiri dan konsultasi sesuai kebutuhan, jadwal, serta kapasitas yang disepakati. |
| PRB-05 | Prestasi dari kegiatan di luar program pembinaan kampus mungkin belum tercatat secara terpusat. | Menyediakan formulir prestasi mandiri, proses verifikasi, dan dashboard data terverifikasi. |

### 2.1 Validasi masalah

Tingkat urgensi dan kebutuhan nyata atas masalah tersebut belum dipastikan dalam blueprint. Wawancara dengan mahasiswa, dosen, dan pengelola perlu dilakukan sebelum kebutuhan dianggap tervalidasi. PRD ini tidak menganggap rumusan masalah awal tersebut sebagai hasil penelitian pengguna yang telah selesai.

---

## 3. Sasaran, Batasan, dan Ruang Lingkup

### 3.1 Sasaran produk

- Mahasiswa dapat mengisi profil dasar dan menentukan target kompetisi.
- Mahasiswa dapat melihat informasi kompetisi dan jadwal yang dikelola admin.
- Mahasiswa dapat melihat rekomendasi partner dan mengirim atau menerima undangan.
- Mahasiswa yang telah membentuk tim dapat menggunakan halaman kompetisi untuk melihat panduan persiapan.
- Mahasiswa dapat mengajukan prestasi mandiri beserta bukti.
- Pengelola dapat memverifikasi prestasi dan melihat ringkasan data sesuai hak akses.
- Sistem dapat menunjukkan perjalanan inti dari profil hingga pencatatan capaian dalam versi awal.

### 3.2 Ruang lingkup utama

1. Profil mahasiswa dan pemetaan minat, keterampilan, pengalaman, ketersediaan, serta target kompetisi.
2. Daftar dan halaman informasi kompetisi, dengan fokus awal pada kompetisi nasional Belmawa yang dipilih tim.
3. Rekomendasi partner, undangan, dan pembentukan tim.
4. Roadmap persiapan berbasis template.
5. Informasi dosen/konsultan dan tautan konsultasi yang telah dikonfirmasi, apabila bagian ini masuk dalam lingkup implementasi.
6. Formulir prestasi mandiri dan proses verifikasi.
7. Dashboard admin dasar untuk partisipasi, progres, seleksi, dan prestasi sesuai data yang tersedia.

### 3.3 Batasan dan hal di luar lingkup awal

Hal berikut tidak boleh diasumsikan telah tersedia pada versi awal:

- AI yang sepenuhnya otomatis dan selalu akurat untuk menyusun seluruh materi kompetisi.
- Pelatihan langsung atau pertemuan dosen secara rutin sebagai kewajiban.
- Pertemuan daring bulanan; hal ini hanya usulan dan memerlukan persetujuan pihak terkait.
- Analitik lanjutan dan dashboard lintas institusi sebagai kebutuhan P0.
- Integrasi dengan sistem lain; integrasi lintas sistem disebut sebagai kemungkinan pada tahap P2, tanpa rincian teknis.
- Peringkat kemampuan mahasiswa yang dianggap sebagai ukuran mutlak.
- Klaim statistik di luar institusi yang benar-benar menyumbangkan data.

---

## 4. Pengguna dan Peran

### 4.1 Mahasiswa

Kebutuhan dan tanggung jawab:

- Membuat akun dan mengisi profil seperlunya.
- Memilih target kompetisi.
- Meninjau rekomendasi calon partner.
- Mengirim atau menerima undangan partner.
- Mengikuti roadmap dan melihat target atau tenggat persiapan.
- Menghubungi dosen/konsultan jika membutuhkan arahan.
- Mengajukan prestasi mandiri dan melengkapi bukti bila diminta.
- Melihat status pengajuan serta data yang tersedia untuk dirinya.

### 4.2 Dosen/konsultan

Kebutuhan dan tanggung jawab:

- Memberikan konsultasi sesuai bidang dan kapasitas yang telah disepakati.
- Ditampilkan sebagai kontak konsultasi hanya jika penugasan dan informasi kontaknya telah dikonfirmasi.
- Tidak secara otomatis diwajibkan membuat seluruh materi atau menyelenggarakan pelatihan.

### 4.3 Admin program

Kebutuhan dan tanggung jawab:

- Mengelola daftar kompetisi, syarat, tahapan, dan jadwal.
- Mengelola roadmap atau sumber belajar yang relevan.
- Mengelola informasi konsultan yang telah disetujui.
- Mengelola aturan matching yang telah disepakati.
- Mengelola informasi seleksi internal dan hasilnya.

### 4.4 Verifikator prestasi

Kebutuhan dan tanggung jawab:

- Memeriksa data dan bukti prestasi yang diajukan.
- Menetapkan status pengajuan.
- Meminta perbaikan apabila bukti atau isian belum lengkap.
- Memberikan alasan jika pengajuan perlu diperbaiki atau ditolak.
- Memastikan data yang belum disetujui tidak dihitung sebagai prestasi terverifikasi.

### 4.5 Admin institusi

Kebutuhan dan tanggung jawab:

- Mengelola data institusi sesuai ruang lingkup kewenangannya.
- Melihat ringkasan dan laporan sesuai hak akses.
- Pada pengembangan lintas kampus, data tiap institusi harus dipisahkan dan cakupan laporan harus jelas.

### 4.6 Matriks akses konseptual

Blueprint mengidentifikasi peran-peran berikut, tetapi belum menentukan matriks izin teknis secara rinci. Matriks ini adalah ringkasan konseptual yang harus disahkan sebelum implementasi.

| Kemampuan | Mahasiswa | Dosen/konsultan | Admin program | Verifikator prestasi | Admin institusi |
|---|---|---|---|---|---|
| Mengelola profil sendiri | Ya | Belum dirinci | Sesuai kewenangan admin | Sesuai kewenangan verifikasi | Sesuai kewenangan institusi |
| Memilih target kompetisi | Ya | Tidak ditetapkan | Mengelola daftar | Tidak ditetapkan | Sesuai kebijakan institusi |
| Mengirim/menerima undangan partner | Ya | Tidak ditetapkan | Mengelola aturan matching | Tidak ditetapkan | Tidak ditetapkan |
| Mengelola kompetisi dan jadwal | Tidak | Tidak | Ya | Tidak | Sesuai lingkup institusi yang disepakati |
| Mengelola roadmap/sumber belajar | Mengakses roadmap | Dapat memberi konsultasi; hak edit belum dirinci | Ya | Tidak | Belum dirinci |
| Memverifikasi prestasi | Tidak | Tidak ditetapkan | Belum dipastikan | Ya | Belum dipastikan |
| Melihat statistik institusi | Data yang berhak dilihat; rinciannya perlu diputuskan | Belum dirinci | Sesuai kewenangan | Sesuai kebutuhan verifikasi | Ya, sesuai hak akses |

**Catatan:** Matriks ini tidak menggantikan kebijakan hak akses final. Akses lintas mahasiswa, dosen, admin program, verifikator, dan admin institusi masih harus ditetapkan.

---

## 5. Alur Pengguna Utama

Contoh Oktober–Desember pada blueprint adalah ilustrasi siklus persiapan, bukan kalender baku untuk semua kompetisi.

### 5.1 Alur mahasiswa dari pendaftaran sampai capaian

1. **Daftar dan lengkapi profil.** Mahasiswa membuat akun dan mengisi identitas yang diperlukan, program studi/angkatan, minat, keterampilan, pengalaman, ketersediaan waktu, serta target kompetisi.
2. **Pilih target kompetisi.** Mahasiswa memilih dari daftar yang disiapkan dan diperbarui admin berdasarkan informasi resmi.
3. **Pemetaan profil.** Sistem mengelompokkan peserta menurut target, minat, keterampilan, pengalaman, peran yang diperlukan, dan ketersediaan.
4. **Rekomendasi dan undangan partner.** Sistem menyarankan calon partner. Mahasiswa meninjau rekomendasi dan dapat mengirim atau menerima undangan.
5. **Pembentukan tim.** Tim terbentuk ketika undangan yang diperlukan diterima dan komposisinya memenuhi ketentuan kompetisi.
6. **Buka halaman kompetisi.** Anggota mengakses informasi kompetisi, ketentuan tim, jadwal, tahapan seleksi internal, roadmap, sumber belajar, target progres, dan kontak konsultan yang relevan jika tersedia.
7. **Persiapan mandiri dan konsultasi.** Mahasiswa mengikuti roadmap. Jika memerlukan arahan, mahasiswa dapat menghubungi dosen/konsultan lewat WhatsApp yang telah dikonfirmasi.
8. **Ikuti seleksi internal kampus.** Tim mengikuti seleksi sesuai jadwal yang diumumkan. Hasil dan mekanisme pencatatan pemenang/delegasi perlu mengikuti aturan yang diputuskan pengelola.
9. **Catat hasil dan prestasi.** Capaian dari kegiatan lain atau di luar jalur pembinaan dapat diajukan melalui formulir prestasi mandiri. Bukti diperiksa sebelum prestasi dinyatakan terverifikasi.
10. **Pantau status dan ringkasan.** Data hasil dan prestasi yang telah tercatat menjadi bagian dari profil serta dashboard institusi sesuai hak akses.

### 5.2 Alur verifikasi prestasi mandiri

1. Mahasiswa membuka formulir prestasi mandiri.
2. Mahasiswa mengisi informasi kegiatan dan mengunggah bukti.
3. Sistem memberi status **Menunggu verifikasi**.
4. Verifikator memeriksa isian dan bukti.
5. Jika perlu perbaikan, verifikator meminta mahasiswa memperbaiki atau melengkapi pengajuan.
6. Jika disetujui, prestasi masuk ke data mahasiswa dan dashboard yang berwenang.
7. Pengajuan yang belum lengkap atau ditolak tidak dihitung sebagai prestasi terverifikasi.

Status akhir dan nama status untuk proses perbaikan/penolakan perlu disepakati tim. Blueprint menetapkan status “Menunggu verifikasi” serta aturan bahwa pengajuan belum lengkap atau ditolak bukan prestasi terverifikasi.

---

## 6. Kebutuhan Fungsional

Prioritas kebutuhan di bawah mengikuti usulan MVP dalam blueprint: **P0** untuk inti demo, **P1** untuk pengembangan berikutnya, dan **P2** untuk skala lintas kampus. Penetapan ini masih berupa rekomendasi awal, bukan keputusan final tim.

### 6.1 Akun dan profil mahasiswa

**FR-001 — Pembuatan akun**  
Sistem harus menyediakan cara bagi mahasiswa untuk membuat akun.

**FR-002 — Pengisian profil mahasiswa**  
Sistem harus menyediakan formulir profil yang memuat data seperlunya, yang sekurang-kurangnya meliputi:

- identitas seperlunya;
- program studi dan angkatan;
- minat;
- keterampilan;
- pengalaman;
- ketersediaan waktu; dan
- target kompetisi.

**FR-003 — Formulir yang sederhana**  
Formulir harus menggunakan pilihan yang mudah dipahami dan kolom singkat serta tidak meminta data yang tidak diperlukan untuk tujuan produk.

**FR-004 — Profil sebagai dasar rekomendasi**  
Data profil yang telah diisi digunakan sebagai masukan untuk pemetaan target kompetisi dan rekomendasi partner. Skor atau persentase profil, bila digunakan, hanya berfungsi sebagai bahan rekomendasi dan bukan bukti mutlak tingkat kemampuan seseorang.

**Prioritas:** P0.

### 6.2 Daftar kompetisi dan jadwal

**FR-005 — Daftar kompetisi awal**  
Sistem harus menampilkan daftar kompetisi yang disiapkan tim, dengan fokus awal pada kompetisi nasional Belmawa yang dipilih tim sebagai acuan program pembinaan.

**FR-006 — Pengelolaan informasi kompetisi**  
Admin program harus dapat mengelola informasi kompetisi. Informasi yang disebutkan dalam blueprint meliputi:

- nama resmi kompetisi;
- deskripsi dan tujuan;
- syarat peserta;
- komposisi tim;
- tahapan kompetisi dan seleksi;
- jadwal resmi; dan
- jadwal seleksi internal kampus.

Informasi resmi, syarat, tahapan, dan jadwal harus merujuk sumber resmi dan diperbarui admin.

**FR-007 — Pemilihan target kompetisi**  
Mahasiswa harus dapat memilih target kompetisi dari daftar yang tersedia.

**FR-008 — Halaman khusus kompetisi**  
Setiap kompetisi yang tersedia sebaiknya memiliki halaman informasi terpusat. Isi halaman menyesuaikan kemampuan tim dan keputusan cakupan MVP.

**Prioritas:** FR-005 sampai FR-007 adalah P0; rincian halaman lengkap dapat disesuaikan dengan kemampuan tim.

### 6.3 Pemetaan dan matching partner

**FR-009 — Pengelompokan peserta**  
Sistem harus dapat mengelompokkan peserta berdasarkan informasi yang relevan, antara lain target kompetisi yang sama, minat, keterampilan, pengalaman, peran yang diperlukan, dan ketersediaan waktu.

**FR-010 — Rekomendasi calon partner**  
Sistem harus menyarankan calon partner sesuai kebutuhan kompetisi dan kriteria matching yang disepakati.

**FR-011 — Dasar rekomendasi yang transparan**  
Pengguna harus dapat memahami bahwa rekomendasi didasarkan pada kesesuaian target, minat/bidang, keterampilan yang saling melengkapi, pengalaman, peran tim, serta ketersediaan atau komitmen. Cara menampilkan penjelasan rekomendasi perlu ditentukan pada desain antarmuka.

**FR-012 — Undangan partner**  
Mahasiswa harus dapat mengirim undangan kepada calon partner yang direkomendasikan dan menerima atau menolak undangan yang masuk. Perilaku saat undangan ditolak perlu diputuskan sebelum implementasi final.

**FR-013 — Status pembentukan tim**  
Sistem hanya menyatakan tim terbentuk setelah undangan yang diperlukan disetujui dan susunan anggota memenuhi aturan kompetisi.

**FR-014 — Jadwal matching**  
Usulan awal dalam blueprint adalah matching dilakukan setiap 15 hari. Pilihan ini belum final; tim perlu memutuskan apakah matching berjalan berkala atau terus-menerus.

**FR-015 — Aturan tim**  
Jumlah anggota per tim, kebolehan mengganti target lomba, dan penanganan peserta yang tidak mendapat partner harus ditetapkan oleh tim sebelum fitur matching dianggap selesai.

**Prioritas:** undangan partner sederhana termasuk P0; penyempurnaan kualitas matching termasuk P1.

### 6.4 Roadmap persiapan

**FR-016 — Roadmap berbasis template**  
Sistem harus menyediakan roadmap persiapan dasar berdasarkan kompetisi yang dipilih. Versi awal dapat menggunakan template yang disiapkan tim.

**FR-017 — Isi roadmap**  
Roadmap dapat menampilkan:

- materi atau topik yang perlu dipelajari;
- keterampilan yang perlu dilatih;
- latihan atau tugas yang disarankan;
- target mingguan dan indikator progres;
- hal yang harus disiapkan menjelang seleksi;
- jadwal seleksi internal; dan
- tenggat penting.

**FR-018 — Urutan persiapan**  
Roadmap harus membantu mahasiswa memahami hal yang perlu dipelajari lebih dahulu, latihan yang perlu dilakukan, dan target yang perlu dicapai dalam waktu persiapan yang tersisa.

**FR-019 — Informasi sumber belajar**  
Roadmap dapat dilengkapi materi atau tautan sumber belajar relevan yang dikelola admin.

**FR-020 — AI sebagai fitur opsional**  
AI direncanakan untuk membantu menyesuaikan saran persiapan berdasarkan kompetisi, kemampuan awal, waktu yang tersisa, dan sumber belajar yang relevan. Fitur ini tidak boleh dinyatakan telah berfungsi apabila implementasinya masih berupa simulasi atau rencana.

**FR-021 — Dasar rekomendasi AI**  
Saran AI harus didasarkan pada informasi kompetisi, rubrik, sumber belajar, dan template relevan. AI tidak boleh diasumsikan otomatis mengetahui semua materi setiap kompetisi.

**Prioritas:** roadmap berbasis template P0; personalisasi roadmap berbantuan AI dan pelacakan progres P1.

### 6.5 Halaman kompetisi dan konsultasi

**FR-022 — Ringkasan kompetisi terpusat**  
Halaman kompetisi dapat menggabungkan informasi lomba, syarat tim, jadwal, tahapan seleksi internal, roadmap, sumber belajar, target progres, dan kontak konsultan yang relevan.

**FR-023 — Informasi dosen/konsultan**  
Apabila fitur ini diimplementasikan, halaman dapat menampilkan nama/foto dosen atau konsultan yang telah menyetujui penugasan, bidang keahlian, serta kontak konsultasi.

**FR-024 — Tautan WhatsApp**  
Apabila konsultasi melalui WhatsApp diaktifkan, sistem harus hanya menampilkan tautan yang sudah dikonfirmasi.

**FR-025 — Konsultasi sesuai kapasitas**  
Alur konsultasi harus mendukung bantuan ketika mahasiswa membutuhkan arahan dan tidak boleh mengasumsikan dosen selalu tersedia atau wajib menyiapkan semua materi.

**FR-026 — Pertemuan daring berkala**  
Pertemuan daring bulanan merupakan usulan yang memerlukan kesepakatan jadwal dan kapasitas dosen/pengelola. Fitur atau kewajiban ini tidak termasuk persyaratan pasti P0.

**FR-027 — Catatan progres dan pengingat**  
Catatan progres tim dan pengingat tenggat termasuk kandidat isi halaman kompetisi, tetapi dapat dihapus atau disesuaikan berdasarkan kemampuan tim. Pelacakan progres dan pengingat juga ditempatkan pada prioritas P1 dalam roadmap MVP.

**Prioritas:** informasi kompetisi/jadwal P0; bagian konsultasi lanjutan disesuaikan dengan kapasitas tim; catatan progres dan pengingat P1.

### 6.6 Seleksi internal dan status delegasi

**FR-028 — Informasi seleksi internal**  
Sistem harus memungkinkan admin program mengelola atau menampilkan jadwal seleksi internal yang telah diumumkan.

**FR-029 — Pencatatan hasil seleksi**  
Hasil seleksi internal dan delegasi yang telah dikonfirmasi dapat ditampilkan pada dashboard admin.

**FR-030 — Hubungan hasil seleksi dengan formulir prestasi**  
Blueprint menyebutkan bahwa mahasiswa/tim pemenang juara 1, 2, dan 3 menginput prestasi melalui formulir prestasi mandiri sehingga status pemenang atau delegasi ditampilkan di dashboard admin. Mekanisme ini perlu diperjelas bersama pengelola agar pencatatan hasil seleksi internal tidak tercampur dengan kategori prestasi eksternal.

**Prioritas:** bagian yang diperlukan untuk menunjukkan perjalanan inti masuk cakupan P0; rincian proses dan status harus diputuskan.

### 6.7 Prestasi mandiri

**FR-031 — Akses pengajuan prestasi**  
Formulir prestasi mandiri harus terbuka bagi seluruh mahasiswa, termasuk mahasiswa yang tidak mengikuti pembinaan kompetisi melalui TALENTA.

**FR-032 — Data pengajuan prestasi**  
Formulir sekurang-kurangnya memuat:

- nama kegiatan;
- penyelenggara;
- kategori;
- tanggal;
- tingkat kegiatan;
- jenis capaian; dan
- bukti pendukung.

**FR-033 — Status awal verifikasi**  
Setelah dikirim, pengajuan diberi status **Menunggu verifikasi**.

**FR-034 — Pemeriksaan dan permintaan perbaikan**  
Verifikator harus dapat memeriksa pengajuan dan meminta perbaikan apabila data atau bukti belum memadai.

**FR-035 — Penetapan hasil verifikasi**  
Pengajuan yang disetujui masuk ke data mahasiswa dan dashboard sesuai hak akses. Pengajuan yang belum lengkap atau ditolak tidak dihitung sebagai prestasi terverifikasi.

**FR-036 — Pembedaan jenis capaian**  
Sistem atau proses verifikasi perlu membedakan partisipasi, nominasi, penghargaan, dan juara. Contoh capaian yang disebutkan dalam blueprint mencakup konferensi internasional, penghargaan *Best Delegate*, kejuaraan olahraga, kompetisi eksternal, nominasi, dan capaian lain sesuai kebijakan kampus.

**FR-037 — Alasan perbaikan atau penolakan**  
Verifikator harus dapat memberikan alasan ketika pengajuan perlu diperbaiki atau ditolak.

**Prioritas:** formulir prestasi mandiri termasuk P0; verifikasi yang lebih lengkap termasuk P1. Detail yang dapat disederhanakan perlu ditetapkan tim.

### 6.8 Dashboard dan statistik institusi

**FR-038 — Dashboard admin dasar**  
Sistem harus menyediakan dashboard dasar untuk membantu pengelola melihat data partisipasi, progres, dan capaian yang tercatat.

**FR-039 — Indikator dashboard**  
Indikator yang dapat ditampilkan, sesuai ketersediaan dan kualitas data, meliputi:

- jumlah mahasiswa terdaftar;
- jumlah peserta menurut kompetisi atau kategori;
- jumlah tim terbentuk;
- progres persiapan secara agregat;
- jumlah pengajuan prestasi mandiri dan status verifikasinya;
- jumlah prestasi terverifikasi menurut periode, kategori, dan tingkat kegiatan; serta
- hasil seleksi internal dan delegasi yang telah dikonfirmasi.

**FR-040 — Batasan cakupan statistik**  
Dashboard harus menunjukkan cakupan data secara jelas. Jika data hanya berasal dari kampus pengguna, sistem tidak boleh mengklaim bahwa statistik tersebut mewakili seluruh mahasiswa Indonesia. Persentase yang ditampilkan harus memiliki definisi, periode, cakupan, dan sumber yang jelas.

**FR-041 — Akses dashboard**  
Dashboard dan laporan hanya dapat dilihat sesuai hak akses yang ditetapkan. Rincian kewenangan masing-masing peran perlu disepakati sebelum implementasi.

**Prioritas:** dashboard admin dasar P0; analitik lanjutan P2.

### 6.9 Dukungan multi-kampus

**FR-042 — Pemisahan data institusi**  
Untuk penggunaan lintas kampus, data harus dipisahkan per institusi. Pengaturan admin, daftar kompetisi, dan data terkait institusi perlu dapat dibedakan.

**FR-043 — Dashboard lintas institusi**  
Dashboard lintas institusi dan analitik lanjutan termasuk cakupan pengembangan P2, bukan kewajiban inti demo P0.

**FR-044 — Integrasi sistem lain**  
Integrasi dengan sistem lain disebut sebagai kemungkinan tahap P2. Sistem, protokol, dan kebutuhan integrasi belum dijelaskan dan tidak ditetapkan dalam PRD ini.

**Prioritas:** P2.

---

## 7. Kebutuhan Data Konseptual

Bagian ini merupakan pengelompokan data yang tersirat dalam blueprint agar lebih mudah diterjemahkan menjadi rancangan sistem. Ini bukan keputusan skema basis data atau rancangan teknis final.

### 7.1 Data mahasiswa

- Identitas seperlunya.
- Program studi dan angkatan.
- Minat.
- Keterampilan.
- Pengalaman.
- Ketersediaan waktu dan komitmen.
- Target kompetisi.

### 7.2 Data kompetisi

- Nama resmi.
- Deskripsi dan tujuan.
- Syarat peserta.
- Aturan atau komposisi tim.
- Tahapan kompetisi.
- Jadwal resmi.
- Jadwal seleksi internal kampus.
- Roadmap/template persiapan.
- Materi atau sumber belajar.
- Informasi konsultan relevan, jika tersedia.

### 7.3 Data matching dan tim

- Mahasiswa yang menjadi peserta.
- Target kompetisi.
- Kriteria rekomendasi partner.
- Rekomendasi calon partner.
- Undangan partner dan status respons.
- Keanggotaan tim.
- Kesesuaian komposisi tim dengan aturan kompetisi.

Rincian status undangan, aturan keluar/berganti tim, dan perubahan target belum didefinisikan dan harus diputuskan.

### 7.4 Data roadmap dan progres

- Kompetisi terkait.
- Materi/topik.
- Keterampilan yang perlu dilatih.
- Latihan/tugas.
- Target mingguan.
- Indikator progres.
- Tenggat dan jadwal seleksi.
- Sumber belajar.

### 7.5 Data prestasi

- Mahasiswa pengaju.
- Nama kegiatan.
- Penyelenggara.
- Kategori.
- Tanggal.
- Tingkat kegiatan.
- Jenis capaian.
- Bukti pendukung.
- Status verifikasi.
- Catatan perbaikan atau alasan penolakan.

### 7.6 Data konsultan

- Nama/foto, jika ditampilkan.
- Bidang keahlian.
- Status persetujuan penugasan.
- Kontak konsultasi yang telah dikonfirmasi.

### 7.7 Data dashboard

Dashboard harus diturunkan dari data yang benar-benar tercatat. Indikator agregat tidak boleh dihitung dengan definisi yang tidak jelas atau melampaui cakupan institusi dan periode data.

---

## 8. Aturan Bisnis

Aturan berikut merangkum ketentuan yang dinyatakan atau diisyaratkan langsung dalam blueprint.

1. Fokus pembinaan awal adalah kompetisi nasional Belmawa yang dipilih tim.
2. Mahasiswa tetap dapat mengajukan prestasi dari kegiatan di luar jalur pembinaan tersebut.
3. Data kompetisi, syarat, tahapan, dan jadwal harus mengacu pada informasi resmi serta diperbarui admin.
4. Rekomendasi partner adalah alat bantu, bukan penilaian mutlak terhadap kualitas mahasiswa.
5. Tim dinyatakan terbentuk setelah undangan disetujui dan komposisi tim sesuai ketentuan kompetisi.
6. Jadwal matching setiap 15 hari masih merupakan usulan, bukan aturan final.
7. Roadmap awal dapat disediakan melalui template yang dikelola tim.
8. AI tidak boleh dianggap mengetahui seluruh materi kompetisi secara otomatis; saran perlu bersumber dari informasi kompetisi, rubrik, template, dan sumber belajar relevan.
9. Fitur AI harus diberi keterangan sebagai simulasi atau rencana pengembangan apabila belum benar-benar berfungsi.
10. Dosen/konsultan membantu sesuai bidang dan kapasitas yang disepakati; konsultasi tidak berarti kewajiban menyediakan semua materi atau pelatihan.
11. Tautan WhatsApp konsultasi hanya ditampilkan setelah dikonfirmasi.
12. Pengajuan prestasi dimulai dengan status “Menunggu verifikasi”.
13. Prestasi yang belum lengkap atau ditolak tidak dihitung sebagai prestasi terverifikasi.
14. Partisipasi, nominasi, penghargaan, dan juara perlu dibedakan.
15. Dashboard hanya boleh menyajikan statistik yang didukung data, dengan cakupan, periode, definisi, dan sumber yang jelas.
16. Pada penggunaan lintas kampus, data harus dipisahkan per institusi.
17. Data yang dikumpulkan harus dibatasi pada kebutuhan; akses harus menyesuaikan hak pengguna.

---

## 9. Kebutuhan Nonfungsional dan Prinsip Kualitas

Blueprint tidak menetapkan angka performa, standar teknis, atau ukuran operasional. Kebutuhan berikut hanya menyusun prinsip kualitas yang memang dinyatakan dalam sumber.

### NFR-001 — Kemudahan penggunaan

Formulir harus singkat, bahasa sederhana, pilihan jelas, dan petunjuk mudah dipahami.

### NFR-002 — Transparansi rekomendasi

Sistem harus menjelaskan bahwa rekomendasi partner didasarkan pada kriteria relevansi, bukan penilaian mutlak kemampuan.

### NFR-003 — Transparansi verifikasi

Mahasiswa harus dapat memahami status pengajuan prestasi. Jika perbaikan atau penolakan dilakukan, alasan perlu diberikan.

### NFR-004 — Minimalisasi data

Sistem hanya meminta data yang dibutuhkan untuk keperluan profil, matching, persiapan, konsultasi, atau pencatatan prestasi.

### NFR-005 — Pembatasan hak akses

Data dan laporan harus diakses sesuai kewenangan pengguna. Detail matriks akses merupakan keputusan terbuka.

### NFR-006 — Kejelasan cakupan statistik

Statistik harus memiliki cakupan, periode, definisi, dan sumber yang jelas serta tidak mengklaim mewakili populasi di luar data yang tersedia.

### NFR-007 — Kejujuran status fitur

Implementasi aktual harus dibedakan dari prototipe, simulasi, atau rencana pengembangan, khususnya untuk fitur AI dan personalisasi roadmap.

### NFR-008 — Kesiapan lintas kampus

Arah produk harus mempertimbangkan pemisahan data, pengelolaan admin, kompetisi, dan pengaturan per institusi. Implementasi lengkap lintas kampus berada di P2 dalam usulan prioritas.

### NFR-009 — Batasan operasional konsultasi

Sistem tidak boleh mengasumsikan dosen/konsultan selalu tersedia. Informasi penugasan dan kontak harus sesuai persetujuan serta kapasitas yang telah disepakati.

> Tidak ada target waktu respons, kapasitas pengguna, persentase ketersediaan, target akurasi matching, SLA, rancangan keamanan teknis, atau teknologi tertentu yang ditetapkan oleh blueprint. Jika diperlukan, hal tersebut harus ditentukan tim dan tidak boleh dianggap sebagai ketentuan sumber.

---

## 10. Prioritas Pengembangan

Prioritas berikut menyalin arah prioritas yang disarankan blueprint dan menormalkan bahasanya untuk kebutuhan implementasi.

| Prioritas | Cakupan | Tujuan |
|---|---|---|
| **P0 — Inti demo** | Profil mahasiswa; daftar kompetisi awal; halaman kompetisi dan jadwal; undangan partner sederhana; roadmap berbasis template; formulir prestasi mandiri; dashboard admin dasar. | Menunjukkan satu perjalanan pengguna yang utuh. |
| **P1 — Pengembangan berikutnya** | Matching yang lebih baik; personalisasi roadmap berbantuan AI; pelacakan progres; pengingat; verifikasi prestasi yang lebih lengkap. | Meningkatkan kualitas rekomendasi dan pemantauan. |
| **P2 — Skala lintas kampus** | Pemisahan data multi-kampus; dashboard lintas institusi; analitik lanjutan; integrasi sistem lain. | Memerlukan tata kelola dan validasi tambahan. |

**Catatan prioritas:** rincian halaman kompetisi, konsultasi, data seleksi internal, dan beberapa indikator dashboard dapat disederhanakan atau disesuaikan dengan kemampuan tim. Prioritas tersebut bukan persetujuan final atas seluruh fitur.

---

## 11. Kriteria Penerimaan MVP

Kriteria berikut dirumuskan dari perjalanan pengguna dan lingkup P0 yang tercantum dalam blueprint. Kriteria ini dimaksudkan sebagai dasar pengujian alur, bukan tambahan target performa teknis.

### 11.1 Profil mahasiswa

- [ ] Mahasiswa dapat membuat akun dan membuka formulir profil.
- [ ] Formulir dapat menampung data profil yang diperlukan: identitas seperlunya, program studi/angkatan, minat, keterampilan, pengalaman, ketersediaan waktu, dan target kompetisi.
- [ ] Formulir tidak meminta data yang tidak diperlukan untuk alur produk.

### 11.2 Daftar kompetisi

- [ ] Mahasiswa dapat melihat daftar kompetisi awal yang dikelola tim.
- [ ] Informasi kompetisi menampilkan setidaknya informasi yang tersedia dan relevan dari daftar resmi, syarat, tahapan, atau jadwal.
- [ ] Admin program dapat memperbarui informasi kompetisi dan jadwal.
- [ ] Mahasiswa dapat memilih target kompetisi.

### 11.3 Matching dan tim

- [ ] Sistem dapat menampilkan calon partner berdasarkan kriteria matching yang telah ditetapkan.
- [ ] Mahasiswa dapat mengirim dan menerima undangan partner.
- [ ] Status tim tidak berubah menjadi terbentuk sebelum undangan disetujui dan aturan komposisi tim terpenuhi.
- [ ] Skor atau kesesuaian tidak ditampilkan sebagai bukti mutlak tingkat kemampuan individu.

### 11.4 Roadmap persiapan

- [ ] Halaman kompetisi menampilkan roadmap berbasis template apabila template tersedia.
- [ ] Roadmap menunjukkan materi/latihan/target/tenggat yang ditentukan untuk kompetisi tersebut.
- [ ] Jika AI belum benar-benar diimplementasikan, antarmuka dan demonstrasi menyatakannya sebagai simulasi atau rencana, bukan kemampuan aktif.

### 11.5 Prestasi mandiri

- [ ] Mahasiswa dapat membuka formulir prestasi mandiri tanpa harus mengikuti program pembinaan TALENTA.
- [ ] Formulir menerima nama kegiatan/penyelenggara, kategori, tanggal, tingkat kegiatan, jenis capaian, dan bukti.
- [ ] Pengajuan baru memiliki status “Menunggu verifikasi”.
- [ ] Verifikator dapat memeriksa pengajuan serta meminta perbaikan atau menyetujui/menolak sesuai alur yang disepakati.
- [ ] Pengajuan yang belum lengkap atau ditolak tidak dihitung sebagai prestasi terverifikasi.
- [ ] Jenis capaian dapat dibedakan, sekurang-kurangnya untuk partisipasi, nominasi, penghargaan, dan juara sesuai kebijakan yang disepakati.

### 11.6 Dashboard admin

- [ ] Admin dapat melihat ringkasan data yang telah masuk.
- [ ] Dashboard menampilkan hanya indikator yang didukung data tersedia.
- [ ] Hasil seleksi internal atau delegasi yang ditampilkan memiliki status konfirmasi yang jelas.
- [ ] Cakupan data ditampilkan secara jujur dan tidak mewakili populasi yang tidak tercakup.
- [ ] Akses dashboard mengikuti hak akses yang disepakati.

---

## 12. Indikator yang Dapat Dipantau

Blueprint menyebutkan contoh indikator dashboard, tetapi belum memberikan target keberhasilan numerik. Karena itu, indikator berikut adalah data yang dapat dipantau, bukan target atau janji hasil.

- Jumlah mahasiswa terdaftar.
- Jumlah peserta menurut kompetisi atau kategori.
- Jumlah tim terbentuk.
- Progres persiapan secara agregat.
- Jumlah pengajuan prestasi mandiri dan status verifikasinya.
- Jumlah prestasi terverifikasi berdasarkan periode, kategori, dan tingkat kegiatan.
- Hasil seleksi internal dan delegasi yang telah dikonfirmasi.

Definisi setiap indikator, periode pelaporan, cakupan institusi, dan sumber data perlu disepakati sebelum dashboard digunakan sebagai dasar evaluasi formal.

---

## 13. Ketergantungan dan Prasyarat

Bagian ini mencatat hal yang dibutuhkan agar alur yang ada di blueprint dapat dijalankan.

1. **Data kompetisi resmi:** nama, syarat, tahapan, dan jadwal harus tersedia serta dapat diperbarui admin.
2. **Kriteria matching:** tim harus menyepakati kriteria, jadwal proses matching, jumlah anggota, dan aturan pembentukan tim.
3. **Template roadmap dan materi:** persiapan mandiri membutuhkan roadmap dasar per kompetisi serta sumber belajar yang relevan.
4. **Informasi konsultan:** penugasan, bidang keahlian, dan kontak perlu disetujui sebelum ditampilkan.
5. **Aturan verifikasi prestasi:** kategori capaian dan proses verifikasi perlu ditetapkan agar data terverifikasi konsisten.
6. **Hak akses:** hak setiap peran perlu dirinci, terutama untuk profil, data prestasi, seleksi internal, dan dashboard.
7. **Validasi kebutuhan:** masalah awal perlu divalidasi dengan mahasiswa, dosen, dan pengelola.
8. **Kesiapan multi-kampus:** jika platform diarahkan ke penggunaan lintas kampus, tata kelola dan pemisahan data perlu dirancang sebelum cakupan P2 dilaksanakan.

---

## 14. Risiko dan Mitigasi yang Berasal dari Prinsip Blueprint

| Risiko | Dampak yang mungkin terjadi | Arah penanganan berdasarkan blueprint |
|---|---|---|
| Informasi kompetisi atau jadwal tidak diperbarui. | Mahasiswa menyiapkan diri menggunakan informasi yang salah atau sudah tidak berlaku. | Gunakan rujukan resmi dan perbarui informasi melalui admin. |
| Skor matching dianggap sebagai peringkat kemampuan. | Rekomendasi dipahami secara keliru dan dapat dianggap tidak adil. | Jelaskan dasar rekomendasi dan tegaskan bahwa skor bukan ukuran mutlak. |
| Roadmap atau saran AI tidak sesuai dengan kompetisi. | Mahasiswa mengikuti persiapan yang tidak relevan. | Dasarkan rekomendasi pada informasi kompetisi, rubrik, template, dan sumber belajar yang relevan. |
| Fitur AI yang belum aktif diklaim telah berfungsi. | Pengguna menerima gambaran produk yang tidak sesuai kenyataan. | Tandai fitur sebagai simulasi atau rencana jika belum benar-benar berfungsi. |
| Dosen/konsultan dianggap selalu tersedia. | Beban konsultasi tidak sesuai kapasitas pihak terkait. | Batasi peran konsultasi sesuai kapasitas yang disepakati; pertemuan rutin memerlukan persetujuan. |
| Pengajuan prestasi tanpa bukti yang memadai dihitung sebagai capaian. | Statistik prestasi menjadi tidak dapat diandalkan. | Lakukan verifikasi dan jangan menghitung pengajuan belum lengkap atau ditolak sebagai terverifikasi. |
| Statistik digeneralisasi di luar data yang tersedia. | Dashboard menyampaikan klaim yang tidak didukung sumber. | Cantumkan cakupan, periode, definisi, dan sumber data. |
| Data lintas kampus bercampur. | Pelaporan institusi menjadi tidak tepat. | Pisahkan data per institusi saat penggunaan multi-kampus diterapkan. |

---

## 15. Keputusan Terbuka yang Harus Disepakati

Keputusan di bawah belum ditetapkan secara final oleh blueprint. Bagian ini harus diperbarui ketika tim telah menyepakati jawabannya.

### 15.1 Matching dan pembentukan tim

- [ ] Apakah matching berlangsung setiap 15 hari atau terus-menerus?
- [ ] Berapa jumlah anggota yang diperbolehkan dalam setiap tim untuk tiap kompetisi?
- [ ] Apakah mahasiswa dapat mengganti target kompetisi setelah memilihnya?
- [ ] Apa yang terjadi jika mahasiswa tidak mendapatkan partner?
- [ ] Apa yang terjadi jika undangan ditolak atau tidak dijawab?
- [ ] Bagaimana perubahan komposisi tim ditangani agar tetap memenuhi aturan kompetisi?

### 15.2 Halaman kompetisi dan konsultasi

- [ ] Bagian mana dari halaman kompetisi yang wajib ada pada MVP dan mana yang dapat dihapus/disederhanakan?
- [ ] Apakah informasi dosen/konsultan dan tautan WhatsApp masuk P0?
- [ ] Apakah pertemuan daring bulanan akan dilaksanakan? Jika ya, siapa yang menyetujui jadwal dan kapasitasnya?
- [ ] Apakah catatan progres dan pengingat dibangun pada P0 atau ditunda ke P1?

### 15.3 Roadmap dan AI

- [ ] Kompetisi mana yang akan memiliki template roadmap pada versi awal?
- [ ] Siapa yang menyiapkan, meninjau, dan memperbarui template serta sumber belajar?
- [ ] Apakah AI akan benar-benar diterapkan pada prototipe, atau hanya disimulasikan sebagai rencana pengembangan?
- [ ] Bagaimana kemampuan awal mahasiswa dan waktu tersisa akan digunakan untuk menyesuaikan roadmap?

### 15.4 Prestasi mandiri dan hasil seleksi internal

- [ ] Bagaimana kategori prestasi dan jenis capaian akan ditetapkan?
- [ ] Status apa saja yang digunakan setelah “Menunggu verifikasi”, termasuk perbaikan, persetujuan, dan penolakan?
- [ ] Siapa yang berwenang memverifikasi dan berapa tingkat aksesnya?
- [ ] Bagaimana hasil juara 1, 2, 3 dan status delegasi dari seleksi internal dicatat supaya konsisten dengan formulir prestasi mandiri?
- [ ] Bukti apa yang dapat diterima untuk setiap kategori capaian?

### 15.5 Dashboard, akses, dan multi-kampus

- [ ] Indikator mana yang wajib pada dashboard admin dasar?
- [ ] Siapa yang dapat melihat data individual, data tim, status verifikasi, dan statistik institusi?
- [ ] Apakah versi pertama hanya digunakan oleh satu institusi atau sejak awal perlu mendukung beberapa institusi?
- [ ] Jika penggunaan lintas kampus diterapkan, bagaimana cakupan setiap admin dan laporan ditentukan?
- [ ] Apakah integrasi dengan sistem lain diperlukan pada tahap P2, dan dengan sistem apa?

### 15.6 Validasi produk dan ukuran keberhasilan

- [ ] Kapan wawancara/validasi dengan mahasiswa, dosen, dan pengelola dilakukan?
- [ ] Bagaimana tim menentukan bahwa perjalanan inti pengguna sudah cukup untuk diuji?
- [ ] Definisi, periode, cakupan, dan sumber setiap indikator dashboard apa yang akan dipakai?
- [ ] Apakah tim akan menetapkan target numerik untuk indikator? Blueprint belum menetapkan target tersebut.

---

## 16. Identitas dan Penamaan Produk

Nama produk yang digunakan dalam blueprint adalah **TALENTA**, dengan deskriptor **“Platform Pembinaan dan Prestasi Mahasiswa”**. Nama ini dipilih agar tidak terikat pada satu kampus tertentu serta lebih mudah digunakan dalam konteks lintas kampus.

Sebelum peluncuran publik, ketersediaan merek dagang, nama domain, dan akun digital yang relevan tetap perlu diperiksa. Pemeriksaan tersebut merupakan langkah operasional sebelum peluncuran, bukan klaim bahwa nama tersebut sudah tersedia secara legal atau digital.

---

## 17. Glosarium

| Istilah | Pengertian dalam konteks TALENTA |
|---|---|
| **Matching partner** | Bantuan sistem untuk menemukan rekan tim yang relevan dengan kebutuhan kompetisi. |
| **Roadmap persiapan** | Urutan langkah belajar dan latihan sebelum kompetisi. |
| **Prestasi mandiri** | Prestasi yang diajukan sendiri oleh mahasiswa, termasuk capaian dari kegiatan di luar program pembinaan. |
| **Verifikasi** | Pemeriksaan bukti sebelum data dinyatakan terkonfirmasi. |
| **MVP** | Versi awal dengan fungsi inti yang cukup untuk diuji pengguna. |
| **Dashboard** | Halaman ringkasan data dan status bagi mahasiswa atau pengelola. |
| **P0** | Prioritas inti demo dalam usulan MVP blueprint. |
| **P1** | Pengembangan berikutnya dalam usulan MVP blueprint. |
| **P2** | Pengembangan skala lintas kampus dalam usulan MVP blueprint. |

---

## 18. Penutup

TALENTA diarahkan menjadi ekosistem pembinaan dan pendataan prestasi mahasiswa yang menghubungkan pemetaan potensi, pemilihan kompetisi, pencarian partner, persiapan mandiri, konsultasi sesuai kebutuhan, serta pencatatan capaian yang terverifikasi. Fokus awal pembinaan adalah kompetisi nasional Belmawa yang dipilih tim, sedangkan formulir prestasi mandiri menjaga agar capaian dari kegiatan lain juga dapat dicatat.

Versi awal sebaiknya memprioritaskan satu perjalanan pengguna yang utuh: profil mahasiswa, daftar kompetisi, undangan partner sederhana, roadmap berbasis template, formulir prestasi mandiri, dan dashboard admin dasar. Matching yang lebih baik, personalisasi AI, pelacakan progres, pengingat, serta verifikasi yang lebih lengkap berada pada prioritas berikutnya. Pemisahan data multi-kampus, analitik lanjutan, dashboard lintas institusi, dan integrasi sistem lain berada pada prioritas skala lanjutan.

Sebelum implementasi, tim perlu memvalidasi masalah pengguna dan menyepakati keputusan terbuka—terutama aturan matching, status tim, isi MVP, peran AI, konsultasi, verifikasi prestasi, hak akses, serta cakupan dashboard. Seluruh implementasi harus tetap jujur terhadap kemampuan yang benar-benar tersedia dan terhadap cakupan data yang dapat dipertanggungjawabkan.

---

## Catatan sumber

PRD ini disusun hanya dari dokumen **Blueprint Induk TALENTA — Platform Pembinaan dan Prestasi Mahasiswa** yang diberikan pada percakapan ini. Tidak ada teknologi, integrasi, target numerik, atau kebijakan eksternal yang ditambahkan sebagai keputusan final.
