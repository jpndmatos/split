import { expect, test } from 'vitest';
import { createDemoApi } from './demo';
import type { Event } from './types';
function setup() {
  let saved: string | null = null;
  const storage = {
    getItem: () => saved,
    setItem: (_: string, value: string) => {
      saved = value;
    },
  };
  return { storage, api: createDemoApi(storage) };
}
test('demo uses the same integer-cent engine, persists payments and supports undo', async () => {
  const { api, storage } = setup();
  const event = (await api('/events/birthday')) as Event;
  expect(event.balances.reduce((n, b) => n + b.cents, 0)).toBe(0);
  const transfer = event.settlements[0];
  const paid = (await api('/events/birthday/payments', 'POST', transfer)) as Event;
  expect(paid.payments).toHaveLength(1);
  expect(((await createDemoApi(storage)('/events/birthday')) as Event).payments).toHaveLength(1);
  const undone = (await api(`/events/birthday/payments/${paid.payments[0].id}`, 'DELETE')) as Event;
  expect(undone.balances).toEqual(event.balances);
});
test('invalid cents, duplicate participants and stale payments do not change saved balances', async () => {
  const { api } = setup();
  const original = (await api('/events/birthday')) as Event;
  const expense = {
    title: 'Test',
    cents: 101,
    payerId: original.members[0].id,
    memberIds: original.members.map((m) => m.id),
    date: '2026-11-03',
    category: 'Food',
  };
  await expect(
    api('/events/birthday/expenses', 'POST', { ...expense, cents: 1.5 }),
  ).rejects.toThrow();
  await expect(
    api('/events/birthday/expenses', 'POST', {
      ...expense,
      memberIds: [expense.payerId, expense.payerId],
    }),
  ).rejects.toThrow();
  await expect(
    api('/events/birthday/payments', 'POST', { ...original.settlements[0], cents: 1 }),
  ).rejects.toThrow();
  expect(await api('/events/birthday')).toEqual(original);
  const saved = (await api('/events/birthday/expenses', 'POST', expense)) as Event;
  expect(saved.expenses[0].splits.reduce((n, s) => n + s.cents, 0)).toBe(101);
});
