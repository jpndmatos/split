type SearchableExpense = { title: string; category: string; payerId: string };
type Member = { id: string; name: string };

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();

export function filterExpenses<T extends SearchableExpense>(
  expenses: T[],
  category: string,
  query: string,
  members: Member[],
): T[] {
  const names = new Map(members.map((member) => [member.id, member.name]));
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return expenses.filter((expense) => {
    if (category !== 'All' && expense.category !== category) return false;
    const text = normalize(
      `${expense.title} ${expense.category} ${names.get(expense.payerId) || ''}`,
    );
    return terms.every((term) => text.includes(term));
  });
}
