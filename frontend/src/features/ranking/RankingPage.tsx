import React, { useEffect, useMemo, useState } from 'react';
import { Award, Medal, Trophy } from 'lucide-react';
import { achievementService, userService } from '@talenta/services';
import { Achievement, User } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageLoading } from '../../components/ui/Skeleton';

const resultPoints: Record<string, number> = {
  partisipasi: 2, nominasi: 5, penghargaan: 8, juara_3: 10, juara_2: 14, juara_1: 18, best_delegate: 8,
};
const levelMultiplier: Record<string, number> = { lokal: 0.5, nasional: 1, internasional: 1.5 };

export const RankingPage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([achievementService.getAll(), userService.getAll()])
      .then(([items, people]) => { setAchievements(items); setUsers(people); })
      .catch(() => setError('Ranking simulasi belum dapat dimuat.'))
      .finally(() => setLoading(false));
  }, []);

  const ranking = useMemo(() => {
    const totals = new Map<string, { points: number; count: number }>();
    achievements.filter((item) => item.kategori === 'kompetisi' && item.status === 'disetujui').forEach((item) => {
      const current = totals.get(item.userId) || { points: 0, count: 0 };
      current.points += Math.round((resultPoints[item.jenisCapaian] || 0) * (levelMultiplier[item.tingkat] || 1));
      current.count += 1;
      totals.set(item.userId, current);
    });
    return [...totals.entries()].map(([userId, score]) => ({ user: users.find((user) => user.id === userId), ...score }))
      .filter((item): item is typeof item & { user: User } => Boolean(item.user))
      .sort((a, b) => b.points - a.points || b.count - a.count || a.user.nama.localeCompare(b.user.nama));
  }, [achievements, users]);

  if (loading) return <PageLoading message="Memuat ranking prestasi…" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader eyebrow="Tahun akademik 2026/2027" title="Ranking prestasi mahasiswa" description="Prototipe ranking dari akumulasi poin prestasi lomba yang berstatus disetujui. Bobot final akan ditetapkan sebelum data nyata digunakan." />
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p> : null}
      {!error && ranking.length === 0 ? <EmptyState icon={<Trophy aria-hidden="true" className="h-6 w-6" />} title="Belum ada ranking" description="Ranking akan muncul setelah prestasi lomba disetujui validator." /> : null}
      {ranking.length > 0 ? (
        <ol className="space-y-3" aria-label="Ranking mahasiswa">
          {ranking.map((item, index) => (
            <li key={item.user.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl font-black ${index === 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`} aria-label={`Peringkat ${index + 1}`}>
                {index === 0 ? <Medal aria-hidden="true" className="h-5 w-5" /> : index + 1}
              </span>
              <div><p className="font-extrabold text-slate-950">{item.user.nama}</p><p className="text-sm text-slate-600">{item.user.prodi} · {item.count} prestasi lomba disetujui</p></div>
              <div className="text-right"><p className="text-xl font-black text-blue-800">{item.points}</p><p className="flex items-center justify-end gap-1 text-xs font-bold uppercase tracking-wide text-slate-500"><Award aria-hidden="true" className="h-3.5 w-3.5" /> poin</p></div>
            </li>
          ))}
        </ol>
      ) : null}
      <p className="rounded-xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">Data pada halaman ini adalah simulasi. NIM, email, kontak, dan berkas bukti tidak ditampilkan.</p>
    </div>
  );
};
