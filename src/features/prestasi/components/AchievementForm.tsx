import React, { useState } from 'react';
import { UploadCloud, AlertCircle, Send, FileCheck, FileText, X } from 'lucide-react';
import { AchievementCategory, AchievementLevel, AchievementType, Achievement } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

interface AchievementFormProps {
  userId: string;
  onSubmit: (data: Omit<Achievement, 'id' | 'status' | 'institutionId'>) => Promise<void>;
  isLoading: boolean;
}

const PRESET_FILES = [
  { label: 'Sertifikat Juara 1 PKM (PDF)', name: 'sertifikat-juara-1-pkm.pdf', size: 245000 },
  { label: 'SK Pemenang Rektorat (PDF)', name: 'sk-rektorat-pemenang-belmawa.pdf', size: 310000 },
  { label: 'Piagam Best Delegate (PNG)', name: 'piagam-best-delegate-mun.png', size: 180000 },
];

export const AchievementForm: React.FC<AchievementFormProps> = ({
  userId,
  onSubmit,
  isLoading,
}) => {
  const [nama, setNama] = useState('');
  const [penyelenggara, setPenyelenggara] = useState('');
  const [kategori, setKategori] = useState<AchievementCategory>('kompetisi');
  const [tingkat, setTingkat] = useState<AchievementLevel>('nasional');
  const [jenisCapaian, setJenisCapaian] = useState<AchievementType>('juara_1');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(150000);
  const [dariSeleksiInternal, setDariSeleksiInternal] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (nama.trim().length < 4) {
      setFormError('Nama kegiatan minimal 4 karakter.');
      return;
    }
    if (penyelenggara.trim().length < 3) {
      setFormError('Penyelenggara kegiatan wajib diisi.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (!tanggal || tanggal > today) {
      setFormError('Tanggal kegiatan tidak boleh berada di masa depan.');
      return;
    }
    if (!fileName.trim()) {
      setFormError('Berkas bukti sertifikat wajib diunggah (pilih salah satu contoh berkas cepat di bawah).');
      return;
    }
    const validExt = /\.(pdf|jpg|jpeg|png)$/i.test(fileName.trim());
    if (!validExt) {
      setFormError('Bukti harus berformat PDF, JPG, atau PNG.');
      return;
    }
    onSubmit({
      userId,
      nama: nama.trim(),
      penyelenggara: penyelenggara.trim(),
      kategori,
      tingkat,
      jenisCapaian,
      tanggal,
      bukti: [{ nama: fileName.trim(), size: fileSize }],
      dariSeleksiInternal,
    });
  };

  const handleSelectPresetFile = (file: (typeof PRESET_FILES)[0]) => {
    setFileName(file.name);
    setFileSize(file.size);
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
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="space-y-4">
        <Input
          id="nama-kegiatan"
          label="Nama Kompetisi / Kegiatan Capaian"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="misal: Lomba Karya Tulis Ilmiah Nasional Belmawa / Best Paper ICET"
          required
          minLength={4}
        />

        <Input
          id="penyelenggara"
          label="Penyelenggara Kegiatan"
          value={penyelenggara}
          onChange={(e) => setPenyelenggara(e.target.value)}
          placeholder="misal: Kemendikbudristek / Universitas Indonesia / IEEE"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            id="kategori"
            label="Kategori Kegiatan"
            value={kategori}
            onChange={(e) => setKategori(e.target.value as AchievementCategory)}
            options={[
              { value: 'kompetisi', label: 'Kompetisi Akademik / Belmawa' },
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
              { value: 'best_delegate', label: 'Best Delegate / Terbaik' },
              { value: 'nominasi', label: 'Finalis / Nominasi' },
              { value: 'penghargaan', label: 'Penghargaan Khusus / Harapan' },
              { value: 'partisipasi', label: 'Peserta Terpilih' },
            ]}
          />

          <Input
            id="tanggal"
            label="Tanggal Perolehan Capaian"
            type="date"
            value={tanggal}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Simulator File Upload Dropzone */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <label htmlFor="bukti" className="block text-xs font-bold text-slate-800">
          Dokumen Bukti Pendukung (Sertifikat / SK Juara / Piagam)
        </label>

        <div className="p-5 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 text-xs space-y-3.5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200 text-blue-700 flex items-center justify-center mx-auto shadow-2xs">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="font-extrabold text-slate-800 text-sm">
              Area Unggah Berkas Bukti (Simulasi)
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Format yang diterima: <strong>PDF, JPG, atau PNG</strong>. Di mode demo, gunakan tombol contoh cepat di bawah:
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Pilih Berkas Contoh Demo:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PRESET_FILES.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => handleSelectPresetFile(f)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                    fileName === f.name
                      ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected File Card Indicator */}
          {fileName && (
            <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-3 text-left shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">{fileName}</div>
                  <div className="text-[10px] text-slate-400">{(fileSize / 1024).toFixed(0)} KB • Berkas Terpilih</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFileName('')}
                className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                aria-label="Batalkan pilihan file"
              >
                <X className="w-4 h-4" />
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
            Centang opsi ini jika prestasi diperoleh melalui jalur seleksi resmi universitas (SK Rektorat / BAAK).
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
          rightIcon={<Send className="w-4 h-4" />}
        >
          Kirim Pengajuan Prestasi
        </Button>
      </div>
    </form>
  );
};
