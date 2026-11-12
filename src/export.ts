const cell = (value: unknown) => {
  let text = String(value);
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};

type Row = {
  title: string;
  date: string;
  category: string;
  payerId: string;
  cents: number;
  splits: { id: string; cents: number }[];
};
export function expenseCsv(rows: Row[], members: { id: string; name: string }[]) {
  const names = new Map(members.map((m) => [m.id, m.name]));
  return [
    ['Date', 'Expense', 'Category', 'Paid by', 'Amount (EUR)', 'Split between'],
    ...rows.map((e) => [
      e.date,
      e.title,
      e.category,
      names.get(e.payerId) || '',
      (e.cents / 100).toFixed(2),
      e.splits.map((s) => names.get(s.id) || '').join(', '),
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n');
}

export function repaymentCsv(
  transfers: { fromId: string; toId: string; cents: number }[],
  members: { id: string; name: string }[],
) {
  const names = new Map(members.map((member) => [member.id, member.name]));
  return [
    ['From', 'To', 'Amount (EUR)'],
    ...transfers.map((transfer) => [
      names.get(transfer.fromId) || '',
      names.get(transfer.toId) || '',
      (transfer.cents / 100).toFixed(2),
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n');
}
