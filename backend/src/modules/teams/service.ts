import { prisma } from '../../lib/prisma';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '../../app/middleware/error';
import { recordAuditEvent } from '../../lib/audit';
import type { Team, TeamInvite } from '@prisma/client';

export interface CreateTeamDto {
  competitionSlug: string;
  teamName: string;
  roleInTeam?: string;
}

export async function getMyTeam(userId: string): Promise<Team | null> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'active',
      team: {
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
    include: {
      team: {
        include: {
          competition: true,
          members: {
            where: { status: 'active' },
            include: {
              user: {
                include: {
                  studentProfile: true,
                },
              },
            },
          },
          invites: {
            where: { status: 'diajukan' },
            include: {
              receiver: {
                include: {
                  studentProfile: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return membership?.team || null;
}

export async function createTeam(
  userId: string,
  dto: CreateTeamDto,
  institutionId: string
): Promise<Team> {
  if (!dto.teamName || dto.teamName.trim().length < 3) {
    throw new ValidationError('Nama tim minimal 3 karakter');
  }

  const comp = await prisma.competition.findUnique({
    where: { slug: dto.competitionSlug },
  });

  if (!comp) {
    throw new NotFoundError('Kompetisi tidak ditemukan');
  }

  if (comp.format === 'individu') {
    throw new ValidationError('Kompetisi format individu tidak memerlukan pembentukan tim');
  }

  // Cek apakah mahasiswa sudah memiliki tim aktif pada kompetisi ini
  const existingMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'active',
      team: {
        competitionId: comp.id,
        status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
      },
    },
  });

  if (existingMembership) {
    throw new ConflictError('Anda sudah memiliki tim aktif pada kompetisi ini');
  }

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        competitionId: comp.id,
        name: dto.teamName.trim(),
        creatorId: userId,
        status: 'mencari',
        version: 1,
      },
    });

    await tx.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        roleInTeam: dto.roleInTeam?.trim() || 'Ketua Tim',
        status: 'active',
      },
    });

    await recordAuditEvent({
      institutionId,
      actorId: userId,
      action: 'TEAM_CREATED',
      targetType: 'Team',
      targetId: team.id,
      metadata: { teamName: team.name, competitionSlug: comp.slug },
    });

    return team;
  });
}

export async function leaveTeam(
  userId: string,
  teamId: string,
  institutionId: string
): Promise<{ message: string }> {
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, userId, status: 'active' },
    include: { team: { include: { members: true, competition: true } } },
  });

  if (!membership) {
    throw new NotFoundError('Keanggotaan tim tidak ditemukan');
  }

  if (membership.team.status === 'terkunci_seleksi') {
    throw new ForbiddenError('Tim telah terkunci untuk tahap seleksi dan tidak dapat ditinggalkan mandiri');
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.update({
      where: { id: membership.id },
      data: { status: 'left' },
    });

    const remainingActive = membership.team.members.filter(
      (m) => m.id !== membership.id && m.status === 'active'
    );

    if (remainingActive.length === 0) {
      await tx.team.update({
        where: { id: teamId },
        data: { status: 'arsip', version: { increment: 1 } },
      });
    } else {
      // Jika anggota kurang dari batas minimum, status tim kembali menjadi 'mencari'
      const newStatus =
        remainingActive.length >= membership.team.competition.minTeamMembers
          ? 'terbentuk'
          : 'mencari';

      await tx.team.update({
        where: { id: teamId },
        data: { status: newStatus, version: { increment: 1 } },
      });
    }

    await recordAuditEvent({
      institutionId,
      actorId: userId,
      action: 'TEAM_LEFT',
      targetType: 'Team',
      targetId: teamId,
      metadata: { teamName: membership.team.name },
    });
  });

  return { message: 'Berhasil keluar dari tim' };
}

export async function sendInvite(
  senderId: string,
  teamId: string,
  receiverId: string,
  institutionId: string
): Promise<TeamInvite> {
  if (senderId === receiverId) {
    throw new ValidationError('Anda tidak dapat mengundang diri sendiri');
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      competition: true,
      members: { where: { status: 'active' } },
    },
  });

  if (!team) {
    throw new NotFoundError('Tim tidak ditemukan');
  }

  // Cek otorisasi pengirim: harus anggota aktif tim
  const isMember = team.members.some((m) => m.userId === senderId);
  if (!isMember) {
    throw new ForbiddenError('Hanya anggota tim yang dapat mengirimkan undangan');
  }

  if (team.status === 'terkunci_seleksi' || team.status === 'arsip') {
    throw new ForbiddenError('Tim tidak dapat menerima anggota baru');
  }

  if (team.members.length >= team.competition.maxTeamMembers) {
    throw new ConflictError('Kapasitas anggota tim telah penuh');
  }

  // Cek batas maksimal 5 undangan aktif yang belum direspon
  const activeInvitesCount = await prisma.teamInvite.count({
    where: {
      teamId,
      status: 'diajukan',
      expiresAt: { gt: new Date() },
    },
  });

  if (activeInvitesCount >= 5) {
    throw new ConflictError('Batas maksimal 5 undangan aktif untuk tim ini telah tercapai');
  }

  // Cek apakah calon penerima sudah memiliki undangan aktif dari tim ini
  const existingInvite = await prisma.teamInvite.findFirst({
    where: {
      teamId,
      receiverId,
      status: 'diajukan',
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new ConflictError('Undangan untuk mahasiswa ini masih aktif menunggu respon');
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 hari

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      senderId,
      receiverId,
      status: 'diajukan',
      expiresAt,
    },
  });

  await recordAuditEvent({
    institutionId,
    actorId: senderId,
    action: 'TEAM_INVITE_SENT',
    targetType: 'TeamInvite',
    targetId: invite.id,
    metadata: { teamId, receiverId },
  });

  return invite;
}

export async function getMyInvites(userId: string) {
  const incoming = await prisma.teamInvite.findMany({
    where: {
      receiverId: userId,
      status: 'diajukan',
      expiresAt: { gt: new Date() },
    },
    include: {
      team: {
        include: {
          competition: true,
          members: {
            where: { status: 'active' },
            include: { user: { include: { studentProfile: true } } },
          },
        },
      },
      sender: {
        include: { studentProfile: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const outgoing = await prisma.teamInvite.findMany({
    where: {
      senderId: userId,
    },
    include: {
      team: {
        include: { competition: true },
      },
      receiver: {
        include: { studentProfile: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { incoming, outgoing };
}

export async function respondInvite(
  userId: string,
  inviteId: string,
  action: 'diterima' | 'ditolak',
  institutionId: string
): Promise<{ message: string }> {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Ambil undangan dengan verifikasi penerima (Anti-IDOR)
        const invite = await tx.teamInvite.findFirst({
          where: {
            id: inviteId,
            receiverId: userId,
          },
          include: {
            team: {
              include: {
                competition: true,
              },
            },
          },
        });

        if (!invite) {
          throw new NotFoundError('Undangan tidak ditemukan atau Anda tidak berwenang meresponnya');
        }

        if (invite.status !== 'diajukan' || invite.expiresAt.getTime() < Date.now()) {
          throw new ValidationError('Undangan ini sudah tidak aktif atau telah kedaluwarsa');
        }

        if (action === 'ditolak') {
          await tx.teamInvite.update({
            where: { id: invite.id },
            data: { status: 'ditolak', respondedAt: new Date() },
          });

          await recordAuditEvent({
            institutionId,
            actorId: userId,
            action: 'TEAM_INVITE_REJECTED',
            targetType: 'TeamInvite',
            targetId: invite.id,
          });

          return { message: 'Undangan telah ditolak' };
        }

        // 2. Kunci baris tim terlebih dahulu (FOR UPDATE) untuk serialisasi konkurensi kapasitas
        await tx.$executeRaw`SELECT id FROM teams WHERE id = ${invite.teamId} FOR UPDATE`;

        // 3. Hitung jumlah anggota aktif secara locking read (FOR UPDATE) agar tidak membaca snapshot basi REPEATABLE READ
        const countRes = await tx.$queryRaw<Array<{ total: bigint | number }>>`
          SELECT COUNT(*) as total FROM team_members WHERE teamId = ${invite.teamId} AND status = 'active' FOR UPDATE
        `;
        const activeMembersCount = Number(countRes[0]?.total ?? 0);

        if (activeMembersCount >= invite.team.competition.maxTeamMembers) {
          await tx.teamInvite.update({
            where: { id: invite.id },
            data: { status: 'kedaluwarsa', respondedAt: new Date() },
          });
          throw new ConflictError('Kapasitas anggota tim telah penuh oleh rekan lain');
        }

        // Cek apakah mahasiswa sudah berada dalam tim aktif lain di kompetisi ini
        const existingMembership = await tx.teamMember.findFirst({
          where: {
            userId,
            status: 'active',
            team: {
              competitionId: invite.team.competitionId,
              status: { in: ['mencari', 'terbentuk', 'terkunci_seleksi'] },
            },
          },
        });

        if (existingMembership) {
          throw new ConflictError('Anda sudah berada dalam tim aktif lain untuk kompetisi ini');
        }

        // Tambahkan mahasiswa ke dalam tim
        await tx.teamMember.create({
          data: {
            teamId: invite.teamId,
            userId,
            roleInTeam: 'Anggota',
            status: 'active',
          },
        });

        await tx.teamInvite.update({
          where: { id: invite.id },
          data: { status: 'diterima', respondedAt: new Date() },
        });

        // Perbarui status tim jika sudah memenuhi batas minimum
        const newTotalMembers = activeMembersCount + 1;
        const newStatus =
          newTotalMembers >= invite.team.competition.minTeamMembers ? 'terbentuk' : 'mencari';

        await tx.team.update({
          where: { id: invite.teamId },
          data: { status: newStatus, version: { increment: 1 } },
        });

        await recordAuditEvent({
          institutionId,
          actorId: userId,
          action: 'TEAM_INVITE_ACCEPTED',
          targetType: 'TeamInvite',
          targetId: invite.id,
          metadata: { teamId: invite.teamId },
        });

        return { message: 'Berhasil bergabung dengan tim' };
      });
    } catch (err: any) {
      if (
        (err?.code === 'P2034' ||
          err?.cause?.originalCode === '1213' ||
          err?.message?.includes('Deadlock')) &&
        attempts < 3
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
        continue;
      }
      throw err;
    }
  }

  throw new ConflictError('Terjadi konflik konkurensi pada tim, silakan ulangi respon undangan.');
}
