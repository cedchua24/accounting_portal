import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BadgeDollarSign,
  Banknote, Bell, BookOpen, Building2, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleHelp, CreditCard, Download, Eye, EyeOff, FileBarChart, Landmark,
  LayoutDashboard, Menu, MoreHorizontal, Plus, ReceiptText, RefreshCw,
  LockKeyhole, LogOut, Mail, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Store, Users,
  WalletCards, X, Zap
} from 'lucide-react';
import './styles.css';
import { accountingApi, authApi } from './api.js';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });

const pagePaths = {
  dashboard: '/',
  accounts: '/financial-accounts',
  payments: '/payments',
  reconciliation: '/reconciliation',
  transfers: '/transfers',
  'credit-cards': '/credit-cards',
  ledger: '/general-ledger',
  reports: '/reports',
  interbranch: '/interbranch',
};

function pageFromPath(pathname) {
  if (pathname === '/financial-accounts' || pathname.startsWith('/financial-accounts/')) return 'accounts';
  return Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] || 'dashboard';
}

const navGroups = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Money', items: [
    { id: 'accounts', label: 'Financial accounts', icon: Landmark, count: 8 },
    { id: 'payments', label: 'Payments', icon: BadgeDollarSign },
    { id: 'reconciliation', label: 'Reconciliation', icon: RefreshCw, count: 6 },
    { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
    { id: 'credit-cards', label: 'Credit cards', icon: CreditCard },
  ] },
  { label: 'Accounting', items: [
    { id: 'ledger', label: 'General ledger', icon: BookOpen },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'interbranch', label: 'Interbranch', icon: Building2 },
  ] },
];

const accountData = [
  { id: 1, name: 'BDO Savings', mask: '•••• 4821', type: 'Bank', balance: 1834250.40, trend: 8.2, color: '#234a3b', initials: 'BD' },
  { id: 2, name: 'GCash — Ced', mask: '•••• 0917', type: 'E-wallet', balance: 248650.75, trend: 12.4, color: '#2671ea', initials: 'G' },
  { id: 3, name: 'Commonwealth Cash', mask: 'Cash drawer', type: 'Cash', balance: 128450.00, trend: -2.1, color: '#d58a3a', initials: 'CW' },
  { id: 4, name: 'RCBC Credit Card', mask: '•••• 7734', type: 'Credit card', balance: -186420.50, trend: -5.3, color: '#872f42', initials: 'RC' },
];

const activity = [
  { type: 'in', title: 'Customer payment', meta: 'Commonwealth · OR-28491', account: 'BDO Savings', amount: 24500, time: '10:42 AM', status: 'Posted' },
  { type: 'out', title: 'Supplier payment', meta: 'Makati · PO-10882', account: 'BDO Savings', amount: -18650, time: '9:18 AM', status: 'Posted' },
  { type: 'in', title: 'Customer payment', meta: 'Fairview · INV-8912', account: 'GCash — Ced', amount: 8450, time: 'Yesterday', status: 'Review' },
  { type: 'transfer', title: 'Account transfer', meta: 'TRF-00481', account: 'GCash → BDO', amount: 35000, time: 'Yesterday', status: 'Posted' },
  { type: 'out', title: 'Expense payment', meta: 'Main office · EXP-2451', account: 'BDO Savings', amount: -7280, time: 'Oct 9', status: 'Posted' },
];

const obligations = [
  { vendor: 'RCBC Credit Card', ref: 'Statement • Oct 2026', due: 'Oct 14', amount: 186420.50, urgency: 'Due in 3 days' },
  { vendor: 'Flour & Co.', ref: 'PO-10879', due: 'Oct 18', amount: 64800, urgency: 'Due in 7 days' },
  { vendor: 'Manila Electric', ref: 'EXP-2449', due: 'Oct 22', amount: 21940.20, urgency: 'Due in 11 days' },
];

const trendValues = [47, 52, 49, 62, 58, 71, 67, 78, 82, 76, 91, 86, 98, 94];

function Logo() {
  return <div className="logo"><span className="logo-mark"><span /><span /><span /></span><span>Ledgerly</span></div>;
}

function Sidebar({ active, setActive, open, close, user, onLogout }) {
  return <>
    {open && <button className="scrim" onClick={close} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-top"><Logo /><button className="mobile-close" onClick={close}><X size={20}/></button></div>
      <div className="company-switcher">
        <div className="company-avatar">BS</div>
        <div><strong>Baking Store Co.</strong><span>8 branches</span></div>
        <ChevronDown size={16} />
      </div>
      <nav>
        {navGroups.map(group => <div className="nav-group" key={group.label}>
          <p>{group.label}</p>
          {group.items.map(item => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => { setActive(item.id); close(); }}>
            <item.icon size={18}/><span>{item.label}</span>{item.count && <em>{item.count}</em>}
          </button>)}
        </div>)}
      </nav>
      <div className="sidebar-footer">
        <button><CircleHelp size={18}/><span>Help center</span></button>
        <button><Settings size={18}/><span>Settings</span></button>
        <button onClick={onLogout}><LogOut size={18}/><span>Sign out</span></button>
        <div className="user-card"><div className="avatar">{(user?.name || user?.username || 'User').split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase()}</div><div><strong>{user?.name || user?.username || 'Accounting user'}</strong><span>{String(user?.role || 'viewer').replaceAll('_', ' ')}</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>
  </>;
}

function Header({ active, onMenu, onNew }) {
  const title = navGroups.flatMap(g => g.items).find(i => i.id === active)?.label || 'Dashboard';
  return <header>
    <button className="menu-button" onClick={onMenu}><Menu size={21}/></button>
    <div className="page-heading"><span>Accounting</span><ChevronRight size={14}/><strong>{title}</strong></div>
    <div className="header-actions">
      <label className="search-box"><Search size={17}/><input placeholder="Search anything…"/><kbd>⌘ K</kbd></label>
      <button className="icon-button" aria-label="Notifications"><Bell size={19}/><span className="notification-dot"/></button>
      <button className="primary-button" onClick={onNew}><Plus size={18}/>New transaction</button>
    </div>
  </header>;
}

function MiniChart() {
  const points = trendValues.map((value, index) => `${(index / (trendValues.length - 1)) * 560},${130 - value}`).join(' ');
  return <div className="chart-wrap">
    <svg viewBox="0 0 560 140" preserveAspectRatio="none" aria-label="Cash flow trend chart">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#37765c" stopOpacity=".24"/><stop offset="1" stopColor="#37765c" stopOpacity="0"/></linearGradient></defs>
      {[24,54,84,114].map(y => <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="#e9eee9" strokeWidth="1" strokeDasharray="4 5"/>)}
      <polygon points={`0,140 ${points} 560,140`} fill="url(#area)"/>
      <polyline points={points} fill="none" stroke="#2f6d53" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="560" cy={130 - trendValues.at(-1)} r="5" fill="#fff" stroke="#2f6d53" strokeWidth="3"/>
    </svg>
    <div className="chart-labels"><span>Sep 12</span><span>Sep 19</span><span>Sep 26</span><span>Oct 3</span><span>Oct 10</span></div>
  </div>;
}

function Dashboard({ onNavigate }) {
  return <main className="content">
    <section className="welcome-row">
      <div><p className="eyebrow">SUNDAY, 11 OCTOBER</p><h1>Good morning, Ced.</h1><p>Here’s the financial pulse across your business today.</p></div>
      <button className="date-button"><CalendarDays size={17}/>Sep 12 – Oct 11<ChevronDown size={15}/></button>
    </section>

    <section className="metric-grid">
      <article className="metric-card featured"><div className="metric-top"><span>Total cash balance</span><div className="metric-icon"><WalletCards size={19}/></div></div><strong>{peso.format(2211351.15)}</strong><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/>8.4%</span><span>vs. last period</span></div><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
      <article className="metric-card"><div className="metric-top"><span>Collections</span><div className="metric-icon pale-green"><ArrowDownLeft size={19}/></div></div><strong>{peso.format(684290)}</strong><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/>12.8%</span><span>this month</span></div></article>
      <article className="metric-card"><div className="metric-top"><span>Payments</span><div className="metric-icon pale-amber"><ArrowUpRight size={19}/></div></div><strong>{peso.format(429840.55)}</strong><div className="metric-foot"><span className="negative"><ArrowUpRight size={14}/>4.1%</span><span>this month</span></div></article>
      <article className="metric-card"><div className="metric-top"><span>Upcoming dues</span><div className="metric-icon pale-red"><CalendarDays size={19}/></div></div><strong>{peso.format(273160.70)}</strong><div className="metric-foot"><span className="warning">5 obligations</span><span>next 14 days</span></div></article>
    </section>

    <section className="dashboard-grid">
      <article className="panel cashflow-panel">
        <div className="panel-head"><div><h2>Cash flow</h2><p>Money in and out across all accounts</p></div><button className="ghost-button">Last 30 days<ChevronDown size={15}/></button></div>
        <div className="cashflow-summary"><div><span>Money in</span><strong>{peso.format(684290)}</strong></div><div><span>Money out</span><strong>{peso.format(429840.55)}</strong></div><div><span>Net cash flow</span><strong className="green">+{peso.format(254449.45)}</strong></div></div>
        <MiniChart />
      </article>
      <article className="panel obligations-panel">
        <div className="panel-head"><div><h2>Upcoming dues</h2><p>Obligations requiring attention</p></div><button className="link-button" onClick={() => onNavigate('credit-cards')}>View all</button></div>
        <div className="due-list">{obligations.map((item, i) => <div className="due-row" key={item.ref}>
          <div className={`due-date ${i === 0 ? 'urgent' : ''}`}><strong>{item.due.split(' ')[1]}</strong><span>OCT</span></div>
          <div className="due-info"><strong>{item.vendor}</strong><span>{item.ref}</span></div>
          <div className="due-amount"><strong>{peso.format(item.amount)}</strong><span className={i === 0 ? 'red' : ''}>{item.urgency}</span></div>
        </div>)}</div>
      </article>
    </section>

    <section className="dashboard-grid lower-grid">
      <article className="panel accounts-panel">
        <div className="panel-head"><div><h2>Financial accounts</h2><p>Live balances from posted journal lines</p></div><button className="link-button" onClick={() => onNavigate('accounts')}>Manage accounts</button></div>
        <div className="account-list">{accountData.map(account => <button className="account-row" key={account.id} onClick={() => onNavigate('accounts')}>
          <span className="account-logo" style={{background: account.color}}>{account.initials}</span><span className="account-info"><strong>{account.name}</strong><span>{account.type} · {account.mask}</span></span><span className="account-balance"><strong className={account.balance < 0 ? 'red' : ''}>{peso.format(account.balance)}</strong><span className={account.trend >= 0 ? 'green' : 'red'}>{account.trend >= 0 ? '+' : ''}{account.trend}%</span></span><ChevronRight size={17}/>
        </button>)}</div>
      </article>
      <article className="panel activity-panel">
        <div className="panel-head"><div><h2>Recent activity</h2><p>Latest activity from every branch</p></div><button className="link-button" onClick={() => onNavigate('payments')}>View all</button></div>
        <div className="activity-list">{activity.slice(0,4).map((item, i) => <div className="activity-row" key={i}>
          <div className={`activity-icon ${item.type}`}>{item.type === 'in' ? <ArrowDownLeft size={17}/> : item.type === 'out' ? <ArrowUpRight size={17}/> : <ArrowLeftRight size={17}/>}</div>
          <div className="activity-info"><strong>{item.title}</strong><span>{item.meta}</span></div>
          <div className="activity-amount"><strong className={item.amount > 0 && item.type === 'in' ? 'green' : ''}>{item.amount > 0 && item.type === 'in' ? '+' : ''}{peso.format(item.amount)}</strong><span>{item.time}</span></div>
        </div>)}</div>
      </article>
    </section>
  </main>;
}

function StatusPill({ status }) { return <span className={`status ${status.toLowerCase()}`}>{status === 'Posted' && <Check size={12}/>} {status}</span>; }

function PaymentsPage({ title = 'Payments' }) {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? activity : activity.filter(x => x.status === filter);
  return <main className="content inner-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>{title}</h1><p>Monitor money movement across every branch and financial account.</p></div><button className="secondary-button"><Download size={17}/>Export</button></div>
    <section className="summary-strip"><div><span>Total volume</span><strong>{peso.format(938739.45)}</strong></div><div><span>Transactions</span><strong>184</strong></div><div><span>Needs review</span><strong className="amber">6</strong></div><div><span>Voided</span><strong>3</strong></div></section>
    <section className="panel table-panel">
      <div className="table-toolbar"><div className="segmented">{['All','Posted','Review'].map(x => <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>{x}</button>)}</div><div className="toolbar-right"><label className="small-search"><Search size={16}/><input placeholder="Search transactions"/></label><button className="icon-text"><SlidersHorizontal size={16}/>Filter</button></div></div>
      <div className="data-table"><div className="table-row table-head"><span>Transaction</span><span>Branch</span><span>Account</span><span>Date</span><span>Status</span><span>Amount</span></div>
        {filtered.map((item,i) => <div className="table-row" key={i}><span><strong>{item.title}</strong><small>{item.meta.split(' · ').at(-1)}</small></span><span>{item.meta.split(' · ')[0]}</span><span>{item.account}</span><span>{item.time}</span><span><StatusPill status={item.status}/></span><span className={item.amount > 0 && item.type === 'in' ? 'green' : ''}><strong>{peso.format(item.amount)}</strong></span></div>)}
      </div>
    </section>
  </main>;
}

function normalizeAccount(account) {
  const rawType = account.type || account.account_type || account.category || 'Account';
  const type = String(rawType).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const name = account.name || account.account_name || account.display_name || `Account ${account.id}`;
  const isCredit = String(rawType).toLowerCase().includes('credit');
  return {
    ...account,
    id: account.id,
    name,
    type,
    isCredit,
    balance: Number(account.current_balance ?? account.balance ?? 0),
    creditLimit: account.credit_limit == null ? null : Number(account.credit_limit),
    outstandingBalance: account.outstanding_balance == null ? null : Number(account.outstanding_balance),
    availableCredit: account.available_credit == null ? null : Number(account.available_credit),
    mask: account.masked_number || account.account_number_masked || account.mask || account.reference || 'Account details',
    initials: (account.initials || name.split(/\s+/).map(part => part[0]).join('').slice(0, 2)).toUpperCase(),
    color: account.color || (isCredit ? '#872f42' : '#234a3b'),
  };
}

function AccountsPage({ requestedAccountId, onSelectAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState(() => {
    return requestedAccountId;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authVersion, setAuthVersion] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    accountingApi.financialAccounts()
      .then(response => {
        if (!current) return;
        const records = Array.isArray(response) ? response : response?.data || response?.accounts || [];
        const normalized = records.map(normalizeAccount);
        setAccounts(normalized);
        setSelectedId(previous => normalized.find(account => String(account.id) === String(previous))?.id ?? normalized[0]?.id ?? null);
      })
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [authVersion]);

  useEffect(() => {
    if (requestedAccountId != null && accounts.some(account => String(account.id) === String(requestedAccountId))) {
      setSelectedId(requestedAccountId);
    }
  }, [requestedAccountId, accounts]);

  const selected = accounts.find(account => String(account.id) === String(selectedId)) || accounts[0];
  const savingsTotal = accounts.filter(account => !account.isCredit).reduce((sum, account) => sum + account.balance, 0);
  const creditLimitTotal = accounts.filter(account => account.isCredit).reduce((sum, account) => sum + (account.creditLimit || 0), 0);
  const selectAccount = account => {
    setSelectedId(account.id);
    onSelectAccount(account.id);
  };

  return <main className="content inner-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Financial accounts</h1><p>One source of truth for bank, cash, e-wallet, and credit accounts.</p></div><button className="secondary-button"><Plus size={17}/>Add account</button></div>
    {!loading && !error && accounts.length > 0 && <section className="account-summary">
      <div><span>Current savings</span><strong>{peso.format(savingsTotal)}</strong><small>Across {accounts.filter(account => !account.isCredit).length} cash accounts</small></div>
      <div><span>Total credit limit</span><strong>{peso.format(creditLimitTotal)}</strong><small>Across {accounts.filter(account => account.isCredit).length} credit accounts</small></div>
    </section>}
    {loading && <section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading financial accounts…</h2><p>Fetching your latest posted balances.</p></section>}
    {!loading && error && <section className="panel account-state error-state"><CircleHelp size={24}/><h2>Financial accounts could not be loaded</h2><p>{error.status === 401 ? 'Your accounting API session is not authorized. Please ask an administrator to check the shared authentication setup.' : error.message || 'Could not load financial accounts.'}</p><button className="secondary-button" onClick={() => setAuthVersion(version => version + 1)}><RefreshCw size={16}/>Try again</button></section>}
    {!loading && !error && accounts.length === 0 && <section className="panel account-state"><Landmark size={24}/><h2>No financial accounts yet</h2><p>Add an account to start tracking current balances and credit limits.</p></section>}
    {!loading && !error && selected && <section className="account-page-grid">
      <div className="account-cards">{accounts.map(a => <button key={a.id} className={`big-account-card ${selected.id === a.id ? 'selected' : ''}`} onClick={() => selectAccount(a)}><span className="account-logo large" style={{background:a.color}}>{a.initials}</span><span><small>{a.type}</small><strong>{a.name}</strong><em>{a.mask}</em></span><span className="card-balance"><small>{a.isCredit ? 'Available credit' : 'Current balance'}</small><strong className={!a.isCredit && a.balance < 0 ? 'red' : ''}>{peso.format(a.isCredit ? (a.availableCredit ?? 0) : a.balance)}</strong>{a.isCredit && a.creditLimit != null && <em>Limit {peso.format(a.creditLimit)}</em>}</span><ChevronRight size={18}/></button>)}</div>
      <article className="panel account-detail"><div className="account-detail-head"><div><span className="account-logo large" style={{background:selected.color}}>{selected.initials}</span><div><small>{selected.type}</small><h2>{selected.name}</h2><p>{selected.mask}</p></div></div><button className="icon-button"><MoreHorizontal size={19}/></button></div>
        <div className="balance-block"><span>{selected.isCredit ? 'Available credit' : 'Current balance'}</span><strong className={!selected.isCredit && selected.balance < 0 ? 'red' : ''}>{peso.format(selected.isCredit ? (selected.availableCredit ?? 0) : selected.balance)}</strong><p>Calculated from posted journal entries</p></div>
        {selected.isCredit && <div className="credit-breakdown"><div><span>Credit limit</span><strong>{peso.format(selected.creditLimit ?? 0)}</strong></div><div><span>Outstanding balance</span><strong className="red">{peso.format(selected.outstandingBalance ?? 0)}</strong></div></div>}
        <div className="detail-meta"><div><span>Access</span><strong><Users size={15}/>Company-wide</strong></div><div><span>Owner</span><strong><Store size={15}/>Main office</strong></div><div><span>Status</span><strong><ShieldCheck size={15}/>Active</strong></div></div>
        <button className="primary-button wide"><BookOpen size={17}/>Open passbook</button>
      </article>
    </section>}
  </main>;
}

function PlaceholderPage({ active }) {
  const meta = navGroups.flatMap(g=>g.items).find(i=>i.id===active);
  const Icon = meta?.icon || FileBarChart;
  return <main className="content inner-page"><div className="title-row"><div><p className="eyebrow">ACCOUNTING</p><h1>{meta?.label}</h1><p>Centralized records with branch, account, source document, status, and journal references.</p></div><button className="secondary-button"><Download size={17}/>Export</button></div><section className="panel empty-state"><div className="empty-icon"><Icon size={26}/></div><h2>{meta?.label} workspace</h2><p>This module is connected to the centralized accounting API and ready for live records.</p><div className="empty-features"><span><Check size={15}/>Audit-safe history</span><span><Check size={15}/>Branch filters</span><span><Check size={15}/>CSV export</span></div><button className="primary-button"><Plus size={17}/>Create record</button></section></main>;
}

function NewTransactionModal({ close }) {
  const [choice, setChoice] = useState('Customer payment');
  const [saved, setSaved] = useState(false);
  if (saved) return <div className="modal-backdrop"><div className="modal success-modal"><div className="success-icon"><Check size={28}/></div><h2>Draft created</h2><p>Your {choice.toLowerCase()} is ready to complete. It will not affect balances until posted.</p><button className="primary-button wide" onClick={close}>Continue</button></div></div>;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}><div className="modal"><div className="modal-head"><div><p className="eyebrow">NEW RECORD</p><h2>Create transaction</h2></div><button className="icon-button" onClick={close}><X size={19}/></button></div><p className="modal-intro">Choose a transaction type. New records are saved as drafts before they are posted to the ledger.</p><div className="transaction-types">{[
    ['Customer payment', ArrowDownLeft, 'Record a receipt from a customer'],
    ['Expense payment', ReceiptText, 'Pay a business expense'],
    ['Account transfer', ArrowLeftRight, 'Move funds between accounts'],
    ['Account adjustment', SlidersHorizontal, 'Reconcile to a statement'],
  ].map(([label, Icon, desc]) => <button key={label} className={choice===label?'selected':''} onClick={()=>setChoice(label)}><span><Icon size={19}/></span><div><strong>{label}</strong><small>{desc}</small></div>{choice===label && <Check size={17}/>}</button>)}</div><div className="modal-actions"><button className="text-button" onClick={close}>Cancel</button><button className="primary-button" onClick={()=>setSaved(true)}>Continue<ChevronRight size={17}/></button></div></div></div>;
}

function LoginPage({ mode, onModeChange, onAuthenticated }) {
  const isRegister = mode === 'register';
  const [login, setLogin] = useState('');
  const [form, setForm] = useState({ name: '', username: '', email: '', first_name: '', last_name: '', phone: '', password: '', password_confirmation: '' });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = isRegister
        ? await authApi.register({
            name: form.name.trim(),
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
            password_confirmation: form.password_confirmation,
            profile: {
              first_name: form.first_name.trim() || null,
              last_name: form.last_name.trim() || null,
              phone: form.phone.trim() || null,
              country: 'PH',
            },
          })
        : await authApi.login(login.trim(), password);
      if (!response?.token) throw new Error('The server did not return an access token.');
      const user = response.user;
      if (!user) throw new Error('The server did not return the user profile.');
      sessionStorage.setItem('accounting_token', response.token);
      sessionStorage.setItem('accounting_user', JSON.stringify(user));
      onAuthenticated(user);
    } catch (requestError) {
      const validationMessage = requestError.details && Object.values(requestError.details).flat()[0];
      setError(validationMessage || requestError.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="login-page">
    <section className="login-story">
      <div className="login-brand"><Logo/><span>ACCOUNTING PORTAL</span></div>
      <div className="story-copy"><span className="story-kicker"><span/>One view across every branch</span><h1>Clarity for every<br/>peso that moves.</h1><p>Track collections, payments, account balances, and journal activity from one secure workspace.</p></div>
      <div className="story-proof"><div><ShieldCheck size={18}/><span><strong>Audit-ready</strong><small>Posted records stay traceable</small></span></div><div><Building2 size={18}/><span><strong>Multi-branch</strong><small>Centralized company view</small></span></div><div><Activity size={18}/><span><strong>Live balances</strong><small>Calculated from journal lines</small></span></div></div>
      <div className="login-orbit orbit-one"/><div className="login-orbit orbit-two"/><div className="login-glow"/>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="login-mobile-brand"><Logo/></div>
        <div className="auth-tabs"><button className={!isRegister ? 'active' : ''} onClick={() => onModeChange('login')}>Sign in</button><button className={isRegister ? 'active' : ''} onClick={() => onModeChange('register')}>Create account</button></div>
        <div className="login-heading"><span className="secure-label"><LockKeyhole size={13}/>{isRegister ? 'NEW ACCOUNT' : 'SECURE ACCESS'}</span><h2>{isRegister ? 'Join the workspace' : 'Welcome back'}</h2><p>{isRegister ? 'Create your Accounting Portal profile. New accounts begin with viewer access.' : 'Sign in with your accounting username or email.'}</p></div>
        <form className="portal-login-form" onSubmit={submit}>
          {isRegister ? <>
            <label>Display name<div className="login-input"><Users size={17}/><input value={form.name} onChange={event => setForm(value => ({...value, name:event.target.value}))} placeholder="Juan Dela Cruz" autoComplete="name" required autoFocus/></div></label>
            <div className="registration-grid"><label>First name<div className="login-input"><input value={form.first_name} onChange={event => setForm(value => ({...value, first_name:event.target.value}))} placeholder="Juan" autoComplete="given-name"/></div></label><label>Last name<div className="login-input"><input value={form.last_name} onChange={event => setForm(value => ({...value, last_name:event.target.value}))} placeholder="Dela Cruz" autoComplete="family-name"/></div></label></div>
            <label>Username<div className="login-input"><span className="input-symbol">@</span><input value={form.username} onChange={event => setForm(value => ({...value, username:event.target.value}))} placeholder="juan.cruz" autoComplete="username" minLength="3" required/></div></label>
            <label>Email address<div className="login-input"><Mail size={17}/><input type="email" value={form.email} onChange={event => setForm(value => ({...value, email:event.target.value}))} placeholder="juan@example.com" autoComplete="email" required/></div></label>
            <label>Phone <small className="optional-label">Optional</small><div className="login-input"><span className="input-symbol">+63</span><input value={form.phone} onChange={event => setForm(value => ({...value, phone:event.target.value}))} placeholder="917 123 4567" autoComplete="tel"/></div></label>
            <label>Password<div className="login-input"><LockKeyhole size={17}/><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={event => setForm(value => ({...value, password:event.target.value}))} placeholder="At least 8 characters" autoComplete="new-password" minLength="8" required/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><small className="field-hint">Use at least one letter and one number.</small></label>
            <label>Confirm password<div className="login-input"><LockKeyhole size={17}/><input type={showPassword ? 'text' : 'password'} value={form.password_confirmation} onChange={event => setForm(value => ({...value, password_confirmation:event.target.value}))} placeholder="Repeat your password" autoComplete="new-password" minLength="8" required/></div></label>
          </> : <>
            <label>Username or email<div className="login-input"><Mail size={17}/><input value={login} onChange={event => setLogin(event.target.value)} placeholder="superadmin or admin@example.test" autoComplete="username" required autoFocus/></div></label>
            <label>Password<div className="login-input"><LockKeyhole size={17}/><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          </>}
          <div className="login-options"><span>{isRegister ? 'Role: viewer (super-admin can promote)' : 'Accounting database account'}</span><a href="mailto:admin@bakingstore.com">Need help?</a></div>
          {error && <div className="portal-login-error" role="alert"><CircleHelp size={16}/><span>{error}</span></div>}
          <button className="login-submit" disabled={submitting}>{submitting ? <><RefreshCw className="spin" size={17}/>{isRegister ? 'Creating account…' : 'Signing in…'}</> : <>{isRegister ? 'Create viewer account' : 'Sign in to Ledgerly'}<ChevronRight size={17}/></>}</button>
        </form>
        <div className="login-security"><ShieldCheck size={15}/><span>Protected by Laravel Sanctum</span></div>
      </div>
      <p className="login-copyright">© 2026 Baking Store Co. · Internal use only</p>
    </section>
  </main>;
}

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('accounting_user')); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState(() => window.location.pathname === '/register' ? 'register' : 'login');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [active, setActive] = useState(() => pageFromPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = (page, accountId = null) => {
    const path = page === 'accounts' && accountId != null
      ? `/financial-accounts/${encodeURIComponent(accountId)}`
      : pagePaths[page] || '/';
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setCurrentPath(path);
    setActive(page);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setActive(pageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const clearExpiredSession = () => {
      sessionStorage.removeItem('accounting_token');
      sessionStorage.removeItem('accounting_user');
      setSession(null);
    };
    window.addEventListener('accounting:unauthorized', clearExpiredSession);
    return () => window.removeEventListener('accounting:unauthorized', clearExpiredSession);
  }, []);

  const logout = async () => {
    try { await authApi.logout(); } catch { /* Clear the local session even if the token already expired. */ }
    sessionStorage.removeItem('accounting_token');
    sessionStorage.removeItem('accounting_user');
    setSession(null);
  };

  const page = useMemo(() => {
    if (active === 'dashboard') return <Dashboard onNavigate={navigate}/>;
    if (active === 'accounts') {
      const accountId = currentPath.match(/^\/financial-accounts\/([^/]+)$/)?.[1];
      return <AccountsPage requestedAccountId={accountId ? decodeURIComponent(accountId) : null} onSelectAccount={id => navigate('accounts', id)}/>;
    }
    if (active === 'payments') return <PaymentsPage/>;
    if (active === 'reconciliation') return <PaymentsPage title="Payment reconciliation"/>;
    return <PlaceholderPage active={active}/>;
  }, [active, currentPath]);
  const changeAuthMode = nextMode => {
    const nextPath = nextMode === 'register' ? '/register' : '/login';
    window.history.replaceState({}, '', nextPath);
    setAuthMode(nextMode);
  };
  const completeAuthentication = user => {
    setSession(user);
    navigate('dashboard');
  };
  if (!session) return <LoginPage mode={authMode} onModeChange={changeAuthMode} onAuthenticated={completeAuthentication}/>;
  return <div className="app-shell"><Sidebar active={active} setActive={navigate} open={menuOpen} close={()=>setMenuOpen(false)} user={session} onLogout={logout}/><div className="main-shell"><Header active={active} onMenu={()=>setMenuOpen(true)} onNew={()=>setModalOpen(true)}/>{page}</div>{modalOpen && <NewTransactionModal close={()=>setModalOpen(false)}/>}</div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
