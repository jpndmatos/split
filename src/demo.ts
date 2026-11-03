import { balances, settlements, splitCents } from '../server/money.mjs';
import type { Event } from './types';

const key = 'split.demo.v1';
type StoredEvent = Omit<Event, 'balances' | 'settlements'>;
const state = (event: StoredEvent): Event => {
  const net = balances(event.members, event.expenses, event.payments);
  return { ...event, balances: net, settlements: settlements(net) };
};
function seed(): StoredEvent[] {
  const members = ['João', 'Inês', 'Miguel', 'Sofia'].map((name, i) => ({
    id: `member-${i}`,
    name,
  }));
  const ids = members.map((x) => x.id);
  return [
    {
      id: 'birthday',
      title: 'Birthday dinner',
      subtitle: 'Shared event costs',
      members,
      payments: [],
      expenses: [
        ['Venue booking', 24000, 0, 'Venue'],
        ['Dinner & drinks', 18640, 1, 'Food'],
        ['Shared transport', 6800, 2, 'Transport'],
        ['Cake & candles', 4250, 3, 'Supplies'],
      ].map(([title, cents, payer, category], i) => ({
        id: `expense-${i}`,
        title: String(title),
        cents: Number(cents),
        payerId: ids[Number(payer)],
        category: String(category),
        date: '2026-10-23',
        splits: splitCents(Number(cents), ids),
      })),
    },
  ];
}
export function createDemoApi(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  return async (path: string, method = 'GET', body?: unknown) => {
    let events: StoredEvent[];
    try {
      const raw = storage.getItem(key);
      events = raw ? JSON.parse(raw) : seed();
      if (
        !Array.isArray(events) ||
        !events.length ||
        events.some(
          (e) =>
            !Array.isArray(e.members) || !Array.isArray(e.expenses) || !Array.isArray(e.payments),
        )
      )
        events = seed();
    } catch {
      events = seed();
    }
    const parts = path.split('/').filter(Boolean);
    const data = body as Record<string, unknown> | undefined;
    if (parts.length === 1 && method === 'GET')
      return events.map(({ id, title }) => ({ id, title }));
    if (parts.length === 1 && method === 'POST') {
      const title = String(data?.title || '').trim();
      const names = data?.names;
      if (
        !title ||
        title.length > 100 ||
        !Array.isArray(names) ||
        names.length < 2 ||
        names.length > 12 ||
        names.some((n) => typeof n !== 'string' || !n.trim() || n.length > 60) ||
        new Set(names.map((n) => n.trim().toLowerCase())).size !== names.length
      )
        throw new Error('Use an event name and 2–12 different member names.');
      const event: StoredEvent = {
        id: crypto.randomUUID(),
        title,
        subtitle: 'Shared event costs',
        members: names.map((name) => ({ id: crypto.randomUUID(), name: name.trim() })),
        expenses: [],
        payments: [],
      };
      events.push(event);
      storage.setItem(key, JSON.stringify(events));
      return state(event);
    }
    const event = events.find((e) => e.id === parts[1]);
    if (!event) throw new Error('Event not found.');
    if (parts.length === 2 && method === 'GET') return state(event);
    if (parts[2] === 'expenses') {
      const previous = event.expenses.find((e) => e.id === parts[3]);
      if (parts[3] && !previous) throw new Error('Expense not found.');
      if (method === 'DELETE') event.expenses = event.expenses.filter((e) => e.id !== parts[3]);
      else if ((method === 'POST' || method === 'PUT') && data) {
        const { cents, payerId, memberIds, date, category } = data;
        const title = String(data.title || '').trim();
        if (
          !title ||
          title.length > 100 ||
          !Number.isSafeInteger(cents) ||
          Number(cents) < 1 ||
          Number(cents) > 100000000
        )
          throw new Error('Enter a description and an amount between €0.01 and €1,000,000.');
        const ids = event.members.map((m) => m.id);
        if (
          !ids.includes(String(payerId)) ||
          !Array.isArray(memberIds) ||
          !memberIds.length ||
          memberIds.some((id) => !ids.includes(id)) ||
          new Set(memberIds).size !== memberIds.length
        )
          throw new Error('Choose a payer and participants in this event.');
        if (
          typeof date !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)) ||
          new Date(date).toISOString().slice(0, 10) !== date
        )
          throw new Error('Choose a valid date.');
        const unchanged =
          previous &&
          previous.cents === cents &&
          previous.splits.length === memberIds.length &&
          memberIds.every((id) => previous.splits.some((s) => s.id === id));
        const expense = {
          id: previous?.id || crypto.randomUUID(),
          title,
          cents: Number(cents),
          payerId: String(payerId),
          date,
          category: ['Food', 'Venue', 'Supplies', 'Transport', 'Other'].includes(String(category))
            ? String(category)
            : 'Other',
          splits: unchanged ? previous.splits : splitCents(Number(cents), memberIds),
        };
        event.expenses = [expense, ...event.expenses.filter((e) => e.id !== expense.id)].sort(
          (a, b) => b.date.localeCompare(a.date),
        );
      } else throw new Error('Unsupported operation.');
    } else if (parts[2] === 'payments') {
      if (method === 'DELETE') {
        if (!event.payments.some((p) => p.id === parts[3])) throw new Error('Payment not found.');
        event.payments = event.payments.filter((p) => p.id !== parts[3]);
      } else if (method === 'POST' && data) {
        const transfer = state(event).settlements.find(
          (t) => t.fromId === data.fromId && t.toId === data.toId && t.cents === data.cents,
        );
        if (!transfer) throw new Error('This repayment has changed. Check the current balances.');
        event.payments.push({ ...transfer, id: crypto.randomUUID() });
      } else throw new Error('Unsupported operation.');
    } else throw new Error('Unsupported operation.');
    storage.setItem(key, JSON.stringify(events));
    return state(event);
  };
}
export const demoApi = (path: string, method?: string, body?: unknown) => {
  try {
    return createDemoApi(localStorage)(path, method, body);
  } catch {
    return Promise.reject(new Error('Browser storage is unavailable. Enable it to use this demo.'));
  }
};
