export type Member = { id: string; name: string };
export type Share = { id: string; cents: number };
export function splitCents(cents: number, ids: string[]): Share[];
export function balances<T extends { id: string }>(
  members: T[],
  expenses: { payerId: string; cents: number; splits: Share[] }[],
  payments: { fromId: string; toId: string; cents: number }[],
): (T & { cents: number })[];
export function settlements(
  items: { id: string; cents: number }[],
): { fromId: string; toId: string; cents: number }[];
