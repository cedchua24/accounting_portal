import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Banknote, Building2, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Plus, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { accountingApi } from './api.js';
import { AppLink, pagePath } from './navigation.jsx';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const money = (amount, currency = 'PHP') => new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency || 'PHP', maximumFractionDigits: 2 }).format(Number(amount || 0));
const dateLabel = value => value ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : '—';
const recordsOf = payload => Array.isArray(payload) ? payload : payload?.data || [];
const humanize = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const accountHolder = account => account?.user_account?.name || account?.user_account?.display_name || account?.user_account?.username || account?.account_holder_name || 'No account holder';
const queryString = filters => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value !== '' && value != null && params.set(key, String(value)));
  return params.size ? `?${params.toString()}` : '';
};

function ChequeSummary({ summary, loading }) {
  const counts = summary?.counts || {};
  const amounts = summary?.outstanding_by_currency || [];
  return <section className="cheque-summary" aria-label="Cheque summary">
    <article className="cheque-total-card"><span><Banknote size={18}/>Outstanding</span>{loading ? <RefreshCw className="spin" size={20}/> : amounts.length ? <div className="cheque-currency-totals">{amounts.map(item => <div key={item.currency}><strong>{money(item.amount, item.currency)}</strong><small>{item.cheque_count} cheque{item.cheque_count === 1 ? '' : 's'}</small></div>)}</div> : <><strong>{money(0)}</strong><small>No outstanding cheques</small></>}</article>
    <article className="danger"><span>Overdue</span><strong>{counts.overdue || 0}</strong><small>Need attention</small></article>
    <article className="warning"><span>Due today</span><strong>{counts.due_today || 0}</strong><small>{dateLabel(summary?.as_of || today())}</small></article>
    <article><span>Upcoming</span><strong>{counts.upcoming || 0}</strong><small>Outstanding cheques</small></article>
    <article className="success"><span>Paid</span><strong>{counts.paid || 0}</strong><small>Cleared records</small></article>
  </section>;
}

function MonitoringBadge({ cheque }) {
  const state = cheque.monitoring_status || cheque.status;
  const Icon = state === 'overdue' ? AlertCircle : state === 'due_today' ? Clock3 : state === 'paid' ? CheckCircle2 : state === 'bounced' || state === 'cancelled' ? XCircle : CalendarDays;
  return <span className={`cheque-badge ${state}`}><Icon size={12}/>{humanize(state)}</span>;
}

function ChequeForm({ onSaved }) {
  const [form, setForm] = useState({ cheque_number: '', branch_id: '', financial_account_id: '', issue_date: today(), due_date: today(), currency: 'PHP', amount: '', status: 'pending', notes: '' });
  const [options, setOptions] = useState({ accounts: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    accountingApi.financialAccounts('?per_page=100')
      .then(accounts => current && setOptions({ accounts: recordsOf(accounts) }))
      .catch(requestError => current && setError(requestError.message || 'Form options could not be loaded.'))
      .finally(() => current && setLoadingOptions(false));
    return () => { current = false; };
  }, []);

  const accounts = options.accounts.filter(account => account.kind === 'checking_account' && (account.currency || 'PHP') === 'PHP');
  const selectedAccount = accounts.find(account => String(account.id) === String(form.financial_account_id));
  const update = event => {
    const { name, value } = event.target;
    setForm(current => {
      const next = { ...current, [name]: value };
      if (name === 'issue_date' && value > current.due_date) next.due_date = value;
      return next;
    });
  };
  const submit = async event => {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      await accountingApi.createCheque({ ...form, cheque_number: form.cheque_number.trim() || null, branch_id: form.branch_id || null, financial_account_id: form.financial_account_id || null, notes: form.notes.trim() || null, amount: Number(form.amount) });
      onSaved();
    } catch (requestError) {
      const detail = requestError.details && Object.values(requestError.details).flat()[0];
      setError(detail || requestError.message || 'Cheque could not be saved.');
    } finally { setSubmitting(false); }
  };

  return <main className="content inner-page cheques-page">
    <div className="title-row"><div><p className="eyebrow">CHEQUES</p><h1>Add cheque</h1><p>Register an outgoing cheque and monitor it through clearing.</p></div><AppLink href={pagePath('cheques')} className="secondary-button">Cheque list<ChevronRight size={16}/></AppLink></div>
    <form className="panel cheque-form" onSubmit={submit}>
      <div className="cheque-form-head"><div><span className="cheque-form-icon"><Banknote size={21}/></span><div><h2>Cheque details</h2><p>Fields marked required are needed to create the register entry.</p></div></div><span className="cheque-draft-label">New record</span></div>
      <div className="cheque-form-layout">
        <section className="cheque-form-primary">
          <div className="cheque-section-heading"><span>1</span><div><h3>Cheque information</h3><p>Enter the account, dates, and amount printed on the cheque.</p></div></div>
          <div className="cheque-primary-grid">
            <label className="span-2">Checking account <b>*</b><select name="financial_account_id" value={form.financial_account_id} onChange={update} disabled={loadingOptions} required><option value="">Select checking account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name || account.account_name} · {accountHolder(account)} · PHP</option>)}</select><small>Account name · account holder · currency</small></label>
            <label>Cheque number <small className="optional-label">Optional</small><input name="cheque_number" value={form.cheque_number} onChange={update} placeholder="e.g. CHK-001284" autoFocus/></label>
            <label>Issue date <b>*</b><input name="issue_date" type="date" value={form.issue_date} onChange={update} required/></label>
            <label>Due date <b>*</b><input name="due_date" type="date" min={form.issue_date} value={form.due_date} onChange={update} required/></label>
            <label>Amount <b>*</b><div className="cheque-amount-input"><span>PHP</span><input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={update} placeholder="0.00" required/></div></label>
            <label className="span-2">Notes <small className="optional-label">Optional</small><textarea name="notes" value={form.notes} onChange={update} rows="4" placeholder="Add a purpose, memo, or supporting reference"/></label>
          </div>
        </section>
        <aside className="cheque-form-aside">
          <div className="cheque-section-heading compact"><span>2</span><div><h3>Record defaults</h3><p>Fixed for new cheque records.</p></div></div>
          <div className="cheque-fixed-list"><div><i><Building2 size={16}/></i><span><small>Branch</small><strong>Company-wide</strong></span><Check size={14}/></div><div><i><Banknote size={16}/></i><span><small>Currency</small><strong>PHP · Philippine peso</strong></span><Check size={14}/></div><div><i><Clock3 size={16}/></i><span><small>Starting status</small><strong>Pending</strong></span><Check size={14}/></div></div>
          <div className="cheque-live-preview"><span>CHEQUE PREVIEW</span><div><small>Amount</small><strong>{money(form.amount || 0, 'PHP')}</strong></div><dl><div><dt>Account</dt><dd>{selectedAccount?.name || selectedAccount?.account_name || 'Not selected'}</dd></div><div><dt>Account holder</dt><dd>{selectedAccount ? accountHolder(selectedAccount) : '—'}</dd></div><div><dt>Due date</dt><dd>{dateLabel(form.due_date)}</dd></div></dl></div>
        </aside>
      </div>
      {error && <div className="cheque-form-error" role="alert"><CircleHelp size={17}/><span>{error}</span></div>}
      <div className="cheque-form-actions"><AppLink href={pagePath('cheques')} className="text-button">Cancel</AppLink><button className="primary-button" disabled={submitting || loadingOptions}>{submitting ? <><RefreshCw className="spin" size={17}/>Saving…</> : <><Check size={17}/>Save cheque</>}</button></div>
    </form>
  </main>;
}

function ChequeTable({ rows, loading, error, onRefresh, onMarkPaid, onDelete, emptyCopy }) {
  if (loading) return <div className="transaction-state"><RefreshCw className="spin" size={21}/><strong>Loading cheques…</strong></div>;
  if (error) return <div className="transaction-state error-state"><CircleHelp size={21}/><strong>Unable to load cheques</strong><span>{error}</span><button className="secondary-button" onClick={onRefresh}>Try again</button></div>;
  if (!rows.length) return <div className="cheque-empty"><span><Banknote size={25}/></span><h2>No cheques found</h2><p>{emptyCopy || 'No register entries match the current filters.'}</p></div>;
  return <div className="cheque-table-wrap"><div className="cheque-row cheque-table-head"><span>Cheque</span><span>Checking account</span><span>Due date</span><span>Amount</span><span>Status</span><span>Actions</span></div>{rows.map(cheque => <div className={`cheque-row ${cheque.monitoring_status || cheque.status}`} key={cheque.id}>
    <span className="cheque-identity"><i><Banknote size={16}/></i><span><strong>{cheque.cheque_number || 'Unnumbered cheque'}</strong><small>Issued {dateLabel(cheque.issue_date)}</small></span></span>
    <span><strong>{cheque.financial_account?.name || cheque.financialAccount?.name || 'Checking account'}</strong><small>{accountHolder(cheque.financial_account || cheque.financialAccount)} · {cheque.branch?.name || 'Company-wide'}</small></span>
    <span className="cheque-due-date"><strong>{dateLabel(cheque.due_date)}</strong><small>{cheque.days_until_due == null ? cheque.payment_date ? `Paid ${dateLabel(cheque.payment_date)}` : humanize(cheque.status) : cheque.days_until_due < 0 ? `${Math.abs(cheque.days_until_due)} day${Math.abs(cheque.days_until_due) === 1 ? '' : 's'} overdue` : cheque.days_until_due === 0 ? 'Due today' : `${cheque.days_until_due} days remaining`}</small></span>
    <span className="cheque-money"><strong>{money(cheque.amount, cheque.currency)}</strong><small>{cheque.currency}</small></span><span><MonitoringBadge cheque={cheque}/></span>
    <span className="cheque-row-actions">{['pending', 'deposited'].includes(cheque.status) && <button onClick={() => onMarkPaid(cheque)} title="Mark paid"><CheckCircle2 size={16}/><span>Mark paid</span></button>}{cheque.status !== 'paid' && <button className="delete" onClick={() => onDelete(cheque)} title="Delete cheque"><Trash2 size={15}/></button>}</span>
  </div>)}</div>;
}

function ChequeBankList() {
  const [filters, setFilters] = useState({ search: '', due_from: '', due_to: '' });
  const [result, setResult] = useState({ data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    accountingApi.chequeBanks(queryString({ ...filters, search: filters.search.trim() }))
      .then(payload => current && setResult(payload || { data: [] }))
      .catch(requestError => current && setError(requestError.message || 'Cheque bank accounts could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [filters, version]);
  const banks = recordsOf(result);
  const totals = banks.reduce((value, bank) => ({
    amount: value.amount + Number(bank.outstanding_amount || 0),
    cheques: value.cheques + Number(bank.outstanding_count || 0),
    overdue: value.overdue + Number(bank.overdue_count || 0),
    today: value.today + Number(bank.due_today_count || 0),
    upcoming: value.upcoming + Number(bank.upcoming_count || 0),
  }), { amount: 0, cheques: 0, overdue: 0, today: 0, upcoming: 0 });
  const update = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  return <main className="content inner-page cheques-page">
    <div className="title-row"><div><p className="eyebrow">CHEQUES</p><h1>Cheque accounts</h1><p>Select a bank checking account to review all of its outstanding cheque dues.</p></div><AppLink href={pagePath('cheques', null, { view: 'new' })} className="primary-button"><Plus size={17}/>Add cheque</AppLink></div>
    <section className="cheque-bank-summary"><article><span>Outstanding amount</span><strong>{money(totals.amount, 'PHP')}</strong><small>{totals.cheques} cheque{totals.cheques === 1 ? '' : 's'} across {banks.length} account{banks.length === 1 ? '' : 's'}</small></article><article className="danger"><span>Overdue</span><strong>{totals.overdue}</strong><small>Requires attention</small></article><article className="warning"><span>Due today</span><strong>{totals.today}</strong><small>{dateLabel(result.as_of || today())}</small></article><article><span>Upcoming</span><strong>{totals.upcoming}</strong><small>Future dues</small></article></section>
    <section className="panel cheque-bank-panel">
      <div className="cheque-bank-toolbar"><div><h2>Bank checking accounts</h2><p>Only accounts with outstanding cheques are shown.</p></div><div className="cheque-bank-filters"><label>Due from<input name="due_from" type="date" value={filters.due_from} onChange={update}/></label><label>Due to<input name="due_to" type="date" min={filters.due_from || undefined} value={filters.due_to} onChange={update}/></label><label className="cheque-search"><span>Search</span><div><Search size={15}/><input name="search" value={filters.search} onChange={update} placeholder="Bank or account"/></div></label><button className="icon-button" onClick={() => setVersion(value => value + 1)} aria-label="Refresh cheque accounts"><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div></div>
      {loading && <div className="transaction-state"><RefreshCw className="spin" size={21}/><strong>Loading bank accounts…</strong></div>}
      {!loading && error && <div className="transaction-state error-state"><CircleHelp size={21}/><strong>Unable to load cheque accounts</strong><span>{error}</span><button className="secondary-button" onClick={() => setVersion(value => value + 1)}>Try again</button></div>}
      {!loading && !error && banks.length === 0 && <div className="cheque-empty"><span><Banknote size={25}/></span><h2>No bank cheque accounts</h2><p>No checking accounts have outstanding cheques for the selected filters.</p></div>}
      {!loading && !error && banks.length > 0 && <div className="cheque-bank-list"><div className="cheque-bank-row cheque-bank-head"><span>Bank / checking account</span><span>Outstanding</span><span>Overdue</span><span>Due today</span><span>Upcoming</span><span>Nearest due</span><span/></div>{banks.map(bank => {
        const institution = bank.institution?.name || 'Bank';
        const initials = institution.split(/\s+/).map(word => word[0]).join('').slice(0, 3).toUpperCase();
        return <AppLink key={bank.financial_account_id} href={pagePath('cheques', bank.financial_account_id, { view: 'bank-dues' })} className="cheque-bank-row"><span className="cheque-bank-name"><i>{initials}</i><span><strong>{institution}</strong><small>{bank.account_name}{bank.masked_account_number ? ` · ${bank.masked_account_number}` : ''}</small></span></span><span className="cheque-bank-amount"><strong>{money(bank.outstanding_amount, bank.currency)}</strong><small>{bank.outstanding_count} outstanding</small></span><span><b className={Number(bank.overdue_count) ? 'bank-count danger' : 'bank-count'}>{bank.overdue_count}</b></span><span><b className={Number(bank.due_today_count) ? 'bank-count warning' : 'bank-count'}>{bank.due_today_count}</b></span><span><b className="bank-count">{bank.upcoming_count}</b></span><span><strong>{dateLabel(bank.nearest_due_date)}</strong><small>Next cheque due</small></span><ChevronRight className="cheque-bank-chevron" size={17}/></AppLink>;
      })}</div>}
    </section>
  </main>;
}

function BankChequeDues({ accountId }) {
  const [filters, setFilters] = useState({ due_status: 'outstanding', due_from: '', due_to: '', search: '', per_page: 100 });
  const [result, setResult] = useState({ cheques: { data: [] } });
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    accountingApi.chequeBankDues(accountId, queryString({ ...filters, search: filters.search.trim() }))
      .then(payload => current && setResult(payload || { cheques: { data: [] } }))
      .catch(requestError => current && setError(requestError.message || 'Bank cheque dues could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [accountId, filters, version]);
  const bank = result.bank_account || {};
  const rows = recordsOf(result.cheques);
  const update = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const markPaid = async cheque => { if (!window.confirm(`Mark cheque ${cheque.cheque_number || 'without a number'} as paid today?`)) return; try { await accountingApi.markChequePaid(cheque.id, { payment_date: today() }); setVersion(value => value + 1); } catch (requestError) { window.alert(requestError.message || 'Cheque could not be marked paid.'); } };
  const remove = async cheque => { if (!window.confirm(`Delete cheque ${cheque.cheque_number || 'without a number'}? This cannot be undone.`)) return; try { await accountingApi.deleteCheque(cheque.id); setVersion(value => value + 1); } catch (requestError) { window.alert(requestError.message || 'Cheque could not be deleted.'); } };
  const bankName = bank.institution?.name || 'Bank';
  return <main className="content inner-page cheques-page">
    <div className="cheque-detail-back"><AppLink href={pagePath('cheques')}><ArrowLeft size={15}/>Back to cheque accounts</AppLink></div>
    <div className="title-row cheque-bank-title"><div><p className="eyebrow">CHEQUE DUE</p><h1>{bankName} · {bank.name || 'Checking account'}</h1><p>Outstanding cheque dues for this bank checking account.</p></div><AppLink href={pagePath('cheques', null, { view: 'new' })} className="primary-button"><Plus size={17}/>Add cheque</AppLink></div>
    <section className="cheque-bank-hero"><div><span className="cheque-bank-logo"><Banknote size={23}/></span><div><small>BANK CHECKING ACCOUNT</small><strong>{bankName}</strong><span>{bank.name || 'Checking account'}{bank.masked_account_number ? ` · ${bank.masked_account_number}` : ''}</span></div></div><div><span>Total due</span><strong>{money(result.total_due_amount, bank.currency || 'PHP')}</strong><small>{rows.length} cheque{rows.length === 1 ? '' : 's'} in this view</small></div></section>
    <section className="panel cheque-register-panel"><div className="cheque-due-tabs">{[['outstanding', 'All outstanding'], ['overdue', 'Overdue'], ['due_today', 'Due today'], ['upcoming', 'Upcoming']].map(([value, label]) => <button key={value} className={filters.due_status === value ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, due_status: value }))}>{label}</button>)}</div><div className="cheque-filters"><label>Due from<input name="due_from" type="date" value={filters.due_from} onChange={update}/></label><label>Due to<input name="due_to" type="date" min={filters.due_from || undefined} value={filters.due_to} onChange={update}/></label><label className="cheque-search"><span>Search</span><div><Search size={15}/><input name="search" value={filters.search} onChange={update} placeholder="Cheque number"/></div></label><button className="icon-button" onClick={() => setVersion(value => value + 1)} aria-label="Refresh bank dues"><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div><ChequeTable rows={rows} loading={loading} error={error} onRefresh={() => setVersion(value => value + 1)} onMarkPaid={markPaid} onDelete={remove} emptyCopy="No outstanding cheques match this bank and due-date filter."/></section>
  </main>;
}

function ChequeRegister({ dueOnly = false }) {
  const [filters, setFilters] = useState({ status: dueOnly ? 'outstanding' : '', branch_id: '', due_from: '', due_to: '', search: '', per_page: 100 });
  const [dueTab, setDueTab] = useState('all');
  const [rows, setRows] = useState([]); const [summary, setSummary] = useState(null); const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => { accountingApi.branches('?per_page=100').then(payload => setBranches(recordsOf(payload))).catch(() => {}); }, []);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    const listFilters = { ...filters, search: filters.search.trim() };
    const summaryFilters = { branch_id: filters.branch_id, due_from: filters.due_from, due_to: filters.due_to };
    Promise.all([accountingApi.cheques(queryString(listFilters)), accountingApi.chequeSummary(queryString(summaryFilters))])
      .then(([list, totals]) => { if (current) { setRows(recordsOf(list)); setSummary(totals); } })
      .catch(requestError => current && setError(requestError.message || 'Cheque register could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [filters, refreshVersion]);
  const visibleRows = useMemo(() => !dueOnly || dueTab === 'all' ? rows : rows.filter(item => item.monitoring_status === dueTab), [rows, dueOnly, dueTab]);
  const update = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const markPaid = async cheque => {
    if (!window.confirm(`Mark cheque ${cheque.cheque_number} as paid today?`)) return;
    try { await accountingApi.markChequePaid(cheque.id, { payment_date: today() }); setRefreshVersion(value => value + 1); } catch (requestError) { window.alert(requestError.message || 'Cheque could not be marked paid.'); }
  };
  const remove = async cheque => {
    if (!window.confirm(`Delete cheque ${cheque.cheque_number}? This cannot be undone.`)) return;
    try { await accountingApi.deleteCheque(cheque.id); setRefreshVersion(value => value + 1); } catch (requestError) { window.alert(requestError.message || 'Cheque could not be deleted.'); }
  };
  return <main className="content inner-page cheques-page">
    <div className="title-row"><div><p className="eyebrow">CHEQUES</p><h1>{dueOnly ? 'Cheque due' : 'Cheque register'}</h1><p>{dueOnly ? 'Monitor overdue, due-today, and upcoming outgoing cheques.' : 'Track every outgoing cheque from registration through clearing.'}</p></div><AppLink href={pagePath('cheques', null, { view: 'new' })} className="primary-button"><Plus size={17}/>Add cheque</AppLink></div>
    <ChequeSummary summary={summary} loading={loading}/>
    <section className="panel cheque-register-panel">
      {dueOnly && <div className="cheque-due-tabs">{[['all', 'All outstanding'], ['overdue', 'Overdue'], ['due_today', 'Due today'], ['upcoming', 'Upcoming']].map(([value, label]) => <button key={value} className={dueTab === value ? 'active' : ''} onClick={() => setDueTab(value)}>{label}<span>{value === 'all' ? rows.length : rows.filter(item => item.monitoring_status === value).length}</span></button>)}</div>}
      <div className="cheque-filters">{!dueOnly && <label>Status<select name="status" value={filters.status} onChange={update}><option value="">All statuses</option><option value="outstanding">Outstanding</option><option value="overdue">Overdue</option><option value="pending">Pending</option><option value="deposited">Deposited</option><option value="paid">Paid</option><option value="bounced">Bounced</option><option value="cancelled">Cancelled</option></select></label>}<label>Branch<select name="branch_id" value={filters.branch_id} onChange={update}><option value="">All branches</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Due from<input name="due_from" type="date" value={filters.due_from} onChange={update}/></label><label>Due to<input name="due_to" type="date" min={filters.due_from || undefined} value={filters.due_to} onChange={update}/></label><label className="cheque-search"><span>Search</span><div><Search size={15}/><input name="search" value={filters.search} onChange={update} placeholder="Cheque number"/></div></label><button className="icon-button" onClick={() => setRefreshVersion(value => value + 1)} aria-label="Refresh cheques"><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div>
      <ChequeTable rows={visibleRows} loading={loading} error={error} onRefresh={() => setRefreshVersion(value => value + 1)} onMarkPaid={markPaid} onDelete={remove} emptyCopy={dueOnly ? 'There are no outstanding cheques in this due-date view.' : undefined}/>
    </section>
  </main>;
}

export default function ChequesWorkspace({ view, bankAccountId, onNavigate }) {
  if (view === 'new') return <ChequeForm onSaved={() => onNavigate('list')}/>;
  if (view === 'bank-dues' && bankAccountId) return <BankChequeDues accountId={bankAccountId}/>;
  if (view === 'due') return <ChequeRegister dueOnly/>;
  return <ChequeBankList/>;
}
