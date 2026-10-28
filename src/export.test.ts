import { describe, it, expect } from 'vitest';
import { expenseCsv } from './export';
describe('expense CSV', () => {
  it('preserves exact cents, quotes names and neutralizes spreadsheet formulas', () => {
    const csv = expenseCsv(
      [
        {
          title: '=HYPERLINK("x")',
          date: '2026-10-28',
          category: 'Food',
          payerId: 'a',
          cents: 1001,
          splits: [{ id: 'a', cents: 1001 }],
        },
      ],
      [{ id: 'a', name: 'Ana, Silva' }],
    );
    expect(csv).toContain('"10.01"');
    expect(csv).toContain('"Ana, Silva"');
    expect(csv).toContain(String.fromCharCode(39) + '=HYPERLINK');
  });
  it('exports a header for an empty event', () => {
    expect(expenseCsv([], []).split('\r\n')).toHaveLength(1);
  });
});
