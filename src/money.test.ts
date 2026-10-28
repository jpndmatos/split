import { describe, it, expect } from 'vitest';
// @ts-expect-error Domain module is shared with the Node API.
import { splitCents, balances, settlements } from '../server/money.mjs';
describe('shared expenses', () => {
  it('preserves every cent in uneven splits', () => {
    expect(splitCents(100, ['a', 'b', 'c'])).toEqual([
      { id: 'a', cents: 34 },
      { id: 'b', cents: 33 },
      { id: 'c', cents: 33 },
    ]);
  });
  it('rejects duplicate participants and fractional cents', () => {
    expect(() => splitCents(100, ['a', 'a'])).toThrow();
    expect(() => splitCents(1.5, ['a'])).toThrow();
  });
  it('settles everyone and accounts for recorded transfers', () => {
    const members = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const expenses = [{ payerId: 'a', cents: 100, splits: splitCents(100, ['a', 'b', 'c']) }];
    const net = balances(members, expenses, []);
    expect(net.reduce((n: number, x: { cents: number }) => n + x.cents, 0)).toBe(0);
    const transfers = settlements(net);
    expect(
      balances(members, expenses, transfers).every((x: { cents: number }) => x.cents === 0),
    ).toBe(true);
  });
});
