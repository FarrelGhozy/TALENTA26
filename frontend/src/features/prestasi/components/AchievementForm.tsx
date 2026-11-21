import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  AlertCircle,
  Send,
  FileCheck,
  FileText,
  X,
  Users,
  User as UserIcon,
  Award,
  Search,
  Plus,
} from 'lucide-react';
import {
  AchievementCategory,
  AchievementLevel,
  AchievementType,
  Achievement,
  Competition,
  CompetitionCategoryItem,
  StudentDirectoryItem,
  Team,
} from '../../../types';
import { APP_ENV, USE_MOCK } from '../../../config/env';
import { achievementService, competitionService, teamService, userService } from '@talenta/services';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';

interface AchievementFormProps {
  userId: string;
  onSubmit: (data: Omit<Achievement, 'id' | 'status' | 'institutionId'> & Record<string, any>, files?: File[]) => Promise<void>;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

const PRESET_FILES = [
  { label: 'Sertifikat Juara 1 PKM (PDF)', name: 'sertifikat-juara-1-pkm.pdf', size: 245000 },
  { label: 'SK Pemenang Rektorat (PDF)', name: 'sk-rektorat-pemenang-belmawa.pdf', size: 310000 },
  { label: 'Piagam Best Delegate (PDF)', name: 'piagam-best-delegate-mun.pdf', size: 180000 },
];

function getTodayJakarta(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const AchievementForm: React.FC<AchievementFormProps> = ({
  userId,
  onSubmit,
  isLoading,
}) => {
  const allowDemoPresets = APP_ENV === 'DEPLOYMENT' || USE_MOCK;
  const [nama, setNama] = useState('');
  const [penyelenggara, setPenyelenggara] = useState('');
  const [kategori, setKategori] = useState<AchievementCategory>('kompetisi');
  const [tingkat, setTingkat] = useState<AchievementLevel>('nasional');
  const [jenisCapaian, setJenisCapaian] = useState<AchievementType>('juara_1');
  const [tanggal, setTanggal] = useState(getTodayJakarta());
  const [deskripsi, setDeskripsi] = useState('');

  // Jenis & Sub-Lomba + Perlombaan Katalog + Kepesertaan
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionSlug, setCompetitionSlug] = useState('');
  const [compPointInfo, setCompPointInfo] = useState<{
    pointDescription?: string | null;
    customRules: Array<{ level: string; result: string; points: number; description?: string | null; subCategory?: { name: string } | null }>;
  } | null>(null);

  const [categories, setCategories] = useState<CompetitionCategoryItem[]>([]);
  const [competitionCategoryId, setCompetitionCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [subCompetitionName, setSubCompetitionName] = useState('');

  const [participationType, setParticipationType] = useState<'individu' | 'kelompok'>('individu');
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [useActiveTeam, setUseActiveTeam] = useState(true);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [directoryResults, setDirectoryResults] = useState<StudentDirectoryItem[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<StudentDirectoryItem[]>([]);

  const [selectedRealFiles, setSelectedRealFiles] = useState<File[]>([]);
  const [presetFileName, setPresetFileName] = useState('');
  const [presetFileSize, setPresetFileSize] = useState(150000);
  const [dariSeleksiInternal, setDariSeleksiInternal] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      competitionService.getAll().catch(() => []),
      achievementService.getCompetitionCategories?.().catch(() => []) ?? Promise.resolve([]),
      teamService.getTeamByUserId(userId).catch(() => null),
    ]).then(([comps, cats, team]) => {
      if (cancelled) return;
      setCompetitions(comps);
      setCategories(cats);
      setMyTeam(team && team.status !== 'arsip' ? team : null);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!competitionSlug) {
      setCompPointInfo(null);
      return;
    }
    const chosen = competitions.find((c) => c.slug === competitionSlug);
    if (chosen?.competitionCategoryId) {
      setCompetitionCategoryId(chosen.competitionCategoryId);
    }
    if (chosen?.penyelenggara && !penyelenggara) {
      setPenyelenggara(chosen.penyelenggara);
    }
    if (achievementService.getCompetitionPointConfig) {
      achievementService
        .getCompetitionPointConfig(competitionSlug)
        .then((res) => setCompPointInfo(res))
        .catch(() => setCompPointInfo(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionSlug]);

  useEffect(() => {
    if (participationType !== 'kelompok' || !userService.searchStudents) return;
    const timer = setTimeout(() => {
      userService
        .searchStudents?.(memberSearchQuery.trim() || undefined)
        .then((list) => setDirectoryResults(list.filter((s) => s.userId !== userId)))
        .catch(() => setDirectoryResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [participationType, memberSearchQuery, userId]);

  const activeCategoryObj = categories.find((c) => c.id === competitionCategoryId);
  const subCategories = activeCategoryObj?.subCategories?.filter((s) => s.isActive) || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('');
    if (!e.target.files) return;
    const fileList = Array.from(e.target.files);
    if (fileList.length > 3) {
      setFormError('Maksimal berkas bukti yang diizinkan adalah 3 berkas.');
      return;
    }
    for (const f of fileList) {
      if (f.size > MAX_FILE_SIZE) {
        setFormError(`Ukuran berkas '${f.name}' melebihi batas maksimal 8 MB.`);
        return;
      }
      const ext = f.name.toLowerCase().split('.').pop();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        setFormError(`Berkas '${f.name}' harus berformat PDF, JPG, atau PNG.`);
        return;
      }
    }
    setSelectedRealFiles(fileList);
    setPresetFileName('');
  };

  const handleAddMember = (student: StudentDirectoryItem) => {
    if (!selectedMembers.some((m) => m.userId === student.userId)) {
      setSelectedMembers((prev) => [...prev, student]);
    }
  };

  const handleRemoveMember = (targetId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.userId !== targetId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (nama.trim().length < 3) {
      setFormError('Nama kegiatan minimal 3 karakter.');
      return;
    }
    if (penyelenggara.trim().length < 2) {
      setFormError('Penyelenggara kegiatan minimal 2 karakter.');
      return;
    }
    const today = getTodayJakarta();
    if (!tanggal || tanggal > today) {
      setFormError('Tanggal kegiatan tidak boleh berada di masa depan.');
      return;
    }

    if (
      participationType === 'kelompok' &&
      !(useActiveTeam && myTeam) &&
      selectedMembers.length === 0
    ) {
      setFormError('Untuk prestasi kelompok, pilih tim aktif atau tambahkan minimal 1 anggota kelompok.');
      return;
    }

    const hasRealFiles = selectedRealFiles.length > 0;
    const hasPreset = allowDemoPresets && Boolean(presetFileName.trim());

    if (!hasRealFiles && !hasPreset) {
      setFormError('Wajib mengunggah minimal 1 berkas bukti (PDF, JPG, atau PNG).');
      return;
    }

    const bukti = hasRealFiles
      ? selectedRealFiles.map((f) => ({ nama: f.name, size: f.size }))
      : [{ nama: presetFileName.trim(), size: presetFileSize }];

    let filesToSubmit: File[] = selectedRealFiles;
    if (!hasRealFiles && hasPreset) {
      const validPdfHeader =
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000108 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n182\n%%EOF';
      const syntheticBlob = new Blob([validPdfHeader], { type: 'application/pdf' });
      const syntheticFile = new File([syntheticBlob], presetFileName.trim(), {
        type: 'application/pdf',
      });
      filesToSubmit = [syntheticFile];
    }

    const chosenComp = competitions.find((c) => c.slug === competitionSlug);

    onSubmit(
      {
        userId,
        nama: nama.trim(),
        penyelenggara: penyelenggara.trim(),
        kategori,
        tingkat,
        jenisCapaian,
        tanggal,
        deskripsi: deskripsi.trim() || undefined,
        bukti,
        dariSeleksiInternal,
        competitionId: chosenComp?.id || undefined,
        competitionSlug: competitionSlug || undefined,
        competitionCategoryId: competitionCategoryId || undefined,
        subCategoryId: subCategoryId || undefined,
        subCompetitionName: subCompetitionName.trim() || undefined,
        participationType,
        teamId: participationType === 'kelompok' && useActiveTeam && myTeam ? myTeam.id : undefined,
        participantUserIds:
          participationType === 'kelompok' ? selectedMembers.map((m) => m.userId) : undefined,
      },
      filesToSubmit.length > 0 ? filesToSubmit : undefined
    );
  };

  const handleSelectPresetFile = (file: (typeof PRESET_FILES)[0]) => {
    setSelectedRealFiles([]);
    setPresetFileName(file.name);
    setPresetFileSize(file.size);
    setFormError('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs"
      noValidate={false}
    >
      {formError && (
        <div role="alert" className="flex items-center gap-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3.5 font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      {/* Kepesertaan: Individu vs Kelompok */}
      <div className="space-y-2">
        <span className="block text-xs font-bold text-slate-800">Kepesertaan Lomba / Kegiatan</span>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setParticipationType('individu')}
            className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
              participationType === 'individu'
                ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600/20'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserIcon className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs font-extrabold">Individu (Perorangan)</div>
              <div className="text-[11px] text-slate-500">Poin masuk ke akun Anda sendiri</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setParticipationType('kelompok')}
            className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
              participationType === 'kelompok'
                ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-1 ring-blue-600/20'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs font-extrabold">Kelompok / Tim</div>
              <div className="text-[11px] text-slate-500">Semua anggota dapat poin penuh</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="space-y-4">
        <Input
          id="nama-kegiatan"
          label="Nama Kompetisi / Kegiatan Capaian"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="misal: Lomba Inovasi Digital Mahasiswa (LIDM) / Karya Tulis Ilmiah"
          required
          minLength={3}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            id="penyelenggara"
            label="Penyelenggara Kegiatan"
            value={penyelenggara}
            onChange={(e) => setPenyelenggara(e.target.value)}
            placeholder="misal: Kemendikbudristek / Universitas Indonesia"
            required
          />

          <Select
            id="competition-slug"
            label="Tautkan Lomba Katalog (Opsional)"
            value={competitionSlug}
            onChange={(e) => setCompetitionSlug(e.target.value)}
            options={[
              { value: '', label: 'Lomba Eksternal / Di Luar Katalog' },
              ...competitions.map((c) => ({ value: c.slug, label: c.namaResmi })),
            ]}
          />
        </div>

        {/* Jenis & Sub-Lomba untuk perhitungan poin 3-lapis */}
        {categories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              id="competition-category"
              label="Jenis / Rumpun Lomba"
              value={competitionCategoryId}
              onChange={(e) => {
                setCompetitionCategoryId(e.target.value);
                setSubCategoryId('');
              }}
              options={[
                { value: '', label: 'Pilih Jenis Lomba (Opsional)' },
                ...categories.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            {subCategories.length > 0 ? (
              <Select
                id="sub-category"
                label="Sub-Lomba / Divisi"
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
                options={[
                  { value: '', label: 'Pilih Sub-Lomba (Opsional)' },
                  ...subCategories.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            ) : (
              <Input
                id="sub-competition-name"
                label="Nama Divisi / Sub-Lomba (Opsional)"
                value={subCompetitionName}
                onChange={(e) => setSubCompetitionName(e.target.value)}
                placeholder="misal: Divisi Inovasi Teknologi Pendidikan"
              />
            )}
          </div>
        )}

        {compPointInfo && (
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-1">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              Keterangan Poin Perlombaan
            </div>
            <p className="text-[11px] leading-relaxed">
              {compPointInfo.pointDescription ||
                'Perlombaan ini mengikuti ketentuan poin khusus / template poin kampus saat diverifikasi validator.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            id="kategori"
            label="Kategori Kegiatan"
            value={kategori}
            onChange={(e) => setKategori(e.target.value as AchievementCategory)}
            options={[
              { value: 'kompetisi', label: 'Kompetisi Lomba (Masuk Ranking)' },
              { value: 'konferensi', label: 'Konferensi / Seminar Ilmiah' },
              { value: 'olahraga', label: 'Kejuaraan Olahraga' },
              { value: 'seni', label: 'Festival Seni & Budaya' },
              { value: 'nominasi', label: 'Nominasi / Penghargaan Khusus' },
              { value: 'lain', label: 'Lainnya' },
            ]}
          />

          <Select
            id="tingkat"
            label="Tingkat Wilayah"
            value={tingkat}
            onChange={(e) => setTingkat(e.target.value as AchievementLevel)}
            options={[
              { value: 'lokal', label: 'Lokal / Kampus' },
              { value: 'nasional', label: 'Nasional' },
              { value: 'internasional', label: 'Internasional' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            id="capaian"
            label="Jenis Capaian / Gelar Juara"
            value={jenisCapaian}
            onChange={(e) => setJenisCapaian(e.target.value as AchievementType)}
            options={[
              { value: 'juara_1', label: 'Juara 1 / Medali Emas' },
              { value: 'juara_2', label: 'Juara 2 / Medali Perak' },
              { value: 'juara_3', label: 'Juara 3 / Medali Perunggu' },
              { value: 'finalis', label: 'Finalis / Nominasi' },
              { value: 'penghargaan_khusus', label: 'Penghargaan Khusus / Best Delegate' },
              { value: 'partisipasi', label: 'Partisipasi / Peserta Terpilih' },
            ]}
          />

          <Input
            id="tanggal"
            label="Tanggal Perolehan Capaian"
            type="date"
            value={tanggal}
            max={getTodayJakarta()}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="deskripsi-capaian" className="block text-xs font-bold text-slate-800 mb-1.5">
            Deskripsi / Ringkasan Karya atau Capaian (Opsional)
          </label>
          <textarea
            id="deskripsi-capaian"
            rows={2}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Jelaskan singkat judul karya, cabang lomba, atau konteks capaian untuk memudahkan validator..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Pilihan Anggota Kelompok */}
      {participationType === 'kelompok' && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-700" aria-hidden="true" />
              Daftar Anggota Kelompok
            </h3>
            <Badge color="blue" size="sm">Semua anggota mendapat poin penuh</Badge>
          </div>

          {myTeam && (
            <label className="flex items-start gap-2.5 text-xs text-slate-700 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={useActiveTeam}
                onChange={(e) => setUseActiveTeam(e.target.checked)}
                className="mt-0.5 rounded text-blue-700"
              />
              <div>
                <span className="font-bold text-slate-900 block">
                  Sertakan seluruh anggota aktif tim "{myTeam.nama}" ({myTeam.anggota.filter((a) => a.status === 'diterima').length} anggota)
                </span>
                <span className="text-[11px] text-slate-500">
                  Anda juga bisa menambah rekan lain di bawah bila diperlukan.
                </span>
              </div>
            </label>
          )}

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">
              Cari & Tambahkan Anggota Mahasiswa Lain (Nama atau NIM)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Ketik nama mahasiswa atau NIM..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
            </div>

            {directoryResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {directoryResults.slice(0, 6).map((s) => {
                  const alreadyAdded = selectedMembers.some((m) => m.userId === s.userId);
                  return (
                    <div key={s.userId} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{s.fullName}</div>
                        <div className="text-[10px] text-slate-400">{s.nim} • {s.studyProgram}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={alreadyAdded ? 'outline' : 'secondary'}
                        disabled={alreadyAdded}
                        onClick={() => handleAddMember(s)}
                        leftIcon={<Plus className="w-3 h-3" aria-hidden="true" />}
                      >
                        {alreadyAdded ? 'Ditambahkan' : 'Tambah'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedMembers.map((m) => (
                  <span
                    key={m.userId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold"
                  >
                    {m.fullName} ({m.nim})
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.userId)}
                      aria-label={`Hapus ${m.fullName} dari daftar anggota`}
                      className="text-blue-700 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Upload Dropzone */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <label htmlFor="bukti-file-input" className="block text-xs font-bold text-slate-800">
          Dokumen Bukti Pendukung (Sertifikat / SK Juara / Piagam)
        </label>

        <div className="p-5 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 text-xs space-y-3.5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 text-blue-700 flex items-center justify-center mx-auto shadow-2xs">
            <UploadCloud className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <div className="font-extrabold text-slate-800 text-sm">
              Pilih Berkas Bukti Nyata (Maksimal 3 berkas, 8 MB per berkas)
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Format yang diterima: <strong>PDF, JPG, atau PNG</strong>. Disimpan secara privat.
            </p>
          </div>

          <div>
            <label
              htmlFor="bukti-file-input"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-blue-800 transition-colors shadow-2xs"
            >
              <UploadCloud className="w-4 h-4" aria-hidden="true" />
              <span>Pilih Berkas dari Perangkat</span>
            </label>
            <input
              id="bukti-file-input"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>

          {allowDemoPresets && (
            <div className="space-y-1.5 pt-2 border-t border-blue-100/80">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Atau Gunakan Berkas Contoh Demo Cepat:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {PRESET_FILES.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => handleSelectPresetFile(f)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                      presetFileName === f.name
                        ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedRealFiles.length > 0 && (
            <div className="space-y-2 pt-1">
              {selectedRealFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-3 text-left shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="font-extrabold text-xs text-slate-900 truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {(file.size / 1024).toFixed(0)} KB • Berkas Asli Terpilih
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRealFiles(selectedRealFiles.filter((_, i) => i !== idx))
                    }
                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                    aria-label={`Hapus berkas ${file.name}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {presetFileName && selectedRealFiles.length === 0 && (
            <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-3 text-left shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">{presetFileName}</div>
                  <div className="text-[10px] text-slate-400">
                    {(presetFileSize / 1024).toFixed(0)} KB • Berkas Contoh Demo
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPresetFileName('')}
                className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                aria-label="Batalkan pilihan file"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Internal Selection Toggle */}
      <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer pt-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80" htmlFor="dari-seleksi">
        <input
          id="dari-seleksi"
          type="checkbox"
          checked={dariSeleksiInternal}
          onChange={(e) => setDariSeleksiInternal(e.target.checked)}
          className="rounded text-blue-700 focus:ring-blue-600 mt-0.5 w-4 h-4 cursor-pointer"
        />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 block">
            Capaian Berasal dari Seleksi Internal Kampus TALENTA
          </span>
          <span className="text-[11px] text-slate-500 block leading-relaxed">
            Centang opsi ini jika prestasi diperoleh melalui jalur seleksi internal.
          </span>
        </div>
      </label>

      {/* Submit Button */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400">
          Status awal setelah dikirim: <strong>Menunggu verifikasi</strong>.
        </span>
        <Button
          type="submit"
          isLoading={isLoading}
          size="md"
          className="w-full sm:w-auto"
          rightIcon={<Send className="w-4 h-4" aria-hidden="true" />}
        >
          Kirim Pengajuan Prestasi
        </Button>
      </div>
    </form>
  );
};
