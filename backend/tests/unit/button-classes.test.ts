import { describe, expect, it } from 'bun:test';
import { mergeButtonClasses } from '../../../frontend/src/lib/buttonClasses';

describe('mergeButtonClasses — Resolusi Konflik Kelas Tailwind v4', () => {
  it('menggantikan text color & border color varian saat caller memberi override tanpa menghapus text-size atau border width', () => {
    const merged = mergeButtonClasses(
      'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
      'text-xs px-3.5 py-1.5',
      'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
    );

    const tokens = merged.split(' ');
    expect(tokens).toContain('border');
    expect(tokens).toContain('text-xs');
    expect(tokens).toContain('border-rose-300');
    expect(tokens).toContain('bg-rose-50');
    expect(tokens).toContain('text-rose-700');
    expect(tokens).toContain('hover:bg-rose-100');

    expect(tokens).not.toContain('border-slate-300');
    expect(tokens).not.toContain('bg-white');
    expect(tokens).not.toContain('text-slate-800');
    expect(tokens).not.toContain('hover:bg-slate-50');
  });

  it('mempertahankan ukuran huruf kustom tanpa menimpa warna teks', () => {
    const merged = mergeButtonClasses(
      'text-rose-700 text-xs px-3.5',
      'text-[11px] px-2.5'
    );
    const tokens = merged.split(' ');
    expect(tokens).toContain('text-rose-700');
    expect(tokens).toContain('text-[11px]');
    expect(tokens).toContain('px-2.5');
    expect(tokens).not.toContain('text-xs');
    expect(tokens).not.toContain('px-3.5');
  });

  it('memisahkan shadow size dan shadow color', () => {
    const merged = mergeButtonClasses(
      'shadow-sm hover:shadow-md hover:shadow-blue-600/20',
      'shadow-xs'
    );
    const tokens = merged.split(' ');
    expect(tokens).toContain('shadow-xs');
    expect(tokens).not.toContain('shadow-sm');
    expect(tokens).toContain('hover:shadow-md');
    expect(tokens).toContain('hover:shadow-blue-600/20');
  });
});
