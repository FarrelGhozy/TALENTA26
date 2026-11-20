import { prisma, closeDatabase } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
import { loadConfig } from '../src/lib/config';

async function main() {
  const currentConfig = loadConfig();
  console.log('[SEED] Memulai inisialisasi basis data TALENTA...');

  // 1. Institusi default UNIDA Gontor
  const institution = await prisma.institution.upsert({
    where: { code: 'unida-gontor' },
    update: {
      name: 'Universitas Darussalam Gontor',
    },
    create: {
      code: 'unida-gontor',
      name: 'Universitas Darussalam Gontor',
    },
  });
  console.log(`[SEED] Institusi terverifikasi: ${institution.name} (${institution.code})`);

  // 2. Super Admin Bootstrap
  const superAdminEmail = (
    currentConfig.superAdminBootstrapEmail || 'admin@unida.gontor.ac.id'
  ).toLowerCase();
  const superAdminPassword =
    currentConfig.superAdminBootstrapPassword || 'AdminGontor2026!';

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'super_admin' },
  });

  if (!existingSuperAdmin) {
    const passwordHash = await hashPassword(superAdminPassword);
    const createdAdmin = await prisma.user.create({
      data: {
        institutionId: institution.id,
        email: superAdminEmail,
        passwordHash,
        role: 'super_admin',
        status: 'active',
      },
    });

    await prisma.auditEvent.create({
      data: {
        institutionId: institution.id,
        actorId: createdAdmin.id,
        action: 'SYSTEM_BOOTSTRAP_SUPERADMIN',
        targetType: 'User',
        targetId: createdAdmin.id,
        metadata: { email: superAdminEmail },
      },
    });

    console.log(`[SEED] Super admin berhasil dibuat: ${superAdminEmail}`);
  } else {
    console.log(
      `[SEED] Super admin sudah terdaftar (${existingSuperAdmin.email}). Bootstrap dilewati.`
    );
  }

  // 3. Validator Akun Uji Coba (khusus dev/test agar pengujian RBAC lokal dapat dilakukan)
  if (currentConfig.nodeEnv !== 'production') {
    const validatorEmail = 'validator@unida.gontor.ac.id';
    const existingValidator = await prisma.user.findUnique({
      where: { email: validatorEmail },
    });

    if (!existingValidator) {
      const valHash = await hashPassword('Validator2026!');
      await prisma.user.create({
        data: {
          institutionId: institution.id,
          email: validatorEmail,
          passwordHash: valHash,
          role: 'validator',
          status: 'active',
        },
      });
      console.log(`[SEED:DEV] Validator uji coba dibuat: ${validatorEmail}`);
    }
  }

  // 4. Periode Akademik Aktif
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
        isActive: true,
      },
    });
    console.log(`[SEED] Periode akademik aktif dibuat: ${activePeriod.name}`);
  }

  // 5. Kurikulum Kompetisi Resmi
  const officialCompetitions = [
    {
      slug: 'gemastik-2026',
      name: 'Gemastik XIX 2026',
      organizer: 'Balai Pengembangan Talenta Indonesia (BPTI / Kemendikbudristek)',
      category: 'Teknologi',
      level: 'nasional',
      format: 'beregu' as const,
      minTeamMembers: 3,
      maxTeamMembers: 3,
      requiredRoles: ['Hacker (Programmer)', 'Hipster (UI/UX Designer)', 'Hustler (Pitch/Product)'],
      description: 'Pagelaran Mahasiswa Nasional Bidang Teknologi Informasi dan Komunikasi untuk mendorong talenta digital Indonesia.',
      requirements: [
        'Mahasiswa aktif jenjang S1/D4/D3 UNIDA Gontor',
        'Satu tim terdiri dari 3 orang mahasiswa',
        'Setiap mahasiswa hanya boleh terdaftar pada satu tim di divisi yang sama',
      ],
      scheduleTimeline: [
        { label: 'Sosialisasi & Pendaftaran Internal', tanggal: '15 Maret 2026' },
        { label: 'Batas Pengumpulan Proposal Tahap 1', tanggal: '30 April 2026' },
        { label: 'Pengumuman Finalis', tanggal: '20 Juni 2026' },
        { label: 'Babak Final Nasional', tanggal: '15-18 Juli 2026' },
      ],
      status: 'published' as const,
    },
    {
      slug: 'pkm-2026',
      name: 'Program Kreativitas Mahasiswa (PKM) 2026',
      organizer: 'Direktorat Pembelajaran dan Kemahasiswaan (Ditjen Diktiristek)',
      category: 'Kepenulisan',
      level: 'nasional',
      format: 'beregu' as const,
      minTeamMembers: 3,
      maxTeamMembers: 5,
      requiredRoles: ['Ketua Tim', 'Anggota Tim'],
      description: 'Program peningkatan mutu peserta didik di perguruan tinggi untuk menumbuhkan, mewadahi, dan mewujudkan ide kreatif mahasiswa.',
      requirements: [
        'Mahasiswa aktif jenjang sarjana',
        'Anggota tim disarankan berasal dari lintas disiplin ilmu',
        'Memiliki dosen pembimbing terdaftar',
      ],
      scheduleTimeline: [
        { label: 'Pengunggahan Proposal Internal Kampus', tanggal: '10 Februari 2026' },
        { label: 'Review & Seleksi Internal', tanggal: '25 Februari 2026' },
        { label: 'Submit ke Portal Belmawa', tanggal: '15 Maret 2026' },
      ],
      status: 'published' as const,
    },
    {
      slug: 'lidm-2026',
      name: 'Lomba Inovasi Digital Mahasiswa (LIDM) 2026',
      organizer: 'BPTI Kemendikbudristek',
      category: 'Teknologi',
      level: 'nasional',
      format: 'beregu' as const,
      minTeamMembers: 3,
      maxTeamMembers: 4,
      requiredRoles: ['Lead Innovator', 'Media Specialist', 'Technical Developer'],
      description: 'Kompetisi pengembangan inovasi digital dalam dunia pendidikan untuk mencapai tujuan pembangunan berkelanjutan.',
      requirements: ['Mahasiswa aktif', 'Tim beranggotakan 3-4 orang'],
      scheduleTimeline: [
        { label: 'Pendaftaran Karya', tanggal: '1 Mei 2026' },
        { label: 'Penjurian Babak Penyisihan', tanggal: '15 Juni 2026' },
      ],
      status: 'published' as const,
    },
    {
      slug: 'onmipa-2026',
      name: 'Olimpiade Nasional MIPA (ONMIPA-PT) 2026',
      organizer: 'BPTI Kemendikbudristek',
      category: 'Sains',
      level: 'nasional',
      format: 'individu' as const,
      minTeamMembers: 1,
      maxTeamMembers: 1,
      requiredRoles: ['Peserta'],
      description: 'Olimpiade sains mahasiswa perguruan tinggi tingkat nasional bidang Matematika, Fisika, Kimia, dan Biologi.',
      requirements: ['Mahasiswa aktif', 'Perseorangan / Individu'],
      scheduleTimeline: [
        { label: 'Seleksi Tingkat Wilayah', tanggal: '20 April 2026' },
        { label: 'Babak Final Nasional', tanggal: '25 Mei 2026' },
      ],
      status: 'published' as const,
    },
  ];

  for (const compData of officialCompetitions) {
    const comp = await prisma.competition.upsert({
      where: { slug: compData.slug },
      update: {
        name: compData.name,
        organizer: compData.organizer,
        category: compData.category,
        level: compData.level,
        format: compData.format,
        minTeamMembers: compData.minTeamMembers,
        maxTeamMembers: compData.maxTeamMembers,
        requiredRoles: compData.requiredRoles,
        description: compData.description,
        requirements: compData.requirements,
        scheduleTimeline: compData.scheduleTimeline,
        status: compData.status,
      },
      create: {
        institutionId: institution.id,
        academicPeriodId: activePeriod.id,
        slug: compData.slug,
        name: compData.name,
        organizer: compData.organizer,
        category: compData.category,
        level: compData.level,
        format: compData.format,
        minTeamMembers: compData.minTeamMembers,
        maxTeamMembers: compData.maxTeamMembers,
        requiredRoles: compData.requiredRoles,
        description: compData.description,
        requirements: compData.requirements,
        scheduleTimeline: compData.scheduleTimeline,
        status: compData.status,
      },
    });

    // 6. Roadmap Awal untuk Gemastik
    if (comp.slug === 'gemastik-2026') {
      const existingRoadmap = await prisma.roadmap.findFirst({
        where: { competitionId: comp.id },
      });

      if (!existingRoadmap) {
        const roadmap = await prisma.roadmap.create({
          data: {
            competitionId: comp.id,
            version: 1,
            status: 'published',
          },
        });

        // Fase 1
        const phase1 = await prisma.roadmapPhase.create({
          data: {
            roadmapId: roadmap.id,
            orderIndex: 1,
            title: 'Fase 1: Fondasi & Penentuan Gagasan',
            description: 'Memahami pedoman lomba resmi, membentuk tim inti, dan mematangkan ide inovasi.',
            targetDays: 14,
          },
        });

        await prisma.roadmapTask.createMany({
          data: [
            {
              phaseId: phase1.id,
              orderIndex: 1,
              title: 'Membaca dan Memahami Panduan Teknis Gemastik 2026',
              description: 'Pastikan membaca batasan format, tema tahunan, dan kriteria penilaian.',
              isRequired: true,
              resourceTitle: 'Panduan BPTI Gemastik',
              resourceUrl: 'https://bpti.kemdikbud.go.id',
            },
            {
              phaseId: phase1.id,
              orderIndex: 2,
              title: 'Brainstorming Ide Solusi Berbasis Masalah Nyata',
              description: 'Tentukan problem statement yang tajam dan solusi berbasis teknologi.',
              isRequired: true,
            },
          ],
        });

        // Fase 2
        const phase2 = await prisma.roadmapPhase.create({
          data: {
            roadmapId: roadmap.id,
            orderIndex: 2,
            title: 'Fase 2: Perancangan & Penyusunan Proposal',
            description: 'Menyusun dokumen proposal karya dan rancangan sistem arsitektur/desain.',
            targetDays: 21,
          },
        });

        await prisma.roadmapTask.createMany({
          data: [
            {
              phaseId: phase2.id,
              orderIndex: 1,
              title: 'Pembuatan Wireframe UI/UX atau Diagram Arsitektur',
              description: 'Rancang visualisasi sistem menggunakan Figma atau diagram alir.',
              isRequired: true,
            },
            {
              phaseId: phase2.id,
              orderIndex: 2,
              title: 'Penyusunan Naskah Proposal Lengkap',
              description: 'Tulis proposal sesuai sistematika baku pedoman lomba.',
              isRequired: true,
            },
          ],
        });

        console.log(`[SEED] Roadmap kurikulum dibuat untuk: ${comp.name}`);
      }

      // 7. Kontak Konsultasi untuk Gemastik
      const existingConsultant = await prisma.consultantContact.findFirst({
        where: { competitionId: comp.id },
      });
      if (!existingConsultant) {
        await prisma.consultantContact.create({
          data: {
            competitionId: comp.id,
            name: 'Pusat Pembinaan Prestasi UNIDA Gontor',
            field: 'Konsultasi Teknis & Arahan Tim Lomba Gemastik',
            whatsappNumber: '6281234567890',
            capacityNote: 'Senin - Kamis, 09.00 - 15.00 WIB',
            isApproved: true,
            status: 'published',
          },
        });
        console.log(`[SEED] Kontak konsultasi terdaftar untuk: ${comp.name}`);
      }
    }
  }

  // 8. Aturan Poin Berversi (PointRule Versi 1 sesuai docs/09)
  const defaultRules: Array<{
    level: 'lokal' | 'nasional' | 'internasional';
    result: 'partisipasi' | 'finalis' | 'juara_3' | 'juara_2' | 'juara_1' | 'penghargaan_khusus';
    points: number;
  }> = [
    { level: 'lokal', result: 'partisipasi', points: 1 },
    { level: 'lokal', result: 'finalis', points: 2 },
    { level: 'lokal', result: 'juara_3', points: 4 },
    { level: 'lokal', result: 'juara_2', points: 6 },
    { level: 'lokal', result: 'juara_1', points: 8 },
    { level: 'lokal', result: 'penghargaan_khusus', points: 2 },

    { level: 'nasional', result: 'partisipasi', points: 2 },
    { level: 'nasional', result: 'finalis', points: 5 },
    { level: 'nasional', result: 'juara_3', points: 10 },
    { level: 'nasional', result: 'juara_2', points: 14 },
    { level: 'nasional', result: 'juara_1', points: 18 },
    { level: 'nasional', result: 'penghargaan_khusus', points: 5 },

    { level: 'internasional', result: 'partisipasi', points: 3 },
    { level: 'internasional', result: 'finalis', points: 8 },
    { level: 'internasional', result: 'juara_3', points: 16 },
    { level: 'internasional', result: 'juara_2', points: 22 },
    { level: 'internasional', result: 'juara_1', points: 30 },
    { level: 'internasional', result: 'penghargaan_khusus', points: 8 },
  ];

  for (const r of defaultRules) {
    await prisma.pointRule.upsert({
      where: {
        institutionId_version_level_result: {
          institutionId: institution.id,
          version: 1,
          level: r.level,
          result: r.result,
        },
      },
      update: {
        points: r.points,
        isActive: true,
      },
      create: {
        institutionId: institution.id,
        version: 1,
        level: r.level,
        result: r.result,
        points: r.points,
        isActive: true,
      },
    });
  }
  console.log('[SEED] Aturan bobot poin prestasi versi 1 berhasil dipasang.');

  console.log('[SEED] Inisialisasi basis data Stage 4 selesai dengan aman.');
}

main()
  .catch((e) => {
    console.error('[SEED_ERROR] Gagal menjalankan seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabase();
  });
