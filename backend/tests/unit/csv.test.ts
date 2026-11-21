import { describe, expect, it } from 'bun:test';
import { escapeCsvField } from '../../src/modules/dashboard/service';

describe('Ekspor CSV', () => {
  it('mengutip nilai dan menggandakan tanda kutip', () => {
    expect(escapeCsvField('Nama "Tim"')).toBe('"Nama ""Tim"""');
  });

  it('menetralisasi formula spreadsheet termasuk setelah spasi', () => {
    expect(escapeCsvField('=HYPERLINK("https://evil")')).toStartWith('"\'=');
    expect(escapeCsvField('  +1+1')).toStartWith('"\'  +');
    expect(escapeCsvField('-2+3')).toBe('"\'-2+3"');
    expect(escapeCsvField('@SUM(A1:A2)')).toBe('"\'@SUM(A1:A2)"');
  });
});
