export type Member = { id: string; name: string };
export type Transfer = { id?: string; fromId: string; toId: string; cents: number };
export type Expense = {
  id: string;
  title: string;
  cents: number;
  payerId: string;
  date: string;
  category: string;
  splits: { id: string; cents: number }[];
};
export type Event = {
  id: string;
  title: string;
  subtitle: string;
  members: Member[];
  expenses: Expense[];
  payments: Transfer[];
  balances: (Member & { cents: number })[];
  settlements: Transfer[];
};
