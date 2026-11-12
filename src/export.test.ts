import { describe, it, expect } from 'vitest';
import { expenseCsv, repaymentCsv } from './export';
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

it('exports actionable repayments with exact cents and safe member names', () => {
  const csv = repaymentCsv(
    [{ fromId: 'a', toId: 'b', cents: 1001 }],
    [
      { id: 'a', name: '=Alex' },
      { id: 'b', name: 'João, Silva' },
    ],
  );
  expect(csv).toContain('"From","To","Amount (EUR)"');
  expect(csv).toContain('"10.01"');
  expect(csv).toContain('"João, Silva"');
  expect(csv).toContain("'" + '=Alex');
  expect(repaymentCsv([], []).split('\r\n')).toHaveLength(1);
});
