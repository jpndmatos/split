import { describe, expect, it } from 'vitest';
import { filterExpenses } from './expenses';

const members = [
  { id: 'joao', name: 'João' },
  { id: 'ines', name: 'Inês' },
];
const expenses = [
  { title: 'Coffee & pastéis', category: 'Food', payerId: 'joao' },
  { title: 'Train tickets', category: 'Travel', payerId: 'ines' },
];

describe('expense search', () => {
  it('finds expenses using unaccented titles and payer names', () => {
    expect(filterExpenses(expenses, 'All', 'joao pasteis', members)).toEqual([expenses[0]]);
    expect(filterExpenses(expenses, 'All', ' INES ', members)).toEqual([expenses[1]]);
  });
  it('combines the category filter with every search term', () => {
    expect(filterExpenses(expenses, 'Food', 'tickets', members)).toEqual([]);
    expect(filterExpenses(expenses, 'Travel', 'train ines', members)).toEqual([expenses[1]]);
  });
  it('returns the original rows for an empty query without changing the input', () => {
    expect(filterExpenses(expenses, 'All', '   ', members)).toEqual(expenses);
    expect(expenses).toHaveLength(2);
  });
});
