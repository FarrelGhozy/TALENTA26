import React, { useState } from 'react';
import { UploadCloud, AlertCircle, Send } from 'lucide-react';
import { AchievementCategory, AchievementLevel, AchievementType, Achievement } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

interface AchievementFormProps {
  userId: string;
  onSubmit: (data: Omit<Achievement, 'id' | 'status' | 'institutionId'>) => Promise<void>;
  isLoading: boolean;
}

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
      setFormError('Nama file bukti sertifikat wajib diisi (contoh: sertifikat-nama.pdf).');
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
      bukti: [{ nama: fileName.trim(), size: 150000 }],
      dariSeleksiInternal,
    });
  };

  const handleQuickFile = (name: string) => {
    setFileName(name);
    setFormError('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 max-w-xl mx-auto bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs"
      noValidate={false}
    >
      {formError && (
        <div role="alert" className="flex items-center gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="space-y-4">
        <Input
          id="nama-kegiatan"
          label="Nama Kompetisi / Kegiatan"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="misal: Lomba Karya Tulis Ilmiah Nasional / Best Delegate MUN"
          required
          minLength={4}
        />

        <Input
          id="penyelenggara"
          label="Penyelenggara Kegiatan"
          value={penyelenggara}
          onChange={(e) => setPenyelenggara(e.target.value)}
          placeholder="misal: Universitas Brawijaya / Kemendikbudristek"
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
              { value: 'konferensi', label: 'Konferensi / MUN' },
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
              { value: 'lokal', label: 'Lokal / Kampus / Wilayah' },
              { value: 'nasional', label: 'Nasional' },
              { value: 'internasional', label: 'Internasional' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            id="capaian"
            label="Jenis Capaian"
            value={jenisCapaian}
            onChange={(e) => setJenisCapaian(e.target.value as AchievementType)}
            options={[
              { value: 'juara_1', label: 'Juara 1 / Emas' },
              { value: 'juara_2', label: 'Juara 2 / Perak' },
              { value: 'juara_3', label: 'Juara 3 / Perunggu' },
              { value: 'best_delegate', label: 'Best Delegate / Terbaik' },
              { value: 'nominasi', label: 'Finalis / Nominasi' },
              { value: 'penghargaan', label: 'Penghargaan Khusus' },
              { value: 'partisipasi', label: 'Peserta / Partisipasi' },
            ]}
          />

          <Input
            id="tanggal"
            label="Tanggal Kegiatan"
            type="date"
            value={tanggal}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />
        </div>
      </div>

      {/* File Upload Box */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <label htmlFor="bukti" className="block text-xs font-bold text-slate-800">
          Berkas Bukti Pendukung (Sertifikat / Piagam / SK Juara)
        </label>
        
        <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-xs space-y-3">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-slate-800 block">Unggah Bukti Dokumen</span>
              <span className="text-[11px] text-slate-400 block">Format: PDF, JPG, atau PNG (Maks 10 MB)</span>
            </div>
          </div>

          <Input
            id="bukti"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="contoh: sertifikat-juara-1.pdf"
          />

          {/* Quick presets for easy demo testing */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-medium">Contoh file cepat:</span>
            <button
              type="button"
              onClick={() => handleQuickFile('sertifikat-juara-1-nasional.pdf')}
              className="text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100"
            >
              sertifikat-juara-1.pdf
            </button>
            <button
              type="button"
              onClick={() => handleQuickFile('sk-pemenang-belmawa.pdf')}
              className="text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100"
            >
              sk-pemenang.pdf
            </button>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1 min-h-[40px]" htmlFor="dari-seleksi">
        <input
          id="dari-seleksi"
          type="checkbox"
          checked={dariSeleksiInternal}
          onChange={(e) => setDariSeleksiInternal(e.target.checked)}
          className="rounded text-blue-700 focus:ring-blue-600 mt-0.5 w-4 h-4 cursor-pointer"
        />
        <span className="leading-relaxed">
          Capaian ini berasal dari hasil Seleksi Internal Kampus TALENTA (diverifikasi oleh tim seleksi institusi).
        </span>
      </label>

      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
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
      <p className="text-[11px] text-slate-400 text-center">
        Setelah dikirim, status awal adalah <strong>Menunggu verifikasi</strong> oleh tim kampus.
      </p>
    </form>
  );
};