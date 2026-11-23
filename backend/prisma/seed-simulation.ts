import crypto from 'node:crypto';
import { prisma, closeDatabase } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
import { loadConfig } from '../src/lib/config';
import { getStorageService } from '../src/lib/storage';
import { uploadStudentAvatar } from '../src/modules/profile/service';
import type { AchievementLevel, AchievementResult, ParticipationType } from '@prisma/client';

const VALID_PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000108 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n182\n%%EOF'
);

interface StudentSeed {
  key: string;
  email: string;
  nim: string;
  fullName: string;
  studyProgram: string;
  faculty: string;
  enrollmentYear: number;
  bio: string;
  experience: string;
  skills: Array<{ nama: string; level: number }>;
  interests: string[];
  rolesCapable: string[];
  portraitUrl: string;
}

const SIMULATION_STUDENTS: StudentSeed[] = [
  {
    key: 'nabila',
    email: 'nabila.rahmawati@unida.gontor.ac.id',
    nim: '432023101',
    fullName: 'Nabila Rahmawati',
    studyProgram: 'Farmasi',
    faculty: 'Ilmu Kesehatan',
    enrollmentYear: 2023,
    bio: 'Fokus pada riset formulasi sediaan herbal dan kompetisi karya tulis ilmiah tingkat nasional serta internasional.',
    experience: 'Asisten Laboratorium Farmasetika dan tim riset PKM-RE UNIDA Gontor.',
    skills: [
      { nama: 'Riset Laboratorium', level: 3 },
      { nama: 'Karya Tulis Ilmiah', level: 3 },
      { nama: 'Presentasi Ilmiah', level: 2 },
    ],
    interests: ['Riset Kesehatan', 'Kepenulisan Ilmiah', 'Inovasi Herbal'],
    rolesCapable: ['Ketua Tim', 'Penulis Proposal', 'Peneliti'],
    portraitUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    key: 'fauzan',
    email: 'mhs@unida.gontor.ac.id',
    nim: '432026001',
    fullName: 'Ahmad Fauzan',
    studyProgram: 'Teknik Informatika',
    faculty: 'Sains dan Teknologi',
    enrollmentYear: 2024,
    bio: 'Pengembang perangkat lunak web dan sistem informasi berfokus pada solusi digital kampus dan kompetisi GEMASTIK.',
    experience: 'Juara kompetisi pengembangan aplikasi web dan aktif di komunitas pemrograman kampus.',
    skills: [
      { nama: 'TypeScript & React', level: 3 },
      { nama: 'Backend API', level: 3 },
      { nama: 'Arsitektur Sistem', level: 2 },
    ],
    interests: ['Teknologi Informasi', 'Rekayasa Perangkat Lunak', 'Inovasi Digital'],
    rolesCapable: ['Hacker (Programmer)', 'Lead Innovator', 'Ketua Tim'],
    portraitUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    key: 'raihan',
    email: 'raihan.pratama@unida.gontor.ac.id',
    nim: '432023102',
    fullName: 'Muhammad Raihan Pratama',
    studyProgram: 'Hubungan Internasional',
    faculty: 'Humaniora',
    enrollmentYear: 2023,
    bio: 'Delegasi debat bahasa Inggris, Model United Nations, dan esai kebijakan publik tingkat internasional.',
    experience: 'Ketua klub debat dan pembina simulasi diplomasi mahasiswa.',
    skills: [
      { nama: 'Public Speaking', level: 3 },
      { nama: 'Debat Bahasa Inggris', level: 3 },
      { nama: 'Analisis Kebijakan', level: 3 },
    ],
    interests: ['Diplomasi', 'Debat Ilmiah', 'Kebijakan Publik'],
    rolesCapable: ['Hustler (Pitch/Product)', 'Penulis Proposal', 'Presenter'],
    portraitUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
  },
  {
    key: 'zaidan',
    email: 'zaidan@unida.gontor.ac.id',
    nim: '442026777',
    fullName: 'Zaidan Ali',
    studyProgram: 'Teknik Informatika',
    faculty: 'Sains dan Teknologi',
    enrollmentYear: 2024,
    bio: 'Desainer UI/UX dan riset pengalaman pengguna untuk produk digital edukasi serta kompetisi desain inovasi.',
    experience: 'Koordinator divisi desain produk pada komunitas teknologi mahasiswa.',
    skills: [
      { nama: 'UI/UX Design', level: 3 },
      { nama: 'Figma Prototyping', level: 3 },
      { nama: 'Riset Pengguna', level: 2 },
    ],
    interests: ['Desain Produk', 'Teknologi Pendidikan', 'Inovasi Digital'],
    rolesCapable: ['Hipster (UI/UX Designer)', 'Media Specialist'],
    portraitUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
  },
  {
    key: 'aisyah',
    email: 'aisyah.salsabila@unida.gontor.ac.id',
    nim: '432024103',
    fullName: 'Aisyah Putri Salsabila',
    studyProgram: 'Ilmu Gizi',
    faculty: 'Ilmu Kesehatan',
    enrollmentYear: 2024,
    bio: 'Tertarik pada inovasi pangan fungsional, edukasi gizi masyarakat, dan kompetisi PKM pengabdian.',
    experience: 'Tim edukasi gizi pesantren dan penulis artikel pangan sehat.',
    skills: [
      { nama: 'Analisis Gizi', level: 3 },
      { nama: 'Penulis Proposal', level: 3 },
      { nama: 'Desain Edukasi', level: 2 },
    ],
    interests: ['Pangan Fungsional', 'Pengabdian Masyarakat', 'PKM'],
    rolesCapable: ['Ketua Tim', 'Penulis Proposal', 'Analis Data'],
    portraitUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    key: 'farhan',
    email: 'farhan.hakim@unida.gontor.ac.id',
    nim: '432023104',
    fullName: 'Farhan Maulana Hakim',
    studyProgram: 'Ekonomi Islam',
    faculty: 'Ekonomi dan Manajemen',
    enrollmentYear: 2023,
    bio: 'Menekuni strategi bisnis berkelanjutan, pemodelan keuangan syariah, dan kompetisi business plan.',
    experience: 'Finalis kompetisi business case dan pengelola inkubator kewirausahaan mahasiswa.',
    skills: [
      { nama: 'Business Model Canvas', level: 3 },
      { nama: 'Analisis Keuangan', level: 3 },
      { nama: 'Pitching', level: 3 },
    ],
    interests: ['Kewirausahaan', 'Ekonomi Syariah', 'Riset Pasar'],
    rolesCapable: ['Hustler (Pitch/Product)', 'Analis Data'],
    portraitUrl: 'https://randomuser.me/api/portraits/men/52.jpg',
  },
  {
    key: 'khadijah',
    email: 'siti.khadijah@unida.gontor.ac.id',
    nim: '432024105',
    fullName: 'Siti Khadijah Az-Zahra',
    studyProgram: 'Pendidikan Bahasa Arab',
    faculty: 'Tarbiyah',
    enrollmentYear: 2024,
    bio: 'Aktif dalam lomba debat bahasa Arab, media pembelajaran interaktif, dan penulisan karya ilmiah kependidikan.',
    experience: 'Tim pengembangan media ajar bahasa Arab berbasis gim edukasi.',
    skills: [
      { nama: 'Bahasa Arab Akademik', level: 3 },
      { nama: 'Desain Pembelajaran', level: 3 },
      { nama: 'Kepenulisan Esai', level: 2 },
    ],
    interests: ['Pendidikan', 'Bahasa Arab', 'Media Digital'],
    rolesCapable: ['Penulis Proposal', 'Media Specialist'],
    portraitUrl: 'https://randomuser.me/api/portraits/women/26.jpg',
  },
  {
    key: 'rizky',
    email: 'rizky.hidayatullah@unida.gontor.ac.id',
    nim: '432023106',
    fullName: 'Rizky Hidayatullah',
    studyProgram: 'Agroteknologi',
    faculty: 'Sains dan Teknologi',
    enrollmentYear: 2023,
    bio: 'Mengembangkan inovasi pertanian presisi ramah lingkungan dan teknologi tepat guna untuk desa mitra.',
    experience: 'Peneliti muda pertanian organik dan kontributor proyek PKM Karsa Cipta.',
    skills: [
      { nama: 'Agronomi Terapan', level: 3 },
      { nama: 'IoT Pertanian', level: 2 },
      { nama: 'Analis Data', level: 2 },
    ],
    interests: ['Pertanian Berkelanjutan', 'Teknologi Tepat Guna', 'Riset Lapangan'],
    rolesCapable: ['Analis Data', 'Technical Developer'],
    portraitUrl: 'https://randomuser.me/api/portraits/men/64.jpg',
  },
  {
    key: 'hafizah',
    email: 'hafizah.izzah@unida.gontor.ac.id',
    nim: '432024107',
    fullName: 'Hafizah Nurul Izzah',
    studyProgram: 'Ilmu Komunikasi',
    faculty: 'Humaniora',
    enrollmentYear: 2024,
    bio: 'Fokus pada produksi konten kampanye sosial, jurnalisme data, dan desain komunikasi visual untuk LIDM.',
    experience: 'Tim produksi dokumenter pendidikan dan kontributor media kampus.',
    skills: [
      { nama: 'Storytelling & Video', level: 3 },
      { nama: 'Komunikasi Publik', level: 3 },
      { nama: 'Riset Media', level: 2 },
    ],
    interests: ['Media Pendidikan', 'Komunikasi Visual', 'Kampanye Sosial'],
    rolesCapable: ['Media Specialist', 'Hipster (UI/UX Designer)'],
    portraitUrl: 'https://randomuser.me/api/portraits/women/17.jpg',
  },
  {
    key: 'dimas',
    email: 'dimas.wibowo@unida.gontor.ac.id',
    nim: '432024108',
    fullName: 'Dimas Arya Wibowo',
    studyProgram: 'Manajemen',
    faculty: 'Ekonomi dan Manajemen',
    enrollmentYear: 2024,
    bio: 'Minat pada manajemen proyek tim lintas disiplin, strategi pemasaran digital, dan kompetisi studi kasus.',
    experience: 'Project manager kegiatan kemahasiswaan dan tim kompetisi bisnis.',
    skills: [
      { nama: 'Manajemen Proyek', level: 3 },
      { nama: 'Strategi Pemasaran', level: 2 },
      { nama: 'Presentasi Bisnis', level: 2 },
    ],
    interests: ['Manajemen Strategis', 'Kewirausahaan', 'Kepemimpinan Tim'],
    rolesCapable: ['Hustler (Pitch/Product)', 'Analis Data'],
    portraitUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
  },
  {
    key: 'fathimah',
    email: 'fathimah.azzahra@unida.gontor.ac.id',
    nim: '432023109',
    fullName: 'Fathimah Az-Zahra',
    studyProgram: 'Hukum Ekonomi Syariah',
    faculty: 'Syariah',
    enrollmentYear: 2023,
    bio: 'Aktif dalam lomba esai hukum internasional, debat konstitusi, dan riset regulasi keuangan syariah digital.',
    experience: 'Delegasi kompetisi peradilan semu dan karya tulis hukum syariah.',
    skills: [
      { nama: 'Analisis Hukum', level: 3 },
      { nama: 'Penulisan Ilmiah', level: 3 },
      { nama: 'Argumentasi Debat', level: 2 },
    ],
    interests: ['Hukum Syariah', 'Regulasi Digital', 'Karya Tulis'],
    rolesCapable: ['Penulis Proposal', 'Peneliti'],
    portraitUrl: 'https://randomuser.me/api/portraits/women/63.jpg',
  },
  {
    key: 'luthfi',
    email: 'luthfi.ramadhan@unida.gontor.ac.id',
    nim: '432025110',
    fullName: 'Luthfi Ramadhan',
    studyProgram: 'Teknik Informatika',
    faculty: 'Sains dan Teknologi',
    enrollmentYear: 2025,
    bio: 'Mahasiswa angkatan baru yang mendalami pemrograman kompetitif, algoritma, dan sains data untuk ONMIPA & GEMASTIK.',
    experience: 'Anggota klub competitive programming dan peserta pembinaan olimpiade sains.',
    skills: [
      { nama: 'Algoritma & Struktur Data', level: 3 },
      { nama: 'Python', level: 2 },
      { nama: 'Matematika Diskrit', level: 2 },
    ],
    interests: ['Pemrograman Kompetitif', 'Olimpiade Sains', 'Data Science'],
    rolesCapable: ['Hacker (Programmer)', 'Technical Developer'],
    portraitUrl: 'https://randomuser.me/api/portraits/men/11.jpg',
  },
];

interface AchievementSeed {
  code: string;
  period: 'active' | 'archive';
  submitterKey: string;
  participantKeys: string[];
  participationType: ParticipationType;
  competitionSlug?: string;
  categoryCode?: string;
  subCategoryCode?: string;
  name: string;
  organizer: string;
  level: AchievementLevel;
  result: AchievementResult;
  points: number;
  eventDate: string;
  description: string;
  status: 'disetujui' | 'menunggu' | 'perlu_perbaikan';
  reviewNote?: string;
}

const SIMULATION_ACHIEVEMENTS: AchievementSeed[] = [
  // ======================================================
  // PERIODE BERJALAN (Tahun Akademik 2025/2026 Ganjil)
  // ======================================================
  {
    code: 'sim-active-01',
    period: 'active',
    submitterKey: 'nabila',
    participantKeys: ['nabila'],
    participationType: 'individu',
    categoryCode: 'sains',
    subCategoryCode: 'kimia',
    name: 'International Pharmacy Innovation & Herbal Formulation Competition 2026',
    organizer: 'ASEAN Pharmaceutical Student Council',
    level: 'internasional',
    result: 'juara_1',
    points: 30,
    eventDate: '2026-09-18',
    description: 'Inovasi formulasi mikrokapsul ekstrak herbal lokal berbasis bahan alam terstandar.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-02',
    period: 'active',
    submitterKey: 'nabila',
    participantKeys: ['nabila'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'Lomba Karya Tulis Ilmiah Farmasi Nasional (LKTI-FN) 2026',
    organizer: 'Ikatan Senat Mahasiswa Farmasi Seluruh Indonesia',
    level: 'nasional',
    result: 'juara_2',
    points: 14,
    eventDate: '2026-10-04',
    description: 'Kajian stabilitas sediaan topikal herbal untuk pelayanan kesehatan pesantren.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-03',
    period: 'active',
    submitterKey: 'nabila',
    participantKeys: ['nabila'],
    participationType: 'individu',
    categoryCode: 'sains',
    subCategoryCode: 'biologi',
    name: 'Olimpiade Sains & Kesehatan Terpadu UNIDA Gontor 2026',
    organizer: 'Fakultas Ilmu Kesehatan UNIDA Gontor',
    level: 'lokal',
    result: 'juara_1',
    points: 8,
    eventDate: '2026-08-22',
    description: 'Juara 1 cabang analisis farmakognosi dan uji mutu bahan alam.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-04',
    period: 'active',
    submitterKey: 'fauzan',
    participantKeys: ['fauzan', 'zaidan', 'farhan'],
    participationType: 'kelompok',
    competitionSlug: 'gemastik-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'inovasi-digital',
    name: 'ASEAN Youth Digital Innovation Challenge 2026',
    organizer: 'Southeast Asia Digital Talent Consortium',
    level: 'internasional',
    result: 'juara_1',
    points: 30,
    eventDate: '2026-10-12',
    description: 'Platform kolaboratif manajemen literasi dan pembinaan talenta kampus lintas disiplin.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-05',
    period: 'active',
    submitterKey: 'fauzan',
    participantKeys: ['fauzan'],
    participationType: 'individu',
    competitionSlug: 'gemastik-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'inovasi-digital',
    name: 'Kompetisi Rekayasa Perangkat Lunak Mahasiswa Nasional 2026',
    organizer: 'BPTI Kemendikbudristek',
    level: 'nasional',
    result: 'juara_1',
    points: 18,
    eventDate: '2026-09-26',
    description: 'Pengembangan aplikasi monitoring pembelajaran adaptif berbasis web progresif.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-06',
    period: 'active',
    submitterKey: 'raihan',
    participantKeys: ['raihan'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'Asia-Pacific Model United Nations Conference 2026',
    organizer: 'Asia-Pacific Diplomacy Forum',
    level: 'internasional',
    result: 'juara_2',
    points: 22,
    eventDate: '2026-09-30',
    description: 'Outstanding Delegate Council UNESCO pada isu ketahanan pendidikan global.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-07',
    period: 'active',
    submitterKey: 'raihan',
    participantKeys: ['raihan'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'National University Debating Championship (NUDC) Wilayah 2026',
    organizer: 'BPTI Kemendikbudristek',
    level: 'nasional',
    result: 'juara_1',
    points: 18,
    eventDate: '2026-08-29',
    description: 'Best Speaker & Juara 1 babak nasional debat parlementer bahasa Inggris.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-08',
    period: 'active',
    submitterKey: 'zaidan',
    participantKeys: ['zaidan'],
    participationType: 'individu',
    competitionSlug: 'lidm-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'desain-uiux',
    name: 'Gontor Design & Digital Product Fest 2026',
    organizer: 'Fakultas Sains dan Teknologi UNIDA Gontor',
    level: 'lokal',
    result: 'juara_1',
    points: 8,
    eventDate: '2026-08-19',
    description: 'Desain antarmuka inklusif untuk sistem perpustakaan digital pesantren.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-09',
    period: 'active',
    submitterKey: 'aisyah',
    participantKeys: ['aisyah', 'rizky', 'dimas'],
    participationType: 'kelompok',
    competitionSlug: 'pkm-2026',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-pm',
    name: 'Program Kreativitas Mahasiswa — Pengabdian Masyarakat (PKM-PM) 2026',
    organizer: 'Direktorat Pembelajaran dan Kemahasiswaan (Belmawa)',
    level: 'nasional',
    result: 'juara_1',
    points: 18,
    eventDate: '2026-10-16',
    description: 'Model kebun pangan gizi mandiri dan pendampingan dapur sehat pesantren.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-10',
    period: 'active',
    submitterKey: 'aisyah',
    participantKeys: ['aisyah'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'Kompetisi Inovasi Pangan & Gizi Nasional 2026',
    organizer: 'Persatuan Ahli Gizi Mahasiswa Indonesia',
    level: 'nasional',
    result: 'juara_2',
    points: 14,
    eventDate: '2026-09-10',
    description: 'Pengembangan camilan tinggi protein berbahan lokal untuk remaja santri.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-11',
    period: 'active',
    submitterKey: 'khadijah',
    participantKeys: ['khadijah'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'Musabaqah Debat Ilmiah Bahasa Arab Nasional 2026',
    organizer: 'Forum Perguruan Tinggi Islam Nasional',
    level: 'nasional',
    result: 'juara_1',
    points: 18,
    eventDate: '2026-10-08',
    description: 'Juara 1 debat ilmiah bahasa Arab tema transformasi pendidikan pesantren.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-12',
    period: 'active',
    submitterKey: 'khadijah',
    participantKeys: ['khadijah'],
    participationType: 'individu',
    competitionSlug: 'lidm-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'inovasi-digital',
    name: 'Lomba Media Pembelajaran Digital Bahasa Arab Nasional 2026',
    organizer: 'Asosiasi Pengajar Bahasa Arab Indonesia',
    level: 'nasional',
    result: 'juara_3',
    points: 10,
    eventDate: '2026-09-14',
    description: 'Aplikasi kartu interaktif pembelajaran nahwu dan sharaf untuk pemula.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-13',
    period: 'active',
    submitterKey: 'rizky',
    participantKeys: ['rizky'],
    participationType: 'individu',
    categoryCode: 'sains',
    subCategoryCode: 'biologi',
    name: 'Lomba Inovasi Pertanian Berkelanjutan Kampus UNIDA 2026',
    organizer: 'Prodi Agroteknologi UNIDA Gontor',
    level: 'lokal',
    result: 'juara_2',
    points: 6,
    eventDate: '2026-08-25',
    description: 'Rancang bangun sensor kelembapan tanah hemat daya untuk lahan hortikultura.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-14',
    period: 'active',
    submitterKey: 'hafizah',
    participantKeys: ['hafizah'],
    participationType: 'individu',
    competitionSlug: 'lidm-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'desain-uiux',
    name: 'Lomba Inovasi Digital Mahasiswa — Divisi Video Pendidikan 2026',
    organizer: 'BPTI Kemendikbudristek',
    level: 'nasional',
    result: 'juara_2',
    points: 14,
    eventDate: '2026-10-19',
    description: 'Film pendek edukasi literasi digital dan etika bermedia sosial bagi pelajar.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-15',
    period: 'active',
    submitterKey: 'hafizah',
    participantKeys: ['hafizah'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'Festival Jurnalisme Data & Komunikasi Publik Nasional 2026',
    organizer: 'Asosiasi Ilmu Komunikasi Perguruan Tinggi',
    level: 'nasional',
    result: 'juara_3',
    points: 10,
    eventDate: '2026-09-05',
    description: 'Laporan visual interaktif dampak literasi keuangan bagi UMKM pedesaan.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-16',
    period: 'active',
    submitterKey: 'fathimah',
    participantKeys: ['fathimah'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'International Islamic Economics & Sharia Law Essay Competition 2026',
    organizer: 'International Islamic Jurisprudence Network',
    level: 'internasional',
    result: 'juara_3',
    points: 16,
    eventDate: '2026-10-02',
    description: 'Kajian tata kelola akad pembiayaan mikro berbasis teknologi finansial syariah.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-17',
    period: 'active',
    submitterKey: 'luthfi',
    participantKeys: ['luthfi'],
    participationType: 'individu',
    competitionSlug: 'onmipa-2026',
    categoryCode: 'sains',
    subCategoryCode: 'matematika',
    name: 'Olimpiade Nasional MIPA (ONMIPA-PT) Bidang Matematika 2026',
    organizer: 'BPTI Kemendikbudristek',
    level: 'nasional',
    result: 'finalis',
    points: 5,
    eventDate: '2026-10-22',
    description: 'Finalis nasional bidang kombinatorika dan aljabar linear.',
    status: 'disetujui',
  },
  {
    code: 'sim-active-18',
    period: 'active',
    submitterKey: 'luthfi',
    participantKeys: ['luthfi'],
    participationType: 'individu',
    competitionSlug: 'gemastik-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'inovasi-digital',
    name: 'UNIDA Competitive Programming Internal Cup 2026',
    organizer: 'Himpunan Mahasiswa Teknik Informatika UNIDA Gontor',
    level: 'lokal',
    result: 'juara_1',
    points: 8,
    eventDate: '2026-08-14',
    description: 'Juara 1 penyelesaian soal algoritma dan optimasi struktur data.',
    status: 'disetujui',
  },

  // ======================================================
  // PERIODE ARSIP (Tahun Akademik 2024/2025 Genap)
  // Agar tab "Sepanjang Waktu (Lifetime)" berbeda nyata dari "Periode Berjalan"
  // ======================================================
  {
    code: 'sim-archive-01',
    period: 'archive',
    submitterKey: 'raihan',
    participantKeys: ['raihan'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'International Youth Diplomacy Summit 2025',
    organizer: 'Global Student Policy Forum',
    level: 'internasional',
    result: 'juara_1',
    points: 30,
    eventDate: '2025-05-14',
    description: 'Best Position Paper & Juara 1 simulasi resolusi kerja sama pendidikan ASEAN.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-02',
    period: 'archive',
    submitterKey: 'nabila',
    participantKeys: ['nabila'],
    participationType: 'individu',
    categoryCode: 'sains',
    subCategoryCode: 'kimia',
    name: 'Kompetisi Nasional Riset Obat Bahan Alam 2025',
    organizer: 'Konsorsium Farmasi Perguruan Tinggi Indonesia',
    level: 'nasional',
    result: 'juara_1',
    points: 18,
    eventDate: '2025-04-20',
    description: 'Juara 1 kategori poster ilmiah dan formulasi ekstrak antioksidan.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-03',
    period: 'archive',
    submitterKey: 'farhan',
    participantKeys: ['farhan'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'National Sharia Business Plan Competition 2025',
    organizer: 'Forum Silaturahim Studi Ekonomi Islam',
    level: 'nasional',
    result: 'juara_1',
    points: 18,
    eventDate: '2025-06-08',
    description: 'Model bisnis koperasi digital berbasis rantai pasok pangan pesantren.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-04',
    period: 'archive',
    submitterKey: 'fauzan',
    participantKeys: ['fauzan'],
    participationType: 'individu',
    categoryCode: 'teknologi',
    subCategoryCode: 'inovasi-digital',
    name: 'Hackathon Pendidikan Digital Nasional 2025',
    organizer: 'Komunitas EdTech Indonesia',
    level: 'nasional',
    result: 'juara_2',
    points: 14,
    eventDate: '2025-05-28',
    description: 'Prototipe asisten bank soal latihan mandiri berbasis analitik progres.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-05',
    period: 'archive',
    submitterKey: 'hafizah',
    participantKeys: ['hafizah'],
    participationType: 'individu',
    categoryCode: 'teknologi',
    subCategoryCode: 'desain-uiux',
    name: 'Kompetisi Infografis & Kampanye Edukasi Nasional 2025',
    organizer: 'Forum Komunikasi Mahasiswa Indonesia',
    level: 'nasional',
    result: 'juara_2',
    points: 14,
    eventDate: '2025-04-11',
    description: 'Seri infografis literasi kesehatan mental remaja.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-06',
    period: 'archive',
    submitterKey: 'zaidan',
    participantKeys: ['zaidan'],
    participationType: 'individu',
    categoryCode: 'teknologi',
    subCategoryCode: 'desain-uiux',
    name: 'UI/UX National Student Challenge 2025',
    organizer: 'Himpunan Desain Interaksi Nusantara',
    level: 'nasional',
    result: 'juara_3',
    points: 10,
    eventDate: '2025-06-15',
    description: 'Desain ulang layanan aksesibilitas jadwal dan transportasi mahasiswa.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-07',
    period: 'archive',
    submitterKey: 'aisyah',
    participantKeys: ['aisyah'],
    participationType: 'individu',
    categoryCode: 'sains',
    subCategoryCode: 'biologi',
    name: 'Lomba Esai Gizi Seimbang UNIDA Gontor 2025',
    organizer: 'Fakultas Ilmu Kesehatan UNIDA Gontor',
    level: 'lokal',
    result: 'juara_1',
    points: 8,
    eventDate: '2025-03-19',
    description: 'Juara 1 penyusunan menu seimbang hemat biaya bagi asrama mahasiswa.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-08',
    period: 'archive',
    submitterKey: 'fathimah',
    participantKeys: ['fathimah'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'International Sharia Moot Court & Legal Paper 2025',
    organizer: 'Southeast Asia Sharia Legal Forum',
    level: 'internasional',
    result: 'finalis',
    points: 8,
    eventDate: '2025-05-03',
    description: 'Finalis naskah hukum perlindungan konsumen transaksi digital syariah.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-09',
    period: 'archive',
    submitterKey: 'khadijah',
    participantKeys: ['khadijah'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'Festival Karya Ilmiah Tarbiyah UNIDA 2025',
    organizer: 'Fakultas Tarbiyah UNIDA Gontor',
    level: 'lokal',
    result: 'juara_2',
    points: 6,
    eventDate: '2025-04-02',
    description: 'Pengembangan modul percakapan bahasa Arab kontekstual.',
    status: 'disetujui',
  },
  {
    code: 'sim-archive-10',
    period: 'archive',
    submitterKey: 'dimas',
    participantKeys: ['dimas'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-rsh',
    name: 'Kompetisi Studi Kasus Manajemen Nasional 2025',
    organizer: 'Ikatan Mahasiswa Manajemen Indonesia',
    level: 'nasional',
    result: 'finalis',
    points: 5,
    eventDate: '2025-06-21',
    description: 'Finalis analisis rantai pasok usaha mikro berbasis komunitas.',
    status: 'disetujui',
  },

  // ======================================================
  // PENGAJUAN AKTIF (MENUNGGU & PERLU PERBAIKAN) — untuk antrean admin & halaman prestasi
  // ======================================================
  {
    code: 'sim-pending-01',
    period: 'active',
    submitterKey: 'fauzan',
    participantKeys: ['fauzan', 'zaidan'],
    participationType: 'kelompok',
    competitionSlug: 'gemastik-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'desain-uiux',
    name: 'Kompetisi Inovasi Sistem Informasi Kampus 2026',
    organizer: 'Asosiasi Perguruan Tinggi Informatika dan Komputer',
    level: 'nasional',
    result: 'juara_2',
    points: 14,
    eventDate: '2026-11-05',
    description: 'Pengajuan menunggu pemeriksaan sertifikat final dan surat tugas pembinaan.',
    status: 'menunggu',
  },
  {
    code: 'sim-pending-02',
    period: 'active',
    submitterKey: 'aisyah',
    participantKeys: ['aisyah'],
    participationType: 'individu',
    categoryCode: 'kepenulisan',
    subCategoryCode: 'pkm-kc',
    name: 'Lomba Poster Edukasi Gizi Mahasiswa Nasional 2026',
    organizer: 'Himpunan Mahasiswa Gizi Indonesia',
    level: 'nasional',
    result: 'juara_3',
    points: 10,
    eventDate: '2026-11-10',
    description: 'Infografis kampanye pencegahan anemia pada remaja putri.',
    status: 'menunggu',
  },
  {
    code: 'sim-revision-01',
    period: 'active',
    submitterKey: 'zaidan',
    participantKeys: ['zaidan'],
    participationType: 'individu',
    competitionSlug: 'lidm-2026',
    categoryCode: 'teknologi',
    subCategoryCode: 'desain-uiux',
    name: 'Festival Desain Antarmuka Nusantara 2026',
    organizer: 'Komunitas Desain Digital Nusantara',
    level: 'nasional',
    result: 'finalis',
    points: 5,
    eventDate: '2026-10-28',
    description: 'Finalis desain aplikasi navigasi layanan akademik mahasiswa.',
    status: 'perlu_perbaikan',
    reviewNote: 'Mohon unggah salinan sertifikat yang menampilkan nama peserta dan tanda tangan panitia secara jelas.',
  },
];

async function downloadPortraitJpeg(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TALENTA-Dev-Seeder/1.0',
        Accept: 'image/jpeg,image/png,image/webp,*/*',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} saat mengunduh ${url}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (!isJpeg) {
      throw new Error(`Respons dari ${url} bukan JPEG valid`);
    }
    return buf;
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanupGarbageAndOldSimulation(institutionId: string, simulationEmails: string[]) {
  const storage = getStorageService();

  // 1. Cari akun sampah E2E/live/demo lama di DB dev
  const garbageUsers = await prisma.user.findMany({
    where: {
      institutionId,
      role: 'mahasiswa',
      OR: [
        { email: { startsWith: 'mhs.e2e.' } },
        { email: { startsWith: 'live_' } },
        { email: { startsWith: 'raka.demo.' } },
        { email: { startsWith: 'walk1_' } },
        { email: { startsWith: 'walk2_' } },
      ],
    },
    select: {
      id: true,
      email: true,
      studentProfile: { select: { avatarObjectKey: true } },
    },
  });

  if (garbageUsers.length > 0) {
    const garbageIds = garbageUsers.map((u) => u.id);

    const garbageEvidences = await prisma.achievementEvidence.findMany({
      where: {
        OR: [{ uploaderId: { in: garbageIds } }, { achievement: { userId: { in: garbageIds } } }],
      },
      select: { objectKey: true },
    });

    // Hapus tim yang dibuat/dipimpin akun sampah (karena FK Restrict)
    await prisma.team.deleteMany({
      where: {
        OR: [{ creatorId: { in: garbageIds } }, { leaderId: { in: garbageIds } }],
      },
    });

    await prisma.user.deleteMany({
      where: { id: { in: garbageIds } },
    });

    for (const u of garbageUsers) {
      if (u.studentProfile?.avatarObjectKey) {
        await storage.deleteFile(u.studentProfile.avatarObjectKey).catch(() => undefined);
      }
    }
    for (const ev of garbageEvidences) {
      await storage.deleteFile(ev.objectKey).catch(() => undefined);
    }

    console.log(`[SIMULASI] Membersihkan ${garbageUsers.length} akun sisa E2E/uji coba lama.`);
  }

  // 2. Bersihkan prestasi & tim simulasi lama milik akun simulasi agar idempotent
  const simUsers = await prisma.user.findMany({
    where: { institutionId, email: { in: simulationEmails } },
    select: { id: true },
  });
  const simUserIds = simUsers.map((u) => u.id);
  if (simUserIds.length > 0) {
    const oldSimEvidences = await prisma.achievementEvidence.findMany({
      where: { achievement: { userId: { in: simUserIds } } },
      select: { objectKey: true },
    });
    await prisma.achievement.deleteMany({
      where: { userId: { in: simUserIds } },
    });
    await prisma.team.deleteMany({
      where: {
        OR: [{ creatorId: { in: simUserIds } }, { leaderId: { in: simUserIds } }],
      },
    });
    for (const ev of oldSimEvidences) {
      await storage.deleteFile(ev.objectKey).catch(() => undefined);
    }
  }
}

async function main() {
  const currentConfig = loadConfig();
  if (currentConfig.nodeEnv === 'production') {
    throw new Error('[SIMULASI_ERROR] Skrip simulasi dilarang dijalankan pada NODE_ENV=production.');
  }

  console.log('[SIMULASI] Memulai pembersihan & pengisian data simulasi TALENTA lokal...');

  const institution = await prisma.institution.upsert({
    where: { code: 'unida-gontor' },
    update: { name: 'Universitas Darussalam Gontor' },
    create: { code: 'unida-gontor', name: 'Universitas Darussalam Gontor' },
  });

  // Pastikan akun admin & validator punya fullName yang jelas
  const adminPasswordHash = await hashPassword(
    currentConfig.superAdminBootstrapPassword || 'AdminGontor2026!'
  );
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@unida.gontor.ac.id' },
    update: { fullName: 'Administrator Utama TALENTA', status: 'active' },
    create: {
      institutionId: institution.id,
      email: 'admin@unida.gontor.ac.id',
      fullName: 'Administrator Utama TALENTA',
      passwordHash: adminPasswordHash,
      role: 'super_admin',
      status: 'active',
    },
  });

  const validatorPasswordHash = await hashPassword('Validator2026!');
  const validatorUser = await prisma.user.upsert({
    where: { email: 'validator@unida.gontor.ac.id' },
    update: { fullName: 'Dr. Ahmad Validator', status: 'active' },
    create: {
      institutionId: institution.id,
      email: 'validator@unida.gontor.ac.id',
      fullName: 'Dr. Ahmad Validator',
      passwordHash: validatorPasswordHash,
      role: 'validator',
      status: 'active',
    },
  });
  console.log(`[SIMULASI] Akun staf siap: ${superAdmin.fullName} & ${validatorUser.fullName}`);

  // Bersihkan sampah E2E & reset prestasi/tim simulasi lama
  await cleanupGarbageAndOldSimulation(
    institution.id,
    SIMULATION_STUDENTS.map((s) => s.email)
  );

  // Pastikan 2 periode akademik: 1 aktif + 1 arsip
  let activePeriod = await prisma.academicPeriod.findFirst({
    where: { institutionId: institution.id, isActive: true },
  });
  if (!activePeriod) {
    activePeriod = await prisma.academicPeriod.create({
      data: {
        institutionId: institution.id,
        name: 'Tahun Akademik 2025/2026 Ganjil',
        year: 2026,
        semester: 'ganjil',
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-02-28'),
        isActive: true,
      },
    });
  } else {
    activePeriod = await prisma.academicPeriod.update({
      where: { id: activePeriod.id },
      data: {
        startDate: activePeriod.startDate || new Date('2025-09-01'),
        endDate: activePeriod.endDate || new Date('2026-02-28'),
      },
    });
  }

  let archivePeriod = await prisma.academicPeriod.findFirst({
    where: {
      institutionId: institution.id,
      name: 'Tahun Akademik 2024/2025 Genap',
    },
  });
  if (!archivePeriod) {
    archivePeriod = await prisma.academicPeriod.create({
      data: {
        institutionId: institution.id,
        name: 'Tahun Akademik 2024/2025 Genap',
        year: 2025,
        semester: 'genap',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-08-31'),
        archivedAt: new Date('2025-08-31'),
        isActive: false,
      },
    });
  }
  console.log(`[SIMULASI] Periode aktif: ${activePeriod.name} | Periode arsip: ${archivePeriod.name}`);

  // Upsert 12 mahasiswa fiktif & unggah foto potret random dari internet ke RustFS privat
  const studentPassHash = await hashPassword('Mahasiswa2026!');
  const userByKey = new Map<string, { id: string; fullName: string; email: string }>();

  for (const s of SIMULATION_STUDENTS) {
    const existing = await prisma.user.findUnique({
      where: { email: s.email },
      include: { studentProfile: true },
    });

    let userId: string;
    if (!existing) {
      const created = await prisma.user.create({
        data: {
          institutionId: institution.id,
          email: s.email,
          fullName: s.fullName,
          passwordHash: studentPassHash,
          role: 'mahasiswa',
          status: 'active',
          studentProfile: {
            create: {
              nim: s.nim,
              fullName: s.fullName,
              studyProgram: s.studyProgram,
              faculty: s.faculty,
              enrollmentYear: s.enrollmentYear,
              bio: s.bio,
              experience: s.experience,
              skills: s.skills,
              interests: s.interests,
              rolesCapable: s.rolesCapable,
              availability: { hari: ['Senin', 'Rabu', 'Jumat'], jam: 6 },
            },
          },
        },
      });
      userId = created.id;
    } else {
      userId = existing.id;
      await prisma.user.update({
        where: { id: userId },
        data: { fullName: s.fullName, status: 'active' },
      });
      if (existing.studentProfile) {
        await prisma.studentProfile.update({
          where: { userId },
          data: {
            fullName: s.fullName,
            studyProgram: s.studyProgram,
            faculty: s.faculty,
            enrollmentYear: s.enrollmentYear,
            bio: s.bio,
            experience: s.experience,
            skills: s.skills,
            interests: s.interests,
            rolesCapable: s.rolesCapable,
            availability: { hari: ['Senin', 'Rabu', 'Jumat'], jam: 6 },
          },
        });
      } else {
        await prisma.studentProfile.create({
          data: {
            userId,
            nim: s.nim,
            fullName: s.fullName,
            studyProgram: s.studyProgram,
            faculty: s.faculty,
            enrollmentYear: s.enrollmentYear,
            bio: s.bio,
            experience: s.experience,
            skills: s.skills,
            interests: s.interests,
            rolesCapable: s.rolesCapable,
            availability: { hari: ['Senin', 'Rabu', 'Jumat'], jam: 6 },
          },
        });
      }
    }

    // Unduh potret random dari internet dan unggah melalui pipeline uploadStudentAvatar ke RustFS privat
    const jpegBuffer = await downloadPortraitJpeg(s.portraitUrl);
    await uploadStudentAvatar(userId, institution.id, {
      name: `${s.key}.jpg`,
      type: 'image/jpeg',
      buffer: jpegBuffer,
    });

    userByKey.set(s.key, { id: userId, fullName: s.fullName, email: s.email });
    console.log(`[SIMULASI] ✓ ${s.fullName} (${s.studyProgram}) — foto profil diunggah ke RustFS (${jpegBuffer.byteLength} B)`);
  }

  // Ambil referensi kompetisi & kategori/sub-kategori
  const competitions = await prisma.competition.findMany({
    where: { institutionId: institution.id },
  });
  const compBySlug = new Map(competitions.map((c) => [c.slug, c]));

  const categories = await prisma.competitionCategory.findMany({
    where: { institutionId: institution.id },
    include: { subCategories: true },
  });
  const catByCode = new Map(categories.map((c) => [c.code, c]));

  // Buat target aktif & tim simulasi untuk inspeksi PP di /app/tim & /app/tim?tab=cari
  const gemastik = compBySlug.get('gemastik-2026');
  const pkm = compBySlug.get('pkm-2026');
  const lidm = compBySlug.get('lidm-2026');
  const onmipa = compBySlug.get('onmipa-2026');

  const setActiveTarget = async (studentKey: string, compId: string) => {
    const u = userByKey.get(studentKey);
    if (!u) return;
    await prisma.studentTarget.updateMany({
      where: { userId: u.id, status: 'active' },
      data: { status: 'archived' },
    });
    await prisma.studentTarget.create({
      data: {
        userId: u.id,
        competitionId: compId,
        academicPeriodId: activePeriod.id,
        status: 'active',
      },
    });
  };

  let gemastikTeamId: string | null = null;
  let pkmTeamId: string | null = null;

  if (gemastik) {
    const fauzan = userByKey.get('fauzan')!;
    const zaidan = userByKey.get('zaidan')!;
    const farhan = userByKey.get('farhan')!;
    const luthfi = userByKey.get('luthfi')!;
    await setActiveTarget('fauzan', gemastik.id);
    await setActiveTarget('zaidan', gemastik.id);
    await setActiveTarget('farhan', gemastik.id);
    await setActiveTarget('luthfi', gemastik.id);

    const gemTeam = await prisma.team.create({
      data: {
        competitionId: gemastik.id,
        name: 'Gontor Digital Innovators',
        creatorId: fauzan.id,
        leaderId: fauzan.id,
        description: 'Tim pengembangan aplikasi edukasi & kolaborasi talenta kampus untuk GEMASTIK XIX 2026.',
        recruitmentType: 'terbuka',
        isRecruiting: true,
        neededRoles: ['Hacker (Programmer)', 'Hustler (Pitch/Product)'],
        targetMaxMembers: 3,
        inviteCode: 'TLN-GMS6-2026',
        inviteCodeUpdatedAt: new Date(),
        status: 'mencari',
      },
    });
    gemastikTeamId = gemTeam.id;

    await prisma.teamMember.createMany({
      data: [
        { teamId: gemTeam.id, userId: fauzan.id, roleInTeam: 'Hacker (Programmer)', status: 'active' },
        { teamId: gemTeam.id, userId: zaidan.id, roleInTeam: 'Hipster (UI/UX Designer)', status: 'active' },
      ],
    });

    // Permintaan bergabung menunggu dari Luthfi & Farhan untuk memudahkan inspeksi panel pelamar di /app/tim
    await prisma.teamJoinRequest.create({
      data: {
        teamId: gemTeam.id,
        userId: farhan.id,
        preferredRole: 'Hustler (Pitch/Product)',
        note: 'Saya terbiasa menyusun model bisnis dan materi pitching untuk kompetisi inovasi digital.',
        status: 'menunggu',
      },
    });
    await prisma.teamJoinRequest.create({
      data: {
        teamId: gemTeam.id,
        userId: luthfi.id,
        preferredRole: 'Hacker (Programmer)',
        note: 'Siap membantu optimasi algoritma dan integrasi backend.',
        status: 'menunggu',
      },
    });

    // Tim terbuka kedua di GEMASTIK agar direktori /app/tim?tab=cari terlihat hidup
    const nabila = userByKey.get('nabila')!;
    await prisma.team.create({
      data: {
        competitionId: gemastik.id,
        name: 'MedTech Santri Labs',
        creatorId: nabila.id,
        leaderId: nabila.id,
        description: 'Membangun aplikasi pemantauan gizi & kesehatan lingkungan pesantren berbasis mobile web.',
        recruitmentType: 'terbuka',
        isRecruiting: true,
        neededRoles: ['Hacker (Programmer)', 'Hipster (UI/UX Designer)'],
        targetMaxMembers: 3,
        inviteCode: 'TLN-MED6-901A',
        inviteCodeUpdatedAt: new Date(),
        status: 'mencari',
        members: {
          create: {
            userId: nabila.id,
            roleInTeam: 'Hustler (Pitch/Product)',
            status: 'active',
          },
        },
      },
    });
  }

  if (pkm) {
    const aisyah = userByKey.get('aisyah')!;
    const rizky = userByKey.get('rizky')!;
    const dimas = userByKey.get('dimas')!;
    await setActiveTarget('aisyah', pkm.id);
    await setActiveTarget('rizky', pkm.id);
    await setActiveTarget('dimas', pkm.id);

    const pkmTeam = await prisma.team.create({
      data: {
        competitionId: pkm.id,
        name: 'Tim Riset Pangan & Gizi Gontor',
        creatorId: aisyah.id,
        leaderId: aisyah.id,
        description: 'Mengembangkan inovasi pangan fungsional dan kebun gizi pesantren untuk PKM-PM 2026.',
        recruitmentType: 'terbuka',
        isRecruiting: true,
        neededRoles: ['Penulis Proposal', 'Analis Data'],
        targetMaxMembers: 5,
        inviteCode: 'TLN-PKM6-441B',
        inviteCodeUpdatedAt: new Date(),
        status: 'terbentuk',
      },
    });
    pkmTeamId = pkmTeam.id;

    await prisma.teamMember.createMany({
      data: [
        { teamId: pkmTeam.id, userId: aisyah.id, roleInTeam: 'Ketua Tim', status: 'active' },
        { teamId: pkmTeam.id, userId: rizky.id, roleInTeam: 'Analis Data', status: 'active' },
        { teamId: pkmTeam.id, userId: dimas.id, roleInTeam: 'Penulis Proposal', status: 'active' },
      ],
    });
  }

  if (lidm) {
    await setActiveTarget('hafizah', lidm.id);
    await setActiveTarget('khadijah', lidm.id);
  }
  if (onmipa) {
    await setActiveTarget('raihan', onmipa.id);
    await setActiveTarget('fathimah', onmipa.id);
  }

  // Buat prestasi simulasi + bukti PDF valid di RustFS + keputusan validator + PointLedger
  const storage = getStorageService();
  let approvedCount = 0;
  let ledgerCount = 0;

  for (const item of SIMULATION_ACHIEVEMENTS) {
    const submitter = userByKey.get(item.submitterKey);
    if (!submitter) continue;

    const periodObj = item.period === 'active' ? activePeriod : archivePeriod;
    const compObj = item.competitionSlug ? compBySlug.get(item.competitionSlug) : undefined;
    const catObj = item.categoryCode ? catByCode.get(item.categoryCode) : undefined;
    const subCatObj =
      catObj && item.subCategoryCode
        ? catObj.subCategories.find((sc) => sc.code === item.subCategoryCode)
        : undefined;

    const linkedTeamId =
      item.participationType === 'kelompok'
        ? item.competitionSlug === 'gemastik-2026'
          ? gemastikTeamId
          : item.competitionSlug === 'pkm-2026'
            ? pkmTeamId
            : null
        : null;

    const ach = await prisma.achievement.create({
      data: {
        institutionId: institution.id,
        userId: submitter.id,
        academicPeriodId: periodObj.id,
        competitionId: compObj?.id || null,
        competitionCategoryId: catObj?.id || null,
        subCategoryId: subCatObj?.id || null,
        teamId: linkedTeamId,
        participationType: item.participationType,
        name: item.name,
        organizer: item.organizer,
        category: 'kompetisi',
        level: item.level,
        result: item.result,
        eventDate: new Date(item.eventDate),
        description: item.description,
        isFromInternalSelection: item.competitionSlug === 'gemastik-2026' || item.competitionSlug === 'pkm-2026',
        status: item.status,
        version: item.status === 'menunggu' ? 1 : 2,
        reviewNote: item.reviewNote || null,
      },
    });

    // Participants
    const participantIds = item.participantKeys
      .map((k) => userByKey.get(k))
      .filter((u): u is { id: string; fullName: string; email: string } => Boolean(u));

    await prisma.achievementParticipant.createMany({
      data: participantIds.map((p) => ({
        achievementId: ach.id,
        userId: p.id,
        isSubmitter: p.id === submitter.id,
      })),
    });

    // Bukti PDF valid di RustFS privat
    const evidenceKey = `institutions/${institution.id}/achievements/${ach.id}/${crypto.randomUUID()}.pdf`;
    await storage.uploadFile(evidenceKey, VALID_PDF_BYTES, 'application/pdf');
    await prisma.achievementEvidence.create({
      data: {
        achievementId: ach.id,
        uploaderId: submitter.id,
        objectKey: evidenceKey,
        fileName: `sertifikat-${item.code}.pdf`,
        fileSize: VALID_PDF_BYTES.byteLength,
        mimeType: 'application/pdf',
        isActive: true,
      },
    });

    // Keputusan & PointLedger bila disetujui atau perlu perbaikan
    if (item.status === 'disetujui') {
      approvedCount++;
      await prisma.achievementDecision.create({
        data: {
          achievementId: ach.id,
          decidedById: validatorUser.id,
          action: 'approve',
          previousStatus: 'menunggu',
          newStatus: 'disetujui',
          reason: 'Bukti sertifikat dan data peserta telah diverifikasi sesuai ketentuan.',
          calculatedPoints: item.points,
          awardedPoints: item.points,
          pointSource: 'template',
          version: 2,
        },
      });

      for (const p of participantIds) {
        await prisma.pointLedger.create({
          data: {
            institutionId: institution.id,
            userId: p.id,
            achievementId: ach.id,
            academicPeriodId: periodObj.id,
            ruleVersion: 1,
            points: item.points,
            type: 'award',
            pointSource: 'template',
            calculatedPoints: item.points,
            idempotencyKey: `${item.code}-${p.id}`,
            reason: `Persetujuan prestasi lomba (${item.level} - ${item.result})`,
          },
        });
        ledgerCount++;
      }
    } else if (item.status === 'perlu_perbaikan') {
      await prisma.achievementDecision.create({
        data: {
          achievementId: ach.id,
          decidedById: validatorUser.id,
          action: 'request_changes',
          previousStatus: 'menunggu',
          newStatus: 'perlu_perbaikan',
          reason: item.reviewNote || 'Mohon lengkapi dokumen pendukung.',
          version: 2,
        },
      });
    }
  }

  console.log(
    `[SIMULASI] Selesai! ${SIMULATION_STUDENTS.length} akun mahasiswa (semua ber-PP di RustFS), ` +
      `${approvedCount} prestasi sah (${ledgerCount} entri PointLedger lintas 2 periode), ` +
      `tim aktif/terbuka, dan antrean verifikasi telah dipasang.`
  );
}

main()
  .catch((err) => {
    console.error('[SIMULASI_ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabase();
  });
