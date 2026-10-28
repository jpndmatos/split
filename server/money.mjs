export function splitCents(cents, ids) {
  if (!Number.isSafeInteger(cents) || cents <= 0 || !ids.length || new Set(ids).size !== ids.length)
    throw new Error('Invalid split');
  const each = Math.floor(cents / ids.length),
    remainder = cents % ids.length;
  return ids.map((id, i) => ({ id, cents: each + (i < remainder ? 1 : 0) }));
}

export function balances(members, expenses, payments) {
  const result = new Map(members.map((m) => [m.id, 0]));
  for (const e of expenses) {
    result.set(e.payerId, result.get(e.payerId) + e.cents);
    for (const s of e.splits) result.set(s.id, result.get(s.id) - s.cents);
  }
  for (const p of payments) {
    result.set(p.fromId, result.get(p.fromId) + p.cents);
    result.set(p.toId, result.get(p.toId) - p.cents);
  }
  return members.map((m) => ({ ...m, cents: result.get(m.id) }));
}

export function settlements(items) {
  const debt = items.filter((x) => x.cents < 0).map((x) => ({ ...x, cents: -x.cents }));
  const credit = items.filter((x) => x.cents > 0).map((x) => ({ ...x }));
  const transfers = [];
  let i = 0,
    j = 0;
  while (i < debt.length && j < credit.length) {
    const cents = Math.min(debt[i].cents, credit[j].cents);
    transfers.push({ fromId: debt[i].id, toId: credit[j].id, cents });
    debt[i].cents -= cents;
    credit[j].cents -= cents;
    if (!debt[i].cents) i++;
    if (!credit[j].cents) j++;
  }
  return transfers;
}
