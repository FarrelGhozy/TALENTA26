import React from 'react';
import { Lightbulb, Compass } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export const AiBoxMock: React.FC = () => {
  return (
    <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30 shadow-2xs">
      <CardHeader className="py-3 bg-blue-50/70 flex items-center justify-between">
        <CardTitle className="text-xs text-blue-950 flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-700 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Rekomendasi Adaptif Persiapan</span>
        </CardTitle>
        <Badge color="amber" size="sm" dot>
          Simulasi AI (P1)
        </Badge>
      </CardHeader>
      <CardContent className="p-4 text-xs text-slate-600 space-y-3">
        <p className="text-[11px] text-slate-500 italic">
          *Fitur asisten AI personalisasi roadmap direncanakan pada tahap lanjutan. Di bawah ini simulasi rekomendasi kontekstual:
        </p>
        <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-1.5 text-xs">
          <div className="font-bold text-blue-950 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Saran Minggu Ini berdasarkan tenggat terdekat:
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Prioritaskan Bab 1 Latar Belakang dan rumusan masalah PKM. Konsultasikan draf literatur utama sebelum mengajukan revisi ke dosen pembimbing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};