import React, { useState } from 'react';
import { Lightbulb, Sparkles, Bot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export const AiBoxMock: React.FC = () => {
  const [activeSuggestion, setActiveSuggestion] = useState<string>('judul');

  const simulatedResponses: Record<string, { title: string; content: string }> = {
    judul: {
      title: 'Analisis Judul & Relevansi Topik PKM 2026',
      content:
        'Judul proposal telah memuat kata kunci spesifik dan relevan dengan Sustainable Development Goals (SDGs). Saran: Sertakan lokus studi empiris atau metodologi terukur agar nilai urgensi kebaruan (novelty) semakin kuat di mata reviewer nasional.',
    },
    struktur: {
      title: 'Audit Kepatuhan Format & Sistematika Pedoman',
      content:
        'Format Bab 1 (Pendahuluan) dan Bab 2 (Tinjauan Pustaka) sudah sesuai pedoman Belmawa 2026. Pastikan daftar pustaka menggunakan format Harvard/IEEE minimal 80% berasal dari jurnal terakreditasi 5 tahun terakhir.',
    },
    bimbingan: {
      title: 'Protokol Konsultasi Dosen Pembimbing',
      content:
        'Sebelum mengirim pesan WhatsApp ke dosen pembimbing, siapkan daftar 3 pertanyaan spesifik mengenai metodologi dan lampirkan draf proposal dalam format PDF dengan penamaan file yang rapi.',
    },
  };

  return (
    <Card className="border-blue-200/90 bg-gradient-to-br from-blue-50/60 via-white to-sky-50/40 shadow-2xs">
      <CardHeader className="py-3 bg-blue-50/80 flex items-center justify-between border-b border-blue-100">
        <CardTitle className="text-xs text-blue-950 flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-700" />
          <span>Asisten Cerdas Belmawa (Simulasi)</span>
        </CardTitle>
        <Badge color="amber" size="sm" dot>
          Simulasi AI Interaktif
        </Badge>
      </CardHeader>

      <CardContent className="p-4 text-xs text-slate-600 space-y-3.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span>Klik tombol simulasi di bawah untuk menguji respon asistensi:</span>
        </div>

        {/* Prompt simulator buttons */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSuggestion('judul')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              activeSuggestion === 'judul'
                ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            🔍 Review Judul Ide
          </button>
          <button
            type="button"
            onClick={() => setActiveSuggestion('struktur')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              activeSuggestion === 'struktur'
                ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            📋 Audit Format Belmawa
          </button>
          <button
            type="button"
            onClick={() => setActiveSuggestion('bimbingan')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              activeSuggestion === 'bimbingan'
                ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            💬 Tips Bimbingan Dosen
          </button>
        </div>

        {/* Dynamic response card */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-2xs space-y-1.5">
          <div className="font-extrabold text-blue-950 flex items-center gap-1.5 text-xs">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{simulatedResponses[activeSuggestion].title}</span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            {simulatedResponses[activeSuggestion].content}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
