import { expenseCsv } from './export';
import { Pencil, Download } from 'lucide-react';
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
type Event = {
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
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]),
    [event, setEvent] = useState<Event | null>(null),
    [selected, setSelected] = useState('');
  const [view, setView] = useState<'expenses' | 'balances'>('expenses'),
    [modal, setModal] = useState<'expense' | 'event' | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filter, setFilter] = useState('All'),
    [payer, setPayer] = useState(''),
    [participants, setParticipants] = useState<string[]>([]);
  async function loadEvents() {
    try {
      const list = await api('/events');
      setEvents(list);
      setSelected((s) => s || list[0]?.id || '');
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadEvents();
  }, []);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setLoading(true);
    setError('');
    api('/events/' + selected)
      .then((data) => {
        if (active) {
          setEvent(data);
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
  const name = (id: string) => event?.members.find((m) => m.id === id)?.name || 'Someone';
  async function mutate(path: string, method: string, body?: unknown, message = 'Saved.') {
    setBusy(true);
    setError('');
    try {
      setEvent(await api(path, method, body));
      setNotice(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openExpense(expense?: Expense) {
    if (!event) return;
    setEditing(expense || null);
    setPayer(expense?.payerId || event.members[0].id);
    setParticipants(
      expense
        ? event.members
            .filter((member) => expense.splits.some((share) => share.id === member.id))
            .map((member) => member.id)
        : event.members.map((m) => m.id),
    );
    setError('');
    setModal('expense');
  }
  async function saveExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event) return;
    const data = new FormData(e.currentTarget);
    const amount = String(data.get('amount'));
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      setError('Use an amount with no more than two decimal places.');
      return;
    }
    const cents = Math.round(Number(amount) * 100);
    if (
      await mutate(
        `/events/${event.id}/expenses${editing ? '/' + editing.id : ''}`,
        editing ? 'PUT' : 'POST',
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
  async function saveEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const created = await api('/events', 'POST', {
        title: data.get('title'),
        names: String(data.get('names'))
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean),
      });
      setEvents((t) => [...t, created]);
      setEvent(created);
      setSelected(created.id);
      setModal(null);
      setNotice('Event created.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = event?.expenses.reduce((sum, e) => sum + e.cents, 0) || 0;
  const expenses = event ? filterExpenses(event.expenses, filter, search, event.members) : [];
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
        <span className="app-description">Event expenses</span>
        <nav className="event-nav" aria-label="Events">
          <h2>Events</h2>
          {events.map((t) => (
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
          className="button new-event"
          onClick={() => {
            setError('');
            setModal('event');
          }}
        >
          <Plus size={16} aria-hidden="true" />
          New event
        </button>
        <div className="sidebar-bottom">
          <ThemeToggle />
        </div>
      </header>
      <main id="main">
        <div className="page-heading">
          <div>
            <h1>{event?.title || 'Events'}</h1>
            <p>Track shared costs, contributions and repayments.</p>
          </div>
          <button
            className="button"
            disabled={!event?.expenses.length}
            onClick={() => {
              if (!event) return;
              const url = URL.createObjectURL(
                new Blob([expenseCsv(event.expenses, event.members)], {
                  type: 'text/csv;charset=utf-8',
                }),
              );
              const link = document.createElement('a');
              link.href = url;
              link.download = 'event-expenses.csv';
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={16} aria-hidden="true" />
            Export CSV
          </button>
          <label className="event-switch">
            <span className="sr-only">Choose event</span>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {events.map((t) => (
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
                void loadEvents();
                if (selected) setSelected('');
              }}
            >
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="loading">
            <LoaderCircle className="spin" /> Loading event…
          </div>
        ) : (
          event && (
            <>
              <section className="summary" aria-label="Event summary">
                <div className="summary-main">
                  <span className="small-label">Total expenses</span>
                  <strong>{euro(total)}</strong>
                  <span>{event.expenses.length} expenses / EUR</span>
                </div>
                <div className="summary-stat">
                  <span className="small-label">Members</span>
                  <strong className="member-count">{event.members.length}</strong>
                  <p className="member-names">{event.members.map((m) => m.name).join(', ')}</p>
                </div>
                <div className="summary-stat">
                  <span className="small-label">Outstanding repayments</span>
                  <strong className="settle-total">
                    {euro(event.settlements.reduce((s, p) => s + p.cents, 0))}
                  </strong>
                  <span>
                    {event.settlements.length
                      ? `${event.settlements.length} repayments remaining`
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
                      aria-label="Event details"
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
                        Expenses <span>{event.expenses.length}</span>
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
                    <button className="button primary" onClick={() => openExpense()}>
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
                          {['All', 'Food', 'Venue', 'Supplies', 'Transport', 'Other'].map((c) => (
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
                                  className="icon-button"
                                  disabled={busy}
                                  aria-label={'Edit ' + e.title}
                                  onClick={() => openExpense(e)}
                                >
                                  <Pencil size={16} />
                                </button>
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
                                        `/events/${event.id}/expenses/${e.id}`,
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
                              {event.expenses.length ? 'No expenses found' : 'No expenses yet'}
                            </h3>
                            <p>
                              {event.expenses.length
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
                          {expenses.length} of {event.expenses.length} expenses
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
                      {event.balances.map((m) => (
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
                  {event.settlements.length ? (
                    event.settlements.map((p, i) => (
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
                                `/events/${event.id}/payments`,
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
                        {event.expenses.length
                          ? 'All recorded expenses are settled.'
                          : 'Add an expense when you’re ready.'}
                      </p>
                    </div>
                  )}
                  <p className="payment-note">Recording a repayment does not transfer money.</p>
                  {event.payments.length > 0 && (
                    <details className="payments">
                      <summary>Recorded payments ({event.payments.length})</summary>
                      {event.payments.map((p) => (
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
                                `/events/${event.id}/payments/${p.id}`,
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
      {modal === 'expense' && event && (
        <Modal
          title={editing ? 'Edit expense' : 'Add expense'}
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={saveExpense} key={editing?.id || 'new'}>
            <p className="form-intro">Enter the amount, payer, and participants.</p>
            <label>
              Description
              <input
                name="title"
                defaultValue={editing?.title || ''}
                required
                maxLength={100}
                placeholder="e.g. Dinner"
                autoFocus
              />
            </label>
            <div className="form-grid">
              <label>
                Amount (€)
                <input
                  name="amount"
                  defaultValue={editing ? (editing.cents / 100).toFixed(2) : ''}
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
                <select name="category" defaultValue={editing?.category || 'Food'}>
                  {['Food', 'Venue', 'Supplies', 'Transport', 'Other'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Paid by
                <select value={payer} onChange={(e) => setPayer(e.target.value)}>
                  {event.members.map((m) => (
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
                  defaultValue={
                    editing?.date ||
                    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 10)
                  }
                />
              </label>
            </div>
            <fieldset>
              <legend>Split equally between</legend>
              <div className="participant-list">
                {event.members.map((m) => (
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
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}
              <ArrowDownLeft size={17} />
            </button>
          </form>
        </Modal>
      )}
      {modal === 'event' && (
        <Modal
          title="New event"
          close={() => {
            if (!busy) setModal(null);
          }}
        >
          <form onSubmit={saveEvent}>
            <p className="form-intro">Create an event and add the people sharing expenses.</p>
            <label>
              Event name
              <input
                name="title"
                maxLength={70}
                required
                placeholder="e.g. Birthday dinner"
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
              {busy ? 'Creating…' : 'Create event'}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
