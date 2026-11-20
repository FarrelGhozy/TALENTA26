import React from 'react';
import { AlertTriangle, CheckCircle2, Info, LoaderCircle, Plus, Search } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';

export const DesignSystemPage: React.FC = () => (
  <div className="space-y-6">
    <PageHeader eyebrow="Referensi antarmuka" title="Design system TALENTA" description="Komponen dasar dan keadaan antarmuka untuk publik, mahasiswa, validator, dan super admin." />
    <Card>
      <CardHeader><CardTitle level={2}>Aksi dan status</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button leftIcon={<Plus aria-hidden="true" className="h-4 w-4" />}>Tambah data</Button>
        <Button variant="outline" leftIcon={<Search aria-hidden="true" className="h-4 w-4" />}>Cari</Button>
        <Button variant="ghost">Batal</Button>
        <Badge color="emerald">Disetujui</Badge><Badge color="amber">Menunggu</Badge><Badge color="rose">Ditolak</Badge>
      </CardContent>
    </Card>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle level={2}>Form</CardTitle></CardHeader><CardContent className="space-y-4"><Input id="contoh-nama" label="Nama kegiatan" placeholder="Masukkan nama kegiatan" /><Input id="contoh-error" label="NIM" value="123" error="NIM harus terdiri dari 8–12 angka." readOnly /></CardContent></Card>
      <Card><CardHeader><CardTitle level={2}>Umpan balik</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="flex gap-2 rounded-xl bg-blue-50 p-3 text-blue-900"><Info aria-hidden="true" className="h-5 w-5 shrink-0" /> Informasi membantu pengguna memahami langkah berikutnya.</p><p className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-900"><CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" /> Perubahan berhasil disimpan.</p><p role="alert" className="flex gap-2 rounded-xl bg-amber-50 p-3 text-amber-950"><AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" /> Periksa kembali data sebelum menerbitkan.</p><p role="status" className="flex gap-2 rounded-xl bg-slate-100 p-3 text-slate-700"><LoaderCircle aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin" /> Memuat data simulasi…</p></CardContent></Card>
    </div>
    <EmptyState title="Belum ada data" description="Keadaan kosong menjelaskan alasan dan tindakan yang dapat dilakukan pengguna." action={<Button leftIcon={<Plus aria-hidden="true" className="h-4 w-4" />}>Tambah data</Button>} />
  </div>
);
