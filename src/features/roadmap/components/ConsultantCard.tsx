import React from 'react';
import { UserCheck, MessageSquare } from 'lucide-react';
import { Consultant } from '../../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

export const ConsultantCard: React.FC<{ consultants: Consultant[] }> = ({ consultants }) => {
  return (
    <Card className="bg-white shadow-2xs border-slate-200/90">
      <CardHeader className="py-3.5">
        <CardTitle level={2} className="text-xs flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-700" />
          <span>Dosen Pembimbing & Konsultan</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-xs">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Dosen pembimbing resmi yang ditugaskan universitas. Gunakan etika komunikasi santun saat menghubungi via WhatsApp.
        </p>

        {consultants.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">Belum ada konsultan terdaftar untuk kompetisi ini.</p>
        )}

        {consultants.map((c) => {
          const isVerified = c.isVerifiedContact && c.assignmentApproved;
          const waMessage = encodeURIComponent(
            `Assalamu'alaikum Wr. Wb. Bapak/Ibu ${c.nama}, perkenalkan saya mahasiswa binaan Belmawa UNIDA Gontor. Mohon izin berkonsultasi mengenai bimbingan proposal kompetisi kami.`
          );

          return (
            <div key={c.id} className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/60 space-y-2.5">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900">{c.nama}</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.bidang.map((b) => (
                      <Badge key={b} color="slate" size="sm">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge color={isVerified ? 'emerald' : 'slate'} size="sm" dot>
                  {isVerified ? 'Resmi Kampus' : 'Verifikasi'}
                </Badge>
              </div>

              <div className="pt-1">
                {isVerified ? (
                  <a
                    href={`https://wa.me/${c.waMock}?text=${waMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors min-h-[40px] shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Hubungi via WhatsApp Resmi
                  </a>
                ) : (
                  <div>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Kontak belum diverifikasi admin"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed min-h-[40px] font-medium"
                    >
                      Kontak Segera Diumumkan
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1">Menunggu penerbitan Surat Tugas oleh fakultas.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
