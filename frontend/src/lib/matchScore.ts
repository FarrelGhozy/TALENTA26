import { Competition, MatchCandidate, User } from '../types';

export function calculateMatchScore(
  currentUser: User,
  candidate: User,
  competition: Competition,
  teamFilledRoles: string[] = []
): MatchCandidate | null {
  if (currentUser.id === candidate.id) return null;

  const reasons: string[] = [];

  // 1. Target kompetisi - in caller already filtered or verified
  const targetScore = 30;

  // 2. Komplemen Peran (25 poin)
  const neededRoles = competition.komposisi.peranWajib.filter((r) => !teamFilledRoles.includes(r));
  const candidateCanFillNeeded = candidate.peranBisa.some((r) => neededRoles.includes(r));
  let roleScore = 0;
  if (candidateCanFillNeeded) {
    roleScore = 25;
    const filled = candidate.peranBisa.find((r) => neededRoles.includes(r));
    reasons.push(`+peran: Melengkapi peran ${filled} yang belum terisi`);
  } else if (candidate.peranBisa.some((r) => !currentUser.peranBisa.includes(r))) {
    roleScore = 15;
    const diff = candidate.peranBisa.filter((r) => !currentUser.peranBisa.includes(r));
    reasons.push(`+peran: Membawa variasi peran (${diff.join(', ')})`);
  } else {
    roleScore = 5;
  }

  // 3. Komplemen Skill (20 poin)
  const mySkillNames = currentUser.skill.map((s) => s.nama.toLowerCase());
  const complementarySkills = candidate.skill.filter((s) => !mySkillNames.includes(s.nama.toLowerCase()));
  let skillScore = 0;
  if (complementarySkills.length > 0) {
    skillScore = Math.min(20, 10 + complementarySkills.length * 5);
    reasons.push(`+skill: Menutup gap keahlian (${complementarySkills.map((s) => s.nama).slice(0, 2).join(', ')})`);
  } else {
    skillScore = 8;
  }

  // 4. Overlap Waktu (15 poin)
  const sharedDays = currentUser.ketersediaan.hari.filter((d) => candidate.ketersediaan.hari.includes(d));
  const minJam = Math.min(currentUser.ketersediaan.jam, candidate.ketersediaan.jam);
  let timeScore = 0;
  let isOverlapTime = true;

  if (sharedDays.length > 0 && minJam >= 6) {
    timeScore = 15;
    reasons.push(`+waktu: Komitmen sinkron di hari ${sharedDays.slice(0, 2).join(', ')} (~${minJam} jam/minggu)`);
  } else if (sharedDays.length > 0) {
    timeScore = 8;
    reasons.push(`!waktu: Hari sama (${sharedDays.join(', ')}), namun jam ketersediaan terbatas`);
  } else {
    timeScore = 2;
    isOverlapTime = false;
    reasons.push(`!waktu: Jadwal kosong belum sinkron`);
  }

  // 5. Kemiripan Minat (10 poin)
  const sharedInterests = currentUser.minat.filter((m) => candidate.minat.includes(m));
  let interestScore = 0;
  if (sharedInterests.length > 0) {
    interestScore = 10;
    reasons.push(`+minat: Kesamaan minat pada ${sharedInterests.join(', ')}`);
  } else {
    interestScore = 4;
  }

  const rawScore = targetScore + roleScore + skillScore + timeScore + interestScore;
  const matchScore = Math.min(99, Math.max(30, Math.round(rawScore)));

  return {
    user: candidate,
    matchScore,
    reasons,
    isOverlapTime,
  };
}
