import { prisma, closeDatabase } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';
import { loadConfig } from '../src/lib/config';

export async function runBaseSeed() {
  const currentConfig = loadConfig();
  console.log('[SEED] Memulai inisialisasi basis data UNIDA Student Championship (USC)...');

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
  const isProd = currentConfig.nodeEnv === 'production';
  if (isProd) {
    if (
      !currentConfig.superAdminBootstrapEmail ||
      !currentConfig.superAdminBootstrapPassword ||
      currentConfig.superAdminBootstrapPassword.startsWith('change-with-')
    ) {
      throw new Error(
        '[SEED_ERROR] Pada mode production, SUPER_ADMIN_BOOTSTRAP_EMAIL dan SUPER_ADMIN_BOOTSTRAP_PASSWORD wajib diset di environment.'
      );
    }
  }

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
        fullName: 'Administrator Utama USC',
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
          fullName: 'Dr. Ahmad Validator',
          passwordHash: valHash,
          role: 'validator',
          status: 'active',
        },
      });
      console.log(`[SEED:DEV] Validator uji coba dibuat: ${validatorEmail}`);
    } else if (!existingValidator.fullName) {
      await prisma.user.update({
        where: { id: existingValidator.id },
        data: { fullName: 'Dr. Ahmad Validator' },
      });
    }

    const studentEmail = 'mhs@unida.gontor.ac.id';
    const existingStudent = await prisma.user.findUnique({
      where: { email: studentEmail },
      include: { studentProfile: true },
    });

    if (!existingStudent) {
      const studentHash = await hashPassword('Mahasiswa2026!');
      await prisma.user.create({
        data: {
          institutionId: institution.id,
          email: studentEmail,
          passwordHash: studentHash,
          role: 'mahasiswa',
          status: 'active',
          studentProfile: {
            create: {
              nim: '432026001',
              fullName: 'Ahmad Fauzan',
              studyProgram: 'Teknik Informatika',
              faculty: 'Sains dan Teknologi',
              enrollmentYear: 2024,
            },
          },
        },
      });
      console.log(`[SEED:DEV] Mahasiswa uji coba dibuat: ${studentEmail}`);
    } else if (existingStudent.studentProfile) {
      await prisma.studentProfile.update({
        where: { id: existingStudent.studentProfile.id },
        data: {
          fullName: 'Ahmad Fauzan',
          studyProgram: 'Teknik Informatika',
          faculty: 'Sains dan Teknologi',
          enrollmentYear: 2024,
        },
      });
    }

    const zaidanEmail = 'zaidan@unida.gontor.ac.id';
    const existingZaidan = await prisma.user.findUnique({
      where: { email: zaidanEmail },
      include: { studentProfile: true },
    });

    if (!existingZaidan) {
      const zaidanHash = await hashPassword('Mahasiswa2026!');
      await prisma.user.create({
        data: {
          institutionId: institution.id,
          email: zaidanEmail,
          passwordHash: zaidanHash,
          role: 'mahasiswa',
          status: 'active',
          studentProfile: {
            create: {
              nim: '442026777',
              fullName: 'Zaidan Ali',
              studyProgram: 'Teknik Informatika',
              faculty: 'Sains dan Teknologi',
              enrollmentYear: 2024,
            },
          },
        },
      });
      console.log(`[SEED:DEV] Mahasiswa Zaidan dibuat: ${zaidanEmail}`);
    } else if (existingZaidan.studentProfile) {
      await prisma.studentProfile.update({
        where: { id: existingZaidan.studentProfile.id },
        data: {
          fullName: 'Zaidan Ali',
          studyProgram: 'Teknik Informatika',
          faculty: 'Sains dan Teknologi',
          enrollmentYear: 2024,
        },
      });
    }
  }

  // 4. Periode Akademik Aktif (hanya dibuat bila belum ada satu pun di institusi)
  let activePeriod = await prisma.academicPeriod.findFirst({
    where: { institutionId: institution.id, isActive: true },
  });
  if (!activePeriod && !isProd) {
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

  // 5. Kurikulum Kompetisi Demo/Pengembangan (hanya non-production)
  const officialCompetitions = isProd
    ? []
    : [
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
      registrationStatus: 'buka' as const,
      requireRoles: false,
      requireCrossStudyProgram: false,
      singleTeamPerCompetition: true,
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
      requiredRoles: ['Ketua Tim', 'Penulis Proposal', 'Analis Data'],
      registrationStatus: 'buka' as const,
      requireRoles: false,
      requireCrossStudyProgram: false,
      singleTeamPerCompetition: true,
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
      registrationStatus: 'buka' as const,
      requireRoles: false,
      requireCrossStudyProgram: false,
      singleTeamPerCompetition: true,
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
      registrationStatus: 'buka' as const,
      requireRoles: false,
      requireCrossStudyProgram: false,
      singleTeamPerCompetition: true,
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
        registrationStatus: compData.registrationStatus,
        requireRoles: compData.requireRoles,
        requireCrossStudyProgram: compData.requireCrossStudyProgram,
        singleTeamPerCompetition: compData.singleTeamPerCompetition,
        description: compData.description,
        requirements: compData.requirements,
        scheduleTimeline: compData.scheduleTimeline,
        status: compData.status,
      },
      create: {
        institutionId: institution.id,
        academicPeriodId: activePeriod?.id || null,
        slug: compData.slug,
        name: compData.name,
        organizer: compData.organizer,
        category: compData.category,
        level: compData.level,
        format: compData.format,
        minTeamMembers: compData.minTeamMembers,
        maxTeamMembers: compData.maxTeamMembers,
        requiredRoles: compData.requiredRoles,
        registrationStatus: compData.registrationStatus,
        requireRoles: compData.requireRoles,
        requireCrossStudyProgram: compData.requireCrossStudyProgram,
        singleTeamPerCompetition: compData.singleTeamPerCompetition,
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

    if (comp.slug === 'onmipa-2026') {
      const existingOnmipaRoadmap = await prisma.roadmap.findFirst({
        where: { competitionId: comp.id },
      });
      if (!existingOnmipaRoadmap) {
        const roadmap = await prisma.roadmap.create({
          data: { competitionId: comp.id, version: 1, status: 'published' },
        });
        const phase = await prisma.roadmapPhase.create({
          data: {
            roadmapId: roadmap.id,
            orderIndex: 1,
            title: 'Fase 1: Pemetaan Materi & Latihan Mandiri ONMIPA',
            description: 'Mempelajari silabus nasional bidang MIPA dan latihan soal seleksi wilayah.',
            targetDays: 21,
          },
        });
        await prisma.roadmapTask.createMany({
          data: [
            {
              phaseId: phase.id,
              orderIndex: 1,
              title: 'Membaca pedoman dan kisi-kisi ONMIPA-PT terbaru',
              isRequired: true,
            },
            {
              phaseId: phase.id,
              orderIndex: 2,
              title: 'Latihan soal bidang pilihan minimal 2 paket soal',
              isRequired: true,
            },
            {
              phaseId: phase.id,
              orderIndex: 3,
              title: 'Mengikuti simulasi seleksi internal kampus',
              isRequired: true,
            },
          ],
        });
      }
    }
  }

  // 7B. Contoh Tim Rekrutmen Terbuka khusus development/test
  if (!isProd) {
    const zaidanUser = await prisma.user.findUnique({ where: { email: 'zaidan@unida.gontor.ac.id' } });
    const pkmComp = await prisma.competition.findUnique({ where: { slug: 'pkm-2026' } });
    if (zaidanUser && pkmComp) {
      const existingZaidanTeam = await prisma.team.findFirst({
        where: { creatorId: zaidanUser.id, competitionId: pkmComp.id, status: { not: 'arsip' } },
      });
      if (!existingZaidanTeam) {
        await prisma.studentTarget.updateMany({
          where: { userId: zaidanUser.id, status: 'active' },
          data: { status: 'archived' },
        });
        await prisma.studentTarget.create({
          data: {
            userId: zaidanUser.id,
            competitionId: pkmComp.id,
            academicPeriodId: activePeriod?.id || null,
            status: 'active',
          },
        });
        const openTeam = await prisma.team.create({
          data: {
            competitionId: pkmComp.id,
            name: 'Tim Riset Gontor Digital',
            creatorId: zaidanUser.id,
            leaderId: zaidanUser.id,
            description: 'Mengembangkan ide riset mahasiswa berbasis teknologi tepat guna untuk PKM.',
            recruitmentType: 'terbuka',
            isRecruiting: true,
            neededRoles: ['Penulis Proposal', 'Analis Data'],
            targetMaxMembers: 5,
            inviteCode: 'TLN-PKM7-842K',
            inviteCodeUpdatedAt: new Date(),
            status: 'mencari',
          },
        });
        await prisma.teamMember.create({
          data: {
            teamId: openTeam.id,
            userId: zaidanUser.id,
            roleInTeam: 'Ketua Tim',
            status: 'active',
          },
        });
        console.log(`[SEED:DEV] Contoh tim rekrutmen terbuka dibuat: ${openTeam.name}`);
      }
    }
  }

  // 8. Template & Aturan Poin Berversi (PointTemplate + PointRule Versi 1 — tidak menimpa aturan berjalan)
  let defaultTemplate = await prisma.pointTemplate.findFirst({
    where: { institutionId: institution.id, version: 1 },
  });
  if (!defaultTemplate) {
    defaultTemplate = await prisma.pointTemplate.create({
      data: {
        institutionId: institution.id,
        name: 'Template Poin Standar v1',
        description: 'Template bobot poin standar UNIDA Gontor untuk prestasi lomba berdasarkan tingkat dan capaian.',
        version: 1,
        isActive: true,
      },
    });
  }

  const existingPointRuleCount = await prisma.pointRule.count({
    where: { institutionId: institution.id },
  });
  if (existingPointRuleCount === 0) {
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

    await prisma.pointRule.createMany({
      data: defaultRules.map((r) => ({
        institutionId: institution.id,
        pointTemplateId: defaultTemplate.id,
        version: 1,
        level: r.level,
        result: r.result,
        points: r.points,
        isActive: true,
      })),
    });
    console.log('[SEED] Template & aturan bobot poin prestasi versi 1 berhasil dipasang.');
  } else {
    const linked = await prisma.pointRule.updateMany({
      where: { institutionId: institution.id, version: 1, pointTemplateId: null },
      data: { pointTemplateId: defaultTemplate.id },
    });
    if (linked.count > 0) {
      console.log(`[SEED] Menautkan ${linked.count} aturan poin v1 ke ${defaultTemplate.name}.`);
    } else {
      console.log('[SEED] Aturan bobot poin sudah ada, seed tidak menimpa aturan berjalan.');
    }
  }

  // 9. Master Jenis & Sub-Lomba untuk lingkungan development/test
  if (!isProd) {
    const existingCatCount = await prisma.competitionCategory.count({
      where: { institutionId: institution.id },
    });
    if (existingCatCount === 0) {
      const catSeeds = [
        {
          code: 'kepenulisan',
          name: 'Kepenulisan & Riset',
          description: 'Karya tulis ilmiah, PKM, esai, dan riset mahasiswa.',
          subs: [
            { code: 'pkm-rsh', name: 'PKM Riset Sosial Humaniora (PKM-RSH)' },
            { code: 'pkm-kc', name: 'PKM Karsa Cipta (PKM-KC)' },
            { code: 'pkm-pm', name: 'PKM Pengabdian kepada Masyarakat (PKM-PM)' },
          ],
        },
        {
          code: 'teknologi',
          name: 'Teknologi & Inovasi Digital',
          description: 'Pengembangan perangkat lunak, UI/UX, IoT, dan inovasi pendidikan digital.',
          subs: [
            { code: 'inovasi-digital', name: 'Inovasi Teknologi Digital Pendidikan' },
            { code: 'desain-uiux', name: 'Desain UI/UX & Produk Digital' },
          ],
        },
        {
          code: 'sains',
          name: 'Olimpiade Sains (MIPA)',
          description: 'Kompetisi bidang Matematika, Fisika, Kimia, dan Biologi.',
          subs: [
            { code: 'matematika', name: 'Matematika' },
            { code: 'fisika', name: 'Fisika' },
            { code: 'kimia', name: 'Kimia' },
            { code: 'biologi', name: 'Biologi' },
          ],
        },
      ];

      for (const c of catSeeds) {
        const createdCat = await prisma.competitionCategory.create({
          data: {
            institutionId: institution.id,
            code: c.code,
            name: c.name,
            description: c.description,
          },
        });
        for (const s of c.subs) {
          await prisma.competitionSubCategory.create({
            data: {
              categoryId: createdCat.id,
              code: s.code,
              name: s.name,
            },
          });
        }
      }
      console.log('[SEED] Master jenis & sub-lomba development berhasil dipasang.');
    }
  }

  console.log('[SEED] Inisialisasi basis data selesai dengan aman.');
}

if (import.meta.main) {
  runBaseSeed()
    .catch((e) => {
      console.error('[SEED_ERROR] Gagal menjalankan seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await closeDatabase();
    });
}
