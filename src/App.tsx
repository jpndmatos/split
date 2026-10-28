import { filterExpenses } from './expenses';
import ThemeToggle from './ThemeToggle';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ReceiptText,
  X,
  Check,
  Trash2,
  Undo2,
  ChevronDown,
  LoaderCircle,
} from 'lucide-react';

type Member = { id: string; name: string };
type Transfer = { id?: string; fromId: string; toId: string; cents: number };
type Expense = {
  id: string;
  title: string;
  cents: number;
  payerId: string;
  date: string;
  category: string;
  splits: { id: string; cents: number }[];
};
type Trip = {
  id: string;
  title: string;
  subtitle: string;
  members: Member[];
  expenses: Expense[];
  payments: Transfer[];
  balances: (Member & { cents: number })[];
  settlements: Transfer[];
};
const euro = (cents: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not connect.');
  return data;
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const [trips, setTrips] = useState<{ id: string; title: string }[]>([]),
    [trip, setTrip] = useState<Trip | null>(null),
    [selected, setSelected] = useState('');
  const [view, setView] = useState<'expenses' | 'balances'>('expenses'),
    [modal, setModal] = useState<'expense' | 'trip' | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'),
    [payer, setPayer] = useState(''),
    [participants, setParticipants] = useState<string[]>([]);
  async function loadTrips() {
    try {
      const list = await api('/trips');
      setTrips(list);
      setSelected((s) => s || list[0]?.id || '');
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadTrips();
  }, []);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true);
    setError('');
    api('/trips/' + selected)
      .then((data) => {
        if (active) {
          setTrip(data);
          setFilter('All');
          setSearch('');
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selected]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const name = (id: string) => trip?.members.find((m) => m.id === id)?.name || 'Someone';
  async function mutate(path: string, method: string, body?: unknown, message = 'Saved.') {
    setBusy(true);
    setError('');
    try {
      setTrip(await api(path, method, body));
      setNotice(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openExpense() {
    if (!trip) return;
    setPayer(trip.members[0].id);
    setParticipants(trip.members.map((m) => m.id));
    setError('');
    setModal('expense');
  }
  async function saveExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!trip) return;
    const data = new FormData(e.currentTarget);
    const amount = String(data.get('amount'));
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setError('Use an amount with no more than two decimal places.');
      return;
    }
    const cents = Math.round(Number(amount) * 100);
    if (
      await mutate(
        `/trips/${trip.id}/expenses`,
        'POST',
        {
          title: data.get('title'),
          cents,
          payerId: payer,
          memberIds: participants,
          date: data.get('date'),
          category: data.get('category'),
        },
        'Expense saved.',
      )
    )
      setModal(null);
  }
  async function saveTrip(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const created = await api('/trips', 'POST', {
        title: data.get('title'),
        names: String(data.get('names'))
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean),
      });
      setTrips((t) => [...t, created]);
      setTrip(created);
      setSelected(created.id);
      setModal(null);
      setNotice('Trip created.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = trip?.expenses.reduce((sum, e) => sum + e.cents, 0) || 0;
  const expenses = trip ? filterExpenses(trip.expenses, filter, search, trip.members) : [];
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a className="brand" href="./" aria-label="Split home">
          <img
            className="app-icon"
            src={import.meta.env.BASE_URL + 'favicon.svg?v=2'}
            width="28"
            height="28"
            alt=""
            aria-hidden="true"
          />
          Split
        </a>
        <span className="app-description">Expense tracker</span>
        <nav className="trip-nav" aria-label="Trips">
          <h2>Trips</h2>
          {trips.map((t) => (
            <button
              key={t.id}
              aria-current={selected === t.id ? 'page' : undefined}
              onClick={() => setSelected(t.id)}
            >
              {t.title}
            </button>
          ))}
        </nav>
        <button
          className="button new-trip"
          onClick={() => {
            setError('');
            setModal('trip');
          }}
        >
          <Plus size={16} aria-hidden="true" />
          New trip
        </button>
        <div className="sidebar-bottom">
          <span>Stored locally in SQLite</span>
          <ThemeToggle />
        </div>
      </header>
      <main id="main">
        <div className="page-heading">
          <div>
            <h1>{trip?.title || 'Trips'}</h1>
            <p>Manage expenses and repayments for this trip.</p>
          </div>
          <label className="trip-switch">
            <span className="sr-only">Choose trip</span>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </label>
        </div>
        {error && !modal && (
          <div className="error" role="alert">
            {error}{' '}
            <button
              onClick={() => {
                void loadTrips();
                if (selected) setSelected('');
              }}
            >
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="loading">
            <LoaderCircle className="spin" /> Loading trip…
          </div>
        ) : (
          trip && (
            <>
              <section className="summary" aria-label="Trip summary">
                <div className="summary-main">
                  <span className="small-label">Total expenses</span>
                  <strong>{euro(total)}</strong>
                  <span>{trip.expenses.length} expenses / EUR</span>
                </div>
                <div className="summary-stat">
                  <span className="small-label">Members</span>
                  <strong className="member-count">{trip.members.length}</strong>
                  <p className="member-names">{trip.members.map((m) => m.name).join(', ')}</p>
                </div>
                <div className="summary-stat">
                  <span className="small-label">Outstanding repayments</span>
                  <strong className="settle-total">
                    {euro(trip.settlements.reduce((s, p) => s + p.cents, 0))}
                  </strong>
                  <span>
                    {trip.settlements.length
                      ? `${trip.settlements.length} repayments remaining`
                      : 'No outstanding repayments'}
                  </span>
                </div>
              </section>
              <div className="content-grid">
                <section className="ledger">
                  <div className="ledger-heading">
                    <div
                      className="tabs"
                      role="tablist"
                      aria-label="Trip details"
                      onKeyDown={(event) => {
                        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                        event.preventDefault();
                        const next =
                          event.key === 'Home'
                            ? 'expenses'
                            : event.key === 'End'
                              ? 'balances'
                              : view === 'expenses'
                                ? 'balances'
                                : 'expenses';
                        setView(next);
                        requestAnimationFrame(() =>
                          document.getElementById(next + '-tab')?.focus(),
                        );
                      }}
                    >
                      <button
                        role="tab"
                        id="expenses-tab"
                        aria-controls="expenses-panel"
                        tabIndex={view === 'expenses' ? 0 : -1}
                        aria-selected={view === 'expenses'}
                        onClick={() => setView('expenses')}
                      >
                        Expenses <span>{trip.expenses.length}</span>
                      </button>
                      <button
                        role="tab"
                        id="balances-tab"
                        aria-controls="balances-panel"
                        tabIndex={view === 'balances' ? 0 : -1}
                        aria-selected={view === 'balances'}
                        onClick={() => setView('balances')}
                      >
                        Balances
                      </button>
                    </div>
                    <button className="button primary" onClick={openExpense}>
                      <Plus size={17} />
                      Add expense
                    </button>
                  </div>
                  {view === 'expenses' ? (
                    <div role="tabpanel" id="expenses-panel" aria-labelledby="expenses-tab">
                      <div className="expense-tools">
                        <label className="expense-search">
                          <span className="sr-only">Search expenses</span>
                          <Search size={17} aria-hidden="true" />
                          <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search expenses or people"
                          />
                        </label>
                        <div className="filters" aria-label="Filter expenses">
                          {['All', 'Food', 'Stay', 'Travel', 'Other'].map((c) => (
                            <button
                              key={c}
                              className={filter === c ? 'selected' : ''}
                              aria-pressed={filter === c}
                              onClick={() => setFilter(c)}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="ledger-columns" aria-hidden="true">
                        <span>Expense</span>
                        <span>Amount</span>
                        <span />
                      </div>
                      <div className="expense-list">
                        {expenses.length ? (
                          expenses.map((e) => {
                            return (
                              <article className="expense" key={e.id}>
                                <div className="expense-info">
                                  <h3>{e.title}</h3>
                                  <p>
                                    {name(e.payerId)} paid /{' '}
                                    {new Intl.DateTimeFormat('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      timeZone: 'UTC',
                                    }).format(new Date(e.date))}
                                    <span className="split-detail">
                                      {' '}
                                      / Split {e.splits.length} ways
                                    </span>
                                  </p>
                                </div>
                                <strong>{euro(e.cents)}</strong>
                                <button
                                  className="icon-button delete"
                                  disabled={busy}
                                  aria-label={'Delete ' + e.title}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Remove “${e.title}”? Everyone’s balance will update.`,
                                      )
                                    )
                                      void mutate(
                                        `/trips/${trip.id}/expenses/${e.id}`,
                                        'DELETE',
                                        undefined,
                                        'Expense removed.',
                                      );
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </article>
                            );
                          })
                        ) : (
                          <div className="empty">
                            <ReceiptText size={32} />
                            <h3>
                              {trip.expenses.length ? 'No expenses found' : 'No expenses yet'}
                            </h3>
                            <p>
                              {trip.expenses.length
                                ? 'Change the search or category filter.'
                                : 'Add an expense to calculate balances.'}
                            </p>
                            {(search || filter !== 'All') && (
                              <button
                                className="button"
                                onClick={() => {
                                  setSearch('');
                                  setFilter('All');
                                }}
                              >
                                Clear filters
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="ledger-footer">
                        <span role="status">
                          {expenses.length} of {trip.expenses.length} expenses
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="balance-list"
                      role="tabpanel"
                      id="balances-panel"
                      aria-labelledby="balances-tab"
                    >
                      {trip.balances.map((m) => (
                        <div className="balance-row" key={m.id}>
                          <span>
                            {m.name}
                            <small>
                              {m.cents > 0 ? 'gets back' : m.cents < 0 ? 'owes' : 'settled'}
                            </small>
                          </span>
                          <strong className={m.cents < 0 ? 'negative' : 'positive'}>
                            {m.cents > 0 ? '+' : ''}
                            {euro(m.cents)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <aside className="settle-panel">
                  <div className="aside-title">
                    <span className="settle-icon">
                      <ArrowUpRight size={20} />
                    </span>
                    <h2>Repayments</h2>
                  </div>
                  <p>Suggested transfers based on current balances.</p>
                  {trip.settlements.length ? (
                    trip.settlements.map((p, i) => (
                      <div className="transfer" key={p.fromId + p.toId}>
                        <div className="transfer-route">
                          <span>{name(p.fromId)}</span>
                          <ArrowRight size={15} />
                          <span>{name(p.toId)}</span>
                        </div>
                        <div className="transfer-action">
                          <strong>{euro(p.cents)}</strong>
                          <button
                            className="button small"
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                `/trips/${trip.id}/payments`,
                                'POST',
                                p,
                                'Payment recorded. No money was moved.',
                              )
                            }
                          >
                            <Check size={14} /> Mark paid
                          </button>
                        </div>
                        <span className="transfer-number">0{i + 1}</span>
                      </div>
                    ))
                  ) : (
                    <div className="all-square">
                      <Check size={28} />
                      <h3>No outstanding repayments</h3>
                      <p>
                        {trip.expenses.length
                          ? 'All recorded expenses are settled.'
                          : 'Add an expense when you’re ready.'}
                      </p>
                    </div>
                  )}
                  <p className="payment-note">Recording a repayment does not transfer money.</p>
                  {trip.payments.length > 0 && (
                    <details className="payments">
                      <summary>Recorded payments ({trip.payments.length})</summary>
                      {trip.payments.map((p) => (
                        <div key={p.id}>
                          <span>
                            {name(p.fromId)} → {name(p.toId)}
                            <strong>{euro(p.cents)}</strong>
                          </span>
                          <button
                            disabled={busy}
                            className="icon-button"
                            aria-label={`Undo payment from ${name(p.fromId)} to ${name(p.toId)}`}
                            onClick={() =>
                              void mutate(
                                `/trips/${trip.id}/payments/${p.id}`,
                                'DELETE',
                                undefined,
                                'Payment undone.',
                              )
                            }
                          >
                            <Undo2 size={15} />
                          </button>
                        </div>
                      ))}
                    </details>
                  )}
                </aside>
              </div>
            </>
          )
        )}
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {modal === 'expense' && trip && (
        <Modal
          title="Add expense"
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={saveExpense}>
            <p className="form-intro">Enter the amount, payer, and participants.</p>
            <label>
              Description
              <input name="title" required maxLength={100} placeholder="e.g. Dinner" autoFocus />
            </label>
            <div className="form-grid">
              <label>
                Amount (€)
                <input
                  name="amount"
                  inputMode="decimal"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </label>
              <label>
                Category
                <select name="category">
                  {['Food', 'Stay', 'Travel', 'Other'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Paid by
                <select value={payer} onChange={(e) => setPayer(e.target.value)}>
                  {trip.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 10)}
                />
              </label>
            </div>
            <fieldset>
              <legend>Split equally between</legend>
              <div className="participant-list">
                {trip.members.map((m) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      checked={participants.includes(m.id)}
                      onChange={(e) =>
                        setParticipants((p) =>
                          e.target.checked ? [...p, m.id] : p.filter((id) => id !== m.id),
                        )
                      }
                    />
                    {m.name}
                  </label>
                ))}
              </div>
              <small>Any extra cent goes to the first selected person.</small>
            </fieldset>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary wide" disabled={busy || !participants.length}>
              {busy ? 'Saving…' : 'Add expense'}
              <ArrowDownLeft size={17} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'trip' && (
        <Modal
          title="New trip"
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={saveTrip}>
            <p className="form-intro">Create a trip and add the people sharing expenses.</p>
            <label>
              Trip name
              <input
                name="title"
                maxLength={70}
                required
                placeholder="A few days in Lisbon"
                autoFocus
              />
            </label>
            <label>
              Members
              <textarea name="names" required placeholder="João, Inês, Miguel, Sofia" rows={3} />
            </label>
            <small>2 to 12 names, separated by commas. EUR only for now.</small>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy ? 'Creating…' : 'Create trip'}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
