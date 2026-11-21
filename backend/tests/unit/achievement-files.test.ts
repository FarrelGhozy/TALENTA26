import { describe, expect, it } from 'bun:test';
import {
  cleanupUploadedFiles,
  validateFileItem,
  type UploadedFileItem,
} from '../../src/modules/achievements/service';

function file(name: string, type: string, buffer: Buffer): UploadedFileItem {
  return { name, type, buffer, size: buffer.length };
}

describe('Validasi bukti prestasi', () => {
  it('menerima signature PDF, JPEG dan PNG yang sesuai', () => {
    expect(() => validateFileItem(file('bukti.pdf', 'application/pdf', Buffer.from('%PDF-1.7')))).not.toThrow();
    expect(() => validateFileItem(file('bukti.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xdb])))).not.toThrow();
    expect(() => validateFileItem(file('bukti.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))).not.toThrow();
  });

  it('menolak file palsu walaupun ekstensi dan MIME diizinkan', () => {
    expect(() => validateFileItem(file('bukti.pdf', 'application/pdf', Buffer.from('bukan pdf')))).toThrow(
      'tidak sesuai'
    );
  });

  it('mencoba membersihkan seluruh objek tanpa berhenti pada satu kegagalan', async () => {
    const deleted: string[] = [];
    await cleanupUploadedFiles(
      {
        async deleteFile(key) {
          deleted.push(key);
          if (key === 'gagal') throw new Error('storage error');
        },
      },
      ['satu', 'gagal', 'dua']
    );
    expect(deleted).toEqual(['satu', 'gagal', 'dua']);
  });
});
