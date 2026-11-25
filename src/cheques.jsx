import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowLeft, ArrowUpRight, Banknote, Building2, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, HandCoins, ListChecks, Plus, RefreshCw, RotateCcw, Search, Trash2, WalletCards, XCircle } from 'lucide-react';
import { accountingApi } from './api.js';
import { AppLink, pagePath } from './navigation.jsx';
import { financialAccountOptionLabel as sharedFinancialAccountOptionLabel } from './financial-account-labels.js';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const money = (amount, currency = 'PHP') => new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency || 'PHP', maximumFractionDigits: 2 }).format(Number(amount || 0));
const dateLabel = value => value ? new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : '—';
const recordsOf = payload => Array.isArray(payload) ? payload : payload?.data || [];
const humanize = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const accountHolder = account => account?.user_account?.name || account?.user_account?.display_name || account?.user_account?.username || account?.account_holder_name || 'No account holder';
const accountIdentity = account => account?.masked_account_number || (account?.account_number_last4 ? `•••• ${account.account_number_last4}` : `Account #${account?.id || '—'}`);
const accountOptionLabel = (account, includeBalance = false) => {
  return sharedFinancialAccountOptionLabel(account, { includeBalance });
};
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
            <label className="span-2">Checking account <b>*</b><select name="financial_account_id" value={form.financial_account_id} onChange={update} disabled={loadingOptions} required><option value="">Select checking account</option>{accounts.map(account => <option key={account.id} value={account.id}>{accountOptionLabel(account, true)}</option>)}</select><small>Institution · account · holder · last digits · available balance</small></label>
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

function ChequeSettlementDialog({ cheque, onClose, onSettled }) {
  const [options, setOptions] = useState({ payment_methods: [], financial_accounts: [] });
  const [form, setForm] = useState({ settlement_date: today(), payment_method_id: '', financial_account_id: '', reference: '', notes: '', includes_expense: false, additional_expense_amount: '', expense_item_id: '', expense_reason: '' });
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let current = true; accountingApi.chequeSettlementOptions(cheque.id).then(value => { if (!current) return; const next = value || {}; const transferMethod = (next.payment_methods || []).find(method => method.type === 'bank_transfer'); const chequeAccountId = cheque.financial_account?.id || cheque.financialAccount?.id; setOptions(next); setForm(existing => ({ ...existing, payment_method_id: transferMethod?.id || '', financial_account_id: chequeAccountId || '' })); }).catch(e => current && setError(e.message || 'Settlement options could not be loaded.')).finally(() => current && setLoading(false)); return () => { current = false; }; }, [cheque.id]);
  const methods = options.payment_methods || [];
  const selectedMethod = methods.find(item => String(item.id) === String(form.payment_method_id));
  const allowedKinds = selectedMethod?.type === 'cash' ? ['cash'] : selectedMethod?.type === 'e_wallet' ? ['e_wallet'] : selectedMethod?.type === 'bank_transfer' ? ['bank_account', 'checking_account'] : [];
  const accounts = (options.financial_accounts || []).filter(account => !selectedMethod || allowedKinds.includes(account.kind));
  const chequeAccount = cheque.financial_account || cheque.financialAccount || {};
  const chequeBalance = Number(chequeAccount.available_balance ?? chequeAccount.current_balance ?? 0);
  const chequeAmount = Number(cheque.amount || 0);
  const overdue = Boolean(form.settlement_date && String(form.settlement_date).slice(0, 10) > String(cheque.due_date).slice(0, 10));
  const additionalExpense = overdue && form.includes_expense ? Number(form.additional_expense_amount || 0) : 0;
  const expenseItems = options.expense_items || [];
  const totalPayment = chequeAmount + additionalExpense;
  const projectedBalance = chequeBalance - totalPayment;
  const depositNeeded = Math.max(0, totalPayment - chequeBalance);
  const selectedAccount = accounts.find(account => String(account.id) === String(form.financial_account_id));
  const selectedAvailable = Number(selectedAccount?.available_balance ?? selectedAccount?.current_balance ?? 0);
  const update = event => { const { name, value, type, checked } = event.target; setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value, ...(name === 'payment_method_id' ? { financial_account_id: '' } : {}), ...(name === 'settlement_date' && value <= String(cheque.due_date).slice(0, 10) ? { includes_expense: false, additional_expense_amount: '', expense_item_id: '', expense_reason: '' } : {}) })); };
  const submit = async event => { event.preventDefault(); setSubmitting(true); setError(''); try { await accountingApi.settleCheque(cheque.id, { settlement_date: form.settlement_date, reference: form.reference.trim() || null, notes: form.notes.trim() || null, additional_expense_amount: additionalExpense, expense_item_id: additionalExpense > 0 ? Number(form.expense_item_id) : null, expense_reason: additionalExpense > 0 ? form.expense_reason.trim() || null : null }); onSettled(); } catch (e) { const detail = e.details && Object.values(e.details).flat()[0]; setError(detail || e.message || 'Cheque could not be settled.'); } finally { setSubmitting(false); } };
  return <div className="cheque-settlement-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="cheque-settlement-dialog" role="dialog" aria-modal="true" aria-label="Settle cheque" onSubmit={submit}>
    <div className="cheque-settlement-head"><div><p className="eyebrow">CHEQUE SETTLEMENT</p><h2>Post cheque payment</h2><p>{cheque.cheque_number || 'Unnumbered cheque'} · {money(totalPayment, cheque.currency)}</p></div><button type="button" className="icon-button" onClick={onClose}><XCircle size={20}/></button></div>
    <div className="cheque-settlement-note"><CircleHelp size={17}/><span>This clears the cheque from its deposited checking-account balance without posting the original supplier expense twice. An overdue interest or penalty is recorded as a separate linked expense.</span></div>
    <section className={`cheque-settlement-balance ${depositNeeded > 0 ? 'insufficient' : 'sufficient'}`}><div className="cheque-balance-account"><span><Banknote size={21}/></span><div><small>CHEQUE CHECKING ACCOUNT</small><strong>{chequeAccount.institution?.name ? `${chequeAccount.institution.name} · ` : ''}{chequeAccount.name || 'Checking account'}</strong><em>{chequeAccount.masked_account_number || 'Account balance used for clearing'}</em></div></div><div><small>{chequeBalance < 0 ? 'Overdrawn balance' : 'Available balance'}</small><strong>{money(chequeBalance, cheque.currency)}</strong></div><div><small>Cheque amount due</small><strong>{money(chequeAmount, cheque.currency)}</strong></div><div><small>{depositNeeded > 0 ? 'Deposit required' : 'Balance after settlement'}</small><strong>{money(depositNeeded > 0 ? depositNeeded : projectedBalance, cheque.currency)}</strong></div><p>{depositNeeded > 0 ? `Deposit ${money(depositNeeded, cheque.currency)} before this cheque can be settled.` : 'This checking account has enough available balance to settle the cheque.'}</p></section>
    {loading ? <div className="transaction-state"><RefreshCw className="spin" size={20}/><strong>Loading payment options…</strong></div> : <div className="cheque-settlement-grid">
      <div className="cheque-clearing-source span-2"><span><Banknote size={18}/></span><div><small>SETTLEMENT SOURCE</small><strong>Cheque checking account balance</strong><p>The cheque will clear from {chequeAccount.name || 'the checking account'}.</p></div></div>
      <label>Settlement date <b>*</b><input type="date" name="settlement_date" min={String(cheque.issue_date).slice(0, 10)} value={form.settlement_date} onChange={update} required/></label>
      <label>Reference <small className="optional-label">Optional</small><input name="reference" value={form.reference} onChange={update} placeholder="Transfer or receipt reference"/></label>
      <label className="span-2">Notes <small className="optional-label">Optional</small><textarea name="notes" rows="3" value={form.notes} onChange={update} placeholder="Settlement details"/></label>
      {overdue && <section className="cheque-expense-panel span-2"><label className="cheque-expense-toggle"><input type="checkbox" name="includes_expense" checked={form.includes_expense} onChange={update}/><span><strong>Payment includes interest or penalty</strong><small>Record the amount above the original cheque as a linked expense.</small></span></label>{form.includes_expense && <div className="cheque-expense-fields"><div className="cheque-expense-category"><small>EXPENSE CATEGORY</small><strong>{options.expense_category?.name || 'Cheque Fees and Charges'}</strong></div><label>Interest / penalty amount <b>*</b><input type="number" name="additional_expense_amount" min="0.01" step="0.01" value={form.additional_expense_amount} onChange={update} required/></label><label>Expense <b>*</b><select name="expense_item_id" value={form.expense_item_id} onChange={update} required><option value="">Select cheque expense</option>{expenseItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="span-2">Details <small className="optional-label">Optional</small><textarea name="expense_reason" rows="2" value={form.expense_reason} onChange={update} placeholder="Interest, late fee, returned-cheque penalty, or supporting details"/></label><div className="cheque-expense-total span-2"><span>Original cheque <strong>{money(chequeAmount, cheque.currency)}</strong></span><span>Expense <strong>{money(additionalExpense, cheque.currency)}</strong></span><span>Total payment <strong>{money(totalPayment, cheque.currency)}</strong></span></div></div>}</section>}
    </div>}
    {error && <div className="cheque-form-error"><AlertCircle size={17}/><span>{error}</span></div>}
    <div className="cheque-settlement-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={loading || submitting || depositNeeded > 0 || (form.includes_expense && (!form.expense_item_id || additionalExpense <= 0))}>{submitting ? <><RefreshCw className="spin" size={16}/>Posting…</> : <><CheckCircle2 size={16}/>{depositNeeded > 0 ? 'Insufficient balance' : `Post ${money(totalPayment, cheque.currency)}`}</>}</button></div>
  </form></div>;
}

export function ChequeDepositDialog({ onClose, onDeposited }) {
  const [options, setOptions] = useState({ accounts: [], methods: [] });
  const [form, setForm] = useState({ destination_financial_account_id: '', payment_method_id: '', source_financial_account_id: '', amount: '', transfer_date: today(), reference: '' });
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let current = true; accountingApi.chequeDepositOptions().then(payload => current && setOptions({ accounts: payload?.financial_accounts || [], methods: payload?.payment_methods || [] })).catch(e => current && setError(e.message || 'Deposit options could not be loaded.')).finally(() => current && setLoading(false)); return () => { current = false; }; }, []);
  const method = options.methods.find(item => String(item.id) === String(form.payment_method_id));
  const allowedKinds = method?.type === 'cash' ? ['cash'] : method?.type === 'e_wallet' ? ['e_wallet'] : method?.type === 'bank_transfer' ? ['bank_account', 'checking_account'] : [];
  const destinations = options.accounts.filter(account => account.kind === 'checking_account' && account.is_active !== false);
  const sources = options.accounts.filter(account => String(account.id) !== String(form.destination_financial_account_id) && account.is_active !== false && account.usable_for_payments && (!method || allowedKinds.includes(account.kind)));
  const destination = destinations.find(account => String(account.id) === String(form.destination_financial_account_id));
  const source = sources.find(account => String(account.id) === String(form.source_financial_account_id));
  const update = event => { const { name, value } = event.target; setForm(current => ({ ...current, [name]: value, ...(name === 'payment_method_id' ? { source_financial_account_id: '' } : {}), ...(name === 'destination_financial_account_id' && value === current.source_financial_account_id ? { source_financial_account_id: '' } : {}) })); };
  const submit = async event => { event.preventDefault(); setSubmitting(true); setError(''); try { await accountingApi.depositChequeBalance({ source_financial_account_id: Number(form.source_financial_account_id), destination_financial_account_id: Number(form.destination_financial_account_id), transfer_method: method?.type === 'bank_transfer' ? 'online' : method?.type, transfer_date: form.transfer_date, currency: destination?.currency || 'PHP', amount: Number(form.amount), reference: form.reference.trim() || null, memo: `Deposit into cheque account ${destination?.name || ''}` }); onDeposited(); } catch (e) { const detail = e.details && Object.values(e.details).flat()[0]; setError(detail || e.message || 'Deposit could not be posted.'); } finally { setSubmitting(false); } };
  return <div className="cheque-settlement-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><form className="cheque-settlement-dialog cheque-deposit-dialog" role="dialog" aria-modal="true" aria-label="Deposit cheque account balance" onSubmit={submit}><div className="cheque-settlement-head"><div><p className="eyebrow">CHEQUE ACCOUNT</p><h2>Deposit balance</h2><p>Add any amount to a checking account used for cheques.</p></div><button type="button" className="icon-button" onClick={onClose}><XCircle size={20}/></button></div>{loading ? <div className="transaction-state"><RefreshCw className="spin" size={20}/><strong>Loading deposit options…</strong></div> : <div className="cheque-deposit-main"><div className="cheque-deposit-grid"><label className="span-2">Deposit to checking account <b>*</b><select name="destination_financial_account_id" value={form.destination_financial_account_id} onChange={update} required><option value="">Select cheque checking account</option>{destinations.map(account => <option key={account.id} value={account.id}>{accountOptionLabel(account, true)}</option>)}</select></label>{destination && <div className="cheque-deposit-destination span-2"><span><Banknote size={20}/></span><div><small>CURRENT AVAILABLE BALANCE</small><strong>{money(destination.available_balance, destination.currency)}</strong><p>{destination.institution?.name || 'Checking account'} · {destination.name} · {accountHolder(destination)} · {accountIdentity(destination)}</p></div></div>}<label>Deposit method <b>*</b><select name="payment_method_id" value={form.payment_method_id} onChange={update} required><option value="">Select cash, online transfer, or e-wallet</option>{options.methods.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Source account <b>*</b><select name="source_financial_account_id" value={form.source_financial_account_id} onChange={update} disabled={!method} required><option value="">Select source account</option>{sources.map(account => <option key={account.id} value={account.id}>{accountOptionLabel(account, true)}</option>)}</select></label><label>Deposit amount <b>*</b><input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={update} placeholder="Enter any amount" required/></label><label>Deposit date <b>*</b><input name="transfer_date" type="date" value={form.transfer_date} onChange={update} required/></label><label className="span-2">Reference <small>Optional</small><input name="reference" value={form.reference} onChange={update} placeholder="Deposit slip or transfer reference"/></label></div>{source && <p className="cheque-deposit-source">Source: <strong>{accountOptionLabel(source, true)}</strong></p>}</div>}{error && <div className="cheque-form-error"><AlertCircle size={17}/><span>{error}</span></div>}<div className="cheque-settlement-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={loading || submitting}>{submitting ? <><RefreshCw className="spin" size={16}/>Posting deposit…</> : <><Plus size={16}/>Post deposit</>}</button></div></form></div>;
}

function ChequeVoidDialog({ cheque, onClose, onVoided }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const settlement = cheque.settlement || {};
  const submit = async event => {
    event.preventDefault();
    if (!reason.trim() || submitting) return;
    setSubmitting(true); setError('');
    try { await accountingApi.voidChequeSettlement(cheque.id, reason.trim()); onVoided(); }
    catch (requestError) { const detail = requestError.details && Object.values(requestError.details).flat()[0]; setError(detail || requestError.message || 'The cheque settlement could not be voided.'); }
    finally { setSubmitting(false); }
  };
  return <div className="cheque-settlement-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && !submitting && onClose()}><form className="cheque-settlement-dialog cheque-void-dialog" role="dialog" aria-modal="true" aria-label="Void cheque settlement" onSubmit={submit}><div className="cheque-settlement-head"><div><p className="eyebrow">VOID CHEQUE SETTLEMENT</p><h2>Reverse this cheque payment?</h2><p>The original settlement remains in history and the cheque returns to outstanding.</p></div><button type="button" className="icon-button" onClick={onClose} disabled={submitting}><XCircle size={20}/></button></div><div className="cheque-void-main"><div className="cheque-void-summary"><span>Cheque<strong>{cheque.cheque_number || 'Unnumbered cheque'}</strong></span><span>Settled amount<strong>{money(settlement.amount || cheque.amount, cheque.currency)}</strong></span><span>Checking account<strong>{cheque.financial_account?.name || 'Checking account'}</strong></span><span>Settlement date<strong>{dateLabel(settlement.settlement_date || cheque.payment_date)}</strong></span></div><label>Reason <b>*</b><textarea rows="3" maxLength="255" value={reason} onChange={event => setReason(event.target.value)} placeholder="Example: Cleared against the wrong cheque or duplicate settlement" required/></label><p className="cheque-void-note"><CircleHelp size={16}/>Any linked penalty journal will be reversed and its expense record cancelled.</p></div>{error && <div className="cheque-form-error"><AlertCircle size={17}/><span>{error}</span></div>}<div className="cheque-settlement-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button><button className="primary-button cheque-void-submit" disabled={submitting || !reason.trim()}>{submitting ? <><RefreshCw className="spin" size={16}/>Voiding…</> : <><RotateCcw size={16}/>Void settlement</>}</button></div></form></div>;
}

function ChequeTable({ rows, loading, error, onRefresh, onSettled, onDelete, onVoid, emptyCopy, paidView = false, onRowClick }) {
  const [settling, setSettling] = useState(null);
  if (loading) return <div className="transaction-state"><RefreshCw className="spin" size={21}/><strong>Loading cheques…</strong></div>;
  if (error) return <div className="transaction-state error-state"><CircleHelp size={21}/><strong>Unable to load cheques</strong><span>{error}</span><button className="secondary-button" onClick={onRefresh}>Try again</button></div>;
  if (!rows.length) return <div className="cheque-empty"><span><Banknote size={25}/></span><h2>No cheques found</h2><p>{emptyCopy || 'No register entries match the current filters.'}</p></div>;
  return <><div className="cheque-table-wrap"><div className="cheque-row cheque-table-head"><span>Cheque</span><span>Checking account</span><span>{paidView ? 'Settlement date' : 'Due date'}</span><span>Amount</span><span>Status / settlement</span><span>Actions</span></div>{rows.map(cheque => { const isVoided = paidView && cheque.settlement?.status === 'voided'; return <div className={`cheque-row ${isVoided ? 'voided-settlement' : cheque.monitoring_status || cheque.status} ${onRowClick ? 'clickable' : ''}`} key={cheque.id} role={onRowClick ? 'button' : undefined} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(cheque)} onKeyDown={event => { if (onRowClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRowClick(cheque); } }}>
    <span className="cheque-identity"><i><Banknote size={16}/></i><span><strong>{cheque.cheque_number || 'Unnumbered cheque'}</strong><small>Issued {dateLabel(cheque.issue_date)}</small></span></span>
    <span><strong>{cheque.financial_account?.name || cheque.financialAccount?.name || 'Checking account'}</strong><small>{accountHolder(cheque.financial_account || cheque.financialAccount)} · {cheque.branch?.name || 'Company-wide'}</small>{!paidView && <small className={`cheque-account-balance ${Number((cheque.financial_account || cheque.financialAccount)?.available_balance || 0) < 0 ? 'negative' : ''}`}>{Number((cheque.financial_account || cheque.financialAccount)?.available_balance || 0) < 0 ? 'Overdrawn ' : 'Available '}{money(Number((cheque.financial_account || cheque.financialAccount)?.available_balance || 0), cheque.currency)}</small>}</span>
    <span className="cheque-due-date"><strong>{dateLabel(paidView ? cheque.settlement?.settlement_date || cheque.payment_date : cheque.due_date)}</strong><small>{paidView ? `Due ${dateLabel(cheque.due_date)}` : cheque.days_until_due == null ? cheque.payment_date ? `Paid ${dateLabel(cheque.payment_date)}` : humanize(cheque.status) : cheque.days_until_due < 0 ? `${Math.abs(cheque.days_until_due)} day${Math.abs(cheque.days_until_due) === 1 ? '' : 's'} overdue` : cheque.days_until_due === 0 ? 'Due today' : `${cheque.days_until_due} days remaining`}</small></span>
    <span className={`cheque-money ${isVoided ? 'voided-money' : ''}`}><strong>{money(cheque.settlement?.amount || cheque.amount, cheque.currency)}</strong><small>{cheque.settlement?.linked_expense ? `Cheque ${money(cheque.amount, cheque.currency)} + expense ${money(cheque.settlement.linked_expense.amount, cheque.currency)}` : cheque.currency}</small></span><span>{paidView ? <span className={`cheque-badge ${isVoided ? 'voided' : 'paid'}`}>{isVoided ? <RotateCcw size={12}/> : <CheckCircle2 size={12}/>} {isVoided ? 'Voided' : 'Paid'}</span> : <MonitoringBadge cheque={cheque}/>} {cheque.settlement && <small>{isVoided ? `Voided · ${cheque.settlement.void_reason || 'No reason recorded'}` : `Global cheque payment · ${(cheque.financial_account || cheque.financialAccount)?.name || 'Checking account'}`}</small>}{cheque.settlement?.linked_expense && <small>{cheque.settlement.linked_expense.expense_item?.name || 'Cheque expense'} · {cheque.settlement.linked_expense.description}</small>}</span>
    <span className="cheque-row-actions">{paidView && !isVoided && cheque.settlement && <button className="void" onClick={event => { event.stopPropagation(); onVoid?.(cheque); }} title="Void this cheque settlement"><RotateCcw size={14}/><span>Void</span></button>}{paidView && <ChevronRight className="cheque-row-open" size={18}/>} {['pending', 'deposited'].includes(cheque.status) && !paidView && <button disabled={Number((cheque.financial_account || cheque.financialAccount)?.available_balance || 0) < Number(cheque.amount || 0)} onClick={event => { event.stopPropagation(); setSettling(cheque); }} title={Number((cheque.financial_account || cheque.financialAccount)?.available_balance || 0) < Number(cheque.amount || 0) ? `Deposit ${money(Math.max(0, Number(cheque.amount || 0) - Number((cheque.financial_account || cheque.financialAccount)?.available_balance || 0)), cheque.currency)} before settlement` : 'Settle this cheque as paid'}><HandCoins size={16}/><span>Settle</span></button>}{cheque.status !== 'paid' && !paidView && <button className="delete" onClick={event => { event.stopPropagation(); onDelete(cheque); }} title="Delete cheque"><Trash2 size={15}/></button>}</span>
  </div>; })}</div>{settling && <ChequeSettlementDialog cheque={settling} onClose={() => setSettling(null)} onSettled={() => { setSettling(null); onSettled(); }}/>}</>;
}

function ChequePaidPage({ onOpen }) {
  const [filters, setFilters] = useState({ branch_id: '', history_status: '', payment_from: '', payment_to: '', search: '', per_page: 100 });
  const [rows, setRows] = useState([]); const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [version, setVersion] = useState(0); const [voidTarget, setVoidTarget] = useState(null);
  useEffect(() => { accountingApi.branches('?per_page=100').then(payload => setBranches(recordsOf(payload))).catch(() => {}); }, []);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    const { history_status: historyStatus, ...requestFilters } = filters;
    accountingApi.cheques(queryString({ ...requestFilters, status: historyStatus === 'posted' ? 'paid' : historyStatus === 'voided' ? 'voided' : 'settled_history', search: filters.search.trim() }))
      .then(payload => current && setRows(recordsOf(payload)))
      .catch(requestError => current && setError(requestError.message || 'Paid cheques could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [filters, version]);
  const update = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const postedRows = rows.filter(cheque => cheque.settlement?.status !== 'voided');
  const voidedRows = rows.filter(cheque => cheque.settlement?.status === 'voided');
  const total = postedRows.reduce((sum, cheque) => sum + Number(cheque.settlement?.amount || cheque.amount || 0), 0);
  const linkedCount = postedRows.filter(cheque => cheque.payment_id || cheque.payment).length;
  return <main className="content inner-page cheques-page">
    <div className="title-row"><div><p className="eyebrow">CHEQUES</p><h1>Cheque paid</h1><p>Review posted and voided cheque settlements with their complete audit details.</p></div><AppLink href={pagePath('cheques', null, { view: 'due' })} className="secondary-button"><CalendarDays size={16}/>View cheque due</AppLink></div>
    <section className="cheque-summary cheque-paid-summary"><article className="cheque-total-card"><span><CheckCircle2 size={18}/>Total settled</span><strong>{money(total, 'PHP')}</strong><small>Voided settlements are excluded</small></article><article><span>Paid cheques</span><strong>{postedRows.length}</strong><small>Currently cleared</small></article><article><span>Voided</span><strong>{voidedRows.length}</strong><small>Reversed settlement records</small></article><article><span>Linked payments</span><strong>{linkedCount}</strong><small>Connected supplier payments</small></article></section>
    <section className="panel cheque-register-panel"><div className="cheque-filters"><label>Branch<select name="branch_id" value={filters.branch_id} onChange={update}><option value="">All branches</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Status<select name="history_status" value={filters.history_status} onChange={update}><option value="">Paid and voided</option><option value="posted">Paid only</option><option value="voided">Voided only</option></select></label><label>Settled from<input name="payment_from" type="date" value={filters.payment_from} onChange={update}/></label><label>Settled to<input name="payment_to" type="date" min={filters.payment_from || undefined} value={filters.payment_to} onChange={update}/></label><label className="cheque-search"><span>Search</span><div><Search size={15}/><input name="search" value={filters.search} onChange={update} placeholder="Cheque number or payee"/></div></label><button className="icon-button" onClick={() => setVersion(value => value + 1)} aria-label="Refresh cheque settlement history"><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div><ChequeTable rows={rows} loading={loading} error={error} onRefresh={() => setVersion(value => value + 1)} onDelete={() => {}} onVoid={setVoidTarget} onRowClick={onOpen} paidView emptyCopy="No cheque settlement records match the selected filters."/></section>
    {voidTarget && <ChequeVoidDialog cheque={voidTarget} onClose={() => setVoidTarget(null)} onVoided={() => { setVoidTarget(null); setVersion(value => value + 1); }}/>} 
  </main>;
}

function ChequePaidDetail({ chequeId }) {
  const [cheque, setCheque] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let current = true; setLoading(true); accountingApi.cheque(chequeId).then(value => { if (current) setCheque(value); }).catch(e => current && setError(e.message || 'Cheque details could not be loaded.')).finally(() => current && setLoading(false)); return () => { current = false; }; }, [chequeId]);
  if (loading) return <main className="content inner-page cheques-page"><div className="transaction-state"><RefreshCw className="spin" size={22}/><strong>Loading cheque details…</strong></div></main>;
  if (error || !cheque) return <main className="content inner-page cheques-page"><div className="transaction-state error-state"><CircleHelp size={22}/><strong>Unable to load cheque</strong><span>{error}</span><AppLink href={pagePath('cheques', null, { view: 'paid' })} className="secondary-button">Back to paid cheques</AppLink></div></main>;
  const settlement = cheque.settlement || {}; const original = cheque.financial_account || {}; const linkedExpense = settlement.linked_expense; const isVoided = settlement.status === 'voided';
  return <main className="content inner-page cheques-page cheque-paid-detail">
    <div className="cheque-detail-back"><AppLink href={pagePath('cheques', null, { view: 'paid' })}><ArrowLeft size={15}/>Back to paid cheques</AppLink></div>
    <section className={`cheque-paid-detail-hero ${isVoided ? 'voided' : ''}`}><div><span>{isVoided ? <RotateCcw size={25}/> : <CheckCircle2 size={25}/>}</span><div><p className="eyebrow">{isVoided ? 'VOIDED CHEQUE SETTLEMENT' : 'PAID CHEQUE'}</p><h1>{cheque.cheque_number || 'Unnumbered cheque'}</h1><small>{isVoided ? `Voided ${dateLabel(settlement.voided_at)}` : `Cleared ${dateLabel(cheque.payment_date)}`}</small></div></div><div><small>SETTLED AMOUNT</small><strong>{money(settlement.amount || cheque.amount, cheque.currency)}</strong><em>{isVoided ? <RotateCcw size={13}/> : <Check size={13}/>} {isVoided ? 'Voided' : 'Paid'}</em></div></section>
    <div className="cheque-paid-detail-layout"><section className="panel cheque-detail-card"><div className="cheque-detail-card-head"><div><h2>Settlement details</h2><p>How and when this cheque was cleared.</p></div>{isVoided ? <RotateCcw size={21}/> : <CheckCircle2 size={21}/>}</div><dl className="cheque-detail-list"><div><dt>Payment type</dt><dd>Global cheque payment</dd></div><div><dt>Paid from account</dt><dd>{original.name || 'Checking account'}<small>{original.institution?.name || accountHolder(original)}</small></dd></div><div><dt>Settlement date</dt><dd>{dateLabel(settlement.settlement_date || cheque.payment_date)}</dd></div><div><dt>Reference</dt><dd>{settlement.reference || '—'}</dd></div><div><dt>Original cheque</dt><dd>{money(cheque.amount, cheque.currency)}</dd></div><div><dt>Linked expense</dt><dd>{linkedExpense ? money(linkedExpense.amount, cheque.currency) : 'None'}{linkedExpense && <small>{linkedExpense.expense_item?.name || 'Cheque expense'} · {humanize(linkedExpense.status)}</small>}</dd></div><div><dt>Accounting treatment</dt><dd>{isVoided ? 'Settlement reversed' : 'Cheque account clearing'}<small>{isVoided ? 'The cheque returned to outstanding and may be settled again.' : 'The deposit source is separate and the cheque is cleared globally from its checking-account balance.'}</small></dd></div>{isVoided && <div className="span-2 void-reason-detail"><dt>Void reason</dt><dd>{settlement.void_reason || 'No reason recorded.'}<small>Voided by {settlement.voided_by?.name || settlement.voided_by?.username || 'System user'}</small></dd></div>}<div className="span-2"><dt>Expense details</dt><dd>{linkedExpense?.description || 'No interest or penalty included.'}</dd></div><div className="span-2"><dt>Notes</dt><dd>{settlement.notes || cheque.notes || 'No notes added.'}</dd></div></dl></section>
      <aside className="panel cheque-detail-card"><div className="cheque-detail-card-head"><div><h2>Cheque information</h2><p>Original issuance and source record.</p></div><Banknote size={21}/></div><dl className="cheque-detail-list single"><div><dt>Issue date</dt><dd>{dateLabel(cheque.issue_date)}</dd></div><div><dt>Due date</dt><dd>{dateLabel(cheque.due_date)}</dd></div><div><dt>Original checking account</dt><dd>{original.name || '—'}<small>{original.institution?.name || accountHolder(original)}</small></dd></div><div><dt>Branch</dt><dd>{cheque.branch?.name || 'Company-wide'}</dd></div><div><dt>Payee</dt><dd>{cheque.counterparty?.name || 'Not recorded'}</dd></div><div><dt>Linked payment</dt><dd>{cheque.payment?.number || 'Manual cheque record'}<small>{cheque.payment ? humanize(cheque.payment.status) : 'No linked supplier payment'}</small></dd></div></dl></aside>
    </div>
  </main>;
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
    <div className="title-row"><div><p className="eyebrow">CHEQUES</p><h1>Cheque accounts</h1><p>Select a bank checking account to review all of its outstanding cheque dues.</p></div></div>
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
  const remove = async cheque => { if (!window.confirm(`Delete cheque ${cheque.cheque_number || 'without a number'}? This cannot be undone.`)) return; try { await accountingApi.deleteCheque(cheque.id); setVersion(value => value + 1); } catch (requestError) { window.alert(requestError.message || 'Cheque could not be deleted.'); } };
  const bankName = bank.institution?.name || 'Bank';
  return <main className="content inner-page cheques-page cheque-bank-dues-page">
    <div className="cheque-detail-back"><AppLink href={pagePath('cheques')}><ArrowLeft size={15}/>Back to cheque accounts</AppLink></div>
    <div className="title-row cheque-bank-title"><div><p className="eyebrow">CHEQUE DUE</p><h1>{bankName} · {bank.name || 'Checking account'}</h1><p>Outstanding cheque dues for this bank checking account.</p></div></div>
    <section className="cheque-bank-hero"><div><span className="cheque-bank-logo"><Banknote size={23}/></span><div><small>BANK CHECKING ACCOUNT</small><strong>{bankName}</strong><span>{bank.name || 'Checking account'}{bank.masked_account_number ? ` · ${bank.masked_account_number}` : ''}</span></div></div><div><span>Total due</span><strong>{money(result.total_due_amount, bank.currency || 'PHP')}</strong><small>{rows.length} cheque{rows.length === 1 ? '' : 's'} in this view</small></div></section>
    <section className="panel cheque-register-panel"><div className="cheque-due-tabs">{[['outstanding', 'All outstanding'], ['overdue', 'Overdue'], ['due_today', 'Due today'], ['upcoming', 'Upcoming']].map(([value, label]) => <button key={value} className={filters.due_status === value ? 'active' : ''} onClick={() => setFilters(current => ({ ...current, due_status: value }))}>{label}</button>)}</div><div className="cheque-filters"><label>Due from<input name="due_from" type="date" value={filters.due_from} onChange={update}/></label><label>Due to<input name="due_to" type="date" min={filters.due_from || undefined} value={filters.due_to} onChange={update}/></label><label className="cheque-search"><span>Search</span><div><Search size={15}/><input name="search" value={filters.search} onChange={update} placeholder="Cheque number"/></div></label><button className="icon-button" onClick={() => setVersion(value => value + 1)} aria-label="Refresh bank dues"><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div><ChequeTable rows={rows} loading={loading} error={error} onRefresh={() => setVersion(value => value + 1)} onSettled={() => setVersion(value => value + 1)} onDelete={remove} emptyCopy="No outstanding cheques match this bank and due-date filter."/></section>
  </main>;
}

function ChequeRegister({ dueOnly = false }) {
  const [filters, setFilters] = useState({ status: dueOnly ? 'outstanding' : '', branch_id: '', due_from: '', due_to: '', search: '', per_page: 100 });
  const [dueTab, setDueTab] = useState('all');
  const [rows, setRows] = useState([]); const [summary, setSummary] = useState(null); const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [refreshVersion, setRefreshVersion] = useState(0);
  const [depositOpen, setDepositOpen] = useState(false);
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
  const remove = async cheque => {
    if (!window.confirm(`Delete cheque ${cheque.cheque_number}? This cannot be undone.`)) return;
    try { await accountingApi.deleteCheque(cheque.id); setRefreshVersion(value => value + 1); } catch (requestError) { window.alert(requestError.message || 'Cheque could not be deleted.'); }
  };
  return <main className="content inner-page cheques-page">
    <div className="title-row"><div><p className="eyebrow">CHEQUES</p><h1>{dueOnly ? 'Cheque due' : 'Cheque register'}</h1><p>{dueOnly ? 'Monitor overdue, due-today, and upcoming outgoing cheques.' : 'Track every outgoing cheque from registration through clearing.'}</p></div>{dueOnly && <div className="cheque-title-actions"><button type="button" className="secondary-button cheque-deposit-balance-button" onClick={() => setDepositOpen(true)}><Banknote size={17}/>Deposit balance</button></div>}</div>
    <ChequeSummary summary={summary} loading={loading}/>
    <section className="panel cheque-register-panel">
      {dueOnly && <div className="cheque-due-tabs">{[['all', 'All outstanding'], ['overdue', 'Overdue'], ['due_today', 'Due today'], ['upcoming', 'Upcoming']].map(([value, label]) => <button key={value} className={dueTab === value ? 'active' : ''} onClick={() => setDueTab(value)}>{label}<span>{value === 'all' ? rows.length : rows.filter(item => item.monitoring_status === value).length}</span></button>)}</div>}
      <div className="cheque-filters">{!dueOnly && <label>Status<select name="status" value={filters.status} onChange={update}><option value="">All statuses</option><option value="outstanding">Outstanding</option><option value="overdue">Overdue</option><option value="pending">Pending</option><option value="deposited">Deposited</option><option value="paid">Paid</option><option value="bounced">Bounced</option><option value="cancelled">Cancelled</option></select></label>}<label>Branch<select name="branch_id" value={filters.branch_id} onChange={update}><option value="">All branches</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Due from<input name="due_from" type="date" value={filters.due_from} onChange={update}/></label><label>Due to<input name="due_to" type="date" min={filters.due_from || undefined} value={filters.due_to} onChange={update}/></label><label className="cheque-search"><span>Search</span><div><Search size={15}/><input name="search" value={filters.search} onChange={update} placeholder="Cheque number"/></div></label><button className="icon-button" onClick={() => setRefreshVersion(value => value + 1)} aria-label="Refresh cheques"><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div>
      <ChequeTable rows={visibleRows} loading={loading} error={error} onRefresh={() => setRefreshVersion(value => value + 1)} onSettled={() => setRefreshVersion(value => value + 1)} onDelete={remove} emptyCopy={dueOnly ? 'There are no outstanding cheques in this due-date view.' : undefined}/>
    </section>
    {depositOpen && <ChequeDepositDialog onClose={() => setDepositOpen(false)} onDeposited={() => { setDepositOpen(false); setRefreshVersion(value => value + 1); }}/>}
  </main>;
}

function CheckingAccountsPage({ onOpen, refreshVersion = 0 }) {
  const [accounts, setAccounts] = useState([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  useEffect(() => { let current = true; setLoading(true); setError(''); accountingApi.chequeCheckingAccounts().then(payload => current && setAccounts(payload?.data || [])).catch(e => current && setError(e.message || 'Checking accounts could not be loaded.')).finally(() => current && setLoading(false)); return () => { current = false; }; }, [version, refreshVersion]);
  const visible = accounts.filter(account => account.is_active !== false && `${account.name} ${account.institution?.name || ''} ${account.masked_account_number || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const totalBalance = visible.reduce((sum, account) => sum + Number(account.available_balance || 0), 0);
  const totalOutstanding = visible.reduce((sum, account) => sum + Number(account.outstanding_cheques_amount || 0), 0);
  return <main className="content inner-page cheques-page checking-accounts-page"><div className="title-row"><div><p className="eyebrow">CHEQUES</p><h1>Checking accounts</h1><p>Review every checking account, cheque activity, deposits, debits, and running balance.</p></div></div><section className="checking-account-summary"><article><span>Checking accounts</span><strong>{visible.length}</strong><small>{visible.filter(account => account.is_active).length} active accounts</small></article><article className={totalBalance < 0 ? 'danger' : ''}><span>Combined balance</span><strong>{money(totalBalance, 'PHP')}</strong><small>Available across this view</small></article><article><span>Outstanding cheques</span><strong>{money(totalOutstanding, 'PHP')}</strong><small>{visible.reduce((sum, account) => sum + Number(account.outstanding_cheques_count || 0), 0)} cheque records</small></article></section><section className="panel checking-account-panel"><div className="checking-account-toolbar"><div><h2>All checking accounts</h2><p>Select an account to view its two transaction details.</p></div><div className="checking-account-search"><Search size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search bank or account"/><button className="icon-button" onClick={() => setVersion(value => value + 1)}><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div></div>{loading && <div className="transaction-state"><RefreshCw className="spin" size={21}/><strong>Loading checking accounts…</strong></div>}{!loading && error && <div className="transaction-state error-state"><CircleHelp size={21}/><strong>Unable to load accounts</strong><span>{error}</span></div>}{!loading && !error && !visible.length && <div className="cheque-empty"><span><Banknote size={25}/></span><h2>No checking accounts</h2><p>No accounts match the current search.</p></div>}{!loading && !error && visible.length > 0 && <div className="checking-account-list"><div className="checking-account-row checking-account-head"><span>Checking account</span><span>Available balance</span><span>Outstanding</span><span>Paid cheques</span><span>Status</span><span/></div>{visible.map(account => <button key={account.id} className="checking-account-row" onClick={() => onOpen(account)}><span className="checking-account-name"><i><Banknote size={18}/></i><span><strong>{account.institution?.name || 'Checking account'}</strong><small>{account.name}{account.masked_account_number ? ` · ${account.masked_account_number}` : ''}</small></span></span><span className={Number(account.available_balance || 0) < 0 ? 'negative-money' : ''}><strong>{money(account.available_balance, account.currency)}</strong><small>{Number(account.available_balance || 0) < 0 ? 'Overdrawn' : 'Available'}</small></span><span><strong>{money(account.outstanding_cheques_amount, account.currency)}</strong><small>{account.outstanding_cheques_count || 0} cheque{Number(account.outstanding_cheques_count || 0) === 1 ? '' : 's'}</small></span><span><strong>{account.paid_cheques_count || 0}</strong><small>Cleared records</small></span><span><b className={`checking-status ${account.is_active ? 'active' : 'inactive'}`}>{account.is_active ? 'Active' : 'Inactive'}</b></span><ChevronRight size={18}/></button>)}</div>}</section></main>;
}

function CheckingAccountDetail({ accountId }) {
  const [result, setResult] = useState(null); const [movements, setMovements] = useState(null); const [tab, setTab] = useState('cheques'); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let current = true; setLoading(true); Promise.all([accountingApi.chequeCheckingAccount(accountId), accountingApi.accountMovements(accountId, '?sort=latest')]).then(([accountResult, movementResult]) => { if (current) { setResult(accountResult); setMovements(movementResult); } }).catch(e => current && setError(e.message || 'Checking account details could not be loaded.')).finally(() => current && setLoading(false)); return () => { current = false; }; }, [accountId]);
  if (loading) return <main className="content inner-page cheques-page"><div className="transaction-state"><RefreshCw className="spin" size={22}/><strong>Loading checking account…</strong></div></main>;
  if (error || !result) return <main className="content inner-page cheques-page"><div className="transaction-state error-state"><CircleHelp size={22}/><strong>Unable to load checking account</strong><span>{error}</span><AppLink href={pagePath('cheques', null, { view: 'checking-accounts' })} className="secondary-button">Back to checking accounts</AppLink></div></main>;
  const account = result.account || {}; const cheques = result.cheques || []; const movementRows = recordsOf(movements); const movementSummary = movements?.summary || {};
  const deposited = movementRows.filter(item => item.direction === 'IN_BOUND').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const debited = movementRows.filter(item => item.direction === 'OUT_BOUND').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return <main className="content inner-page cheques-page checking-account-detail"><div className="cheque-detail-back"><AppLink href={pagePath('cheques', null, { view: 'checking-accounts' })}><ArrowLeft size={15}/>Back to checking accounts</AppLink></div><section className="checking-detail-hero"><div><span><Banknote size={25}/></span><div><p className="eyebrow">CHECKING ACCOUNT</p><h1>{account.institution?.name || 'Bank'} · {account.name}</h1><small>{account.masked_account_number || 'No account number'} · {account.owner_branch?.name || 'Company-wide'}</small></div></div><div className={Number(account.available_balance || 0) < 0 ? 'negative-money' : ''}><small>AVAILABLE BALANCE</small><strong>{money(account.available_balance, account.currency)}</strong><em>{account.is_active ? 'Active' : 'Inactive'}</em></div></section><section className="checking-detail-stats"><article><span>Outstanding cheques</span><strong>{result.summary?.outstanding_count || 0}</strong><small>{money(result.summary?.outstanding_amount, account.currency)}</small></article><article><span>Paid cheques</span><strong>{result.summary?.paid_count || 0}</strong><small>Cleared transactions</small></article><article><span>Deposited</span><strong>{money(deposited, account.currency)}</strong><small>Inbound in loaded history</small></article><article><span>Debited</span><strong>{money(debited, account.currency)}</strong><small>Outbound in loaded history</small></article></section><section className="panel checking-detail-panel"><div className="checking-detail-tabs"><button className={tab === 'cheques' ? 'active' : ''} onClick={() => setTab('cheques')}><ListChecks size={18}/><span><strong>Cheque transactions</strong><small>Issued, due, and paid cheques</small></span></button><button className={tab === 'movements' ? 'active' : ''} onClick={() => setTab('movements')}><WalletCards size={18}/><span><strong>Deposits & debits</strong><small>Balance movement details</small></span></button></div>{tab === 'cheques' ? <div className="checking-transaction-table"><div className="checking-transaction-row head"><span>Cheque</span><span>Issue date</span><span>Due date</span><span>Amount</span><span>Status</span></div>{!cheques.length && <div className="checking-empty-row">No cheque transactions recorded for this account.</div>}{cheques.map(cheque => <div className="checking-transaction-row" key={cheque.id}><span><strong>{cheque.cheque_number || 'Unnumbered cheque'}</strong><small>{cheque.counterparty?.name || cheque.payment?.number || 'Manual record'}</small></span><span><strong>{dateLabel(cheque.issue_date)}</strong></span><span><strong>{dateLabel(cheque.due_date)}</strong>{cheque.payment_date && <small>Paid {dateLabel(cheque.payment_date)}</small>}</span><span className="amount"><strong>{money(cheque.amount, cheque.currency)}</strong></span><span><MonitoringBadge cheque={cheque}/></span></div>)}</div> : <div className="checking-movement-table"><div className="checking-movement-summary"><span>Total debits <strong>{money(movementSummary.total_debit, account.currency)}</strong></span><span>Total credits <strong>{money(movementSummary.total_credit, account.currency)}</strong></span></div><div className="checking-movement-row head"><span>Date / journal</span><span>Transaction</span><span>Direction</span><span>Debit</span><span>Credit</span><span>Balance effect</span></div>{!movementRows.length && <div className="checking-empty-row">No deposits or debits recorded for this account.</div>}{movementRows.map(item => <div className="checking-movement-row" key={item.id}><span><strong>{dateLabel(item.entry_date)}</strong><small>{item.journal_number}</small></span><span><strong>{humanize(item.movement_type)}</strong><small>{item.description || item.transaction?.reference || 'Account movement'}</small></span><span><b className={`movement-direction ${item.direction === 'IN_BOUND' ? 'in' : 'out'}`}>{item.direction === 'IN_BOUND' ? <ArrowDownLeft size={13}/> : <ArrowUpRight size={13}/>} {humanize(item.direction)}</b></span><span>{money(item.debit, account.currency)}</span><span>{money(item.credit, account.currency)}</span><span className={Number(item.balance_effect || 0) < 0 ? 'negative-money' : 'positive-money'}><strong>{money(item.balance_effect, account.currency)}</strong></span></div>)}</div>}</section></main>;
}

export default function ChequesWorkspace({ view, bankAccountId, chequeId, checkingAccountId, onNavigate, refreshVersion = 0 }) {
  if (view === 'new') return <ChequeForm onSaved={() => onNavigate('list')}/>;
  if (view === 'bank-dues' && bankAccountId) return <BankChequeDues accountId={bankAccountId}/>;
  if (view === 'due') return <ChequeRegister dueOnly/>;
  if (view === 'paid-detail' && chequeId) return <ChequePaidDetail chequeId={chequeId}/>;
  if (view === 'paid') return <ChequePaidPage onOpen={cheque => onNavigate('paid-detail', cheque.id)}/>;
  if (view === 'checking-account-detail' && checkingAccountId) return <CheckingAccountDetail accountId={checkingAccountId}/>;
  if (view === 'checking-accounts') return <CheckingAccountsPage refreshVersion={refreshVersion} onOpen={account => onNavigate('checking-account-detail', account.id)}/>;
  return <ChequeBankList/>;
}
