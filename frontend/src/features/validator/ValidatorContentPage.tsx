import React, { useEffect, useState } from 'react';
import { BookOpenCheck, Contact, Plus, Send, Trophy } from 'lucide-react';
import { validatorContentService } from '@talenta/services';
import type { ValidatorCompetitionItem } from '../../services/types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoading } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

const initialCompetition = {
  name: '',
  organizer: '',
  category: '',
  level: 'nasional',
  format: 'beregu' as 'individu' | 'beregu',
  minTeamMembers: 2,
  maxTeamMembers: 5,
  description: '',
};

export const ValidatorContentPage: React.FC = () => {
  const [tab, setTab] = useState('kompetisi');
  const [items, setItems] = useState<ValidatorCompetitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [competition, setCompetition] = useState(initialCompetition);
  const [roadmap, setRoadmap] = useState({ competitionSlug: '', phaseTitle: '', taskTitle: '' });
  const [consultant, setConsultant] = useState({ competitionSlug: '', name: '', field: '', whatsappNumber: '' });
  const [selections, setSelections] = useState<Array<{ id: string; stage: string; result: string; organizerVerified: boolean; competition?: { name: string }; team?: { name: string } }>>([]);
  const [selection, setSelection] = useState({ competitionId: '', teamId: '', stage: '', result: 'menunggu' as 'menunggu' | 'lolos' | 'tidak', organizerVerified: false });
  const { notify } = useToast();

  const load = async () => {
    try {
      setError('');
      const [competitions, selectionRows] = await Promise.all([
        validatorContentService.getCompetitions(),
        validatorContentService.getSelections(),
      ]);
      setItems(competitions);
      setSelections(selectionRows);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat konten validator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createCompetition = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await validatorContentService.createCompetition(competition);
      setCompetition(initialCompetition);
      notify('Draft kompetisi berhasil dibuat.', 'success');
      await load();
    } catch (err: any) {
      notify(err.message || 'Gagal membuat kompetisi.', 'error');
    }
  };

  const saveRoadmap = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await validatorContentService.saveRoadmap(roadmap.competitionSlug, [{
        orderIndex: 1,
        title: roadmap.phaseTitle,
        tasks: [{ orderIndex: 1, title: roadmap.taskTitle, isRequired: true }],
      }]);
      notify('Roadmap berhasil disimpan.', 'success');
    } catch (err: any) {
      notify(err.message || 'Gagal menyimpan roadmap.', 'error');
    }
  };

  const saveConsultant = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await validatorContentService.createConsultant(consultant);
      notify('Kontak konsultasi berhasil diterbitkan.', 'success');
    } catch (err: any) {
      notify(err.message || 'Gagal menyimpan kontak.', 'error');
    }
  };

  const saveSelection = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await validatorContentService.saveSelection(selection);
      notify('Hasil seleksi berhasil dicatat.', 'success');
      await load();
    } catch (err: any) {
      notify(err.message || 'Gagal menyimpan hasil seleksi.', 'error');
    }
  };

  const options = items.map((item) => ({ value: item.slug, label: item.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ruang validator"
        title="Kelola konten pembinaan"
        description="Buat draft kompetisi, terbitkan informasi, susun roadmap, dan kelola kontak konsultasi."
      />
      <Tabs
        tabs={[
          { id: 'kompetisi', label: 'Kompetisi' },
          { id: 'roadmap', label: 'Roadmap' },
          { id: 'konsultan', label: 'Kontak konsultasi' },
          { id: 'seleksi', label: 'Seleksi internal' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0} className="space-y-5">
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        {loading ? <PageLoading message="Memuat konten pembinaan..." /> : null}

        {!loading && tab === 'kompetisi' && (
          <>
            <form onSubmit={createCompetition} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              <Input label="Nama kompetisi" value={competition.name} onChange={(e) => setCompetition({ ...competition, name: e.target.value })} required />
              <Input label="Penyelenggara" value={competition.organizer} onChange={(e) => setCompetition({ ...competition, organizer: e.target.value })} required />
              <Input label="Kategori" value={competition.category} onChange={(e) => setCompetition({ ...competition, category: e.target.value })} required />
              <Select label="Format" value={competition.format} onChange={(e) => setCompetition({ ...competition, format: e.target.value as 'individu' | 'beregu' })} options={[{ value: 'individu', label: 'Individu' }, { value: 'beregu', label: 'Beregu' }]} />
              <div className="sm:col-span-2"><Input label="Deskripsi" value={competition.description} onChange={(e) => setCompetition({ ...competition, description: e.target.value })} required /></div>
              <div className="sm:col-span-2"><Button type="submit" leftIcon={<Plus className="h-4 w-4" />}>Buat draft</Button></div>
            </form>
            {items.length === 0 ? (
              <EmptyState icon={<Trophy className="h-6 w-6" />} title="Belum ada kompetisi" description="Buat draft pertama melalui formulir di atas." />
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><strong>{item.name}</strong><p className="text-xs text-slate-500">{item.organizer} • {item.status}</p></div>
                    <div className="flex gap-2">
                      {item.status !== 'published' && <Button size="sm" onClick={async () => { await validatorContentService.setCompetitionStatus(item.id, 'published'); await load(); }} leftIcon={<Send className="h-4 w-4" />}>Terbitkan</Button>}
                      {item.status !== 'archived' && <Button size="sm" variant="outline" onClick={async () => { await validatorContentService.setCompetitionStatus(item.id, 'archived'); await load(); }}>Arsipkan</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!loading && tab === 'roadmap' && (
          <form onSubmit={saveRoadmap} className="space-y-4 rounded-2xl border bg-white p-5">
            <Select label="Kompetisi" value={roadmap.competitionSlug} onChange={(e) => setRoadmap({ ...roadmap, competitionSlug: e.target.value })} options={[{ value: '', label: 'Pilih kompetisi' }, ...options]} required />
            <Input label="Nama fase" value={roadmap.phaseTitle} onChange={(e) => setRoadmap({ ...roadmap, phaseTitle: e.target.value })} required />
            <Input label="Tugas pertama" value={roadmap.taskTitle} onChange={(e) => setRoadmap({ ...roadmap, taskTitle: e.target.value })} required />
            <Button type="submit" leftIcon={<BookOpenCheck className="h-4 w-4" />}>Simpan roadmap</Button>
          </form>
        )}

        {!loading && tab === 'konsultan' && (
          <form onSubmit={saveConsultant} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Select label="Kompetisi" value={consultant.competitionSlug} onChange={(e) => setConsultant({ ...consultant, competitionSlug: e.target.value })} options={[{ value: '', label: 'Pilih kompetisi' }, ...options]} required /></div>
            <Input label="Nama kontak" value={consultant.name} onChange={(e) => setConsultant({ ...consultant, name: e.target.value })} required />
            <Input label="Bidang" value={consultant.field} onChange={(e) => setConsultant({ ...consultant, field: e.target.value })} required />
            <Input label="Nomor WhatsApp" value={consultant.whatsappNumber} onChange={(e) => setConsultant({ ...consultant, whatsappNumber: e.target.value })} required />
            <div className="sm:col-span-2"><Button type="submit" leftIcon={<Contact className="h-4 w-4" />}>Terbitkan kontak</Button></div>
          </form>
        )}

        {!loading && tab === 'seleksi' && (
          <div className="space-y-5">
            <form onSubmit={saveSelection} className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
              <Select label="Kompetisi" value={selection.competitionId} onChange={(e) => setSelection({ ...selection, competitionId: e.target.value })} options={[{ value: '', label: 'Pilih kompetisi' }, ...items.map((item) => ({ value: item.id, label: item.name }))]} required />
              <Input label="ID tim peserta" value={selection.teamId} onChange={(e) => setSelection({ ...selection, teamId: e.target.value })} helper="Gunakan ID tim yang sudah terbentuk pada kompetisi ini." required />
              <Input label="Tahap seleksi" value={selection.stage} onChange={(e) => setSelection({ ...selection, stage: e.target.value })} required />
              <Select label="Hasil" value={selection.result} onChange={(e) => setSelection({ ...selection, result: e.target.value as 'menunggu' | 'lolos' | 'tidak' })} options={[{ value: 'menunggu', label: 'Menunggu' }, { value: 'lolos', label: 'Lolos' }, { value: 'tidak', label: 'Tidak lolos' }]} />
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selection.organizerVerified} onChange={(e) => setSelection({ ...selection, organizerVerified: e.target.checked })} /> Hasil telah dikonfirmasi panitia</label>
              <div className="sm:col-span-2"><Button type="submit">Simpan hasil seleksi</Button></div>
            </form>
            {selections.length > 0 && <ul className="space-y-2">{selections.map((item) => <li key={item.id} className="rounded-xl border bg-white p-4 text-sm"><strong>{item.competition?.name || 'Kompetisi'} — {item.team?.name || 'Tim'}</strong><p className="text-xs text-slate-500">{item.stage} • {item.result} • {item.organizerVerified ? 'dikonfirmasi panitia' : 'belum dikonfirmasi'}</p></li>)}</ul>}
          </div>
        )}
      </div>
    </div>
  );
};
