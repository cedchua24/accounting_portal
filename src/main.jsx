import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowUpRight, BadgeDollarSign,
  Banknote, Bell, BookOpen, Building2, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleHelp, CreditCard, Download, Eye, EyeOff, FileBarChart, Landmark,
  LayoutDashboard, Menu, MoreHorizontal, Plus, ReceiptText, RefreshCw,
  LockKeyhole, LogOut, Mail, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Store, Users,
  WalletCards, X, Zap, Pencil, Save, Globe2, RotateCcw, HandCoins, Percent, UserRound,
  BriefcaseBusiness, FolderTree, Tags, TableProperties
} from 'lucide-react';
import './styles.css';
import './credit-cards.css';
import './loans.css';
import './expenses.css';
import { accountingApi, authApi } from './api.js';
import ExpensesWorkspace from './expenses.jsx';
import UserAccountsWorkspace from './user-accounts.jsx';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });

function localIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dashboardPeriod(preset = 'today') {
  const dayTo = new Date();
  const dayFrom = new Date(dayTo);
  if (preset === 'week') dayFrom.setDate(dayFrom.getDate() - ((dayFrom.getDay() + 6) % 7));
  if (preset === 'month') dayFrom.setDate(1);
  return { dayFrom: localIsoDate(dayFrom), dayTo: localIsoDate(dayTo) };
}

function shortDate(dateString, includeYear = false) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(new Date(`${dateString}T00:00:00`));
}

const pagePaths = {
  dashboard: '/',
  'cash-balance': '/cash-balance',
  collections: '/collections',
  'user-accounts': '/user-accounts',
  accounts: '/financial-accounts',
  payments: '/payments',
  refunds: '/customer-refunds',
  'refund-list': '/customer-refunds/list',
  'upcoming-dues': '/upcoming-dues',
  reconciliation: '/reconciliation',
  transfers: '/transfers',
  'transfer-history': '/transfers/history',
  'credit-cards': '/credit-cards',
  loans: '/loans',
  expenses: '/expenses/ledger',
  ledger: '/general-ledger',
  reports: '/reports',
  interbranch: '/interbranch',
};

const standalonePageTitles = {
  'cash-balance': 'Cash balance',
  collections: 'Collections',
  'upcoming-dues': 'Upcoming dues',
  'transfer-history': 'Transfer history',
  'refund-list': 'Customer refund list',
};

function sidebarSelection(activePage) {
  if (activePage === 'cash-balance') return 'accounts';
  if (activePage === 'upcoming-dues') return 'payments';
  if (activePage === 'transfer-history') return 'transfers';
  if (activePage === 'refund-list') return 'refunds';
  return activePage;
}

function pageFromPath(pathname) {
  if (pathname === '/user-accounts' || pathname.startsWith('/user-accounts/')) return 'user-accounts';
  if (pathname === '/financial-accounts' || pathname.startsWith('/financial-accounts/')) return 'accounts';
  if (pathname === '/credit-cards' || pathname.startsWith('/credit-cards/')) return 'credit-cards';
  if (pathname === '/loans' || pathname.startsWith('/loans/')) return 'loans';
  if (pathname === '/expenses' || pathname.startsWith('/expenses/')) return 'expenses';
  return Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] || 'dashboard';
}

const navGroups = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Money', items: [
    { id: 'user-accounts', label: 'User accounts', icon: Users },
    { id: 'accounts', label: 'Financial accounts', icon: Landmark, count: 8 },
    { id: 'collections', label: 'Collections', icon: ArrowDownLeft },
    { id: 'payments', label: 'Payments', icon: BadgeDollarSign },
    { id: 'refunds', label: 'Customer refunds', icon: RotateCcw },
    { id: 'reconciliation', label: 'Reconciliation', icon: RefreshCw, count: 6 },
    { id: 'transfers', label: 'Transfer money', icon: ArrowLeftRight },
    { id: 'credit-cards', label: 'Credit cards', icon: CreditCard },
    { id: 'loans', label: 'Loans', icon: HandCoins },
  ] },
  { label: 'Accounting', items: [
    { id: 'expenses', label: 'Expense', icon: BriefcaseBusiness },
    { id: 'ledger', label: 'General ledger', icon: BookOpen },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'interbranch', label: 'Interbranch', icon: Building2 },
  ] },
];

const activity = [
  { type: 'in', title: 'Customer payment', meta: 'Commonwealth · OR-28491', account: 'BDO Savings', amount: 24500, time: '10:42 AM', status: 'Posted' },
  { type: 'out', title: 'Supplier payment', meta: 'Makati · PO-10882', account: 'BDO Savings', amount: -18650, time: '9:18 AM', status: 'Posted' },
  { type: 'in', title: 'Customer payment', meta: 'Fairview · INV-8912', account: 'GCash — Ced', amount: 8450, time: 'Yesterday', status: 'Review' },
  { type: 'transfer', title: 'Account transfer', meta: 'TRF-00481', account: 'GCash → BDO', amount: 35000, time: 'Yesterday', status: 'Posted' },
  { type: 'out', title: 'Expense payment', meta: 'Main office · EXP-2451', account: 'BDO Savings', amount: -7280, time: 'Oct 9', status: 'Posted' },
];

function Logo() {
  return <div className="logo"><span className="logo-mark"><span /><span /><span /></span><span>MDR Accounting</span></div>;
}

function Sidebar({ active, currentPath, setActive, open, close, user, onLogout }) {
  const selectedItem = sidebarSelection(active);
  const [transferMenuOpen, setTransferMenuOpen] = useState(selectedItem === 'transfers');
  const [refundMenuOpen, setRefundMenuOpen] = useState(selectedItem === 'refunds');
  const [loanMenuOpen, setLoanMenuOpen] = useState(selectedItem === 'loans');
  const [expenseMenuOpen, setExpenseMenuOpen] = useState(selectedItem === 'expenses');
  useEffect(() => {
    if (selectedItem === 'transfers') setTransferMenuOpen(true);
    if (selectedItem === 'refunds') setRefundMenuOpen(true);
    if (selectedItem === 'loans') setLoanMenuOpen(true);
    if (selectedItem === 'expenses') setExpenseMenuOpen(true);
  }, [selectedItem]);
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
          {group.items.map(item => item.id === 'refunds' ? <div className="nav-dropdown" key={item.id}>
            <button type="button" className={`nav-dropdown-toggle ${selectedItem === 'refunds' ? 'parent-active' : ''}`} aria-expanded={refundMenuOpen} onClick={() => setRefundMenuOpen(value => !value)}><item.icon size={18}/><span>{item.label}</span><ChevronDown className={refundMenuOpen ? 'open' : ''} size={15}/></button>
            {refundMenuOpen && <div className="nav-submenu"><button type="button" className={active === 'refunds' ? 'active' : ''} aria-current={active === 'refunds' ? 'page' : undefined} onClick={() => { setActive('refunds'); close(); }}><Plus size={14}/><span>Add refund</span></button><button type="button" className={active === 'refund-list' ? 'active' : ''} aria-current={active === 'refund-list' ? 'page' : undefined} onClick={() => { setActive('refund-list'); close(); }}><ReceiptText size={14}/><span>Refund list</span></button></div>}
          </div> : item.id === 'transfers' ? <div className="nav-dropdown" key={item.id}>
            <button type="button" className={`nav-dropdown-toggle ${selectedItem === 'transfers' ? 'parent-active' : ''}`} aria-expanded={transferMenuOpen} onClick={() => setTransferMenuOpen(value => !value)}><item.icon size={18}/><span>{item.label}</span><ChevronDown className={transferMenuOpen ? 'open' : ''} size={15}/></button>
            {transferMenuOpen && <div className="nav-submenu"><button type="button" className={active === 'transfers' ? 'active' : ''} aria-current={active === 'transfers' ? 'page' : undefined} onClick={() => { setActive('transfers'); close(); }}><Plus size={14}/><span>Add transfer</span></button><button type="button" className={active === 'transfer-history' ? 'active' : ''} aria-current={active === 'transfer-history' ? 'page' : undefined} onClick={() => { setActive('transfer-history'); close(); }}><ReceiptText size={14}/><span>History</span></button></div>}
          </div> : item.id === 'loans' ? <div className="nav-dropdown" key={item.id}>
            <button type="button" className={`nav-dropdown-toggle ${selectedItem === 'loans' ? 'parent-active' : ''}`} aria-expanded={loanMenuOpen} onClick={() => setLoanMenuOpen(value => !value)}><item.icon size={18}/><span>{item.label}</span><ChevronDown className={loanMenuOpen ? 'open' : ''} size={15}/></button>
            {loanMenuOpen && <div className="nav-submenu"><button type="button" className={currentPath === '/loans/new' ? 'active' : ''} aria-current={currentPath === '/loans/new' ? 'page' : undefined} onClick={() => { setActive('loans', null, { view: 'new' }); close(); }}><Plus size={14}/><span>Add loan</span></button><button type="button" className={currentPath === '/loans' || /^\/loans\/\d+$/.test(currentPath) ? 'active' : ''} aria-current={currentPath === '/loans' ? 'page' : undefined} onClick={() => { setActive('loans'); close(); }}><ReceiptText size={14}/><span>Loan list</span></button><button type="button" className={currentPath === '/loans/upcoming' ? 'active' : ''} aria-current={currentPath === '/loans/upcoming' ? 'page' : undefined} onClick={() => { setActive('loans', null, { view: 'upcoming' }); close(); }}><CalendarDays size={14}/><span>Upcoming dues</span></button></div>}
          </div> : item.id === 'expenses' ? <div className="nav-dropdown expense-nav" key={item.id}>
            <button type="button" className={`nav-dropdown-toggle ${selectedItem === 'expenses' ? 'parent-active' : ''}`} aria-expanded={expenseMenuOpen} onClick={() => setExpenseMenuOpen(value => !value)}><item.icon size={18}/><span>{item.label}</span><ChevronDown className={expenseMenuOpen ? 'open' : ''} size={15}/></button>
            {expenseMenuOpen && <div className="nav-submenu expense-nav-submenu"><button type="button" className={currentPath === '/expenses/chart-accounts' ? 'active' : ''} aria-current={currentPath === '/expenses/chart-accounts' ? 'page' : undefined} onClick={() => { setActive('expenses', null, { view: 'chart-accounts' }); close(); }}><FolderTree size={14}/><span>Chart of Accounts</span></button><button type="button" className={currentPath === '/expenses/types' ? 'active' : ''} aria-current={currentPath === '/expenses/types' ? 'page' : undefined} onClick={() => { setActive('expenses', null, { view: 'types' }); close(); }}><Tags size={14}/><span>Expense Type</span></button><button type="button" className={currentPath === '/expenses/categories' ? 'active' : ''} aria-current={currentPath === '/expenses/categories' ? 'page' : undefined} onClick={() => { setActive('expenses', null, { view: 'categories' }); close(); }}><TableProperties size={14}/><span>Expense Category</span></button><button type="button" className={currentPath === '/expenses/items' ? 'active' : ''} aria-current={currentPath === '/expenses/items' ? 'page' : undefined} onClick={() => { setActive('expenses', null, { view: 'items' }); close(); }}><ReceiptText size={14}/><span>Expense</span></button><button type="button" className={currentPath === '/expenses' || currentPath === '/expenses/ledger' || currentPath === '/expenses/approvals' ? 'active' : ''} aria-current={currentPath === '/expenses' || currentPath === '/expenses/ledger' ? 'page' : undefined} onClick={() => { setActive('expenses', null, { view: 'ledger' }); close(); }}><BadgeDollarSign size={14}/><span>Expense Transaction</span></button></div>}
          </div> : <button key={item.id} className={selectedItem === item.id ? 'active' : ''} aria-current={selectedItem === item.id ? 'page' : undefined} onClick={() => { setActive(item.id); close(); }}>
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
  const title = navGroups.flatMap(g => g.items).find(i => i.id === active)?.label || standalonePageTitles[active] || 'Dashboard';
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

function MiniChart({ dataPoints }) {
  const chartPoints = Array.isArray(dataPoints) ? dataPoints : [];
  const values = chartPoints.map(point => Number(point.cumulative_net_cash_flow || 0));
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;
  const yFor = value => 115 - ((value - min) / (max - min)) * 100;
  const xFor = index => chartPoints.length <= 1 ? 280 : (index / (chartPoints.length - 1)) * 560;
  const linePoints = chartPoints.map((point, index) => `${xFor(index)},${yFor(Number(point.cumulative_net_cash_flow || 0))}`).join(' ');
  const baselineY = yFor(0);
  const labelIndexes = chartPoints.length <= 5
    ? chartPoints.map((_, index) => index)
    : Array.from(new Set([0, 1, 2, 3, 4].map(step => Math.round(step * (chartPoints.length - 1) / 4))));
  const lastValue = values.at(-1) || 0;
  return <div className="chart-wrap">
    <svg viewBox="0 0 560 140" preserveAspectRatio="none" aria-label="Cash flow trend chart">
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#37765c" stopOpacity=".24"/><stop offset="1" stopColor="#37765c" stopOpacity="0"/></linearGradient></defs>
      {[24,54,84,114].map(y => <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="#e9eee9" strokeWidth="1" strokeDasharray="4 5"/>)}
      <line x1="0" x2="560" y1={baselineY} y2={baselineY} stroke="#dce4de" strokeWidth="1"/>
      {chartPoints.length > 0 && <polygon points={`0,${baselineY} ${linePoints} 560,${baselineY}`} fill="url(#area)"/>}
      {chartPoints.length > 0 && <polyline points={linePoints} fill="none" stroke="#2f6d53" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
      {chartPoints.length > 0 && <circle cx={xFor(chartPoints.length - 1)} cy={yFor(lastValue)} r="5" fill="#fff" stroke="#2f6d53" strokeWidth="3"/>}
    </svg>
    <div className="chart-labels">{labelIndexes.map(index => <span key={chartPoints[index]?.date || index}>{chartPoints[index]?.date ? shortDate(chartPoints[index].date) : ''}</span>)}</div>
  </div>;
}

function Dashboard({ onNavigate }) {
  const [{ dayFrom, dayTo }, setPeriod] = useState(dashboardPeriod);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [draftDayFrom, setDraftDayFrom] = useState(dayFrom);
  const [draftDayTo, setDraftDayTo] = useState(dayTo);
  const [cashBalance, setCashBalance] = useState(null);
  const [cashBalanceError, setCashBalanceError] = useState('');
  const [collections, setCollections] = useState(null);
  const [collectionsError, setCollectionsError] = useState('');
  const [payments, setPayments] = useState(null);
  const [paymentsError, setPaymentsError] = useState('');
  const [upcomingDues, setUpcomingDues] = useState(null);
  const [upcomingDuesError, setUpcomingDuesError] = useState('');
  const [cashFlowDays, setCashFlowDays] = useState(30);
  const [cashFlow, setCashFlow] = useState(null);
  const [cashFlowError, setCashFlowError] = useState('');
  const [upcomingDuesList, setUpcomingDuesList] = useState(null);
  const [upcomingDuesListError, setUpcomingDuesListError] = useState('');
  const [recentActivity, setRecentActivity] = useState(null);
  const [recentActivityError, setRecentActivityError] = useState('');
  const [dashboardAccounts, setDashboardAccounts] = useState(null);
  const [dashboardAccountsError, setDashboardAccountsError] = useState('');

  useEffect(() => {
    let current = true;
    setCashBalance(null);
    setCashBalanceError('');
    accountingApi.dashboardTotalCashBalance(dayFrom, dayTo)
      .then(result => {
        if (current) setCashBalance(result);
      })
      .catch(error => {
        if (current) setCashBalanceError(error.message || 'Cash balance could not be loaded.');
      });
    return () => { current = false; };
  }, [dayFrom, dayTo]);

  useEffect(() => {
    let current = true;
    setCollections(null);
    setCollectionsError('');
    accountingApi.dashboardCollections(dayFrom, dayTo)
      .then(result => {
        if (current) setCollections(result);
      })
      .catch(error => {
        if (current) setCollectionsError(error.message || 'Collections could not be loaded.');
      });
    return () => { current = false; };
  }, [dayFrom, dayTo]);

  useEffect(() => {
    let current = true;
    setPayments(null);
    setPaymentsError('');
    accountingApi.dashboardPayments(dayFrom, dayTo)
      .then(result => {
        if (current) setPayments(result);
      })
      .catch(error => {
        if (current) setPaymentsError(error.message || 'Payments could not be loaded.');
      });
    return () => { current = false; };
  }, [dayFrom, dayTo]);

  useEffect(() => {
    let current = true;
    setUpcomingDues(null);
    setUpcomingDuesError('');
    accountingApi.dashboardUpcomingDues(dayFrom, dayTo)
      .then(result => {
        if (current) setUpcomingDues(result);
      })
      .catch(error => {
        if (current) setUpcomingDuesError(error.message || 'Upcoming dues could not be loaded.');
      });
    return () => { current = false; };
  }, [dayFrom, dayTo]);

  useEffect(() => {
    let current = true;
    const cashFlowDayTo = new Date();
    const cashFlowDayFrom = new Date(cashFlowDayTo);
    cashFlowDayFrom.setDate(cashFlowDayFrom.getDate() - (cashFlowDays - 1));
    setCashFlow(null);
    setCashFlowError('');
    accountingApi.dashboardCashFlow(localIsoDate(cashFlowDayFrom), localIsoDate(cashFlowDayTo))
      .then(result => {
        if (current) setCashFlow(result);
      })
      .catch(error => {
        if (current) setCashFlowError(error.message || 'Cash flow could not be loaded.');
      });
    return () => { current = false; };
  }, [cashFlowDays]);

  useEffect(() => {
    let current = true;
    setUpcomingDuesList(null);
    setUpcomingDuesListError('');
    accountingApi.dashboardUpcomingDuesList()
      .then(result => {
        if (current) setUpcomingDuesList(result);
      })
      .catch(error => {
        if (current) setUpcomingDuesListError(error.message || 'Upcoming dues list could not be loaded.');
      });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setRecentActivity(null);
    setRecentActivityError('');
    accountingApi.dashboardRecentActivity()
      .then(result => {
        if (current) setRecentActivity(result);
      })
      .catch(error => {
        if (current) setRecentActivityError(error.message || 'Recent activity could not be loaded.');
      });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setDashboardAccounts(null);
    setDashboardAccountsError('');
    loadEveryPage(page => accountingApi.financialAccounts(`?active=1&page=${page}`))
      .then(records => {
        if (current) setDashboardAccounts(records.map(normalizeAccount).slice(0, 4));
      })
      .catch(error => {
        if (current) setDashboardAccountsError(error.message || 'Financial accounts could not be loaded.');
      });
    return () => { current = false; };
  }, []);

  const applyDateFilter = event => {
    event.preventDefault();
    if (!draftDayFrom || !draftDayTo || draftDayFrom > draftDayTo) return;
    setPeriod({ dayFrom: draftDayFrom, dayTo: draftDayTo });
    setDateFilterOpen(false);
  };

  const resetToToday = () => {
    const todayPeriod = dashboardPeriod('today');
    setDraftDayFrom(todayPeriod.dayFrom);
    setDraftDayTo(todayPeriod.dayTo);
    setPeriod(todayPeriod);
    setDateFilterOpen(false);
  };

  const applyPreset = preset => {
    const nextPeriod = dashboardPeriod(preset);
    setDraftDayFrom(nextPeriod.dayFrom);
    setDraftDayTo(nextPeriod.dayTo);
    setPeriod(nextPeriod);
    setDateFilterOpen(false);
  };

  const toggleDateFilter = () => {
    if (!dateFilterOpen) {
      setDraftDayFrom(dayFrom);
      setDraftDayTo(dayTo);
    }
    setDateFilterOpen(open => !open);
  };

  const totalCashBalance = cashBalance?.total_cash_balance == null ? Number.NaN : Number(cashBalance.total_cash_balance);
  const changePercentage = cashBalance?.change_percentage == null ? Number.NaN : Number(cashBalance.change_percentage);
  const hasCashBalance = Number.isFinite(totalCashBalance);
  const hasChange = Number.isFinite(changePercentage);
  const changeClass = changePercentage > 0 ? 'positive' : changePercentage < 0 ? 'negative' : '';
  const ChangeIcon = changePercentage < 0 ? ArrowDownLeft : ArrowUpRight;
  const totalCollections = collections?.total_collections == null ? Number.NaN : Number(collections.total_collections);
  const collectionsChange = collections?.change_percentage == null ? Number.NaN : Number(collections.change_percentage);
  const hasCollections = Number.isFinite(totalCollections);
  const hasCollectionsChange = Number.isFinite(collectionsChange);
  const collectionsChangeClass = collectionsChange > 0 ? 'positive' : collectionsChange < 0 ? 'negative' : '';
  const CollectionsChangeIcon = collectionsChange < 0 ? ArrowDownLeft : ArrowUpRight;
  const totalPayments = payments?.total_payments == null ? Number.NaN : Number(payments.total_payments);
  const paymentsChange = payments?.change_percentage == null ? Number.NaN : Number(payments.change_percentage);
  const hasPayments = Number.isFinite(totalPayments);
  const hasPaymentsChange = Number.isFinite(paymentsChange);
  const paymentsChangeClass = paymentsChange > 0 ? 'negative' : paymentsChange < 0 ? 'positive' : '';
  const PaymentsChangeIcon = paymentsChange < 0 ? ArrowDownLeft : ArrowUpRight;
  const totalUpcomingDues = upcomingDues?.total_upcoming_dues == null ? Number.NaN : Number(upcomingDues.total_upcoming_dues);
  const obligationCount = upcomingDues?.obligation_count == null ? Number.NaN : Number(upcomingDues.obligation_count);
  const hasUpcomingDues = Number.isFinite(totalUpcomingDues);
  const hasObligationCount = Number.isFinite(obligationCount);
  const nearestDueDate = upcomingDues?.nearest_due_date;
  const cashFlowMoneyIn = cashFlow?.money_in == null ? Number.NaN : Number(cashFlow.money_in);
  const cashFlowMoneyOut = cashFlow?.money_out == null ? Number.NaN : Number(cashFlow.money_out);
  const cashFlowNet = cashFlow?.net_cash_flow == null ? Number.NaN : Number(cashFlow.net_cash_flow);
  const hasCashFlow = [cashFlowMoneyIn, cashFlowMoneyOut, cashFlowNet].every(Number.isFinite);
  const isToday = dayFrom === dayTo && dayTo === localIsoDate(new Date());
  const periodLabel = isToday ? `Today · ${shortDate(dayTo, true)}` : dayFrom === dayTo ? shortDate(dayTo, true) : `${shortDate(dayFrom)} – ${shortDate(dayTo, true)}`;
  const todayHeading = new Intl.DateTimeFormat('en-PH', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();

  return <main className="content">
    <section className="welcome-row">
      <div><p className="eyebrow">{todayHeading}</p><h1>Good morning, Ced.</h1><p>Here’s the financial pulse across your business today.</p></div>
      <div className="dashboard-date-filter">
        <button type="button" className="date-button" onClick={toggleDateFilter} aria-expanded={dateFilterOpen}><CalendarDays size={17}/>{periodLabel}<ChevronDown size={15}/></button>
        {dateFilterOpen && <form className="date-filter-popover" onSubmit={applyDateFilter}>
          <div className="date-filter-head"><div><strong>Dashboard period</strong><span>Today is used by default</span></div><button type="button" onClick={() => setDateFilterOpen(false)} aria-label="Close date filter"><X size={16}/></button></div>
          <div className="date-filter-presets"><button type="button" onClick={() => applyPreset('today')}>Today</button><button type="button" onClick={() => applyPreset('week')}>This week</button><button type="button" onClick={() => applyPreset('month')}>This month</button></div>
          <span className="date-filter-custom-label">Custom range</span>
          <div className="date-filter-fields"><label>From<input type="date" value={draftDayFrom} onChange={event => setDraftDayFrom(event.target.value)}/></label><label>To<input type="date" value={draftDayTo} onChange={event => setDraftDayTo(event.target.value)}/></label></div>
          {draftDayFrom && draftDayTo && draftDayFrom > draftDayTo && <p className="date-filter-error">The start date must be before the end date.</p>}
          <div className="date-filter-actions"><button type="button" className="text-button" onClick={resetToToday}>Reset</button><button type="submit" className="primary-button" disabled={!draftDayFrom || !draftDayTo || draftDayFrom > draftDayTo}>Apply filter</button></div>
        </form>}
      </div>
    </section>

    <section className="metric-grid">
      <button className="metric-card featured" onClick={() => onNavigate('cash-balance')} title={cashBalanceError || undefined}><div className="metric-top"><span>Total cash balance</span><div className="metric-icon"><WalletCards size={19}/></div></div><strong>{cashBalanceError ? 'Unavailable' : hasCashBalance ? peso.format(totalCashBalance) : 'Loading…'}</strong><div className="metric-foot">{cashBalanceError ? <span>Could not load balance</span> : cashBalance ? <><span className={changeClass}>{hasChange && <ChangeIcon size={14}/>} {hasChange ? `${Math.abs(changePercentage).toFixed(2)}%` : '—'}</span><span>from opening balance</span></> : <span>As of {shortDate(dayTo, true)}</span>}</div><div className="sparkline"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></button>
      <button className="metric-card" onClick={() => onNavigate('collections')} title={collectionsError || undefined}><div className="metric-top"><span>Collections</span><div className="metric-icon pale-green"><ArrowDownLeft size={19}/></div></div><strong>{collectionsError ? 'Unavailable' : hasCollections ? peso.format(totalCollections) : 'Loading…'}</strong><div className="metric-foot">{collectionsError ? <span>Could not load collections</span> : collections ? <><span className={collectionsChangeClass}>{hasCollectionsChange && <CollectionsChangeIcon size={14}/>} {hasCollectionsChange ? `${Math.abs(collectionsChange).toFixed(2)}%` : '—'}</span><span>vs. previous period</span></> : <span>{shortDate(dayFrom)} – {shortDate(dayTo, true)}</span>}</div></button>
      <button className="metric-card" onClick={() => onNavigate('payments')} title={paymentsError || undefined}><div className="metric-top"><span>Payments</span><div className="metric-icon pale-amber"><ArrowUpRight size={19}/></div></div><strong>{paymentsError ? 'Unavailable' : hasPayments ? peso.format(totalPayments) : 'Loading…'}</strong><div className="metric-foot">{paymentsError ? <span>Could not load payments</span> : payments ? <><span className={paymentsChangeClass}>{hasPaymentsChange && <PaymentsChangeIcon size={14}/>} {hasPaymentsChange ? `${Math.abs(paymentsChange).toFixed(2)}%` : '—'}</span><span>vs. previous period</span></> : <span>{shortDate(dayFrom)} – {shortDate(dayTo, true)}</span>}</div></button>
      <button className="metric-card" onClick={() => onNavigate('upcoming-dues')} title={upcomingDuesError || undefined}><div className="metric-top"><span>Upcoming dues</span><div className="metric-icon pale-red"><CalendarDays size={19}/></div></div><strong>{upcomingDuesError ? 'Unavailable' : hasUpcomingDues ? peso.format(totalUpcomingDues) : 'Loading…'}</strong><div className="metric-foot">{upcomingDuesError ? <span>Could not load upcoming dues</span> : upcomingDues ? <><span className="warning">{hasObligationCount ? `${obligationCount} ${obligationCount === 1 ? 'obligation' : 'obligations'}` : '—'}</span><span>{isToday ? 'due today' : nearestDueDate ? `nearest ${shortDate(nearestDueDate)}` : 'selected period'}</span></> : <span>{periodLabel}</span>}</div></button>
    </section>

    <section className="dashboard-grid">
      <article className="panel cashflow-panel">
        <div className="panel-head"><div><h2>Cash flow</h2><p>Money in and out across all accounts</p></div><label className="cashflow-period-control"><select value={cashFlowDays} onChange={event => setCashFlowDays(Number(event.target.value))} aria-label="Cash flow period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select><ChevronDown size={15}/></label></div>
        {cashFlowError ? <div className="cashflow-state error-state"><CircleHelp size={19}/><span>{cashFlowError}</span></div> : !cashFlow || !hasCashFlow ? <div className="cashflow-state"><RefreshCw className="spin" size={19}/><span>Loading cash flow…</span></div> : <><div className="cashflow-summary"><div><span>Money in</span><strong>{peso.format(cashFlowMoneyIn)}</strong></div><div><span>Money out</span><strong>{peso.format(cashFlowMoneyOut)}</strong></div><div><span>Net cash flow</span><strong className={cashFlowNet > 0 ? 'green' : cashFlowNet < 0 ? 'red' : ''}>{cashFlowNet > 0 ? '+' : ''}{peso.format(cashFlowNet)}</strong></div></div><MiniChart dataPoints={cashFlow.points}/></>}
      </article>
      <article className="panel obligations-panel">
        <div className="panel-head"><div><h2>Upcoming dues</h2><p>Obligations requiring attention</p></div><button className="link-button" onClick={() => onNavigate('upcoming-dues')}>View all</button></div>
        {upcomingDuesListError ? <div className="dashboard-panel-state error-state"><CircleHelp size={19}/><span>{upcomingDuesListError}</span></div> : !upcomingDuesList ? <div className="dashboard-panel-state"><RefreshCw className="spin" size={19}/><span>Loading upcoming dues…</span></div> : upcomingDuesList.data?.length === 0 ? <div className="dashboard-panel-state"><Check size={19}/><span>No obligations due in the next 14 days.</span></div> : <div className="due-list">{(upcomingDuesList.data || []).map(item => {
          const urgent = item.is_overdue || Number(item.days_until_due) <= 3;
          return <div className="due-row" key={item.id}>
            <div className={`due-date ${urgent ? 'urgent' : ''}`}><strong>{item.due_day || item.due?.split(' ')[1]}</strong><span>{item.due_month || item.due?.split(' ')[0]}</span></div>
            <div className="due-info"><strong>{item.vendor || 'Obligation'}</strong><span>{item.ref || item.number || humanize(item.type)}</span></div>
            <div className="due-amount"><strong>{money(item.amount_due ?? item.amount, item.currency || 'PHP')}</strong><span className={urgent ? 'red' : ''}>{item.urgency || (item.is_overdue ? 'Overdue' : item.due)}</span></div>
          </div>;
        })}</div>}
      </article>
    </section>

    <section className="dashboard-grid lower-grid">
      <article className="panel accounts-panel">
        <div className="panel-head"><div><h2>Financial accounts</h2><p>Live balances from posted journal lines</p></div><button className="link-button" onClick={() => onNavigate('accounts')}>Manage accounts</button></div>
        {dashboardAccountsError ? <div className="dashboard-panel-state error-state"><CircleHelp size={19}/><span>{dashboardAccountsError}</span></div> : !dashboardAccounts ? <div className="dashboard-panel-state"><RefreshCw className="spin" size={19}/><span>Loading financial accounts…</span></div> : dashboardAccounts.length === 0 ? <div className="dashboard-panel-state"><Landmark size={19}/><span>No active financial accounts.</span></div> : <div className="account-list">{dashboardAccounts.map(account => {
          const displayBalance = account.isCredit ? -Math.abs(account.currentBalance) : account.currentBalance;
          return <button className="account-row" key={account.id} onClick={() => onNavigate('accounts', account.id)}>
            <span className="account-logo" style={{background: account.color}}>{account.initials}</span><span className="account-info"><strong>{account.name}</strong><span>{account.type} · {account.accountNumber}</span></span><span className="account-balance"><strong className={displayBalance < 0 ? 'red' : ''}>{money(displayBalance, account.currency || 'PHP')}</strong><span className="green">Active</span></span><ChevronRight size={17}/>
          </button>;
        })}</div>}
      </article>
      <article className="panel activity-panel">
        <div className="panel-head"><div><h2>Recent activity</h2><p>Latest activity from every branch</p></div><button className="link-button" onClick={() => onNavigate('payments')}>View all</button></div>
        {recentActivityError ? <div className="dashboard-panel-state error-state"><CircleHelp size={19}/><span>{recentActivityError}</span></div> : !recentActivity ? <div className="dashboard-panel-state"><RefreshCw className="spin" size={19}/><span>Loading recent activity…</span></div> : recentActivity.data?.length === 0 ? <div className="dashboard-panel-state"><Activity size={19}/><span>No recent activity.</span></div> : <div className="activity-list">{(recentActivity.data || []).map(item => {
          const amount = Number(item.amount || 0);
          const isInflow = item.type === 'in';
          const displayAmount = item.type === 'out' ? -Math.abs(amount) : amount;
          return <div className="activity-row" key={item.id}>
            <div className={`activity-icon ${item.type}`}>{isInflow ? <ArrowDownLeft size={17}/> : item.type === 'out' ? <ArrowUpRight size={17}/> : <ArrowLeftRight size={17}/>}</div>
            <div className="activity-info"><strong>{item.title || 'Account activity'}</strong><span>{item.meta || item.account || '—'}</span></div>
            <div className="activity-amount"><strong className={isInflow && amount > 0 ? 'green' : ''}>{isInflow && amount > 0 ? '+' : ''}{money(displayAmount, item.currency || 'PHP')}</strong><span>{item.time || calendarDate(item.activity_date)}</span></div>
          </div>;
        })}</div>}
      </article>
    </section>
  </main>;
}

function StatusPill({ status }) { return <span className={`status ${status.toLowerCase()}`}>{status === 'Posted' && <Check size={12}/>} {status}</span>; }

function PaymentsPage({ title = 'Payments', direction = null }) {
  const [filter, setFilter] = useState('All');
  const directionalActivity = direction ? activity.filter(item => item.type === direction) : activity;
  const filtered = filter === 'All' ? directionalActivity : directionalActivity.filter(item => item.status === filter);
  const totalVolume = directionalActivity.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const description = direction === 'in'
    ? 'Track incoming customer collections across every branch and financial account.'
    : direction === 'out'
      ? 'Track outgoing supplier, expense, and direct-account payments.'
      : 'Monitor money movement across every branch and financial account.';
  return <main className="content inner-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>{title}</h1><p>{description}</p></div><button className="secondary-button"><Download size={17}/>Export</button></div>
    <section className="summary-strip"><div><span>Total volume</span><strong>{peso.format(totalVolume)}</strong></div><div><span>Transactions</span><strong>{directionalActivity.length}</strong></div><div><span>Needs review</span><strong className="amber">{directionalActivity.filter(item => item.status === 'Review').length}</strong></div><div><span>Posted</span><strong>{directionalActivity.filter(item => item.status === 'Posted').length}</strong></div></section>
    <section className="panel table-panel">
      <div className="table-toolbar"><div className="segmented">{['All','Posted','Review'].map(x => <button key={x} className={filter === x ? 'active' : ''} onClick={() => setFilter(x)}>{x}</button>)}</div><div className="toolbar-right"><label className="small-search"><Search size={16}/><input placeholder="Search transactions"/></label><button className="icon-text"><SlidersHorizontal size={16}/>Filter</button></div></div>
      <div className="data-table"><div className="table-row table-head"><span>Transaction</span><span>Branch</span><span>Account</span><span>Date</span><span>Status</span><span>Amount</span></div>
        {filtered.map((item,i) => <div className="table-row" key={i}><span><strong>{item.title}</strong><small>{item.meta.split(' · ').at(-1)}</small></span><span>{item.meta.split(' · ')[0]}</span><span>{item.account}</span><span>{item.time}</span><span><StatusPill status={item.status}/></span><span className={item.amount > 0 && item.type === 'in' ? 'green' : ''}><strong>{peso.format(item.amount)}</strong></span></div>)}
      </div>
    </section>
  </main>;
}

function CashBalancePage({ onOpenAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    loadEveryPage(page => accountingApi.financialAccounts(`?page=${page}`))
      .then(records => current && setAccounts(records.map(normalizeAccount).filter(account => !account.isCredit)))
      .catch(requestError => current && setError(requestError.message || 'Cash balances could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  const total = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const available = accounts.reduce((sum, account) => sum + account.availableBalance, 0);
  return <main className="content inner-page"><div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Total cash balance</h1><p>Current balances across cash, bank, checking, and e-wallet accounts.</p></div><button className="secondary-button" onClick={() => onOpenAccount()}><Landmark size={16}/>Manage accounts</button></div><section className="summary-strip module-summary"><div><span>Current balance</span><strong>{peso.format(total)}</strong></div><div><span>Available balance</span><strong>{peso.format(available)}</strong></div><div><span>Active cash accounts</span><strong>{accounts.length}</strong></div></section>{loading && <section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading balances…</h2></section>}{!loading && error && <section className="panel account-state error-state"><CircleHelp size={22}/><h2>Balances could not be loaded</h2><p>{error}</p></section>}{!loading && !error && <section className="account-cards account-list-page">{accounts.map(account => <button className="big-account-card" key={account.id} onClick={() => onOpenAccount(account.id)}><span className="account-logo large" style={{background: account.color}}>{account.initials}</span><span><small>{account.type}</small><strong>{account.name}</strong><em>{account.accountNumber}</em></span><span className="card-balance"><small>Current balance</small><strong>{peso.format(account.currentBalance)}</strong></span><ChevronRight size={17}/></button>)}</section>}</main>;
}

function LiveRecordsPage({ eyebrow, title, description, Icon, columns, loadRecords, rowValues, emptyMessage }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    loadRecords().then(response => {
      if (!current) return;
      const data = Array.isArray(response) ? response : response?.data || [];
      setRecords(data);
      setTotal(Number(response?.total ?? data.length));
    }).catch(requestError => current && setError(requestError.message || `${title} could not be loaded.`))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [loadRecords, refreshVersion, title]);

  return <main className="content inner-page module-page">
    <div className="title-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><button className="secondary-button" onClick={() => setRefreshVersion(value => value + 1)} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={16}/>Refresh</button></div>
    <section className="summary-strip module-summary"><div><span>Total records</span><strong>{total}</strong></div><div><span>Visible now</span><strong>{records.length}</strong></div><div><span>Data source</span><strong>Live API</strong></div></section>
    <section className="panel module-records">
      <div className="module-row module-head" style={{gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))`}}>{columns.map(column => <span key={column}>{column}</span>)}</div>
      {loading && <div className="transaction-state"><RefreshCw className="spin" size={20}/><strong>Loading {title.toLowerCase()}…</strong></div>}
      {!loading && error && <div className="transaction-state error-state"><CircleHelp size={20}/><strong>Unable to load records</strong><span>{error}</span></div>}
      {!loading && !error && records.length === 0 && <div className="transaction-state"><Icon size={21}/><strong>No records yet</strong><span>{emptyMessage}</span></div>}
      {!loading && !error && records.map((record, index) => <div className="module-row" style={{gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))`}} key={record.id || index}>{rowValues(record).map((value, cellIndex) => <span key={cellIndex}>{value ?? '—'}</span>)}</div>)}
    </section>
  </main>;
}

const loadJournals = () => accountingApi.journals();
const loadInterbranchOrders = () => accountingApi.interbranchOrders();
const loadUpcomingDues = () => accountingApi.obligations();

const transferMethods = [
  { value: 'cash', label: 'Cash', description: 'From a cash account', Icon: Banknote },
  { value: 'online', label: 'Online', description: 'Bank or checking transfer', Icon: Globe2 },
  { value: 'e_wallet', label: 'E-wallet', description: 'From a digital wallet', Icon: WalletCards },
  { value: 'cheque', label: 'Cheque', description: 'From a checking account', Icon: ReceiptText },
];

function emptyTransferForm() {
  return {
    source_financial_account_id: '', destination_type: 'internal', destination_financial_account_id: '',
    transfer_method: 'online', external_institution_name: '', external_account_name: '',
    external_account_number: '', cheque_number: '',
    transfer_date: localIsoDate(new Date()), currency: 'PHP', amount: '', reference: '', memo: '', post: true,
  };
}

function TransfersPage({ onViewHistory }) {
  const [form, setForm] = useState(emptyTransferForm);
  const [accounts, setAccounts] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [externalOptionsLoading, setExternalOptionsLoading] = useState(false);
  const [externalOptionsLoaded, setExternalOptionsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdTransfer, setCreatedTransfer] = useState(null);

  const loadAccounts = () => loadEveryPage(page => accountingApi.financialAccounts(`?active=1&page=${page}`))
    .then(records => records.map(normalizeAccount));
  useEffect(() => {
    let current = true;
    loadAccounts()
      .then(accountRecords => {
        if (!current) return;
        setAccounts(accountRecords);
      })
      .catch(loadError => current && setError(loadError.message || 'Transfer workspace could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (form.destination_type !== 'external' || externalOptionsLoaded) return;
    let current = true;
    setExternalOptionsLoading(true);
    Promise.all([loadActiveChartAccounts(), loadFinancialInstitutions()])
      .then(([ledgerRecords, institutionRecords]) => {
        if (!current) return;
        setChartAccounts(ledgerRecords);
        setInstitutions(institutionRecords.filter(institution => institution.is_active !== false
          && String(institution.code || '').toUpperCase() !== 'CASH'
          && String(institution.name || '').toLowerCase() !== 'cash'));
        setExternalOptionsLoaded(true);
      })
      .catch(loadError => current && setError(loadError.message || 'External transfer options could not be loaded.'))
      .finally(() => current && setExternalOptionsLoading(false));
    return () => { current = false; };
  }, [form.destination_type, externalOptionsLoaded]);

  const refreshTransferData = async () => {
    setAccounts(await loadAccounts());
  };

  const transferEnabled = account => !account.applications?.length || account.applications.some(application => application.application === 'account_transfer' || application.type?.code === 'account_transfer');
  const compatibleKinds = form.transfer_method === 'cash' ? ['cash'] : form.transfer_method === 'e_wallet' ? ['e_wallet'] : form.transfer_method === 'cheque' ? ['checking_account'] : ['bank_account', 'checking_account'];
  const sourceAccounts = accounts.filter(account => !account.isCredit && compatibleKinds.includes(account.kind) && account.usable_for_payments !== false && transferEnabled(account));
  const selectedSource = accounts.find(account => String(account.id) === String(form.source_financial_account_id));
  const destinationAccounts = accounts.filter(account => !account.isCredit && String(account.id) !== String(form.source_financial_account_id) && account.currency === form.currency && account.usable_for_receipts !== false && transferEnabled(account));
  const selectedDestination = accounts.find(account => String(account.id) === String(form.destination_financial_account_id));
  const availableOffsetAccounts = chartAccounts.filter(account => String(account.id) !== String(selectedSource?.chart_account_id));
  const externalOffsetAccount = availableOffsetAccounts.find(account => account.code === '5000' || /\bgeneral expense\b/i.test(account.name || ''))
    || availableOffsetAccounts.find(account => account.type === 'expense');
  const isWalletInstitution = institution => ['e_wallet', 'wallet'].includes(String(institution.type || institution.kind || '').toLowerCase())
    || /\b(gcash|maya|paymaya)\b/i.test(`${institution.name || ''} ${institution.code || ''}`);
  const walletInstitutions = institutions.filter(isWalletInstitution);
  const bankInstitutions = institutions.filter(institution => !isWalletInstitution(institution));
  const numericAmount = Number(form.amount || 0);
  const canSubmit = Boolean(form.source_financial_account_id && form.transfer_date && form.currency && numericAmount > 0
    && (form.destination_type === 'internal'
      ? form.destination_financial_account_id
      : form.external_institution_name.trim() && form.external_account_name.trim()
        && form.external_account_number.trim() && form.memo.trim() && externalOffsetAccount)
    && (form.transfer_method !== 'cheque' || form.cheque_number.trim()));

  const updateForm = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    setError('');
  };
  const issue = field => {
    const value = fieldErrors[field];
    if (!value) return null;
    return <small className="account-field-error">{Array.isArray(value) ? value[0] : value}</small>;
  };
  const chooseMethod = method => setForm(current => ({
    ...current,
    transfer_method: method,
    source_financial_account_id: '',
    destination_financial_account_id: '',
    cheque_number: method === 'cheque' ? current.cheque_number : '',
  }));
  const chooseSource = value => {
    const account = accounts.find(item => String(item.id) === String(value));
    setForm(current => ({
      ...current,
      source_financial_account_id: value,
      currency: account?.currency || current.currency,
      destination_financial_account_id: account && selectedDestination?.currency !== account.currency ? '' : current.destination_financial_account_id,
    }));
    setFieldErrors(current => ({ ...current, source_financial_account_id: undefined }));
  };
  const submitTransfer = async event => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = {
        source_financial_account_id: Number(form.source_financial_account_id),
        destination_type: form.destination_type,
        transfer_method: form.transfer_method,
        transfer_date: form.transfer_date,
        currency: form.currency,
        amount: numericAmount,
        reference: form.reference.trim() || null,
        memo: form.memo.trim() || null,
        post: form.post,
      };
      if (form.transfer_method === 'cheque') payload.cheque_number = form.cheque_number.trim();
      if (form.destination_type === 'internal') {
        payload.destination_financial_account_id = Number(form.destination_financial_account_id);
      } else {
        payload.offset_account_id = Number(externalOffsetAccount.id);
        payload.recipient_name = form.external_account_name.trim();
        payload.external_institution_name = form.external_institution_name.trim() || null;
        payload.external_account_name = form.external_account_name.trim() || null;
        payload.external_account_number = form.external_account_number.trim() || null;
      }
      const result = await accountingApi.createTransfer(payload);
      setCreatedTransfer(result);
      setForm(current => ({ ...emptyTransferForm(), transfer_method: current.transfer_method, destination_type: current.destination_type }));
      await refreshTransferData();
    } catch (requestError) {
      setError(requestError.message || 'Transfer could not be created.');
      setFieldErrors(requestError.details || {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="content inner-page"><section className="panel transaction-state"><RefreshCw className="spin" size={22}/><strong>Loading transfer workspace…</strong></section></main>;

  return <main className="content inner-page transfer-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Transfer money</h1><p>Move funds between your accounts or record money sent to an external person or account.</p></div><button type="button" className="secondary-button" onClick={onViewHistory}><ReceiptText size={16}/>View transfer history</button></div>
    {error && <div className="account-save-message error"><CircleHelp size={18}/><span><strong>Transfer needs attention</strong>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
    {createdTransfer && <div className="account-save-message success"><Check size={18}/><span><strong>{createdTransfer.status === 'posted' ? 'Transfer posted' : 'Draft saved'}</strong>{createdTransfer.number || 'The transfer'} · {money(createdTransfer.amount, createdTransfer.currency || 'PHP')}</span><button onClick={() => setCreatedTransfer(null)}>Dismiss</button></div>}

    <section className="transfer-layout">
      <form className="panel transfer-form" onSubmit={submitTransfer}>
        <div className="transfer-section-head"><span><ArrowLeftRight size={20}/></span><div><h2>Transfer details</h2><p>Choose how the money leaves the source account.</p></div></div>
        <div className="transfer-method-grid">{transferMethods.map(({ value, label, description, Icon }) => <button type="button" key={value} className={form.transfer_method === value ? 'selected' : ''} onClick={() => chooseMethod(value)}><Icon size={19}/><span><strong>{label}</strong><small>{description}</small></span><Check size={15}/></button>)}</div>

        <div className="transfer-fields">
          <label className="span-2">Send from<select value={form.source_financial_account_id} onChange={event => chooseSource(event.target.value)} required><option value="">Select a compatible source account</option>{sourceAccounts.map(account => <option value={account.id} key={account.id}>{account.name} · {money(account.availableBalance, account.currency || 'PHP')} available</option>)}</select>{sourceAccounts.length === 0 && <small className="account-field-help">No active account is enabled for this transfer method.</small>}{issue('source_financial_account_id')}</label>
          <label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={event => updateForm('amount', event.target.value)} placeholder="0.00" required/>{issue('amount')}</label>
          <label>Currency<input value={form.currency} readOnly/>{issue('currency')}</label>
          <label>Transfer date<input type="date" value={form.transfer_date} onChange={event => updateForm('transfer_date', event.target.value)} required/>{issue('transfer_date')}</label>
          {form.transfer_method === 'cheque' && <label>Cheque number<input value={form.cheque_number} onChange={event => updateForm('cheque_number', event.target.value)} placeholder="Enter cheque number" required/>{issue('cheque_number')}</label>}
        </div>

        <div className="transfer-subsection"><div><h3>Destination</h3><p>Internal transfers stay between accounts in this portal. External transfers record money leaving the business account.</p></div><div className="destination-tabs"><button type="button" className={form.destination_type === 'internal' ? 'selected' : ''} onClick={() => updateForm('destination_type', 'internal')}><Building2 size={16}/>Internal account</button><button type="button" className={form.destination_type === 'external' ? 'selected' : ''} onClick={() => updateForm('destination_type', 'external')}><Globe2 size={16}/>External recipient</button></div></div>

        {form.destination_type === 'internal' ? <div className="transfer-fields"><label className="span-2">Receive in<select value={form.destination_financial_account_id} onChange={event => updateForm('destination_financial_account_id', event.target.value)} disabled={!selectedSource} required><option value="">{selectedSource ? 'Select destination account' : 'Select a source account first'}</option>{destinationAccounts.map(account => <option value={account.id} key={account.id}>{account.name} · {money(account.currentBalance, account.currency || 'PHP')}</option>)}</select>{issue('destination_financial_account_id')}</label></div> : <div className="transfer-fields">
          <label>Bank or e-wallet<select value={form.external_institution_name} onChange={event => updateForm('external_institution_name', event.target.value)} disabled={externalOptionsLoading} required><option value="">{externalOptionsLoading ? 'Loading banks and e-wallets…' : 'Select bank or e-wallet'}</option><optgroup label="Banks">{bankInstitutions.map(institution => { const name = institution.name || institution.institution_name || institution.display_name; return name ? <option key={institution.id || name} value={name}>{name}</option> : null; })}</optgroup><optgroup label="E-wallets">{walletInstitutions.map(institution => { const name = institution.name || institution.institution_name || institution.display_name; return name ? <option key={institution.id || name} value={name}>{name}</option> : null; })}</optgroup></select>{issue('external_institution_name')}</label>
          <label>Account name<input value={form.external_account_name} onChange={event => updateForm('external_account_name', event.target.value)} placeholder="Name on destination account" required/>{issue('external_account_name')}{issue('recipient_name')}</label>
          <label className="span-2">Account number<input value={form.external_account_number} onChange={event => updateForm('external_account_number', event.target.value)} placeholder="Enter bank or wallet account number" required/>{issue('external_account_number')}</label>
        </div>}

        <div className="transfer-fields transfer-final-fields"><label>Reference number <small>Optional</small><input value={form.reference} onChange={event => updateForm('reference', event.target.value)} placeholder="Bank reference or tracking number"/>{issue('reference')}</label><label className="span-2">Details{form.destination_type === 'internal' && <small>Optional</small>}<textarea rows="3" value={form.memo} onChange={event => updateForm('memo', event.target.value)} placeholder="Purpose or transfer details" required={form.destination_type === 'external'}/>{issue('memo')}</label></div>
        <label className="transfer-post-toggle"><input type="checkbox" checked={form.post} onChange={event => updateForm('post', event.target.checked)}/><span><strong>Post immediately</strong><small>Turn this off to save a draft for review. Posted transfers create journal entries and affect balances.</small></span></label>
        <button className="primary-button transfer-submit" disabled={!canSubmit || submitting}>{submitting ? <><RefreshCw className="spin" size={16}/>Saving transfer…</> : <><ArrowLeftRight size={16}/>{form.post ? 'Post transfer' : 'Save draft'}</>}</button>
      </form>

      <aside className="panel transfer-preview">
        <p className="eyebrow">TRANSFER PREVIEW</p><h2>{numericAmount > 0 ? money(numericAmount, form.currency) : money(0, form.currency)}</h2>
        <div className="transfer-route"><span className="account-logo large" style={{background:selectedSource?.color || '#789087'}}>{selectedSource?.initials || '?'}</span><div><small>From</small><strong>{selectedSource?.name || 'Choose source'}</strong><span>{humanize(form.transfer_method)}</span></div><ArrowLeftRight size={18}/><span className="account-logo large" style={{background:form.destination_type === 'internal' ? selectedDestination?.color || '#789087' : '#3c6d91'}}>{form.destination_type === 'internal' ? selectedDestination?.initials || '?' : <Globe2 size={17}/>}</span><div><small>To</small><strong>{form.destination_type === 'internal' ? selectedDestination?.name || 'Choose account' : form.external_account_name || 'External recipient'}</strong><span>{form.destination_type === 'external' ? form.external_institution_name || 'Outside this portal' : form.currency}</span></div></div>
        <dl className="transfer-preview-list"><div><dt>Date</dt><dd>{calendarDate(form.transfer_date)}</dd></div><div><dt>Destination</dt><dd>{humanize(form.destination_type)}</dd></div><div><dt>Posting</dt><dd>{form.post ? 'Post now' : 'Save draft'}</dd></div></dl>
        {form.destination_type === 'external' && <p className="transfer-disbursement-note"><ShieldCheck size={15}/>This records the accounting transaction only. The actual bank, wallet, cash, or cheque delivery happens outside this portal unless a provider integration is added.</p>}
      </aside>
    </section>

  </main>;
}

const refundMethodOptions = [
  { type: 'cash', label: 'Cash', description: 'Return money from a cash account', Icon: Banknote },
  { type: 'bank_transfer', label: 'Bank transfer', description: 'Send from a bank or checking account', Icon: Landmark },
  { type: 'e_wallet', label: 'E-wallet', description: 'Return funds from a digital wallet', Icon: WalletCards },
];

function refundPaymentType(method) {
  const key = String(method?.type || method?.code || method?.slug || method?.name || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (key.includes('cash')) return 'cash';
  if (key.includes('wallet')) return 'e_wallet';
  if (key.includes('bank') || key.includes('online') || key.includes('transfer')) return 'bank_transfer';
  return key;
}

function emptyRefundForm() {
  return {
    original_payment_id: '', financial_account_id: '', payment_method_id: '',
    refund_mode: 'exchange', original_payment_amount: '', replacement_amount: '',
    refund_date: localIsoDate(new Date()), currency: 'PHP', amount: '',
    reference: '', reason: '', post: true,
  };
}

function CustomerRefundsPage({ onViewList }) {
  const [form, setForm] = useState(emptyRefundForm);
  const [accounts, setAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdRefund, setCreatedRefund] = useState(null);

  useEffect(() => {
    let current = true;
    Promise.all([
      loadEveryPage(page => accountingApi.financialAccounts(`?active=1&page=${page}`)),
      accountingApi.paymentMethods(),
    ]).then(([accountRecords, methodResponse]) => {
      if (!current) return;
      setAccounts(accountRecords.map(normalizeAccount).filter(account => !account.isCredit));
      const methods = Array.isArray(methodResponse) ? methodResponse : methodResponse?.data || [];
      setPaymentMethods(methods.filter(method => method.is_active !== false && ['cash', 'bank_transfer', 'e_wallet'].includes(refundPaymentType(method))));
    }).catch(loadError => current && setError(loadError.message || 'Refund workspace could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  const selectedMethod = paymentMethods.find(method => String(method.id) === String(form.payment_method_id));
  const selectedMethodType = refundPaymentType(selectedMethod);
  const compatibleKinds = matchPaymentMethodKinds(selectedMethodType);
  const compatibleAccounts = accounts.filter(account => compatibleKinds.includes(account.kind) && account.usable_for_payments !== false);
  const selectedAccount = accounts.find(account => String(account.id) === String(form.financial_account_id));
  const originalPaymentAmount = Number(form.original_payment_amount || 0);
  const replacementAmount = Number(form.replacement_amount || 0);
  const exchangeAmountReady = form.original_payment_amount !== '' && form.replacement_amount !== '' && originalPaymentAmount > replacementAmount;
  const numericAmount = form.refund_mode === 'exchange' ? Math.max(0, originalPaymentAmount - replacementAmount) : Number(form.amount || 0);
  const originalPaymentId = Number(form.original_payment_id || 0);
  const amountReady = form.refund_mode === 'exchange' ? exchangeAmountReady : form.amount !== '' && numericAmount > 0;
  const canSubmit = Boolean(originalPaymentId > 0 && amountReady && selectedMethod && selectedAccount && form.refund_date && form.currency && numericAmount > 0 && form.reason.trim());

  const updateForm = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setFieldErrors(current => ({ ...current, [field]: undefined }));
    setError('');
  };
  const issue = field => {
    const value = fieldErrors[field];
    return value ? <small className="account-field-error">{Array.isArray(value) ? value[0] : value}</small> : null;
  };
  const chooseMethodType = type => {
    const method = paymentMethods.find(item => refundPaymentType(item) === type);
    setForm(current => ({ ...current, payment_method_id: method ? String(method.id) : '', financial_account_id: '' }));
    setFieldErrors(current => ({ ...current, payment_method_id: undefined, financial_account_id: undefined }));
    setError('');
  };
  const chooseAccount = value => {
    const account = accounts.find(item => String(item.id) === String(value));
    setForm(current => ({ ...current, financial_account_id: value, currency: account?.currency || current.currency }));
    setFieldErrors(current => ({ ...current, financial_account_id: undefined, currency: undefined }));
  };
  const submitRefund = async event => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const result = await accountingApi.createCustomerRefund({
        original_payment_id: originalPaymentId,
        financial_account_id: Number(form.financial_account_id),
        payment_method_id: Number(form.payment_method_id),
        refund_date: form.refund_date,
        currency: form.currency,
        amount: numericAmount,
        reference: form.reference.trim() || null,
        reason: form.reason.trim(),
        post: form.post,
      });
      setCreatedRefund(result);
      setForm(emptyRefundForm());
      const refreshedAccounts = await loadEveryPage(page => accountingApi.financialAccounts(`?active=1&page=${page}`));
      setAccounts(refreshedAccounts.map(normalizeAccount).filter(account => !account.isCredit));
    } catch (requestError) {
      setError(requestError.message || 'Customer refund could not be created.');
      setFieldErrors(requestError.details || {});
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="content inner-page"><section className="panel transaction-state"><RefreshCw className="spin" size={22}/><strong>Loading refund workspace…</strong></section></main>;

  return <main className="content inner-page transfer-page refund-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Customer refund</h1><p>Keep the original sale intact, record the replacement value, and return only the difference.</p></div><button type="button" className="secondary-button" onClick={onViewList}><ReceiptText size={16}/>View refund list</button></div>
    {error && <div className="account-save-message error"><CircleHelp size={18}/><span><strong>Refund needs attention</strong>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}
    {createdRefund && <div className="account-save-message success"><Check size={18}/><span><strong>{createdRefund.status === 'posted' ? 'Refund posted' : 'Draft saved'}</strong>{createdRefund.number || createdRefund.reference || 'Customer refund'} · {money(createdRefund.amount, createdRefund.currency || 'PHP')}</span><button type="button" onClick={() => setCreatedRefund(null)}>Dismiss</button></div>}

    <section className="transfer-layout">
      <form className="panel transfer-form" onSubmit={submitRefund}>
        <div className="transfer-section-head"><span><RotateCcw size={20}/></span><div><h2>Refund details</h2><p>Link the refund to its original customer payment, then choose how the money will be returned.</p></div></div>

        <div className="refund-mode-tabs" aria-label="Refund scenario"><button type="button" className={form.refund_mode === 'exchange' ? 'selected' : ''} onClick={() => updateForm('refund_mode', 'exchange')}><ArrowLeftRight size={16}/><span><strong>Item exchange</strong><small>Customer chooses a lower-value replacement</small></span></button><button type="button" className={form.refund_mode === 'other' ? 'selected' : ''} onClick={() => updateForm('refund_mode', 'other')}><RotateCcw size={16}/><span><strong>Other refund</strong><small>Enter the refund amount manually</small></span></button></div>

        <div className="transfer-step-heading"><span className="transfer-step-number">1</span><div><h3>Original posted payment</h3><p>The original order and payment stay unchanged for a complete audit trail.</p></div></div>
        <div className="transfer-fields refund-original-payment"><label>Original payment ID<input type="number" min="1" step="1" value={form.original_payment_id} onChange={event => updateForm('original_payment_id', event.target.value)} placeholder="For example, 25" required/>{issue('original_payment_id')}</label>{form.refund_mode === 'exchange' && <label>Amount originally paid<input type="number" min="0.01" step="0.01" value={form.original_payment_amount} onChange={event => updateForm('original_payment_amount', event.target.value)} placeholder="1,000.00" required/></label>}</div>

        <div className="transfer-step-heading"><span className="transfer-step-number">2</span><div><h3>{form.refund_mode === 'exchange' ? 'Replacement and difference' : 'Refund amount'}</h3><p>{form.refund_mode === 'exchange' ? 'Enter the lower replacement value. The amount returned to the customer is calculated automatically.' : 'Enter the amount being returned from the original posted payment.'}</p></div></div>
        {form.refund_mode === 'exchange' ? <><div className="transfer-fields refund-exchange-fields"><label>Replacement item value<input type="number" min="0" step="0.01" value={form.replacement_amount} onChange={event => updateForm('replacement_amount', event.target.value)} placeholder="800.00" required/></label><label>Refund difference<input value={money(numericAmount, form.currency)} readOnly/>{issue('amount')}</label></div><div className={`refund-calculation ${form.replacement_amount !== '' && originalPaymentAmount <= replacementAmount ? 'invalid' : ''}`}><div><span>Original order and payment</span><strong>{money(originalPaymentAmount, form.currency)}</strong><small>Preserved unchanged</small></div><span className="refund-calculation-symbol">−</span><div><span>Replacement value</span><strong>{money(replacementAmount, form.currency)}</strong><small>New item selected</small></div><span className="refund-calculation-symbol">=</span><div className="refund-calculation-result"><span>Return to customer</span><strong>{money(numericAmount, form.currency)}</strong><small>{exchangeAmountReady ? `MDR retains ${money(replacementAmount, form.currency)}` : 'Replacement must be lower'}</small></div></div></> : <div className="transfer-fields refund-exchange-fields"><label className="span-2">Refund amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={event => updateForm('amount', event.target.value)} placeholder="0.00" required/>{issue('amount')}</label></div>}

        <div className="transfer-step-heading"><span className="transfer-step-number">3</span><div><h3>Refund method</h3><p>The selected method controls which financial accounts can fund the refund.</p></div></div>
        <div className="transfer-method-grid refund-method-grid">{refundMethodOptions.map(({ type, label, description, Icon }) => {
          const method = paymentMethods.find(item => refundPaymentType(item) === type);
          const selected = selectedMethodType === type;
          return <button type="button" key={type} className={selected ? 'selected' : ''} disabled={!method} onClick={() => chooseMethodType(type)}><Icon size={19}/><span><strong>{label}</strong><small>{method ? description : 'No active method available'}</small></span><Check size={15}/></button>;
        })}</div>

        <div className="transfer-step-heading refund-final-heading"><span className="transfer-step-number">4</span><div><h3>Posting details</h3><p>Choose the funding account, date, and audit reference.</p></div></div>
        <div className="transfer-fields refund-final-fields">
          <label className="span-2">Refund from<select value={form.financial_account_id} onChange={event => chooseAccount(event.target.value)} disabled={!selectedMethod} required><option value="">{selectedMethod ? 'Select a compatible financial account' : 'Choose a refund method first'}</option>{compatibleAccounts.map(account => <option value={account.id} key={account.id}>{account.name} · {money(account.availableBalance, account.currency || 'PHP')} available</option>)}</select>{selectedMethod && compatibleAccounts.length === 0 && <small className="account-field-help">No active account is compatible with this refund method.</small>}{issue('financial_account_id')}</label>
          <label>Currency<input value={form.currency} readOnly/>{issue('currency')}</label>
          <label>Refund date<input type="date" value={form.refund_date} onChange={event => updateForm('refund_date', event.target.value)} required/>{issue('refund_date')}</label>
          <label>Reference <small>Optional</small><input value={form.reference} onChange={event => updateForm('reference', event.target.value)} placeholder="RETURN-1001"/>{issue('reference')}</label>
          <label className="span-2">Reason<textarea rows="3" value={form.reason} onChange={event => updateForm('reason', event.target.value)} placeholder="Describe why the customer payment is being refunded" required/>{issue('reason')}</label>
        </div>

        <label className="transfer-post-toggle"><input type="checkbox" checked={form.post} onChange={event => updateForm('post', event.target.checked)}/><span><strong>Post immediately</strong><small>Turn this off to save a draft for review. A posted refund creates journal entries and reduces the selected account balance.</small></span></label>
        <button className="primary-button transfer-submit" disabled={!canSubmit || submitting}>{submitting ? <><RefreshCw className="spin" size={16}/>Saving refund…</> : <><RotateCcw size={16}/>{form.post ? 'Post customer refund' : 'Save refund draft'}</>}</button>
      </form>

      <aside className="panel transfer-preview refund-preview">
        <p className="eyebrow">REFUND PREVIEW</p><h2>{numericAmount > 0 ? money(numericAmount, form.currency) : money(0, form.currency)}</h2>
        {form.refund_mode === 'exchange' && <div className="refund-structure-preview"><span>Original transaction<strong>{money(originalPaymentAmount, form.currency)}</strong></span><span>Replacement value<strong>{money(replacementAmount, form.currency)}</strong></span><span>Customer refund<strong>{money(numericAmount, form.currency)}</strong></span><span>Net retained<strong>{money(replacementAmount, form.currency)}</strong></span></div>}
        <div className="refund-preview-account"><span className="account-logo large" style={{background:selectedAccount?.color || '#789087'}}>{selectedAccount?.initials || '?'}</span><div><small>Refund from</small><strong>{selectedAccount?.name || 'Choose financial account'}</strong><span>{selectedMethod ? humanize(selectedMethodType) : 'Choose refund method'}</span></div></div>
        <dl className="transfer-preview-list"><div><dt>Scenario</dt><dd>{form.refund_mode === 'exchange' ? 'Item exchange' : 'Other refund'}</dd></div><div><dt>Original payment</dt><dd>{originalPaymentId > 0 ? `#${originalPaymentId}` : 'Not selected'}</dd></div><div><dt>Refund date</dt><dd>{calendarDate(form.refund_date)}</dd></div><div><dt>Reference</dt><dd>{form.reference.trim() || 'Optional'}</dd></div><div><dt>Posting</dt><dd>{form.post ? 'Post now' : 'Save draft'}</dd></div></dl>
        <p className="transfer-disbursement-note"><ShieldCheck size={15}/>{form.refund_mode === 'exchange' ? 'The original sale and payment remain unchanged; only the calculated difference is posted as a refund.' : 'The original sale and payment remain unchanged; only this refund is posted.'} The API verifies all refundable limits and account rules.</p>
      </aside>
    </section>
  </main>;
}

const emptyRefundListFilters = { date_from: '', date_to: '', status: '', financial_account_id: '' };

function CustomerRefundListPage({ onNewRefund }) {
  const [draftFilters, setDraftFilters] = useState(emptyRefundListFilters);
  const [filters, setFilters] = useState(emptyRefundListFilters);
  const [accounts, setAccounts] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [actionTarget, setActionTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let current = true;
    loadEveryPage(pageNumber => accountingApi.financialAccounts(`?active=1&page=${pageNumber}`))
      .then(records => current && setAccounts(records.map(normalizeAccount).filter(account => !account.isCredit)))
      .catch(() => current && setAccounts([]));
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    const params = new URLSearchParams({ page: String(page), per_page: '15' });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    setLoading(true);
    setError('');
    accountingApi.customerRefunds(`?${params.toString()}`)
      .then(response => {
        if (!current) return;
        const records = Array.isArray(response) ? response : response?.data || [];
        setRefunds(records);
        setTotal(Number(response?.total ?? records.length));
        setLastPage(Number(response?.last_page || 1));
      })
      .catch(requestError => current && setError(requestError.message || 'Customer refunds could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [filters.date_from, filters.date_to, filters.status, filters.financial_account_id, page, refreshVersion]);

  const updateFilter = event => setDraftFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const applyFilters = event => {
    event.preventDefault();
    setPage(1);
    setFilters(draftFilters);
  };
  const clearFilters = () => {
    setDraftFilters(emptyRefundListFilters);
    setFilters(emptyRefundListFilters);
    setPage(1);
  };
  const openAction = (type, refund) => {
    setActionTarget({ type, refund });
    setVoidReason('');
    setActionError('');
  };
  const closeAction = () => {
    if (actionPending) return;
    setActionTarget(null);
    setVoidReason('');
    setActionError('');
  };
  const submitAction = async event => {
    event.preventDefault();
    if (!actionTarget || (actionTarget.type === 'void' && !voidReason.trim())) return;
    setActionPending(true);
    setActionError('');
    try {
      if (actionTarget.type === 'post') await accountingApi.postCustomerRefund(actionTarget.refund.id);
      else await accountingApi.voidCustomerRefund(actionTarget.refund.id, voidReason.trim());
      setActionTarget(null);
      setVoidReason('');
      setRefreshVersion(value => value + 1);
    } catch (requestError) {
      setActionError(requestError.message || `Refund could not be ${actionTarget.type === 'post' ? 'posted' : 'voided'}.`);
    } finally {
      setActionPending(false);
    }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  return <main className="content inner-page transfer-history-page refund-list-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Customer refund list</h1><p>Review refund drafts, posted returns, and voided records.</p></div><button type="button" className="primary-button" onClick={onNewRefund}><Plus size={16}/>Add refund</button></div>
    <section className="panel transfer-history">
      <div className="panel-head"><div><h2>Customer refunds</h2><p>Filter refunds by date, status, or funding account.</p></div><div className="history-head-actions"><span className="transaction-count">{loading ? 'Loading…' : `${total} records`}</span>{activeFilterCount > 0 && <span className="transfer-filter-count">{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}</span>}</div></div>
      <form className="transaction-filters transfer-history-filters" onSubmit={applyFilters}>
        <label>Date from<input name="date_from" type="date" value={draftFilters.date_from} max={draftFilters.date_to || undefined} onChange={updateFilter}/></label>
        <label>Date to<input name="date_to" type="date" value={draftFilters.date_to} min={draftFilters.date_from || undefined} onChange={updateFilter}/></label>
        <label>Status<select name="status" value={draftFilters.status} onChange={updateFilter}><option value="">All statuses</option><option value="draft">Draft</option><option value="posted">Posted</option><option value="voided">Void</option></select></label>
        <label>Financial account<select name="financial_account_id" value={draftFilters.financial_account_id} onChange={updateFilter}><option value="">All financial accounts</option>{[...accounts].sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <div className="filter-actions"><button type="button" className="text-button" onClick={clearFilters}>Clear all</button><button type="submit" className="primary-button"><SlidersHorizontal size={15}/>Apply filters</button></div>
      </form>
      {loading && <div className="transaction-state"><RefreshCw className="spin" size={20}/><strong>Loading customer refunds…</strong></div>}
      {!loading && error && <div className="transaction-state error-state"><CircleHelp size={20}/><strong>Unable to load customer refunds</strong><span>{error}</span></div>}
      {!loading && !error && refunds.length === 0 && <div className="transaction-state"><RotateCcw size={21}/><strong>No refunds found</strong><span>Try a different filter or add a customer refund.</span></div>}
      {!loading && !error && refunds.length > 0 && <div className="transfer-history-table"><div className="refund-history-row transfer-history-head"><span>Refund</span><span>Original payment</span><span>Method</span><span>Refund from</span><span>Date</span><span>Status</span><span>Amount</span><span>Actions</span></div>{refunds.map(refund => {
        const status = String(refund.status || (refund.voided_at ? 'voided' : 'draft')).toLowerCase();
        const originalPayment = refund.original_payment || refund.payment;
        const method = refund.payment_method;
        const account = refund.financial_account || refund.account;
        return <div className="refund-history-row" key={refund.id}><span><strong>{refund.reference || refund.number || `Refund ${refund.id}`}</strong><small>{refund.reason || 'Customer refund'}</small></span><span><strong>{originalPayment?.number || originalPayment?.reference || `#${refund.original_payment_id || '—'}`}</strong><small>{originalPayment?.customer?.name || originalPayment?.counterparty?.name || 'Customer payment'}</small></span><span>{method?.name || humanize(refund.payment_method_type || refund.method || '—')}</span><span><strong>{account?.name || '—'}</strong><small>{account?.account_number_masked || account?.masked_account_number || ''}</small></span><span>{calendarDate(refund.refund_date || refund.created_at)}</span><span><em className={`history-status ${status}`}>{status === 'voided' ? 'Void' : humanize(status)}</em></span><span><strong>{money(refund.amount, refund.currency || 'PHP')}</strong></span><span className="refund-history-actions">{status === 'draft' && <button type="button" onClick={() => openAction('post', refund)}>Post</button>}{status === 'posted' && <button type="button" className="void-link" onClick={() => openAction('void', refund)}>Void</button>}{!['draft', 'posted'].includes(status) && <small>—</small>}</span></div>;
      })}</div>}
      {!loading && !error && lastPage > 1 && <div className="transfer-pagination"><button type="button" className="secondary-button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}><ArrowLeft size={15}/>Previous</button><span>Page {page} of {lastPage}</span><button type="button" className="secondary-button" onClick={() => setPage(current => Math.min(lastPage, current + 1))} disabled={page === lastPage}>Next<ChevronRight size={15}/></button></div>}
    </section>

    {actionTarget && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeAction()}><form className="modal confirmation-modal" onSubmit={submitAction}><div className="modal-head"><div><p className="eyebrow">{actionTarget.type === 'post' ? 'POST CUSTOMER REFUND' : 'VOID CUSTOMER REFUND'}</p><h2>{actionTarget.type === 'post' ? 'Post this refund?' : 'Reverse this refund?'}</h2></div><button type="button" className="icon-button" onClick={closeAction} disabled={actionPending}><X size={19}/></button></div><p className="modal-intro">{actionTarget.type === 'post' ? 'Posting creates the journal entry and reduces the selected financial account balance.' : 'Voiding preserves the original refund and creates the appropriate reversal for the audit trail.'}</p>{actionTarget.type === 'void' && <label className="void-reason-field">Reason<textarea rows="3" value={voidReason} onChange={event => setVoidReason(event.target.value)} placeholder="Why is this refund being voided?" required/></label>}{actionError && <div className="portal-login-error"><CircleHelp size={16}/><span>{actionError}</span></div>}<div className="modal-actions"><button type="button" className="text-button" onClick={closeAction} disabled={actionPending}>Cancel</button><button type="submit" className={`primary-button ${actionTarget.type === 'void' ? 'danger-button' : ''}`} disabled={actionPending || (actionTarget.type === 'void' && !voidReason.trim())}>{actionPending ? <><RefreshCw className="spin" size={15}/>Saving…</> : actionTarget.type === 'post' ? 'Post refund' : 'Void refund'}</button></div></form></div>}
  </main>;
}

const emptyTransferHistoryFilters = { date_from: '', date_to: '', status: '', financial_account_id: '' };

function TransferHistoryPage({ onNewTransfer }) {
  const [draftFilters, setDraftFilters] = useState(emptyTransferHistoryFilters);
  const [filters, setFilters] = useState(emptyTransferHistoryFilters);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    loadEveryPage(pageNumber => accountingApi.financialAccounts(`?active=1&page=${pageNumber}`))
      .then(records => current && setAccounts(records.map(normalizeAccount).filter(account => !account.isCredit)))
      .catch(() => current && setAccounts([]));
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    const params = new URLSearchParams({ page: String(page), per_page: '15' });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    setLoading(true);
    setError('');
    accountingApi.transfers(`?${params.toString()}`)
      .then(response => {
        if (!current) return;
        const records = Array.isArray(response) ? response : response?.data || [];
        setTransfers(records);
        setTotal(Number(response?.total ?? records.length));
        setLastPage(Number(response?.last_page || 1));
      })
      .catch(requestError => current && setError(requestError.message || 'Transfer history could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [filters.date_from, filters.date_to, filters.status, filters.financial_account_id, page]);

  const updateFilter = event => setDraftFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const applyFilters = event => {
    event.preventDefault();
    setPage(1);
    setFilters(draftFilters);
  };
  const clearFilters = () => {
    setDraftFilters(emptyTransferHistoryFilters);
    setFilters(emptyTransferHistoryFilters);
    setPage(1);
  };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const accountMethodGroups = [
    { label: 'Online banking', kinds: ['bank_account'] },
    { label: 'E-wallet', kinds: ['e_wallet'] },
    { label: 'Cash', kinds: ['cash'] },
    { label: 'Cheque', kinds: ['checking_account'] },
  ].map(group => ({
    ...group,
    accounts: accounts
      .filter(account => group.kinds.includes(account.kind))
      .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })),
  }));
  const groupedAccountIds = new Set(accountMethodGroups.flatMap(group => group.accounts.map(account => String(account.id))));
  const otherAccounts = accounts
    .filter(account => !groupedAccountIds.has(String(account.id)))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));

  return <main className="content inner-page transfer-history-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Transfer history</h1><p>Review internal and external money transfers, newest first.</p></div><button type="button" className="primary-button" onClick={onNewTransfer}><Plus size={16}/>New transfer</button></div>
    <section className="panel transfer-history">
      <div className="panel-head"><div><h2>Money transfers</h2><p>Filter by transfer date, posting status, or source/destination account.</p></div><div className="history-head-actions"><span className="transaction-count">{loading ? 'Loading…' : `${total} records`}</span>{activeFilterCount > 0 && <span className="transfer-filter-count">{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}</span>}</div></div>
      <form className="transaction-filters transfer-history-filters" onSubmit={applyFilters}>
        <label>Date from<input name="date_from" type="date" value={draftFilters.date_from} max={draftFilters.date_to || undefined} onChange={updateFilter}/></label>
        <label>Date to<input name="date_to" type="date" value={draftFilters.date_to} min={draftFilters.date_from || undefined} onChange={updateFilter}/></label>
        <label>Status<select name="status" value={draftFilters.status} onChange={updateFilter}><option value="">All statuses</option><option value="draft">Draft</option><option value="posted">Posted</option><option value="voided">Void</option></select></label>
        <label>Payment method / account<select name="financial_account_id" value={draftFilters.financial_account_id} onChange={updateFilter}><option value="">All payment methods and accounts</option>{accountMethodGroups.map(group => group.accounts.length > 0 && <optgroup key={group.label} label={group.label}>{group.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</optgroup>)}{otherAccounts.length > 0 && <optgroup label="Other">{otherAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</optgroup>}</select></label>
        <div className="filter-actions"><button type="button" className="text-button" onClick={clearFilters}>Clear all</button><button type="submit" className="primary-button"><SlidersHorizontal size={15}/>Apply filters</button></div>
      </form>
      {loading && <div className="transaction-state"><RefreshCw className="spin" size={20}/><strong>Loading transfer history…</strong></div>}
      {!loading && error && <div className="transaction-state error-state"><CircleHelp size={20}/><strong>Unable to load transfer history</strong><span>{error}</span></div>}
      {!loading && !error && transfers.length === 0 && <div className="transaction-state"><ArrowLeftRight size={21}/><strong>No transfers found</strong><span>Try a different filter or create a new transfer.</span></div>}
      {!loading && !error && transfers.length > 0 && <div className="transfer-history-table"><div className="transfer-history-row transfer-history-head"><span>Transfer</span><span>Method</span><span>From</span><span>To</span><span>Date</span><span>Status</span><span>Amount</span><span>Details</span></div>{transfers.map(transfer => {
        const external = transfer.destination_type === 'external';
        return <div className="transfer-history-row" key={transfer.id}><span><strong>{transfer.reference || transfer.number}</strong><small>{external ? 'External' : 'Internal'} · {transfer.number}</small></span><span>{humanize(transfer.transfer_method || 'online')}</span><span>{transfer.source_account?.name || '—'}</span><span><strong>{external ? transfer.recipient_name : transfer.destination_account?.name || '—'}</strong>{external && <small>{transfer.external_institution_name || transfer.masked_external_account_number || 'External recipient'}</small>}</span><span>{calendarDate(transfer.transfer_date)}</span><span><em className={`history-status ${transfer.status}`}>{transfer.status === 'voided' ? 'Void' : humanize(transfer.status)}</em></span><span><strong>{money(transfer.amount, transfer.currency || 'PHP')}</strong></span><span><small>{transfer.memo || '—'}</small></span></div>;
      })}</div>}
      {!loading && !error && lastPage > 1 && <div className="transfer-pagination"><button type="button" className="secondary-button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}><ArrowLeft size={15}/>Previous</button><span>Page {page} of {lastPage}</span><button type="button" className="secondary-button" onClick={() => setPage(current => Math.min(lastPage, current + 1))} disabled={page === lastPage}>Next<ChevronRight size={15}/></button></div>}
    </section>
  </main>;
}

function GeneralLedgerPage() {
  return <LiveRecordsPage eyebrow="ACCOUNTING" title="General ledger" description="Review posted journal entries and their source transactions." Icon={BookOpen} columns={['Journal', 'Type', 'Description', 'Entry date', 'Lines', 'Debit total']} loadRecords={loadJournals} emptyMessage="Posted journal entries will appear here." rowValues={journal => [journal.number || journal.reference || `Journal ${journal.id}`, humanize(journal.kind || 'journal entry'), journal.description, journal.entry_date, (journal.lines || []).length, money((journal.lines || []).reduce((sum, line) => sum + Number(line.debit || 0), 0), journal.currency || 'PHP')]}/>;
}

function InterbranchPage() {
  return <LiveRecordsPage eyebrow="ACCOUNTING" title="Interbranch" description="Monitor orders and settlements moving between business branches." Icon={Building2} columns={['Order', 'Source branch', 'Destination branch', 'Date', 'Status', 'Amount']} loadRecords={loadInterbranchOrders} emptyMessage="Interbranch orders will appear here after they are created." rowValues={order => [order.number || order.reference || `Order ${order.id}`, order.source_branch?.name, order.destination_branch?.name, order.order_date, humanize(order.status || 'draft'), money(order.total_amount ?? order.amount, order.currency || 'PHP')]}/>;
}

function UpcomingDuesPage() {
  return <LiveRecordsPage eyebrow="MONEY" title="Upcoming dues" description="Review unpaid obligations and their nearest payment deadlines." Icon={CalendarDays} columns={['Obligation', 'Account or vendor', 'Type', 'Due date', 'Status', 'Amount due']} loadRecords={loadUpcomingDues} emptyMessage="Upcoming card, supplier, and operating obligations will appear here." rowValues={obligation => [obligation.number || obligation.reference || `Obligation ${obligation.id}`, obligation.financial_account?.name || obligation.vendor?.name || obligation.counterparty?.name, humanize(obligation.type || 'obligation'), obligation.due_date, humanize(obligation.status || 'open'), money(obligation.balance_due ?? obligation.outstanding_amount ?? obligation.amount, obligation.currency || 'PHP')]}/>;
}

function ReconciliationPage() {
  const queues = [
    ['Customer receipts', 'Match posted customer payments with source orders.', ArrowDownLeft],
    ['Account balances', 'Compare portal balances with bank, cash, and wallet statements.', RefreshCw],
    ['Credit-card statements', 'Review statement totals, payments, and audited adjustments.', CreditCard],
  ];
  return <main className="content inner-page module-page"><div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Reconciliation</h1><p>Review and resolve differences before closing the accounting period.</p></div></div><section className="summary-strip module-summary"><div><span>Needs review</span><strong className="amber">6</strong></div><div><span>Confirmed today</span><strong>18</strong></div><div><span>Open differences</span><strong>2</strong></div></section><section className="module-card-grid">{queues.map(([name, text, Icon]) => <article className="panel module-card" key={name}><span><Icon size={20}/></span><h2>{name}</h2><p>{text}</p><button className="secondary-button">Open workspace<ChevronRight size={15}/></button></article>)}</section></main>;
}

function ReportsPage() {
  const reports = [
    ['Cash position', 'Balances and availability across all active financial accounts.', WalletCards],
    ['Payment activity', 'Incoming and outgoing payments grouped by period and branch.', BadgeDollarSign],
    ['General ledger', 'Journal activity with debit, credit, and source-document detail.', BookOpen],
    ['Interbranch activity', 'Orders and settlements between branches.', Building2],
  ];
  return <main className="content inner-page module-page"><div className="title-row"><div><p className="eyebrow">ACCOUNTING</p><h1>Reports</h1><p>Open operational and accounting reports from one workspace.</p></div></div><section className="module-card-grid reports-grid">{reports.map(([name, text, Icon]) => <article className="panel module-card" key={name}><span><Icon size={20}/></span><h2>{name}</h2><p>{text}</p><button className="secondary-button"><Download size={15}/>Generate report</button></article>)}</section></main>;
}

function getAccountHolderName(value = {}) {
  const account = value.financial_account || value.financialAccount || value.account || {};
  const userAccount = value.user_account || value.userAccount || account.user_account || account.userAccount || {};
  const legacyHolder = value.cardholder || account.cardholder || account.holder || account.owner || {};
  return userAccount.name
    || userAccount.full_name
    || userAccount.display_name
    || value.account_holder_name
    || value.cardholder_name
    || value.card_holder_name
    || value.holder_name
    || value.owner_name
    || account.account_holder_name
    || account.cardholder_name
    || account.card_holder_name
    || account.holder_name
    || account.owner_name
    || (typeof value.account_holder === 'string' && !/^\d+$/.test(value.account_holder) ? value.account_holder : null)
    || (typeof account.account_holder === 'string' && !/^\d+$/.test(account.account_holder) ? account.account_holder : null)
    || (typeof legacyHolder === 'string' ? legacyHolder : legacyHolder.name || legacyHolder.full_name || legacyHolder.display_name)
    || 'Not provided';
}

function normalizeAccount(account) {
  const rawType = account.type || account.kind || account.account_type || account.category || 'Account';
  const type = String(rawType).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const name = account.name || account.account_name || account.display_name || `Account ${account.id}`;
  const accountNumber = account.account_number_masked
    || account.masked_account_number
    || account.masked_number
    || account.card_number_masked
    || account.account_number
    || account.card_number
    || account.number
    || 'Not provided';
  const isCredit = String(rawType).toLowerCase().includes('credit');
  const currentBalance = Number(account.current_balance ?? account.outstanding_balance ?? account.balance ?? 0);
  const availableBalance = Number(account.available_balance ?? account.available_credit ?? (isCredit && account.credit_limit != null ? Number(account.credit_limit) - currentBalance : currentBalance));
  return {
    ...account,
    id: account.id,
    name,
    holderName: getAccountHolderName(account),
    accountNumber,
    type,
    isCredit,
    balance: currentBalance,
    currentBalance,
    availableBalance,
    creditLimit: account.credit_limit == null ? null : Number(account.credit_limit),
    outstandingBalance: Number(account.outstanding_balance ?? currentBalance),
    availableCredit: isCredit ? availableBalance : null,
    balanceUpdatedAt: account.balance_updated_at || null,
    mask: account.masked_number || account.account_number_masked || account.mask || account.reference || 'Account details',
    initials: (account.initials || name.split(/\s+/).map(part => part[0]).join('').slice(0, 2)).toUpperCase(),
    color: account.color || (isCredit ? '#872f42' : '#234a3b'),
  };
}

function humanize(value = '') {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function balanceUpdatedLabel(value) {
  if (!value) return 'Update time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Update time unavailable';
  return `Updated ${date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}`;
}

async function loadActiveChartAccounts() {
  const accounts = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await accountingApi.chartAccounts(`?page=${page}`);
    const records = Array.isArray(response) ? response : response?.data || [];
    accounts.push(...records);
    lastPage = Array.isArray(response) ? 1 : Number(response?.last_page || 1);
    page += 1;
  } while (page <= lastPage);
  const parentIds = new Set(accounts.map(account => account.parent_id).filter(Boolean).map(String));
  return accounts.filter(account => account.is_active !== false && !parentIds.has(String(account.id)));
}

async function loadEveryPage(requestPage) {
  const records = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const response = await requestPage(page);
    const pageRecords = Array.isArray(response) ? response : response?.data || [];
    records.push(...pageRecords);
    if (Array.isArray(response)) {
      hasMore = false;
      continue;
    }
    const currentPage = Number(response?.current_page || page);
    const lastPage = Number(response?.last_page);
    const perPage = Number(response?.per_page);
    const total = Number(response?.total);
    if (Number.isFinite(lastPage) && lastPage > 0) hasMore = currentPage < lastPage;
    else if (Object.prototype.hasOwnProperty.call(response || {}, 'next_page_url')) hasMore = Boolean(response.next_page_url);
    else if (Number.isFinite(total) && Number.isFinite(perPage) && perPage > 0) hasMore = currentPage * perPage < total;
    else hasMore = false;
    page = currentPage + 1;
  }
  return records;
}

const apiRecords = response => Array.isArray(response) ? response : response?.data || [];

async function loadFinancialInstitutions(params = '') {
  const response = await accountingApi.financialInstitutions(params);
  return apiRecords(response);
}

function adjustmentLedgerAccounts(accounts) {
  const findNamed = pattern => accounts.find(account => pattern.test(account.name || ''));
  const ownerEquity = findNamed(/\b(owner(?:'s)? equity|capital)\b/i);
  const generalExpense = findNamed(/\bgeneral expense\b/i);
  const existingBalance = findNamed(/\b(opening balance|beginning balance|prior period|historical balance|balance forward|brought forward)\b/i) || ownerEquity;
  const feeAccount = findNamed(/\b(fee|fees|charge|charges)\b/i) || generalExpense;
  const interestAccount = findNamed(/\b(interest|finance charge|finance charges|finance cost|finance costs)\b/i) || generalExpense;

  return [
    existingBalance && { ...existingBalance, choiceKey: `${existingBalance.id}:existing`, purpose: 'Existing dues', choiceLabel: `Existing dues — ${existingBalance.name}` },
    feeAccount && { ...feeAccount, choiceKey: `${feeAccount.id}:fees`, purpose: 'Fees and charges', choiceLabel: `Fees and charges — ${feeAccount.name}` },
    interestAccount && { ...interestAccount, choiceKey: `${interestAccount.id}:interest`, purpose: 'Interest', choiceLabel: `Interest — ${interestAccount.name}` },
  ].filter(Boolean);
}

function transactionParty(item) {
  const details = item.transaction || {};
  if (details.counterparty?.name) return details.counterparty.name;
  if (details.source_account || details.destination_account) {
    return [details.source_account?.name, details.destination_account?.name].filter(Boolean).join(' → ');
  }
  return details.destination_account?.name || details.adjustment_account?.name || '—';
}

function transactionMethod(item) {
  const details = item.transaction || {};
  return details.payment_method?.name || details.reference || item.branch?.name || 'Journal entry';
}

function paymentLineConfirmation(item) {
  const details = item.transaction || {};
  const line = details.payment_line || details.paymentLine;
  const canUpdate = Boolean(line?.id) && details.payment?.status === 'posted';
  if (!details.payment && !line) return { state: 'na', label: '—' };
  if (!line) return { state: 'unknown', label: 'Unavailable' };
  const confirmedAt = line.confirmed_at || null;
  const confirmed = line.confirmed ?? line.is_confirmed ?? Boolean(confirmedAt);
  if (!confirmed && !canUpdate) return { state: 'na', label: '—', lineId: line.id, canUpdate: false };
  if (!confirmed) return { state: 'pending', label: 'Not confirmed', lineId: line.id, canUpdate: true, confirmed: false };
  const confirmedBy = line.confirmed_by?.name || line.confirmed_by_name || null;
  return { state: 'confirmed', label: 'Confirmed', confirmedAt, confirmedBy, lineId: line.id, canUpdate, confirmed: true };
}

const emptyTransactionFilters = { branch_id: '', date_from: '', date_to: '', debit: '', credit: '', status: '', event: '', sort: 'latest' };

const financialAccountKinds = [
  ['cash', 'Cash'],
  ['bank_account', 'Bank account'],
  ['checking_account', 'Checking account'],
  ['e_wallet', 'E-wallet'],
  ['credit_card', 'Credit card'],
];

function financialApplicationUsage(application = {}) {
  const key = `${application.code || ''} ${application.name || ''}`.toLowerCase().replaceAll(/[^a-z0-9]+/g, ' ');
  if (key.includes('balance adjustment')) return 'adjustment';
  if (key.includes('interbranch') || key.includes('account transfer')) return 'both';
  if (key.includes('customer receipt') || key.includes('end of day settlement')) return 'receipt';
  if (key.includes('purchase order') || key.includes('expense payment') || key.includes('obligation payment') || key.includes('direct payment')) return 'payment';
  return 'either';
}

function canUseFinancialApplication(application, form) {
  if (!form.kind) return false;
  const usage = financialApplicationUsage(application);
  if (form.kind === 'credit_card') {
    if (usage === 'adjustment') return true;
    if (usage === 'payment') return form.usable_for_payments;
    return false;
  }
  if (usage === 'receipt') return form.usable_for_receipts;
  if (usage === 'payment') return form.usable_for_payments;
  if (usage === 'both') return form.usable_for_receipts && form.usable_for_payments;
  return form.usable_for_receipts || form.usable_for_payments;
}

function financialAccountForm(account, applicationTypes = []) {
  const kind = account.kind || '';
  const applicationValues = (account.application_ids || account.applications || []).map(item => {
    if (typeof item === 'number' || (typeof item === 'string' && /^\d+$/.test(item))) return String(item);
    if (item?.application_id != null) return String(item.application_id);
    const code = typeof item === 'string' ? item : item?.application || item?.type?.code;
    const type = applicationTypes.find(applicationType => applicationType.code === code);
    return type ? String(type.id) : null;
  }).filter(Boolean);
  const accessibleBranches = account.accessible_branches || account.accessibleBranches || [];
  const branchIds = Array.isArray(account.branch_ids) ? account.branch_ids : accessibleBranches.map(branch => branch.id);
  const form = {
    name: account.name || '',
    account_number: '',
    account_holder: account.account_holder == null ? '' : String(account.account_holder),
    description: account.description || '',
    kind,
    financial_institution_id: account.financial_institution_id == null ? '' : String(account.financial_institution_id),
    chart_account_id: account.chart_account_id == null ? '' : String(account.chart_account_id),
    currency: account.currency || 'PHP',
    credit_limit: account.credit_limit == null ? '' : String(account.credit_limit),
    statement_day: account.statement_day == null ? '' : String(account.statement_day),
    due_day: account.due_day == null ? '' : String(account.due_day),
    usable_for_receipts: kind === 'credit_card' ? false : account.usable_for_receipts !== false,
    usable_for_payments: kind === 'credit_card' ? true : account.usable_for_payments !== false,
    is_active: account.is_active !== false,
    applications: applicationValues,
    branch_ids: branchIds.map(String),
  };
  return {
    ...form,
    applications: form.applications.filter(value => {
      const application = applicationTypes.find(type => String(type.id) === value);
      return application && canUseFinancialApplication(application, form);
    }),
  };
}

function transactionQuery(filters, page = null) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && !(key === 'sort' && value === 'latest')) params.set(key, value);
  });
  if (page) params.set('page', page);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function matchPaymentMethodKinds(type) {
  return {
    cash: ['cash'],
    bank_transfer: ['bank_account', 'checking_account'],
    cheque: ['checking_account'],
    credit_card: ['credit_card'],
    e_wallet: ['e_wallet'],
  }[type] || [];
}

function AccountsPage({ onSelectAccount, onAddAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [accountChoices, setAccountChoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [accountFilter, setAccountFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authVersion, setAuthVersion] = useState(0);

  useEffect(() => {
    let current = true;
    Promise.all([
      accountingApi.paymentMethods(),
      loadEveryPage(page => accountingApi.financialAccounts(`?page=${page}`)),
    ])
      .then(([response, financialAccountRecords]) => {
        if (!current) return;
        const records = Array.isArray(response) ? response : response?.data || [];
        const preferredOrder = ['cash', 'online_transfer', 'e_wallet', 'cheque', 'credit_card', 'interbranch_settlement'];
        const methodKey = method => String(method.code || method.slug || method.name || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        setPaymentMethods(records
          .filter(method => method.is_active !== false)
          .sort((left, right) => {
            const leftRank = preferredOrder.indexOf(methodKey(left));
            const rightRank = preferredOrder.indexOf(methodKey(right));
            if (leftRank !== rightRank) return (leftRank < 0 ? preferredOrder.length : leftRank) - (rightRank < 0 ? preferredOrder.length : rightRank);
            return String(left.name || '').localeCompare(String(right.name || ''), 'en', { sensitivity: 'base' });
          }));
        setAccountChoices(financialAccountRecords.map(normalizeAccount));
      })
      .catch(() => {
        if (!current) return;
        setPaymentMethods([]);
        setAccountChoices([]);
      });
    return () => { current = false; };
  }, [authVersion]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    const [filterType, filterId] = accountFilter.split(':');
    const request = filterType === 'account' && filterId
      ? accountingApi.financialAccount(filterId).then(response => [response?.data || response])
      : loadEveryPage(page => {
        const params = new URLSearchParams({ page: String(page) });
        if (filterType === 'method' && filterId) params.set('payment_method_id', filterId);
        return accountingApi.financialAccounts(`?${params.toString()}`);
      });
    request
      .then(records => {
        if (!current) return;
        setAccounts(records.filter(Boolean).map(normalizeAccount));
      })
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [authVersion, accountFilter]);

  const savingsTotal = accounts.filter(account => !account.isCredit).reduce((sum, account) => sum + account.balance, 0);
  const creditLimitTotal = accounts.filter(account => account.isCredit).reduce((sum, account) => sum + (account.creditLimit || 0), 0);
  const sortedAccounts = [...accounts].sort((left, right) => right.currentBalance - left.currentBalance
    || left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
  const compatibleKinds = method => matchPaymentMethodKinds(method.type);
  const accountGroups = paymentMethods.map(method => ({
    method,
    accounts: accountChoices.filter(account => compatibleKinds(method).includes(account.kind)),
  }));
  const groupedAccountIds = new Set(accountGroups.flatMap(group => group.accounts.map(account => String(account.id))));
  const otherAccountChoices = accountChoices.filter(account => !groupedAccountIds.has(String(account.id)));

  return <main className="content inner-page">
    <div className="title-row"><div><p className="eyebrow">MONEY</p><h1>Financial accounts</h1><p>One source of truth for bank, cash, e-wallet, and credit accounts.</p></div><button className="secondary-button" onClick={onAddAccount}><Plus size={17}/>Add account</button></div>
    <section className="account-filter" aria-label="Financial account filters">
      <label htmlFor="payment-method-filter"><SlidersHorizontal size={16}/><span>Payment method</span></label>
      <div className="filter-select-wrap"><select id="payment-method-filter" value={accountFilter} onChange={event => setAccountFilter(event.target.value)}><option value="">All payment methods and accounts</option>{accountGroups.map(({ method, accounts: methodAccounts }) => <optgroup key={method.id} label={method.name}><option value={`method:${method.id}`}>All {method.name} accounts</option>{methodAccounts.map(account => <option key={`${method.id}-${account.id}`} value={`account:${account.id}`}>{account.name}</option>)}</optgroup>)}{otherAccountChoices.length > 0 && <optgroup label="Other accounts">{otherAccountChoices.map(account => <option key={account.id} value={`account:${account.id}`}>{account.name}</option>)}</optgroup>}</select><ChevronDown size={15}/></div>
    </section>
    {!loading && !error && accounts.length > 0 && <section className="account-summary">
      <div><span>Current savings</span><strong>{peso.format(savingsTotal)}</strong><small>Across {accounts.filter(account => !account.isCredit).length} cash accounts</small></div>
      <div><span>Total credit limit</span><strong>{peso.format(creditLimitTotal)}</strong><small>Across {accounts.filter(account => account.isCredit).length} credit accounts</small></div>
    </section>}
    {loading && <section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading financial accounts…</h2><p>Fetching your latest posted balances.</p></section>}
    {!loading && error && <section className="panel account-state error-state"><CircleHelp size={24}/><h2>Financial accounts could not be loaded</h2><p>{error.status === 401 ? 'Your accounting API session is not authorized. Please ask an administrator to check the shared authentication setup.' : error.message || 'Could not load financial accounts.'}</p><button className="secondary-button" onClick={() => setAuthVersion(version => version + 1)}><RefreshCw size={16}/>Try again</button></section>}
    {!loading && !error && accounts.length === 0 && <section className="panel account-state"><Landmark size={24}/><h2>No financial accounts yet</h2><p>Add an account to start tracking current balances and credit limits.</p></section>}
    {!loading && !error && accounts.length > 0 && <section className="account-cards account-list-page">{sortedAccounts.map(a => <button key={a.id} className="big-account-card" onClick={() => onSelectAccount(a.id)}><span className="account-logo large" style={{background:a.color}}>{a.initials}</span><span><small>{a.type}</small><strong>{a.name}</strong><em className="financial-account-holder">Account holder name: <b>{a.holderName}</b></em><em className="financial-account-number">Account number: <b>{a.accountNumber}</b></em></span><span className="card-balance"><small>{a.isCredit ? 'Outstanding balance' : 'Current balance'}</small><strong className={!a.isCredit && a.balance < 0 ? 'red' : ''}>{peso.format(a.currentBalance)}</strong>{a.isCredit && <em>Available {peso.format(a.availableBalance)}</em>}<em className="balance-updated">{balanceUpdatedLabel(a.balanceUpdatedAt)}</em></span><ChevronRight size={18}/></button>)}</section>}
  </main>;
}

function AccountTransactionsPage({ accountId, onBack, onAdjust, onEdit }) {
  const [account, setAccount] = useState(null);
  const [branches, setBranches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionMeta, setTransactionMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmationError, setConfirmationError] = useState('');
  const [updatingConfirmationId, setUpdatingConfirmationId] = useState(null);
  const [confirmationDialog, setConfirmationDialog] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyTransactionFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyTransactionFilters);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    Promise.all([accountingApi.financialAccount(accountId), accountingApi.branches('?active=1').catch(() => ({ data: [] }))])
      .then(([accountResponse, branchResponse]) => {
        if (!current) return;
        setAccount(normalizeAccount(accountResponse?.data || accountResponse));
        setBranches(Array.isArray(branchResponse) ? branchResponse : branchResponse?.data || []);
      })
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [accountId]);

  useEffect(() => {
    let current = true;
    setTransactionsLoading(true);
    setTransactions([]);
    setTransactionMeta(null);
    setError(null);
    accountingApi.accountTransactions(accountId, transactionQuery(appliedFilters))
      .then(response => {
        if (!current) return;
        setTransactions(Array.isArray(response) ? response : response?.data || []);
        setTransactionMeta(Array.isArray(response) ? null : response);
      })
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setTransactionsLoading(false));
    return () => { current = false; };
  }, [accountId, appliedFilters]);

  const loadMore = async () => {
    if (!transactionMeta?.next_page_url) return;
    setLoadingMore(true);
    try {
      const page = Number(transactionMeta.current_page || 1) + 1;
      const response = await accountingApi.accountTransactions(accountId, transactionQuery(appliedFilters, page));
      setTransactions(current => [...current, ...(response?.data || [])]);
      setTransactionMeta(response);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoadingMore(false);
    }
  };

  const updateFilter = event => setDraftFilters(filters => ({ ...filters, [event.target.name]: event.target.value }));
  const applyFilters = event => {
    event.preventDefault();
    setAppliedFilters({ ...draftFilters });
  };
  const clearFilters = () => {
    setDraftFilters(emptyTransactionFilters);
    setAppliedFilters(emptyTransactionFilters);
  };
  const activeFilterCount = Object.entries(appliedFilters).filter(([key, value]) => value !== '' && !(key === 'sort' && value === 'latest')).length;
  const totalDebit = Number(transactionMeta?.summary?.total_debit ?? transactions.reduce((sum, item) => sum + Number(item.debit || 0), 0));
  const totalCredit = Number(transactionMeta?.summary?.total_credit ?? transactions.reduce((sum, item) => sum + Number(item.credit || 0), 0));

  const updateConfirmation = async event => {
    event.preventDefault();
    const confirmation = confirmationDialog;
    if (!confirmation?.canUpdate || !confirmation.lineId) return;
    setUpdatingConfirmationId(confirmation.lineId);
    setConfirmationError('');
    try {
      const updatedLine = await accountingApi.updatePaymentLineConfirmation(confirmation.lineId, confirmation.nextConfirmed);
      setTransactions(current => current.map(item => {
        const line = item.transaction?.payment_line || item.transaction?.paymentLine;
        if (String(line?.id) !== String(confirmation.lineId)) return item;
        return {
          ...item,
          transaction: {
            ...item.transaction,
            payment_line: {
              ...line,
              confirmed: Boolean(updatedLine.confirmed_at),
              confirmed_at: updatedLine.confirmed_at,
              confirmed_by: updatedLine.confirmed_by || null,
            },
          },
        };
      }));
      setConfirmationDialog(null);
    } catch (requestError) {
      setConfirmationError(requestError.message || 'Confirmation could not be updated.');
    } finally {
      setUpdatingConfirmationId(null);
    }
  };

  if (loading) return <main className="content inner-page"><section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading account transactions…</h2><p>Fetching the account and its complete journal history.</p></section></main>;
  if (error && !account) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Financial accounts</button><section className="panel account-state error-state"><CircleHelp size={24}/><h2>Account history could not be loaded</h2><p>{error.message || 'Please try again.'}</p></section></main>;

  return <main className="content inner-page account-transactions-page">
    <button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Financial accounts</button>
    <div className="title-row account-history-title"><div><p className="eyebrow">ACCOUNT PASSBOOK</p><h1>{account.name}</h1><p>{account.type}</p><p className="account-history-holder">Account holder name: <strong>{account.holderName}</strong></p><p className="account-history-number">Account number: <strong>{account.accountNumber}</strong></p></div><div className="account-history-actions"><button className="secondary-button" onClick={onEdit}><Pencil size={15}/>Edit details</button><button className="secondary-button" onClick={onAdjust}><SlidersHorizontal size={15}/>{account.isCredit ? 'Adjust amount due' : 'Adjust balance'}</button><span className="account-logo history-logo" style={{background:account.color}}>{account.initials}</span></div></div>
    <section className="account-history-summary">
      <div><span>{account.isCredit ? 'Outstanding balance' : 'Current balance'}</span><strong className={!account.isCredit && account.currentBalance < 0 ? 'red' : ''}>{peso.format(account.currentBalance)}</strong></div>
      <div><span>{account.isCredit ? 'Available credit' : 'Available balance'}</span><strong>{peso.format(account.availableBalance)}</strong></div>
      <div><span>Total transactions</span><strong>{transactionMeta?.total ?? transactions.length}</strong></div>
      <div className="debit-total"><span>Total debit</span><strong>{peso.format(totalDebit)}</strong></div>
      <div className="credit-total"><span>Total credit</span><strong>{peso.format(totalCredit)}</strong></div>
      <div><span>Account status</span><strong>Active</strong></div>
      {account.isCredit && <div><span>Credit limit</span><strong>{peso.format(account.creditLimit ?? 0)}</strong></div>}
      <div><span>Balance snapshot</span><strong className="snapshot-time">{balanceUpdatedLabel(account.balanceUpdatedAt)}</strong></div>
    </section>
    <section className="panel transaction-history">
      <div className="panel-head"><div><h2>All transactions</h2><p>Every debit and credit from payments, orders, expenses, transfers, refunds, settlements, and adjustments</p></div><div className="history-head-actions"><span className="transaction-count">{transactionMeta?.total ?? transactions.length} records</span><button className={`filter-toggle ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={15}/>Filters{activeFilterCount > 0 && <em>{activeFilterCount}</em>}<ChevronDown size={14}/></button></div></div>
      {filtersOpen && <form className="transaction-filters" onSubmit={applyFilters}>
        <label>Branch<select name="branch_id" value={draftFilters.branch_id} onChange={updateFilter}><option value="">All branches</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Date from<input name="date_from" type="date" value={draftFilters.date_from} max={draftFilters.date_to || undefined} onChange={updateFilter}/></label>
        <label>Date to<input name="date_to" type="date" value={draftFilters.date_to} min={draftFilters.date_from || undefined} onChange={updateFilter}/></label>
        <label>Debit amount<input name="debit" type="number" min="0" step="0.0001" placeholder="Any amount" value={draftFilters.debit} onChange={updateFilter}/></label>
        <label>Credit amount<input name="credit" type="number" min="0" step="0.0001" placeholder="Any amount" value={draftFilters.credit} onChange={updateFilter}/></label>
        <label>Status<select name="status" value={draftFilters.status} onChange={updateFilter}><option value="">All statuses</option><option value="posted">Posted</option><option value="voided">Voided</option></select></label>
        <label>Event<select name="event" value={draftFilters.event} onChange={updateFilter}><option value="">Debit & credit</option><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option></select></label>
        <label>Sort by<select name="sort" value={draftFilters.sort} onChange={updateFilter}><option value="latest">Latest first</option><option value="oldest">Oldest first</option></select></label>
        <div className="filter-actions"><button type="button" className="text-button" onClick={clearFilters}>Clear all</button><button type="submit" className="primary-button"><SlidersHorizontal size={15}/>Apply filters</button></div>
      </form>}
      {confirmationError && <div className="confirmation-error"><CircleHelp size={15}/><span>{confirmationError}</span><button onClick={() => setConfirmationError('')} aria-label="Dismiss"><X size={14}/></button></div>}
      {transactionsLoading && <div className="transaction-state"><RefreshCw className="spin" size={20}/><span>Filtering transactions…</span></div>}
      {!transactionsLoading && transactions.length === 0 && !error && <div className="transaction-state"><ReceiptText size={21}/><strong>No transactions found</strong><span>Try clearing the filters or choose a different date range.</span></div>}
      {!transactionsLoading && transactions.length > 0 && <div className="transaction-table"><div className="transaction-row transaction-head"><span>Date</span><span>Transaction</span><span>Party / method</span><span>Status</span><span>Event</span><span>Confirmed</span><span>Debit</span><span>Credit</span><span>Balance effect</span></div>{transactions.map(item => {
        const details = item.transaction || {};
        const sourceNumber = details.source_number || item.journal_number;
        const paymentNumber = details.payment?.number;
        const effect = Number(item.balance_effect || 0);
        const event = item.event || (Number(item.debit || 0) > 0 ? 'DEBIT' : 'CREDIT');
        const confirmation = paymentLineConfirmation(item);
        const isUpdating = String(updatingConfirmationId) === String(confirmation.lineId);
        return <div className="transaction-row" key={item.id}><span className="transaction-date">{item.entry_date || '—'}<small>{item.branch?.name || ''}</small></span><span className="transaction-source"><strong>{humanize(details.source_type || item.movement_type)}</strong><small>{sourceNumber || '—'}{paymentNumber && paymentNumber !== sourceNumber ? ` · ${paymentNumber}` : ''}</small><em>{item.description || details.reference || ''}</em></span><span className="transaction-party"><strong>{transactionParty(item)}</strong><small>{transactionMethod(item)}</small></span><span><span className={`history-status ${(details.source_status || details.payment?.status || '').toLowerCase()}`}>{humanize(details.source_status || details.payment?.status || 'Recorded')}</span></span><span><span className={`event-badge ${event.toLowerCase()}`}>{event}</span></span><span className="confirmation-cell">{confirmation.canUpdate ? <button className={`confirmation-badge confirmation-action ${confirmation.state}`} disabled={isUpdating} aria-pressed={confirmation.confirmed} onClick={() => setConfirmationDialog({ ...confirmation, nextConfirmed: confirmation.confirmed, paymentNumber, sourceNumber })} title="Update payment confirmation">{isUpdating ? 'Updating…' : confirmation.label}</button> : <span className={`confirmation-badge ${confirmation.state}`}>{confirmation.label}</span>}{confirmation.confirmedAt && <small>{new Date(confirmation.confirmedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</small>}{confirmation.confirmedBy && <small>{confirmation.confirmedBy}</small>}</span><span>{Number(item.debit || 0) ? peso.format(Number(item.debit)) : '—'}</span><span>{Number(item.credit || 0) ? peso.format(Number(item.credit)) : '—'}</span><span className={effect >= 0 ? 'green' : 'red'}><strong>{effect >= 0 ? '+' : '−'}{peso.format(Math.abs(effect))}</strong><small>{humanize(item.direction)}</small></span></div>;
      })}</div>}
      {error && <p className="transaction-inline-error">{error.message}</p>}
      {transactionMeta?.next_page_url && <div className="transaction-more"><button className="secondary-button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more transactions'}</button></div>}
    </section>
    {confirmationDialog && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !updatingConfirmationId && setConfirmationDialog(null)}><form className="modal confirmation-modal" onSubmit={updateConfirmation}><div className="modal-head"><div><p className="eyebrow">PAYMENT LINE</p><h2>Update confirmation</h2></div><button type="button" className="icon-button" onClick={() => setConfirmationDialog(null)} disabled={Boolean(updatingConfirmationId)}><X size={19}/></button></div><p className="confirmation-reference">{confirmationDialog.sourceNumber || 'Payment'}{confirmationDialog.paymentNumber ? ` · ${confirmationDialog.paymentNumber}` : ''}</p><label className="confirmation-check"><input type="checkbox" checked={confirmationDialog.nextConfirmed} onChange={event => setConfirmationDialog(dialog => ({ ...dialog, nextConfirmed: event.target.checked }))}/><span><strong>Payment confirmed</strong><small>Record this payment line as reviewed and confirmed.</small></span></label><div className="modal-actions"><button type="button" className="text-button" onClick={() => setConfirmationDialog(null)} disabled={Boolean(updatingConfirmationId)}>Cancel</button><button type="submit" className="primary-button" disabled={Boolean(updatingConfirmationId)}>{updatingConfirmationId ? 'Saving…' : 'Submit'}</button></div></form></div>}
  </main>;
}

function FinancialAccountEditPage({ accountId, onBack, onSaved }) {
  const isCreate = accountId == null;
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [applicationTypes, setApplicationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let current = true;
    setLoading(true);
    Promise.all([
      isCreate ? Promise.resolve(null) : accountingApi.financialAccount(accountId),
      loadFinancialInstitutions(),
      loadActiveChartAccounts(),
      loadEveryPage(page => accountingApi.branches(`?active=1&page=${page}`)),
      loadEveryPage(page => accountingApi.userAccounts(`?active=1&per_page=100&page=${page}`)),
      accountingApi.financialAccountApplicationTypes(),
    ]).then(([accountResponse, institutionResponse, ledgerResponse, branchResponse, userAccountResponse, applicationTypeResponse]) => {
      if (!current) return;
      const record = accountResponse?.data || accountResponse || {};
      const typeRecords = Array.isArray(applicationTypeResponse) ? applicationTypeResponse : applicationTypeResponse?.data || [];
      setAccount(record);
      setForm(financialAccountForm(record, typeRecords));
      setInstitutions(institutionResponse);
      setChartAccounts(ledgerResponse);
      setBranches(branchResponse);
      setUserAccounts([...userAccountResponse].sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'en', { sensitivity: 'base' })));
      setApplicationTypes(typeRecords);
    }).catch(requestError => current && setError(requestError.message || 'Account settings could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [accountId, isCreate]);

  const update = event => {
    const { name, value, type, checked } = event.target;
    setFieldErrors(errors => ({ ...errors, [name]: undefined }));
    setForm(current => {
      const next = {
        ...current,
        [name]: type === 'checkbox' ? checked : value,
        ...(name === 'kind' && value === 'credit_card' ? { usable_for_receipts: false, usable_for_payments: true } : {}),
      };
      return {
        ...next,
        applications: next.applications.filter(applicationId => {
          const application = applicationTypes.find(item => String(item.id) === applicationId);
          return application && canUseFinancialApplication(application, next);
        }),
      };
    });
  };
  const toggleApplication = value => setForm(current => ({
    ...current,
    applications: current.applications.includes(value)
      ? current.applications.filter(application => application !== value)
      : [...current.applications, value],
  }));
  const toggleBranch = value => setForm(current => ({
    ...current,
    branch_ids: current.branch_ids.includes(value)
      ? current.branch_ids.filter(branchId => branchId !== value)
      : [...current.branch_ids, value],
  }));

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    const creditCard = form.kind === 'credit_card';
    const cash = form.kind === 'cash';
    const payload = {
      name: form.name.trim(),
      account_holder: form.account_holder ? Number(form.account_holder) : null,
      description: form.description.trim() || null,
      kind: form.kind,
      financial_institution_id: cash ? null : Number(form.financial_institution_id),
      chart_account_id: Number(form.chart_account_id),
      currency: form.currency.trim().toUpperCase(),
      credit_limit: creditCard ? Number(form.credit_limit) : null,
      statement_day: creditCard ? Number(form.statement_day) : null,
      due_day: creditCard ? Number(form.due_day) : null,
      usable_for_receipts: creditCard ? false : form.usable_for_receipts,
      usable_for_payments: form.usable_for_payments,
      is_active: form.is_active,
      application_ids: form.applications.filter(applicationId => {
        const application = applicationTypes.find(item => String(item.id) === applicationId);
        return application && canUseFinancialApplication(application, { ...form, usable_for_receipts: creditCard ? false : form.usable_for_receipts });
      }).map(Number),
      is_company_wide: false,
      owner_branch_id: null,
      branch_ids: form.branch_ids.map(Number),
    };
    if (form.account_number.trim()) payload.account_number = form.account_number.trim();
    try {
      const updated = isCreate
        ? await accountingApi.createFinancialAccount(payload)
        : await accountingApi.updateFinancialAccount(accountId, payload);
      onSaved(updated?.data?.id || updated?.id || accountId);
    } catch (requestError) {
      setFieldErrors(requestError.details || {});
      setError(requestError.message || 'The account could not be updated.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const issue = name => fieldErrors[name] && <small className="account-field-error">{[].concat(fieldErrors[name])[0]}</small>;
  if (loading) return <main className="content inner-page"><section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading account settings…</h2><p>Preparing financial account initialization details.</p></section></main>;
  if (!form) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Account details</button><section className="panel account-state error-state"><CircleHelp size={24}/><h2>Account settings could not be loaded</h2><p>{error}</p></section></main>;

  const maskedNumber = account.masked_account_number || account.account_number_masked || 'No number saved';
  const isCreditCard = form.kind === 'credit_card';
  const isCash = form.kind === 'cash';
  const canSubmit = form.name.trim() && form.chart_account_id && form.currency.trim().length === 3
    && form.kind
    && (isCash || (form.financial_institution_id && (!isCreate || form.account_number.trim())))
    && (!isCreditCard || (form.credit_limit !== '' && form.statement_day && form.due_day))
    && form.branch_ids.length > 0;

  return <main className="content inner-page account-edit-page">
    <button className="back-button" onClick={onBack}><ArrowLeft size={16}/>{isCreate ? 'Financial accounts' : 'Account details'}</button>
    <div className="title-row"><div><p className="eyebrow">ACCOUNT SETUP</p><h1>{isCreate ? 'Create financial account' : 'Edit financial account'}</h1><p>{isCreate ? 'Initialize a financial account and choose which branches can use it.' : `Update identity, accounting, access, and transaction settings for ${account.name}.`}</p></div><span className={`edit-status-pill ${form.is_active ? 'active' : 'inactive'}`}>{form.is_active ? 'Active account' : 'Inactive account'}</span></div>
    {error && <div className="account-save-message error" role="alert"><CircleHelp size={18}/><span><strong>We couldn’t save these changes</strong>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15}/></button></div>}
    <form className="account-edit-layout" onSubmit={submit}>
      <div className="account-edit-sections">
        <section className="panel account-edit-section">
          <div className="account-edit-heading"><span><Landmark size={19}/></span><div><h2>Account identity</h2><p>The name and banking details employees see when selecting this account.</p></div></div>
          <div className="account-form-grid">
            <label className="span-2">Account name<input name="name" value={form.name} onChange={update} maxLength="255" placeholder="e.g. BDO Payroll Account" required/>{issue('name')}</label>
            <label>Account type<select name="kind" value={form.kind} onChange={update} required><option value="">Select account type</option>{financialAccountKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{issue('kind')}</label>
            <label>Currency<input name="currency" value={form.currency} maxLength="3" placeholder="PHP" disabled required/>{issue('currency')}</label>
            <label>Financial institution<select name="financial_institution_id" value={form.financial_institution_id} onChange={update} disabled={isCash} required={!isCash}><option value="">{isCash ? 'Not required for cash' : 'Select institution'}</option>{institutions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{issue('financial_institution_id')}</label>
            <label>Account holder<select name="account_holder" value={form.account_holder} onChange={update}><option value="">No account holder</option>{userAccounts.map(item => <option key={item.id} value={item.id}>{item.name}{item.code ? ` — ${item.code}` : ''}</option>)}</select><small className="account-field-help">Only active user accounts can be assigned.</small>{issue('account_holder')}</label>
            <label className="span-2">Account number<input name="account_number" value={form.account_number} onChange={update} maxLength="100" placeholder={isCreate ? (isCash ? 'Optional for cash accounts' : 'Enter account number') : `Current: ${maskedNumber}`} required={isCreate && !isCash}/>{!isCreate && <small className="account-field-help">Leave blank to keep the encrypted account number. Enter a new value only when replacing it.</small>}{issue('account_number')}</label>
            <label className="span-2">Description<textarea name="description" value={form.description} onChange={update} maxLength="255" rows="3" placeholder="What this account is used for"/>{issue('description')}</label>
          </div>
        </section>

        <section className="panel account-edit-section">
          <div className="account-edit-heading"><span><BookOpen size={19}/></span><div><h2>Accounting configuration</h2><p>Connect the operational account to its unique general-ledger control account.</p></div></div>
          <div className="account-form-grid">
            <label className="span-2">Ledger account<select name="chart_account_id" value={form.chart_account_id} onChange={update} required><option value="">Select a leaf ledger account</option>{chartAccounts.map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} — ` : ''}{item.name} ({humanize(item.type)})</option>)}</select>{issue('chart_account_id')}</label>
            {isCreditCard && <>
              <label>Credit limit<input name="credit_limit" type="number" min="0" step="0.01" value={form.credit_limit} onChange={update} placeholder="0.00" required/>{issue('credit_limit')}</label>
              <label>Statement day<input name="statement_day" type="number" min="1" max="31" value={form.statement_day} onChange={update} required/>{issue('statement_day')}</label>
              <label>Due day<input name="due_day" type="number" min="1" max="31" value={form.due_day} onChange={update} required/>{issue('due_day')}</label>
            </>}
          </div>
        </section>

        <section className="panel account-edit-section">
          <div className="account-edit-heading"><span><Globe2 size={19}/></span><div><h2>Branches with access</h2><p>Select the branches whose employees can use this account.</p></div></div>
          <fieldset className="branch-access-settings"><legend>Select at least one branch</legend><div className="choice-grid">{branches.map(branch => <label key={branch.id} className={form.branch_ids.includes(String(branch.id)) ? 'checked' : ''}><input type="checkbox" checked={form.branch_ids.includes(String(branch.id))} onChange={() => toggleBranch(String(branch.id))}/><span><strong>{branch.name}</strong><small>{branch.code || 'Branch'}</small></span><Check size={15}/></label>)}</div>{issue('branch_ids')}</fieldset>
        </section>

        <section className="panel account-edit-section">
          <div className="account-edit-heading"><span><Zap size={19}/></span><div><h2>Usage and applications</h2><p>Control the workflows where employees can select this account.</p></div></div>
          {!form.kind && <p className="usage-prerequisite">Select an account type before configuring usage and applications.</p>}
          {form.kind && !form.usable_for_receipts && !form.usable_for_payments && <p className="usage-prerequisite">Enable Receive money or Send money to choose allowed applications.</p>}
          <div className="account-toggle-row"><label className={!form.kind || isCreditCard ? 'disabled' : ''}><input type="checkbox" name="usable_for_receipts" checked={form.usable_for_receipts} onChange={update} disabled={!form.kind || isCreditCard}/><span><strong>Receive money</strong><small>{!form.kind ? 'Select an account type first' : isCreditCard ? 'Credit cards cannot receive money' : 'Show this account in receipt workflows'}</small></span></label><label className={!form.kind ? 'disabled' : ''}><input type="checkbox" name="usable_for_payments" checked={form.usable_for_payments} onChange={update} disabled={!form.kind}/><span><strong>{isCreditCard ? 'Use for payments/purchases' : 'Send money'}</strong><small>{!form.kind ? 'Select an account type first' : isCreditCard ? 'Use this card for purchase orders and expenses' : 'Show this account in outgoing payment workflows'}</small></span></label></div>
          <fieldset className="application-settings"><legend>Allowed applications</legend><p>No selection means the backend treats the account as unrestricted. Select applications to limit it to exact workflows.</p><div className="choice-grid application-grid">{applicationTypes.map(application => { const value = String(application.id); const available = canUseFinancialApplication(application, form); return <label key={value} className={`${form.applications.includes(value) ? 'checked' : ''}${!available ? ' disabled' : ''}`}><input type="checkbox" checked={form.applications.includes(value)} onChange={() => toggleApplication(value)} disabled={!available}/><span><strong>{application.name}</strong><small>{application.description || humanize(application.code)}</small></span><Check size={15}/></label>; })}</div>{issue('application_ids')}</fieldset>
        </section>
      </div>

      <aside className="panel account-edit-sidebar">
        <div className="account-edit-preview"><span className="account-logo history-logo" style={{background: normalizeAccount({...account, name: form.name, kind: form.kind}).color}}>{(form.name || 'Account').split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase()}</span><div><small>FINANCIAL ACCOUNT</small><strong>{form.name || 'Unnamed account'}</strong><span>{humanize(form.kind)} · {form.currency.toUpperCase()}</span></div></div>
        <div className="edit-review-list"><span>Account number<strong>{form.account_number ? (isCreate ? 'Ready to encrypt' : 'New number entered') : maskedNumber}</strong></span><span>Branch access<strong>{form.branch_ids.length} branch{form.branch_ids.length === 1 ? '' : 'es'}</strong></span><span>Applications<strong>{form.applications.length || 'Unrestricted'}</strong></span><span>Receipts / payments<strong>{form.usable_for_receipts ? 'Yes' : 'No'} / {form.usable_for_payments ? 'Yes' : 'No'}</strong></span></div>
        <label className="account-active-toggle"><input type="checkbox" name="is_active" checked={form.is_active} onChange={update}/><span><strong>Account is active</strong><small>Inactive accounts remain in history but cannot be used for new transactions.</small></span></label>
        {issue('is_active')}
        <button type="submit" className="primary-button wide account-save-button" disabled={!canSubmit || saving}>{saving ? <><RefreshCw className="spin" size={16}/>{isCreate ? 'Creating account…' : 'Saving changes…'}</> : <><Save size={16}/>{isCreate ? 'Create financial account' : 'Save account details'}</>}</button>
        <button type="button" className="text-button wide" onClick={onBack} disabled={saving}>Cancel</button>
        <p className="account-security-note"><ShieldCheck size={14}/>Account numbers are encrypted and only the last four digits are returned by the API.</p>
      </aside>
    </form>
  </main>;
}

function FinancialAccountAdjustmentsPage({ accountId, onBack }) {
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [account, setAccount] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [chartAccountsLoading, setChartAccountsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [adjustmentAccountId, setAdjustmentAccountId] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(today);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdAdjustment, setCreatedAdjustment] = useState(null);
  const [auditAdjustment, setAuditAdjustment] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    accountingApi.financialAccount(accountId).then(async accountResponse => {
      if (!current) return;
      const accountRecord = normalizeAccount(accountResponse?.data || accountResponse);
      setAccount(accountRecord);
      if (accountRecord.isCredit) return;
      const adjustmentResponse = await accountingApi.financialAccountAdjustments(accountId);
      if (!current) return;
      const adjustmentRecords = Array.isArray(adjustmentResponse) ? adjustmentResponse : adjustmentResponse?.data || adjustmentResponse?.adjustments || [];
      setAdjustments(adjustmentRecords);
      setActualBalance(String(accountRecord.currentBalance));
    }).catch(requestError => current && setError(requestError.message || 'Account adjustments could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [accountId, refreshVersion]);

  useEffect(() => {
    if (!account || account.isCredit) return;
    let current = true;
    setChartAccountsLoading(true);
    loadActiveChartAccounts()
      .then(records => current && setChartAccounts(adjustmentLedgerAccounts(records.filter(item => String(item.id) !== String(account.chart_account_id)))))
      .catch(requestError => current && setError(requestError.message || 'Adjustment ledger accounts could not be loaded.'))
      .finally(() => current && setChartAccountsLoading(false));
    return () => { current = false; };
  }, [account]);

  const currency = account?.currency || 'PHP';
  const systemBalance = Number(account?.currentBalance || 0);
  const adjustmentAmount = Number(actualBalance || 0) - systemBalance;
  const adjustmentDirection = adjustmentAmount > 0 ? 'Increase balance' : adjustmentAmount < 0 ? 'Decrease balance' : 'No adjustment';
  const selectedAdjustmentAccount = chartAccounts.find(item => item.choiceKey === adjustmentAccountId);
  const canSubmit = Boolean(adjustmentAccountId && adjustmentDate && reason.trim() && Number(actualBalance) >= 0 && Math.abs(adjustmentAmount) >= .005 && !account?.isCredit);

  const submitAdjustment = async event => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await accountingApi.createFinancialAccountAdjustment(accountId, {
        adjustment_account_id: Number(selectedAdjustmentAccount.id),
        actual_balance: Number(actualBalance),
        adjustment_date: adjustmentDate,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        reason: reason.trim(),
      });
      setCreatedAdjustment(response?.data || response);
      setConfirmOpen(false);
      setAdjustmentAccountId('');
      setReference('');
      setReason('');
      setRefreshVersion(version => version + 1);
    } catch (requestError) {
      const validationMessage = requestError.details && Object.values(requestError.details).flat()[0];
      setError(validationMessage || requestError.message || 'The balance adjustment could not be posted.');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openAudit = async adjustment => {
    setAuditLoading(true);
    setError('');
    try {
      const response = await accountingApi.financialAccountAdjustment(accountId, adjustment.id);
      setAuditAdjustment(response?.data || response);
    } catch (requestError) {
      setError(requestError.message || 'Adjustment details could not be loaded.');
    } finally {
      setAuditLoading(false);
    }
  };

  const voidAdjustment = async event => {
    event.preventDefault();
    if (!voidTarget || !voidReason.trim()) return;
    setVoiding(true);
    setError('');
    try {
      await accountingApi.voidFinancialAccountAdjustment(accountId, voidTarget.id, voidReason.trim());
      setVoidTarget(null);
      setVoidReason('');
      setAuditAdjustment(null);
      setRefreshVersion(version => version + 1);
    } catch (requestError) {
      const validationMessage = requestError.details && Object.values(requestError.details).flat()[0];
      setError(validationMessage || requestError.message || 'The balance adjustment could not be voided.');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Account history</button><section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading balance adjustments…</h2><p>Fetching the account balance and audit history.</p></section></main>;
  if (!account) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Account history</button><section className="panel account-state error-state"><CircleHelp size={24}/><h2>Adjustment page could not be loaded</h2><p>{error || 'Financial account not found.'}</p></section></main>;
  if (account.isCredit) return <CreditCardAdjustmentsPage cardId={accountId} onBack={onBack}/>;

  return <main className="content inner-page credit-adjustments-page financial-adjustments-page">
    <div className="credit-adjustment-pagebar"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Account history</button><div><p className="eyebrow">BALANCE RECONCILIATION</p><h1>Financial account adjustments</h1><p>Match MDR Accounting with the balance reported by the bank, cash count, or wallet.</p></div><button className="secondary-button" onClick={() => setRefreshVersion(version => version + 1)}><RefreshCw size={15}/>Refresh</button></div>
    {error && <div className="payment-form-error adjustment-page-error" role="alert"><CircleHelp size={15}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={14}/></button></div>}
    <section className="adjustment-context panel">
      <div><span>Financial account</span><strong>{account.name}</strong><small>{account.type} · {account.accountNumber}</small></div>
      <div><span>System balance</span><strong>{money(systemBalance, currency)}</strong><small>{balanceUpdatedLabel(account.balanceUpdatedAt)}</small></div>
      <div><span>Available balance</span><strong>{money(account.availableBalance, currency)}</strong><small>{account.holderName} · {currency}</small></div>
      <div><span>Posted adjustments</span><strong>{adjustments.length}</strong><small>Complete audit history below</small></div>
    </section>

    <section className="adjustment-workspace">
      <form className="panel adjustment-form" onSubmit={event => { event.preventDefault(); if (canSubmit) setConfirmOpen(true); }}>
        <div className="panel-head"><div><h2>Match the actual balance</h2><p>Enter the real-world balance; only the discrepancy is posted.</p></div><span className="adjustment-form-icon"><SlidersHorizontal size={19}/></span></div>
        <div className="adjustment-form-fields">
          <label>System balance<input value={systemBalance.toFixed(2)} disabled/><small>Current posted balance before this adjustment.</small></label>
          <label>Actual balance<input type="number" min="0" step="0.01" value={actualBalance} onChange={event => setActualBalance(event.target.value)} required/></label>
          <label>Adjustment reason<select value={adjustmentAccountId} onChange={event => setAdjustmentAccountId(event.target.value)} disabled={chartAccountsLoading || chartAccounts.length === 0} required><option value="">{chartAccountsLoading ? 'Loading adjustment reasons…' : chartAccounts.length ? 'Select why the balance differs' : 'No applicable ledger accounts found'}</option>{chartAccounts.map(item => <option key={item.choiceKey} value={item.choiceKey}>{item.choiceLabel}</option>)}</select><small>{!chartAccountsLoading && chartAccounts.length === 0 ? 'Add an active Owner Equity or General Expense leaf account.' : 'The correct ledger account is selected automatically.'}</small></label>
          <label>Adjustment date<input type="date" value={adjustmentDate} onChange={event => setAdjustmentDate(event.target.value)} required/></label>
          <label>Reference <small>Optional</small><input value={reference} onChange={event => setReference(event.target.value)} placeholder="e.g. BDO-BALANCE-2026-10-13"/></label>
          <label className="adjustment-reason">Reason<textarea rows="3" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why the actual balance differs from MDR Accounting" required/></label>
        </div>
        <button className="primary-button wide" disabled={!canSubmit}><ShieldCheck size={15}/>Review balance adjustment</button>
      </form>
      <aside className={`adjustment-preview ${adjustmentAmount > 0 ? 'increase' : adjustmentAmount < 0 ? 'decrease' : ''}`}>
        <span>Balance discrepancy</span><h2>{money(Math.abs(adjustmentAmount), currency)}</h2><strong>{adjustmentDirection}</strong>
        <dl><div><dt>MDR Accounting balance</dt><dd>{money(systemBalance, currency)}</dd></div><div><dt>Actual balance</dt><dd>{money(actualBalance, currency)}</dd></div><div><dt>Difference posted</dt><dd>{adjustmentAmount > 0 ? '+' : adjustmentAmount < 0 ? '−' : ''}{money(Math.abs(adjustmentAmount), currency)}</dd></div></dl>
        <p>{adjustmentAmount > 0 ? 'The account balance will increase.' : adjustmentAmount < 0 ? 'The account balance will decrease.' : 'Enter a different actual balance to create an adjustment.'}</p>
      </aside>
    </section>

    <section className="panel adjustment-history-panel"><div className="panel-head"><div><h2>Balance adjustment history</h2><p>Every posted discrepancy and reversal remains traceable</p></div><span className="transaction-count">{adjustments.length} records</span></div>
      {adjustments.length === 0 ? <div className="transaction-state"><SlidersHorizontal size={21}/><strong>No balance adjustments posted</strong><span>Recorded discrepancies will appear here.</span></div> : <div className="adjustment-history-list">{adjustments.map(adjustment => {
        const isVoided = Boolean(adjustment.voided_at || String(adjustment.status || '').toLowerCase() === 'voided');
        const amount = Number(adjustment.adjustment_amount ?? adjustment.amount ?? 0);
        const before = adjustment.expected_balance_before ?? adjustment.system_balance_before ?? adjustment.balance_before ?? 0;
        return <article className="adjustment-history-row" key={adjustment.id}><div><span className={`history-status ${isVoided ? 'voided' : 'posted'}`}>{isVoided ? 'Voided' : humanize(adjustment.direction || adjustment.status || 'Posted')}</span><strong>{money(Math.abs(amount), currency)}</strong><small>{calendarDate(adjustment.adjustment_date || adjustment.date || adjustment.created_at)}</small></div><div><span>System balance before</span><strong>{money(before, currency)}</strong><small>Before correction</small></div><div><span>Actual balance</span><strong>{money(adjustment.actual_balance, currency)}</strong><small>{adjustment.reference || 'No reference'}</small></div><div><span>Reason</span><strong>{adjustment.reason || '—'}</strong><small>{adjustment.adjustment_account?.name || adjustment.chart_account?.name || `Account ${adjustment.adjustment_account_id || '—'}`}</small></div><div className="adjustment-row-actions"><button type="button" onClick={() => openAudit(adjustment)} disabled={auditLoading}>View audit</button>{!isVoided && <button type="button" className="void-link" onClick={() => { setVoidTarget(adjustment); setVoidReason(''); }}>Void</button>}</div></article>;
      })}</div>}
    </section>

    {confirmOpen && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !submitting && setConfirmOpen(false)}><form className="modal adjustment-confirm-modal" onSubmit={submitAdjustment}><div className="modal-head"><div><p className="eyebrow">CONFIRM BALANCE ADJUSTMENT</p><h2>Post {money(Math.abs(adjustmentAmount), currency)}?</h2></div><button type="button" className="icon-button" onClick={() => setConfirmOpen(false)} disabled={submitting}><X size={19}/></button></div><p className="modal-intro">This posts a double-entry journal and updates the account balance. Incorrect entries must be voided, not edited.</p><div className="payment-confirm-summary"><div><span>Direction</span><strong>{adjustmentDirection}</strong></div><div><span>System balance</span><strong>{money(systemBalance, currency)}</strong></div><div><span>Actual balance</span><strong>{money(actualBalance, currency)}</strong></div><div><span>Adjustment account</span><strong>{selectedAdjustmentAccount ? `${selectedAdjustmentAccount.code || ''} ${selectedAdjustmentAccount.name}`.trim() : '—'}</strong></div><div><span>Reference</span><strong>{reference || '—'}</strong></div><div><span>Date</span><strong>{calendarDate(adjustmentDate)}</strong></div></div><div className="modal-actions"><button type="button" className="text-button" onClick={() => setConfirmOpen(false)} disabled={submitting}>Go back</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? <><RefreshCw className="spin" size={15}/>Posting…</> : <><Check size={15}/>Post adjustment</>}</button></div></form></div>}

    {createdAdjustment && <div className="modal-backdrop"><div className="modal payment-success-modal"><div className="success-icon"><Check size={28}/></div><p className="eyebrow">BALANCE ADJUSTED</p><h2>{money(Math.abs(Number(createdAdjustment.adjustment_amount ?? adjustmentAmount)), currency)}</h2><p>The discrepancy was posted and the account balance now reflects the recorded actual balance.</p><div className="payment-result-breakdown"><span>Previous balance<strong>{money(createdAdjustment.expected_balance_before ?? createdAdjustment.system_balance_before ?? systemBalance, currency)}</strong></span><span>Actual balance<strong>{money(createdAdjustment.actual_balance ?? actualBalance, currency)}</strong></span></div><button className="primary-button wide" onClick={() => setCreatedAdjustment(null)}>Done</button></div></div>}

    {auditAdjustment && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setAuditAdjustment(null)}><div className="modal adjustment-audit-modal"><div className="modal-head"><div><p className="eyebrow">BALANCE ADJUSTMENT AUDIT</p><h2>{auditAdjustment.reference || `Adjustment ${auditAdjustment.id}`}</h2></div><button className="icon-button" onClick={() => setAuditAdjustment(null)}><X size={19}/></button></div><div className="audit-detail-grid"><span>System balance before<strong>{money(auditAdjustment.expected_balance_before ?? auditAdjustment.system_balance_before ?? auditAdjustment.balance_before, currency)}</strong></span><span>Actual balance<strong>{money(auditAdjustment.actual_balance, currency)}</strong></span><span>Adjustment<strong>{money(Math.abs(Number(auditAdjustment.adjustment_amount ?? auditAdjustment.amount)), currency)}</strong></span><span>Direction<strong>{humanize(auditAdjustment.direction || 'Adjustment')}</strong></span><span>Posting date<strong>{calendarDate(auditAdjustment.adjustment_date || auditAdjustment.created_at)}</strong></span><span>Account<strong>{auditAdjustment.financial_account?.name || account.name}</strong></span><span>Adjustment account<strong>{auditAdjustment.adjustment_account?.name || auditAdjustment.chart_account?.name || auditAdjustment.adjustment_account_id || '—'}</strong></span><span>Journal<strong>{auditAdjustment.journal_entry?.number || auditAdjustment.journal?.number || '—'}</strong></span><span>Created by<strong>{auditAdjustment.creator?.name || auditAdjustment.created_by?.name || '—'}</strong></span><span>Posted by<strong>{auditAdjustment.posted_by?.name || '—'}</strong></span><span>Created at<strong>{calendarDate(auditAdjustment.created_at)}</strong></span><span>Status<strong>{humanize(auditAdjustment.status || (auditAdjustment.voided_at ? 'voided' : 'posted'))}</strong></span></div><div className="audit-reason"><span>Reason</span><p>{auditAdjustment.reason || '—'}</p></div>{(auditAdjustment.journal_entry?.lines || auditAdjustment.journal_lines || []).length > 0 && <div className="journal-lines"><h3>Journal lines</h3>{(auditAdjustment.journal_entry?.lines || auditAdjustment.journal_lines).map((line, index) => <div key={line.id || index}><span>{line.account?.name || line.chart_account?.name || line.account_name || `Line ${index + 1}`}</span><strong>Debit {money(line.debit, currency)}</strong><strong>Credit {money(line.credit, currency)}</strong></div>)}</div>}</div></div>}

    {voidTarget && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !voiding && setVoidTarget(null)}><form className="modal confirmation-modal" onSubmit={voidAdjustment}><div className="modal-head"><div><p className="eyebrow">VOID BALANCE ADJUSTMENT</p><h2>Reverse this discrepancy?</h2></div><button type="button" className="icon-button" onClick={() => setVoidTarget(null)} disabled={voiding}><X size={19}/></button></div><p className="modal-intro">The reversal restores the previous balance while preserving the original adjustment and audit trail.</p><label className="void-reason-field">Reason<textarea rows="3" value={voidReason} onChange={event => setVoidReason(event.target.value)} placeholder="Why is this balance adjustment being voided?" required/></label><div className="modal-actions"><button type="button" className="text-button" onClick={() => setVoidTarget(null)} disabled={voiding}>Cancel</button><button type="submit" className="primary-button danger-button" disabled={voiding || !voidReason.trim()}>{voiding ? <><RefreshCw className="spin" size={15}/>Voiding…</> : 'Void adjustment'}</button></div></form></div>}
  </main>;
}

const dueStatusLabels = {
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due today',
  DUE_URGENT: 'Due within 7 days',
  DUE_SOON: 'Due in 8-10 days',
  UPCOMING: 'Upcoming',
  NO_AMOUNT_DUE: 'No amount due',
};

const paymentModeLabels = {
  partial: 'Partial payment',
  exact: 'Paid in full',
  overpayment: 'Overpayment',
};

function money(value, currency = 'PHP') {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency || 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function calendarDate(value, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function creditCardIdentity(card = {}, institutions = []) {
  const account = card.financial_account || card.financialAccount || card.account || {};
  const institution = card.financial_institution || card.financialInstitution || card.institution || account.financial_institution || account.financialInstitution || account.institution || {};
  const institutionId = card.financial_institution_id || account.financial_institution_id || institution.id;
  const linkedInstitution = institutions.find(item => String(item.id) === String(institutionId)) || {};
  const institutionName = institution.name
    || institution.short_name
    || institution.institution_name
    || card.financial_institution_name
    || card.institution_name
    || card.bank_name
    || linkedInstitution.displayName
    || linkedInstitution.name
    || 'Financial institution not provided';
  const accountNumber = card.account_number_masked
    || card.masked_account_number
    || card.masked_number
    || card.card_number_masked
    || account.account_number_masked
    || account.masked_account_number
    || account.masked_number
    || card.account_number
    || card.card_number
    || account.account_number
    || account.number
    || 'Account number not provided';
  const holderName = getAccountHolderName(card);
  return {
    institutionName,
    accountName: card.account_name || account.account_name || account.name || account.display_name || card.name || 'Credit card',
    accountHolderName: holderName === 'Not provided' ? 'Account holder not provided' : holderName,
    accountNumber,
  };
}

function CreditCardsPage({ onSelectCard }) {
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [cards, setCards] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState('');
  const [institutionQuery, setInstitutionQuery] = useState('');
  const [institutionOpen, setInstitutionOpen] = useState(false);
  const [asOf, setAsOf] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let current = true;
    loadFinancialInstitutions()
      .then(records => {
        if (!current) return;
        setInstitutions(records.map(institution => ({ ...institution, displayName: institution.name || institution.institution_name || institution.display_name || `Institution ${institution.id}` })));
      })
      .catch(() => current && setInstitutions([]));
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ as_of: asOf });
    if (institutionId) params.set('financial_institution_id', institutionId);
    accountingApi.creditCards(`?${params.toString()}`)
      .then(response => {
        if (!current) return;
        setCards(Array.isArray(response) ? response : response?.data || []);
      })
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [asOf, institutionId, refreshVersion]);
  const matchingInstitutions = institutions.filter(institution => institution.displayName.toLowerCase().includes(institutionQuery.trim().toLowerCase()));
  const currencies = [...new Set(cards.map(card => card.currency || 'PHP'))];
  const summaryCurrency = currencies.length === 1 ? currencies[0] : null;
  const totalOutstanding = cards.reduce((sum, card) => sum + Number(card.outstanding_balance || 0), 0);
  const totalDue = cards.reduce((sum, card) => sum + Number(card.amount_due || 0), 0);
  const totalAvailable = cards.reduce((sum, card) => sum + Number(card.available_credit || 0), 0);
  const urgentCount = cards.filter(card => ['OVERDUE', 'DUE_TODAY', 'DUE_URGENT', 'DUE_SOON'].includes(card.due_status)).length;
  const summaryMoney = value => summaryCurrency ? money(value, summaryCurrency) : '—';

  return <main className="content inner-page credit-cards-page">
    <div className="title-row credit-title-row"><div><p className="eyebrow">MONEY</p><h1>Credit card due monitor</h1><p>Stay ahead of statement balances and upcoming payment deadlines.</p></div><div className="monitor-actions"><div className="institution-combobox"><label htmlFor="institution-search">Financial institution <small>Optional</small></label><div className="institution-search-wrap"><Search size={15}/><input id="institution-search" role="combobox" aria-expanded={institutionOpen} aria-controls="institution-options" aria-autocomplete="list" placeholder="All institutions" value={institutionQuery} onFocus={() => setInstitutionOpen(true)} onBlur={() => window.setTimeout(() => setInstitutionOpen(false), 140)} onChange={event => { setInstitutionQuery(event.target.value); setInstitutionId(''); setInstitutionOpen(true); }}/>{institutionQuery && <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => { setInstitutionQuery(''); setInstitutionId(''); }} aria-label="Clear institution"><X size={13}/></button>}</div>{institutionOpen && <div className="institution-options" id="institution-options" role="listbox"><button type="button" className={!institutionId ? 'selected' : ''} onMouseDown={event => event.preventDefault()} onClick={() => { setInstitutionId(''); setInstitutionQuery(''); setInstitutionOpen(false); }}>All institutions</button>{matchingInstitutions.map(institution => <button type="button" role="option" aria-selected={String(institution.id) === String(institutionId)} className={String(institution.id) === String(institutionId) ? 'selected' : ''} key={institution.id} onMouseDown={event => event.preventDefault()} onClick={() => { setInstitutionId(String(institution.id)); setInstitutionQuery(institution.displayName); setInstitutionOpen(false); }}><span>{institution.displayName}</span>{institution.code && <small>{institution.code}</small>}</button>)}{matchingInstitutions.length === 0 && <span className="institution-no-results">No institutions found</span>}</div>}</div><label>As of<input type="date" value={asOf} onChange={event => setAsOf(event.target.value)}/></label><button className="secondary-button" onClick={() => setRefreshVersion(version => version + 1)} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={16}/>Refresh</button></div></div>

    {!loading && !error && cards.length > 0 && <section className="credit-summary" aria-label="Credit card summary">
      <div><span>Outstanding balance</span><strong>{summaryMoney(totalOutstanding)}</strong><small>{summaryCurrency ? `Across ${cards.length} card${cards.length === 1 ? '' : 's'}` : 'Multiple currencies'}</small></div>
      <div className={urgentCount ? 'summary-urgent' : ''}><span>Amount due</span><strong>{summaryMoney(totalDue)}</strong><small>{urgentCount ? `${urgentCount} card${urgentCount === 1 ? '' : 's'} need attention` : 'No urgent cards'}</small></div>
      <div><span>Available credit</span><strong>{summaryMoney(totalAvailable)}</strong><small>As of {calendarDate(asOf)}</small></div>
      {(() => { const nearest = cards.find(card => Number(card.nearest_payable_amount ?? card.next_due_amount ?? 0) > 0); return <div><span>Nearest payable</span><strong>{nearest ? money(nearest.nearest_payable_amount ?? nearest.next_due_amount, nearest.currency) : summaryMoney(0)}</strong><small>{nearest ? `Due ${calendarDate(nearest.nearest_payable_due_date ?? nearest.nearest_due_date)}` : 'No unpaid statements'}</small></div>; })()}
    </section>}

    {loading && <section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading credit cards…</h2><p>Checking balances, statements, and the nearest due dates.</p></section>}
    {!loading && error && <section className="panel account-state error-state"><CircleHelp size={24}/><h2>Credit cards could not be loaded</h2><p>{error.status === 401 ? 'Your session is not authorized to view credit cards. Please sign in again or check the API token.' : error.message || 'The credit-card API did not respond.'}</p><button className="secondary-button" onClick={() => setRefreshVersion(version => version + 1)}><RefreshCw size={16}/>Try again</button></section>}
    {!loading && !error && cards.length === 0 && <section className="panel account-state"><CreditCard size={25}/><h2>No credit cards found</h2><p>{institutionId ? `No cards from ${institutionQuery} are available as of ${calendarDate(asOf)}.` : `No credit cards are available as of ${calendarDate(asOf)}.`}</p>{institutionId && <button className="secondary-button" onClick={() => { setInstitutionId(''); setInstitutionQuery(''); }}>Show all institutions</button>}</section>}

    {!loading && !error && cards.length > 0 && <section className="credit-card-list">{cards.map(card => {
      const status = card.due_status || 'NO_AMOUNT_DUE';
      const identity = creditCardIdentity(card, institutions);
      const utilization = Number(card.credit_limit) > 0 ? Math.min(100, Math.max(0, (Number(card.outstanding_balance || 0) / Number(card.credit_limit)) * 100)) : 0;
      const statements = card.unpaid_statements || [];
      const dayCount = Math.abs(Number(card.days_until_due || 0));
      const dueCopy = status === 'OVERDUE'
        ? `${dayCount} day${dayCount === 1 ? '' : 's'} overdue`
        : status === 'DUE_TODAY' ? 'Payment is due today'
        : status === 'NO_AMOUNT_DUE' ? 'Nothing currently due'
        : `${Number(card.days_until_due || 0)} day${Number(card.days_until_due || 0) === 1 ? '' : 's'} remaining`;
      return <article className={`credit-card-panel panel credit-card-clickable status-${status.toLowerCase()}`} key={card.id} role="button" tabIndex="0" onClick={() => onSelectCard(card.id, asOf)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectCard(card.id, asOf); } }} aria-label={`View ${card.name} details`}>
        <div className="credit-card-heading"><div className="credit-card-identity"><span className="credit-card-icon"><CreditCard size={20}/></span><div><span className="credit-card-kicker">{identity.institutionName}</span><h2>{identity.accountName}</h2><div className="credit-card-holder"><span>Account holder name</span><strong>{identity.accountHolderName}</strong></div><div className="credit-card-identifiers"><span>{identity.accountNumber}</span><span>{card.currency || 'PHP'}</span></div></div></div><span className={`due-status ${status.toLowerCase()}`}>{dueStatusLabels[status] || humanize(status)}</span></div>
        <div className="credit-card-body">
          <div className="credit-card-balance"><span>Outstanding balance</span><strong>{money(card.outstanding_balance, card.currency)}</strong><div className="utilization-track"><span style={{ width: `${utilization}%` }}/></div><small>{utilization.toFixed(0)}% of {money(card.credit_limit, card.currency)} limit used</small></div>
          <div className="due-callout"><div><span>Nearest payable</span><strong>{money(card.nearest_payable_amount ?? card.next_due_amount ?? 0, card.currency)}</strong><small>{card.nearest_payable_due_date || card.nearest_due_date ? `Due ${calendarDate(card.nearest_payable_due_date ?? card.nearest_due_date)} · ${dueCopy}` : dueCopy}</small></div><CalendarDays size={22}/></div>
          <dl className="credit-card-metrics"><div><dt>Amount due</dt><dd>{money(card.amount_due, card.currency)}</dd></div><div><dt>Next due amount</dt><dd>{money(card.next_due_amount, card.currency)}</dd></div><div><dt>Available credit</dt><dd>{money(card.available_credit, card.currency)}</dd></div><div><dt>Next closing date</dt><dd>{calendarDate(card.next_closing_date)}</dd></div><div><dt>Statement day</dt><dd>Day {card.statement_day ?? '—'}</dd></div><div><dt>Due day</dt><dd>Day {card.due_day ?? '—'}</dd></div></dl>
        </div>
        <div className="statement-section"><div className="statement-heading"><div><h3>Unpaid statements</h3><p>Open balances contributing to the amount due</p></div><span>{statements.length} open</span></div>{statements.length === 0 ? <div className="no-statements"><Check size={16}/>No unpaid statements</div> : <div className="statement-table"><div className="statement-row statement-head"><span>Statement</span><span>Statement date</span><span>Due date</span><span>Minimum due</span><span>Balance due</span><span>Status</span></div>{statements.map(statement => <div className="statement-row" key={statement.id}><span><strong>{statement.number}</strong><small>Total {money(statement.total_amount, card.currency)}</small></span><span>{calendarDate(statement.statement_date)}</span><span>{calendarDate(statement.due_date)}</span><span>{money(statement.minimum_due, card.currency)}</span><span><strong>{money(statement.balance_due, card.currency)}</strong><small>{money(statement.paid_amount, card.currency)} paid</small></span><span><span className={`history-status ${String(statement.status || '').toLowerCase()}`}>{humanize(statement.status || 'Open')}</span></span></div>)}</div>}<div className="card-detail-link">View full history and prepare a payment <ChevronRight size={15}/></div></div>
      </article>;
    })}</section>}
  </main>;
}

function CreditCardDetailPage({ cardId, onBack, onAdjust }) {
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const initialAsOf = useMemo(() => new URLSearchParams(window.location.search).get('as_of') || today, [today]);
  const [card, setCard] = useState(null);
  const [asOf, setAsOf] = useState(initialAsOf);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [fundingAccounts, setFundingAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [memo, setMemo] = useState('Credit-card statement payment');
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [fundingAccountsLoading, setFundingAccountsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [detailTab, setDetailTab] = useState('history');

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    accountingApi.creditCard(cardId, `?as_of=${encodeURIComponent(asOf)}`)
      .then(response => {
        if (!current) return;
        const record = response?.data || response;
        setCard(record);
        setBranchId(value => value || String(record?.branch_id || record?.branch?.id || ''));
        setPaymentAmount(value => value || String(record?.amount_due || ''));
      })
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [cardId, asOf, refreshVersion]);

  useEffect(() => {
    let current = true;
    setOptionsLoading(true);
    setPaymentMethodId('');
    setFundingAccountId('');
    setFundingAccounts([]);
    Promise.all([
      accountingApi.branches('?active=1'),
      accountingApi.creditCardPaymentMethods(cardId),
    ]).then(([branchResponse, methodResponse]) => {
      if (!current) return;
      const branchRecords = Array.isArray(branchResponse) ? branchResponse : branchResponse?.data || [];
      const methodRecords = Array.isArray(methodResponse) ? methodResponse : methodResponse?.data || [];
      setPaymentMethods(methodRecords);
      setBranchId(value => value || (branchRecords[0] ? String(branchRecords[0].id) : ''));
    }).catch(requestError => {
      if (current) setPaymentError(requestError.message || 'Payment options could not be loaded.');
    }).finally(() => current && setOptionsLoading(false));
    return () => { current = false; };
  }, [cardId]);

  useEffect(() => {
    if (!paymentMethodId || !branchId) {
      setFundingAccounts([]);
      setFundingAccountId('');
      return;
    }
    let current = true;
    setFundingAccountsLoading(true);
    setFundingAccounts([]);
    setFundingAccountId('');
    setPaymentError('');
    accountingApi.creditCardFundingAccounts(cardId, paymentMethodId, branchId)
      .then(response => {
        if (!current) return;
        const records = Array.isArray(response) ? response : response?.data || [];
        setFundingAccounts(records.map(normalizeAccount));
      })
      .catch(requestError => {
        if (current) setPaymentError(requestError.message || 'Applicable funding accounts could not be loaded.');
      })
      .finally(() => current && setFundingAccountsLoading(false));
    return () => { current = false; };
  }, [branchId, cardId, paymentMethodId]);

  if (loading) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Credit cards</button><section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading card details…</h2><p>Fetching statements and their applied payments.</p></section></main>;
  if (error || !card) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Credit cards</button><section className="panel account-state error-state"><CircleHelp size={24}/><h2>{error?.status === 404 ? 'Credit card not found' : 'Card details could not be loaded'}</h2><p>{error?.status === 404 ? 'This account is not a credit card or no longer exists.' : error?.message || 'Please try again.'}</p><button className="secondary-button" onClick={() => setRefreshVersion(version => version + 1)}><RefreshCw size={16}/>Try again</button></section></main>;

  const currency = card.currency || 'PHP';
  const identity = creditCardIdentity(card);
  const status = card.due_status || 'NO_AMOUNT_DUE';
  const statements = card.statement_history || [];
  const selectedStatement = statements.find(statement => String(statement.id) === String(selectedStatementId));
  const paymentBasis = Number(selectedStatement?.balance_due ?? card.amount_due ?? 0);
  const suggestedAmount = Number(paymentAmount || 0);
  const utilization = Number(card.credit_limit) > 0 ? Math.min(100, Math.max(0, (Number(card.outstanding_balance || 0) / Number(card.credit_limit)) * 100)) : 0;
  const totalPayments = statements.reduce((sum, statement) => sum + (statement.payments || []).length, 0);
  const selectedPaymentMethod = paymentMethods.find(method => String(method.id) === String(paymentMethodId));
  const compatibleFundingAccounts = fundingAccounts;
  const paymentMode = Math.abs(suggestedAmount - paymentBasis) < .005 ? 'exact' : suggestedAmount > paymentBasis ? 'overpayment' : 'partial';
  const selectedFundingAccount = compatibleFundingAccounts.find(account => String(account.id) === String(fundingAccountId));
  const paymentReady = Boolean(branchId && selectedFundingAccount && selectedPaymentMethod && paymentDate && suggestedAmount > 0 && !fundingAccountsLoading);

  const submitCreditCardPayment = async event => {
    event.preventDefault();
    if (!paymentReady) return;
    setSubmittingPayment(true);
    setPaymentError('');
    try {
      const payload = {
        branch_id: Number(branchId),
        funding_account_id: Number(fundingAccountId),
        payment_method_id: Number(paymentMethodId),
        payment_date: paymentDate,
        amount: suggestedAmount,
        idempotency_key: idempotencyKey,
        ...(selectedStatementId ? { statement_id: Number(selectedStatementId) } : {}),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(memo.trim() ? { memo: memo.trim() } : {}),
      };
      const response = await accountingApi.createCreditCardPayment(cardId, payload);
      setPaymentResult(response?.data || response);
      setConfirmationOpen(false);
      setIdempotencyKey(crypto.randomUUID());
      setReference('');
      setPaymentAmount('');
      setSelectedStatementId('');
    } catch (requestError) {
      const validationMessage = requestError.details && Object.values(requestError.details).flat()[0];
      setPaymentError(validationMessage || requestError.message || 'The credit-card payment could not be posted.');
      setConfirmationOpen(false);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openDetailSection = (tab, elementId) => {
    setDetailTab(tab);
    window.requestAnimationFrame(() => document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return <main className="content inner-page card-detail-page">
    <div className="credit-detail-pagebar"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Credit cards</button><strong>Credit card details</strong><label>As of <input type="date" value={asOf} onChange={event => setAsOf(event.target.value)}/></label></div>
    <section className="credit-visual-card">
      <div className="visual-card-top"><div><span>{identity.institutionName}</span><h1>{identity.accountName}</h1><div className="visual-card-holder"><small>Account holder name</small><strong>{identity.accountHolderName}</strong></div><div className="visual-card-account-meta"><small>{identity.accountNumber}</small></div></div><span className="visual-card-currency">{currency}</span></div>
      <div className="visual-card-balances"><span>Outstanding balance<strong>{money(card.outstanding_balance, currency)}</strong></span><span>Total amount due<strong>{money(card.amount_due, currency)}</strong></span><span>Due date<strong>{calendarDate(card.nearest_due_date, 'No due date')}</strong></span></div>
      <div className="visual-card-limit"><div><span>Credit limit</span><strong>{money(card.credit_limit, currency)}</strong></div><div className="visual-limit-track"><span style={{ width: `${utilization}%` }}/></div><div className="visual-card-available"><span>{utilization.toFixed(0)}% used</span><span>{money(card.available_credit, currency)} available</span></div></div>
      <span className={`due-status visual-due-status ${status.toLowerCase()}`}>{dueStatusLabels[status] || humanize(status)}</span>
    </section>
    <nav className="credit-quick-actions" aria-label="Credit card actions">
      <button onClick={() => openDetailSection(detailTab, 'card-payment')}><span><Banknote size={22}/></span><strong>Pay</strong><small>Make a payment</small></button>
      <button onClick={() => openDetailSection('history', 'card-tabs')}><span><ReceiptText size={22}/></span><strong>Statements</strong><small>{statements.length} records</small></button>
      <button onClick={() => openDetailSection('history', 'card-tabs')}><span><Activity size={22}/></span><strong>History</strong><small>{totalPayments} payments</small></button>
      <button onClick={() => onAdjust(asOf)}><span><SlidersHorizontal size={22}/></span><strong>Adjust</strong><small>Match actual SOA</small></button>
      <button onClick={() => openDetailSection('information', 'card-tabs')}><span><CreditCard size={22}/></span><strong>Information</strong><small>Card details</small></button>
    </nav>

    <div className="credit-detail-tabs" id="card-tabs" role="tablist"><button role="tab" aria-selected={detailTab === 'history'} className={detailTab === 'history' ? 'active' : ''} onClick={() => setDetailTab('history')}>History</button><button role="tab" aria-selected={detailTab === 'information'} className={detailTab === 'information' ? 'active' : ''} onClick={() => setDetailTab('information')}>Information</button><button role="tab" aria-selected={detailTab === 'manage'} className={detailTab === 'manage' ? 'active' : ''} onClick={() => setDetailTab('manage')}>Manage</button></div>

    <section className="card-detail-layout">
      {detailTab === 'history' && <div className="panel statement-history-panel"><div className="panel-head"><div><h2>Statement history</h2><p>Every statement with the payments applied to it</p></div><span className="transaction-count">{statements.length} records</span></div>
        {statements.length === 0 ? <div className="transaction-state"><ReceiptText size={21}/><strong>No statements yet</strong><span>Statement history will appear here when available.</span></div> : <div className="statement-history-list">{statements.map(statement => {
          const payments = statement.payments || [];
          const statementStatus = String(statement.status || (Number(statement.balance_due || 0) > 0 ? 'open' : 'paid')).toLowerCase();
          return <article className="history-statement" key={statement.id}>
            <div className="history-statement-head"><div><span className="history-statement-number">{statement.number}</span><small>{calendarDate(statement.statement_date)} statement · due {calendarDate(statement.due_date)}</small></div><span className={`history-status ${statementStatus}`}>{humanize(statementStatus)}</span></div>
            <div className="history-statement-totals"><span>Total<strong>{money(statement.total_amount, currency)}</strong></span><span>Paid<strong className="green">{money(statement.paid_amount, currency)}</strong></span><span>Minimum due<strong>{money(statement.minimum_due, currency)}</strong></span><span>Balance due<strong className={Number(statement.balance_due || 0) > 0 ? 'red' : ''}>{money(statement.balance_due, currency)}</strong></span></div>
            <div className="applied-payments"><div className="applied-payments-title"><span>Applied payments</span><small>{payments.length}</small></div>{payments.length === 0 ? <p>No payments applied to this statement.</p> : payments.map((payment, index) => <div className="applied-payment-row" key={payment.id || index}><span className="payment-check"><Check size={13}/></span><span><strong>{payment.number || payment.reference || `Payment ${index + 1}`}</strong><small>{payment.account?.name || payment.financial_account?.name || payment.payment_method?.name || 'Credit card payment'}</small></span><span><strong>{calendarDate(payment.payment_date || payment.date || payment.paid_at)}</strong><small>{humanize(payment.status || 'Applied')}</small></span><strong>{money(payment.amount || payment.applied_amount, currency)}</strong></div>)}</div>
          </article>;
        })}</div>}
      </div>}
      {detailTab === 'information' && <section className="panel card-information-panel"><div className="panel-head"><div><h2>Card information</h2><p>Account identity, billing cycle, limits, and current position</p></div></div><div className="card-information-grid"><span>Financial institution<strong>{identity.institutionName}</strong></span><span>Account name<strong>{identity.accountName}</strong></span><span>Account holder name<strong>{identity.accountHolderName}</strong></span><span>Account number<strong>{identity.accountNumber}</strong></span><span>Currency<strong>{currency}</strong></span><span>Credit limit<strong>{money(card.credit_limit, currency)}</strong></span><span>Available credit<strong>{money(card.available_credit, currency)}</strong></span><span>Statement day<strong>Day {card.statement_day ?? '—'}</strong></span><span>Due day<strong>Day {card.due_day ?? '—'}</strong></span><span>Next closing date<strong>{calendarDate(card.next_closing_date)}</strong></span><span>Next due amount<strong>{money(card.next_due_amount, currency)}</strong></span></div></section>}
      {detailTab === 'manage' && <section className="panel card-manage-panel"><div className="panel-head"><div><h2>Manage card</h2><p>Account controls remain protected by the accounting backend</p></div></div><div className="card-manage-list"><div><span className="payment-planner-icon"><CalendarDays size={18}/></span><span><strong>Billing schedule</strong><small>Statement day {card.statement_day ?? '—'} · Due day {card.due_day ?? '—'}</small></span></div><div><span className="payment-planner-icon"><ShieldCheck size={18}/></span><span><strong>Payment protection</strong><small>Payments require confirmation and an idempotency key.</small></span></div></div></section>}

      <aside className="panel payment-planner" id="card-payment"><div className="payment-planner-head"><span className="payment-planner-icon"><Banknote size={21}/></span><div><p className="eyebrow">CARD PAYMENT</p><h2>Make a payment</h2></div></div><p className="payment-planner-copy">Choose where the money comes from and how it should be applied. Payments post to the ledger immediately.</p>
        {paymentError && <div className="payment-form-error" role="alert"><CircleHelp size={15}/><span>{paymentError}</span><button onClick={() => setPaymentError('')} aria-label="Dismiss"><X size={14}/></button></div>}
        {optionsLoading ? <div className="payment-options-loading"><RefreshCw className="spin" size={16}/>Loading payment options…</div> : <div className="payment-planner-form">
          <label>Apply payment<select value={selectedStatementId} onChange={event => { const nextId = event.target.value; const statement = statements.find(item => String(item.id) === String(nextId)); setSelectedStatementId(nextId); setPaymentAmount(String(statement?.balance_due ?? card.amount_due ?? '')); }}><option value="">Oldest unpaid statements first</option>{statements.filter(statement => Number(statement.balance_due || 0) > 0).map(statement => <option key={statement.id} value={statement.id}>{statement.number} · {money(statement.balance_due, currency)} due</option>)}</select></label>
          <label className="payment-amount-field">Payment amount<input className="payment-amount-input" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} placeholder="0.00" required/><small className="amount-helper">The backend determines partial, paid in full, or overpayment.</small></label>
          <label>Payment method<select value={paymentMethodId} onChange={event => { setPaymentMethodId(event.target.value); setFundingAccountId(''); }} required><option value="">Select payment method first</option>{paymentMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
          <label>Pay from<select value={fundingAccountId} onChange={event => setFundingAccountId(event.target.value)} disabled={!paymentMethodId || fundingAccountsLoading} required><option value="">{!paymentMethodId ? 'Choose payment method first' : fundingAccountsLoading ? 'Loading applicable accounts…' : 'Select financial account'}</option>{compatibleFundingAccounts.map(account => {
            const available = Number(account.availableBalance || 0);
            return <option key={account.id} value={account.id} disabled={available <= 0} style={{ fontWeight: available > 0 ? 700 : 400, color: available > 0 ? '#17251e' : '#9aa39e' }}>{account.institution?.name ? `${account.institution.name} · ` : ''}{account.name} · {available <= 0 ? '–' : `${money(available, account.currency || currency)} available`}</option>;
          })}</select>{paymentMethodId && !fundingAccountsLoading && compatibleFundingAccounts.length === 0 && <small className="amount-helper">No active financial accounts are available for this method and branch.</small>}</label>
          <label>Payment date<input type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} required/></label>
          <label>Reference <small>Optional</small><input value={reference} onChange={event => setReference(event.target.value)} placeholder="e.g. BANK-SETTLEMENT-1"/></label>
          <label>Memo <small>Optional</small><textarea value={memo} onChange={event => setMemo(event.target.value)} rows="2" placeholder="Credit-card statement payment"/></label>
        </div>}
        <div className="payment-preview"><span>Payment amount</span><strong>{money(suggestedAmount, currency)}</strong><div className={`payment-mode-preview ${paymentMode}`}><b>{paymentModeLabels[paymentMode]}</b><small>{paymentMode === 'partial' ? `${money(Math.max(0, paymentBasis - suggestedAmount), currency)} will remain due` : paymentMode === 'overpayment' ? `${money(Math.max(0, suggestedAmount - paymentBasis), currency)} becomes card credit` : 'This clears the selected balance'}</small></div><small>{selectedStatement ? selectedStatement.number : 'Automatically allocate oldest balance first'}</small></div>
        <button className="primary-button wide" disabled={!paymentReady || optionsLoading || fundingAccountsLoading} onClick={() => { setPaymentError(''); setConfirmationOpen(true); }}><ShieldCheck size={15}/>Review payment</button><p className="payment-api-note">You will confirm before this payment is posted.</p>
      </aside>
    </section>
    {confirmationOpen && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !submittingPayment && setConfirmationOpen(false)}><form className="modal credit-payment-confirm" onSubmit={submitCreditCardPayment}><div className="modal-head"><div><p className="eyebrow">CONFIRM CARD PAYMENT</p><h2>Post {money(suggestedAmount, currency)}?</h2></div><button type="button" className="icon-button" onClick={() => setConfirmationOpen(false)} disabled={submittingPayment}><X size={19}/></button></div><p className="modal-intro">This immediately moves funds, posts the journal entry, and updates the card balance.</p><div className="payment-confirm-summary"><div><span>Payment type</span><strong className={paymentMode}>{paymentModeLabels[paymentMode]}</strong></div><div><span>Card</span><strong>{card.name}</strong></div><div><span>Allocation</span><strong>{selectedStatement?.number || 'Oldest unpaid first'}</strong></div><div><span>From</span><strong>{selectedFundingAccount?.name || '—'}</strong></div><div><span>Method</span><strong>{selectedPaymentMethod?.name || '—'}</strong></div><div><span>Payment date</span><strong>{calendarDate(paymentDate)}</strong></div><div><span>Amount due before</span><strong>{money(paymentBasis, currency)}</strong></div></div>{paymentMode === 'overpayment' && <div className="overpayment-notice"><CircleHelp size={16}/><span><strong>{money(suggestedAmount - paymentBasis, currency)} overpayment</strong> will pay the next open statement first; any remainder becomes card credit.</span></div>}<div className="modal-actions"><button type="button" className="text-button" onClick={() => setConfirmationOpen(false)} disabled={submittingPayment}>Go back</button><button type="submit" className="primary-button" disabled={submittingPayment}>{submittingPayment ? <><RefreshCw className="spin" size={15}/>Posting…</> : <><Check size={15}/>Post payment</>}</button></div></form></div>}
    {paymentResult && <div className="modal-backdrop"><div className="modal payment-success-modal"><div className="success-icon"><Check size={28}/></div><p className="eyebrow">PAYMENT POSTED</p><h2>{money(paymentResult.amount, currency)}</h2><span className={`payment-result-mode ${paymentResult.payment_mode}`}>{paymentModeLabels[paymentResult.payment_mode] || humanize(paymentResult.payment_mode)}</span><p>{paymentResult.payment?.number || 'The payment'} was posted successfully. The card now has {money(paymentResult.amount_due_after, currency)} remaining due.</p><div className="payment-result-breakdown"><span>Selected statement<strong>{money(paymentResult.allocated_amount, currency)}</strong></span><span>Carried forward<strong>{money(paymentResult.carried_forward_amount, currency)}</strong></span><span>Unapplied credit<strong>{money(paymentResult.unapplied_credit_amount, currency)}</strong></span></div><button className="primary-button wide" onClick={() => { setPaymentResult(null); setRefreshVersion(version => version + 1); }}>Done</button></div></div>}
  </main>;
}

function CreditCardAdjustmentsPage({ cardId, onBack }) {
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const asOf = useMemo(() => new URLSearchParams(window.location.search).get('as_of') || today, [today]);
  const [card, setCard] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [chartAccountsLoading, setChartAccountsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [paymentObligationId, setPaymentObligationId] = useState('');
  const [adjustmentAccountId, setAdjustmentAccountId] = useState('');
  const [actualAmountDue, setActualAmountDue] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(today);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdAdjustment, setCreatedAdjustment] = useState(null);
  const [auditAdjustment, setAuditAdjustment] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    Promise.all([
      accountingApi.creditCard(cardId, `?as_of=${encodeURIComponent(asOf)}`),
      accountingApi.creditCardAdjustments(cardId),
    ]).then(([cardResponse, adjustmentResponse]) => {
      if (!current) return;
      const cardRecord = cardResponse?.data || cardResponse;
      const adjustmentRecords = Array.isArray(adjustmentResponse) ? adjustmentResponse : adjustmentResponse?.data || adjustmentResponse?.adjustments || [];
      setCard(cardRecord);
      setAdjustments(adjustmentRecords);
    }).catch(requestError => current && setError(requestError.message || 'Credit-card adjustments could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [asOf, cardId, refreshVersion]);

  useEffect(() => {
    if (!card) return;
    let current = true;
    setChartAccountsLoading(true);
    loadActiveChartAccounts()
      .then(records => current && setChartAccounts(adjustmentLedgerAccounts(records.filter(item => String(item.id) !== String(card.chart_account_id)))))
      .catch(requestError => current && setError(requestError.message || 'Adjustment ledger accounts could not be loaded.'))
      .finally(() => current && setChartAccountsLoading(false));
    return () => { current = false; };
  }, [card]);

  const obligationOptions = useMemo(() => {
    if (!card) return [];
    const records = [...(card.unpaid_statements || []), ...(card.statement_history || [])];
    const seen = new Set();
    return records.map(statement => ({
      ...statement,
      obligationId: statement.payment_obligation_id || statement.obligation_id || statement.id,
    })).filter(statement => {
      const key = String(statement.obligationId);
      if (!statement.obligationId || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [card]);

  useEffect(() => {
    if (!card || paymentObligationId) return;
    const first = obligationOptions.find(item => Number(item.balance_due || 0) > 0) || obligationOptions[0];
    if (first) setPaymentObligationId(String(first.obligationId));
  }, [card, obligationOptions, paymentObligationId]);

  const selectedObligation = obligationOptions.find(item => String(item.obligationId) === String(paymentObligationId));
  const expectedAmount = Number(selectedObligation?.balance_due ?? selectedObligation?.amount_due ?? card?.amount_due ?? 0);

  useEffect(() => {
    if (!card) return;
    setActualAmountDue(String(expectedAmount));
  }, [card, expectedAmount, paymentObligationId]);

  const currency = card?.currency || 'PHP';
  const adjustmentAmount = Number(actualAmountDue || 0) - expectedAmount;
  const adjustmentDirection = adjustmentAmount > 0 ? 'Increase liability' : adjustmentAmount < 0 ? 'Reduce liability' : 'No adjustment';
  const selectedAdjustmentAccount = chartAccounts.find(item => item.choiceKey === adjustmentAccountId);
  const canSubmit = Boolean(paymentObligationId && adjustmentAccountId && adjustmentDate && reason.trim() && Number(actualAmountDue) >= 0 && Math.abs(adjustmentAmount) >= .005);

  const submitAdjustment = async event => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await accountingApi.createCreditCardAdjustment(cardId, {
        payment_obligation_id: Number(paymentObligationId),
        adjustment_account_id: Number(selectedAdjustmentAccount.id),
        actual_amount_due: Number(actualAmountDue),
        adjustment_date: adjustmentDate,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        reason: reason.trim(),
      });
      setCreatedAdjustment(response?.data || response);
      setConfirmOpen(false);
      setReason('');
      setReference('');
      setAdjustmentAccountId('');
      setRefreshVersion(version => version + 1);
    } catch (requestError) {
      const validationMessage = requestError.details && Object.values(requestError.details).flat()[0];
      setError(validationMessage || requestError.message || 'The adjustment could not be posted.');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openAudit = async adjustment => {
    setAuditLoading(true);
    setError('');
    try {
      const response = await accountingApi.creditCardAdjustment(cardId, adjustment.id);
      setAuditAdjustment(response?.data || response);
    } catch (requestError) {
      setError(requestError.message || 'Adjustment details could not be loaded.');
    } finally {
      setAuditLoading(false);
    }
  };

  const voidAdjustment = async event => {
    event.preventDefault();
    if (!voidTarget || !voidReason.trim()) return;
    setVoiding(true);
    setError('');
    try {
      await accountingApi.voidCreditCardAdjustment(cardId, voidTarget.id, voidReason.trim());
      setVoidTarget(null);
      setVoidReason('');
      setAuditAdjustment(null);
      setRefreshVersion(version => version + 1);
    } catch (requestError) {
      const validationMessage = requestError.details && Object.values(requestError.details).flat()[0];
      setError(validationMessage || requestError.message || 'The adjustment could not be voided.');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Credit card details</button><section className="panel account-state"><RefreshCw className="spin" size={22}/><h2>Loading adjustments…</h2><p>Fetching the card balance and adjustment audit trail.</p></section></main>;
  if (!card) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Credit card details</button><section className="panel account-state error-state"><CircleHelp size={24}/><h2>Adjustment page could not be loaded</h2><p>{error || 'Credit card not found.'}</p></section></main>;

  return <main className="content inner-page credit-adjustments-page">
    <div className="credit-adjustment-pagebar"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Credit card details</button><div><p className="eyebrow">CREDIT CARD CONTROL</p><h1>Balance and due adjustments</h1><p>Reconcile the portal with the card issuer's actual statement.</p></div><button className="secondary-button" onClick={() => setRefreshVersion(version => version + 1)}><RefreshCw size={15}/>Refresh</button></div>
    {error && <div className="payment-form-error adjustment-page-error" role="alert"><CircleHelp size={15}/><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={14}/></button></div>}
    <section className="adjustment-context panel">
      <div><span>Credit card</span><strong>{card.name}</strong><small>{creditCardIdentity(card).accountNumber}</small></div>
      <div><span>Portal amount due</span><strong>{money(card.amount_due, currency)}</strong><small>As of {calendarDate(asOf)}</small></div>
      <div><span>Outstanding balance</span><strong>{money(card.outstanding_balance, currency)}</strong><small>{money(card.available_credit, currency)} available credit</small></div>
      <div><span>Posted adjustments</span><strong>{adjustments.length}</strong><small>Complete audit history below</small></div>
    </section>

    <section className="adjustment-workspace">
      <form className="panel adjustment-form" onSubmit={event => { event.preventDefault(); if (canSubmit) setConfirmOpen(true); }}>
        <div className="panel-head"><div><h2>Match the actual statement</h2><p>Only the difference is posted to the ledger.</p></div><span className="adjustment-form-icon"><SlidersHorizontal size={19}/></span></div>
        <div className="adjustment-form-fields">
          {obligationOptions.length > 0 ? <label>Statement / obligation<select value={paymentObligationId} onChange={event => setPaymentObligationId(event.target.value)} required><option value="">Select statement</option>{obligationOptions.map(item => <option key={item.obligationId} value={item.obligationId}>{item.number || `Obligation ${item.obligationId}`} · {money(item.balance_due ?? item.amount_due, currency)} expected</option>)}</select></label> : <label>Payment obligation ID<input type="number" min="1" value={paymentObligationId} onChange={event => setPaymentObligationId(event.target.value)} placeholder="Enter the statement obligation ID" required/><small>The card API did not return statement options, so enter the obligation ID directly.</small></label>}
          <label>Adjustment reason<select value={adjustmentAccountId} onChange={event => setAdjustmentAccountId(event.target.value)} disabled={chartAccountsLoading || chartAccounts.length === 0} required><option value="">{chartAccountsLoading ? 'Loading adjustment reasons…' : chartAccounts.length ? 'Select why the amount due differs' : 'No applicable ledger accounts found'}</option>{chartAccounts.map(item => <option key={item.choiceKey} value={item.choiceKey}>{item.choiceLabel}</option>)}</select><small>{!chartAccountsLoading && chartAccounts.length === 0 ? 'Add an active Owner Equity or General Expense leaf account.' : 'The correct ledger account is selected automatically.'}</small></label>
          <label>Actual amount due<input type="number" min="0" step="0.01" value={actualAmountDue} onChange={event => setActualAmountDue(event.target.value)} required/></label>
          <label>Adjustment date<input type="date" value={adjustmentDate} onChange={event => setAdjustmentDate(event.target.value)} required/></label>
          <label>Reference <small>Optional</small><input value={reference} onChange={event => setReference(event.target.value)} placeholder="e.g. BDO-AMEX-SOA-2026-10"/></label>
          <label className="adjustment-reason">Reason<textarea rows="3" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why the issuer amount differs from the portal" required/></label>
        </div>
        <button className="primary-button wide" disabled={!canSubmit}><ShieldCheck size={15}/>Review adjustment</button>
      </form>
      <aside className={`adjustment-preview ${adjustmentAmount > 0 ? 'increase' : adjustmentAmount < 0 ? 'decrease' : ''}`}>
        <span>Adjustment preview</span><h2>{money(Math.abs(adjustmentAmount), currency)}</h2><strong>{adjustmentDirection}</strong>
        <dl><div><dt>Portal expects</dt><dd>{money(expectedAmount, currency)}</dd></div><div><dt>Actual statement</dt><dd>{money(actualAmountDue, currency)}</dd></div><div><dt>Difference posted</dt><dd>{adjustmentAmount > 0 ? '+' : adjustmentAmount < 0 ? '−' : ''}{money(Math.abs(adjustmentAmount), currency)}</dd></div></dl>
        <p>{adjustmentAmount > 0 ? 'The card liability will increase.' : adjustmentAmount < 0 ? 'The card liability will decrease.' : 'Enter a different actual amount to create an adjustment.'}</p>
      </aside>
    </section>

    <section className="panel adjustment-history-panel"><div className="panel-head"><div><h2>Adjustment history</h2><p>Posted corrections and their journal audit trail</p></div><span className="transaction-count">{adjustments.length} records</span></div>
      {adjustments.length === 0 ? <div className="transaction-state"><SlidersHorizontal size={21}/><strong>No adjustments posted</strong><span>Corrections will appear here after they are posted.</span></div> : <div className="adjustment-history-list">{adjustments.map(adjustment => {
        const isVoided = Boolean(adjustment.voided_at || String(adjustment.status || '').toLowerCase() === 'voided');
        const amount = Number(adjustment.adjustment_amount ?? adjustment.amount ?? 0);
        return <article className="adjustment-history-row" key={adjustment.id}><div><span className={`history-status ${isVoided ? 'voided' : 'posted'}`}>{isVoided ? 'Voided' : humanize(adjustment.direction || adjustment.status || 'Posted')}</span><strong>{money(Math.abs(amount), currency)}</strong><small>{calendarDate(adjustment.adjustment_date || adjustment.date || adjustment.created_at)}</small></div><div><span>Expected before</span><strong>{money(adjustment.expected_amount_due_before, currency)}</strong><small>{money(adjustment.paid_amount_before, currency)} paid before</small></div><div><span>Actual amount due</span><strong>{money(adjustment.actual_amount_due, currency)}</strong><small>{adjustment.reference || 'No reference'}</small></div><div><span>Reason</span><strong>{adjustment.reason || '—'}</strong><small>{adjustment.adjustment_account?.name || adjustment.chart_account?.name || `Account ${adjustment.adjustment_account_id || '—'}`}</small></div><div className="adjustment-row-actions"><button type="button" onClick={() => openAudit(adjustment)} disabled={auditLoading}>View audit</button>{!isVoided && <button type="button" className="void-link" onClick={() => { setVoidTarget(adjustment); setVoidReason(''); }}>Void</button>}</div></article>;
      })}</div>}
    </section>

    {confirmOpen && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !submitting && setConfirmOpen(false)}><form className="modal adjustment-confirm-modal" onSubmit={submitAdjustment}><div className="modal-head"><div><p className="eyebrow">CONFIRM ADJUSTMENT</p><h2>Post {money(Math.abs(adjustmentAmount), currency)}?</h2></div><button type="button" className="icon-button" onClick={() => setConfirmOpen(false)} disabled={submitting}><X size={19}/></button></div><p className="modal-intro">This posts a journal entry and changes the card liability. It cannot be edited after posting; an incorrect entry must be voided.</p><div className="payment-confirm-summary"><div><span>Direction</span><strong>{adjustmentDirection}</strong></div><div><span>Expected due</span><strong>{money(expectedAmount, currency)}</strong></div><div><span>Actual due</span><strong>{money(actualAmountDue, currency)}</strong></div><div><span>Adjustment account</span><strong>{selectedAdjustmentAccount ? `${selectedAdjustmentAccount.code || ''} ${selectedAdjustmentAccount.name}`.trim() : '—'}</strong></div><div><span>Reference</span><strong>{reference || '—'}</strong></div><div><span>Date</span><strong>{calendarDate(adjustmentDate)}</strong></div></div><div className="modal-actions"><button type="button" className="text-button" onClick={() => setConfirmOpen(false)} disabled={submitting}>Go back</button><button type="submit" className="primary-button" disabled={submitting}>{submitting ? <><RefreshCw className="spin" size={15}/>Posting…</> : <><Check size={15}/>Post adjustment</>}</button></div></form></div>}

    {createdAdjustment && <div className="modal-backdrop"><div className="modal payment-success-modal"><div className="success-icon"><Check size={28}/></div><p className="eyebrow">ADJUSTMENT POSTED</p><h2>{money(Math.abs(Number(createdAdjustment.adjustment_amount ?? adjustmentAmount)), currency)}</h2><p>The difference was posted to the card and its journal transaction is now part of the audit trail.</p><div className="payment-result-breakdown"><span>Expected before<strong>{money(createdAdjustment.expected_amount_due_before ?? expectedAmount, currency)}</strong></span><span>Actual due<strong>{money(createdAdjustment.actual_amount_due ?? actualAmountDue, currency)}</strong></span></div><button className="primary-button wide" onClick={() => setCreatedAdjustment(null)}>Done</button></div></div>}

    {auditAdjustment && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setAuditAdjustment(null)}><div className="modal adjustment-audit-modal"><div className="modal-head"><div><p className="eyebrow">ADJUSTMENT AUDIT</p><h2>{auditAdjustment.reference || `Adjustment ${auditAdjustment.id}`}</h2></div><button className="icon-button" onClick={() => setAuditAdjustment(null)}><X size={19}/></button></div><div className="audit-detail-grid"><span>Expected before<strong>{money(auditAdjustment.expected_amount_due_before, currency)}</strong></span><span>Paid before<strong>{money(auditAdjustment.paid_amount_before, currency)}</strong></span><span>Actual due<strong>{money(auditAdjustment.actual_amount_due, currency)}</strong></span><span>Adjustment<strong>{money(Math.abs(Number(auditAdjustment.adjustment_amount ?? auditAdjustment.amount)), currency)}</strong></span><span>Direction<strong>{humanize(auditAdjustment.direction || 'Adjustment')}</strong></span><span>Posting date<strong>{calendarDate(auditAdjustment.adjustment_date || auditAdjustment.created_at)}</strong></span><span>Statement<strong>{auditAdjustment.payment_obligation?.number || auditAdjustment.statement?.number || auditAdjustment.payment_obligation_id || '—'}</strong></span><span>Adjustment account<strong>{auditAdjustment.adjustment_account?.name || auditAdjustment.chart_account?.name || auditAdjustment.adjustment_account_id || '—'}</strong></span><span>Journal<strong>{auditAdjustment.journal_entry?.number || auditAdjustment.journal?.number || '—'}</strong></span><span>Created by<strong>{auditAdjustment.creator?.name || auditAdjustment.created_by?.name || '—'}</strong></span><span>Posted by<strong>{auditAdjustment.posted_by?.name || '—'}</strong></span><span>Status<strong>{humanize(auditAdjustment.status || (auditAdjustment.voided_at ? 'voided' : 'posted'))}</strong></span></div><div className="audit-reason"><span>Reason</span><p>{auditAdjustment.reason || '—'}</p></div>{(auditAdjustment.journal_entry?.lines || auditAdjustment.journal_lines || []).length > 0 && <div className="journal-lines"><h3>Journal lines</h3>{(auditAdjustment.journal_entry?.lines || auditAdjustment.journal_lines).map((line, index) => <div key={line.id || index}><span>{line.account?.name || line.chart_account?.name || line.account_name || `Line ${index + 1}`}</span><strong>Debit {money(line.debit, currency)}</strong><strong>Credit {money(line.credit, currency)}</strong></div>)}</div>}</div></div>}

    {voidTarget && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !voiding && setVoidTarget(null)}><form className="modal confirmation-modal" onSubmit={voidAdjustment}><div className="modal-head"><div><p className="eyebrow">VOID ADJUSTMENT</p><h2>Reverse this journal entry?</h2></div><button type="button" className="icon-button" onClick={() => setVoidTarget(null)} disabled={voiding}><X size={19}/></button></div><p className="modal-intro">Voiding preserves the original record and posts the appropriate reversal.</p><label className="void-reason-field">Reason<textarea rows="3" value={voidReason} onChange={event => setVoidReason(event.target.value)} placeholder="Why is this adjustment being voided?" required/></label><div className="modal-actions"><button type="button" className="text-button" onClick={() => setVoidTarget(null)} disabled={voiding}>Cancel</button><button type="submit" className="primary-button danger-button" disabled={voiding || !voidReason.trim()}>{voiding ? <><RefreshCw className="spin" size={15}/>Voiding…</> : 'Void adjustment'}</button></div></form></div>}
  </main>;
}

const loanToday = () => localIsoDate(new Date());

function loanDueNotice(dueDate, asOfDate = loanToday()) {
  if (!dueDate) return { className: '', label: 'Schedule complete' };
  const due = new Date(`${dueDate}T00:00:00`);
  const asOf = new Date(`${asOfDate}T00:00:00`);
  const days = Math.round((due.getTime() - asOf.getTime()) / 86400000);
  if (days < 0) return { className: 'overdue', label: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` };
  if (days === 0) return { className: 'urgent', label: 'Due today' };
  if (days === 1) return { className: 'urgent', label: 'Due tomorrow' };
  if (days <= 3) return { className: 'urgent', label: `Due in ${days} days` };
  if (days <= 7) return { className: 'due-soon', label: `Due in ${days} days` };
  return { className: '', label: 'Scheduled payment' };
}

function nextMonthDate(value) {
  const date = new Date(`${value || loanToday()}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return localIsoDate(date);
}

function loanParty(loan = {}) {
  const account = loan.financial_account || loan.financialAccount || {};
  return loan.borrower_name || loan.user_account?.name || loan.userAccount?.name || account.user_account?.name || account.userAccount?.name || loan.party || loan.counterparty?.name || loan.party_name || 'Unnamed borrower';
}

function loanAccount(loan = {}) {
  const account = loan.financial_account || loan.financialAccount || {};
  const institution = loan.financial_institution || loan.financialInstitution || {};
  return institution.name || loan.financial_institution_name || account.name || account.account_name || (loan.borrower_type === 'company' ? 'External lender' : 'No financial institution');
}

function loanUserAccountName(loan = {}) {
  const account = loan.financial_account || loan.financialAccount || {};
  const userAccount = loan.user_account || loan.userAccount || account.user_account || account.userAccount || {};
  return loan.user_account_name || loan.userAccountName || userAccount.name || userAccount.display_name || userAccount.username || account.user_account_name || '';
}

function loanErrorMessage(error, fallback) {
  const details = error?.details;
  const first = details && Object.values(details).flat()[0];
  return first || error?.message || fallback;
}

const fallbackLoanBorrowerOptions = [
  { value: 'company', label: 'External person / company', accounts: [] },
  { value: 'bank', label: 'Bank', accounts: [] },
  { value: 'credit_card', label: 'Credit card', accounts: [] },
];

function isLoanFinancialAccount(account) {
  const type = String(account.kind || account.account_type || account.category || account.type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return ['cash', 'bank', 'bank_account', 'checking', 'checking_account', 'credit_card'].includes(type);
}

function loanAccountUserId(account = {}) {
  return account.user_account?.id || account.userAccount?.id || account.account_holder || account.user_account_id || null;
}

function NewLoanModal({ close, onCreated }) {
  const today = loanToday();
  const [form, setForm] = useState({
    borrower_type: 'company', financial_institution_id: '', user_account_choice_id: '', direction: 'borrowed', party_name: '', financial_account_id: '',
    first_due_date: nextMonthDate(today), currency: 'PHP', principal_amount: '',
    total_interest_amount: '', term_months: '12', notes: '',
  });
  const [financialInstitutions, setFinancialInstitutions] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [borrowerOptions, setBorrowerOptions] = useState(fallbackLoanBorrowerOptions);
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [loadingUserAccounts, setLoadingUserAccounts] = useState(true);
  const [loadingBorrowers, setLoadingBorrowers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    Promise.allSettled([
      loadFinancialInstitutions('?type=bank&active=1'),
      accountingApi.userAccountList().then(apiRecords),
    ]).then(([institutionResult, userAccountResult]) => {
      if (!current) return;
      if (institutionResult.status === 'fulfilled') setFinancialInstitutions(institutionResult.value);
      if (userAccountResult.status === 'fulfilled') setUserAccounts(userAccountResult.value);
      const failedRequest = [institutionResult, userAccountResult].find(result => result.status === 'rejected');
      if (failedRequest) setError(loanErrorMessage(failedRequest.reason, 'Loan choices could not be loaded. Please try again.'));
    }).finally(() => {
      if (!current) return;
      setLoadingChoices(false);
      setLoadingUserAccounts(false);
    });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (form.currency.length !== 3) return;
    let current = true;
    setLoadingBorrowers(true);
    accountingApi.loanCreationOptions(form.currency)
      .then(response => {
        if (!current) return;
        const returnedOptions = (response?.borrower_types || [])
          .filter(option => ['company', 'bank', 'credit_card'].includes(option.value));
        const options = fallbackLoanBorrowerOptions.map(fallback => {
          const returned = returnedOptions.find(option => option.value === fallback.value);
          return returned ? { ...fallback, ...returned, label: fallback.label } : fallback;
        });
        setBorrowerOptions(options);
        setForm(existing => {
          const selectedType = options.find(option => option.value === existing.borrower_type);
          const needsFinancialAccount = selectedType?.requires_financial_account
            ?? existing.borrower_type === 'credit_card';
          const accountIsValid = !needsFinancialAccount || selectedType?.accounts?.some(account => String(account.id) === String(existing.financial_account_id));
          return accountIsValid ? existing : { ...existing, user_account_choice_id: '', financial_account_id: '' };
        });
      })
      .catch(requestError => {
        if (!current) return;
        setBorrowerOptions(fallbackLoanBorrowerOptions);
        setError(loanErrorMessage(requestError, 'Borrower choices could not be loaded. Please try again.'));
      })
      .finally(() => current && setLoadingBorrowers(false));
    return () => { current = false; };
  }, [form.currency]);

  const update = (name, value) => setForm(current => ({ ...current, [name]: value }));
  const principal = Number(form.principal_amount || 0);
  const interest = Number(form.total_interest_amount || 0);
  const months = Math.max(1, Number(form.term_months || 1));
  const firstDueDay = form.first_due_date ? Number(form.first_due_date.slice(-2)) : null;
  const total = principal + interest;
  const monthly = total / months;
  const selectedBorrowerOption = borrowerOptions.find(option => option.value === form.borrower_type);
  const borrowerAccounts = selectedBorrowerOption?.accounts || [];
  const isBankLoan = form.borrower_type === 'bank';
  const usesFinancialInstitution = isBankLoan
    ? (selectedBorrowerOption?.requires_financial_institution ?? true)
    : form.borrower_type === 'credit_card';
  const usesUserAccount = isBankLoan
    ? (selectedBorrowerOption?.requires_user_account ?? true)
    : form.borrower_type === 'credit_card';
  const requiresFinancialAccount = selectedBorrowerOption?.requires_financial_account
    ?? form.borrower_type === 'credit_card';
  const userAccountChoices = userAccounts;
  const selectedUserAccount = userAccountChoices.find(account => String(account.id) === String(form.user_account_choice_id));
  const chooseBorrowerType = value => setForm(current => ({
    ...current,
    borrower_type: value,
    financial_institution_id: '',
    user_account_choice_id: '',
    financial_account_id: '',
    ...(value === 'company' ? {} : { party_name: '' }),
  }));
  const chooseUserAccount = value => {
    const account = requiresFinancialAccount
      ? borrowerAccounts.find(item => String(loanAccountUserId(item)) === String(value))
      : null;
    setForm(current => ({ ...current, user_account_choice_id: value, financial_account_id: account?.id || '', currency: account?.currency || current.currency }));
  };
  const chooseFinancialInstitution = value => setForm(current => ({ ...current, financial_institution_id: value, user_account_choice_id: '', financial_account_id: '' }));
  const lenderDescription = form.borrower_type === 'company'
    ? 'Enter the external person or company lending money to the business.'
    : isBankLoan
      ? 'Select the lending institution and the user account taking the loan.'
      : 'Select the card issuer and its linked financial account.';

  const submit = async event => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    if (requiresFinancialAccount && !form.financial_account_id) {
      setError('The selected user account does not have an associated financial account for this loan type.');
      setSubmitting(false);
      return;
    }
    const payload = {
      borrower_type: form.borrower_type,
      direction: form.direction,
      start_date: today,
      first_due_date: form.first_due_date,
      currency: form.currency,
      principal_amount: Number(form.principal_amount),
      total_interest: Number(form.total_interest_amount || 0),
      term_months: Number(form.term_months),
      notes: form.notes || null,
    };
    if (form.borrower_type === 'company') payload.party_name = form.party_name.trim();
    if (isBankLoan) {
      payload.financial_institution_id = Number(form.financial_institution_id);
      payload.user_account_id = Number(form.user_account_choice_id);
    }
    if (requiresFinancialAccount) payload.financial_account_id = Number(form.financial_account_id);
    try {
      const created = await accountingApi.createLoan(payload);
      onCreated(created);
    } catch (requestError) {
      setError(loanErrorMessage(requestError, 'The loan could not be created.'));
    } finally { setSubmitting(false); }
  };

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
    <section className="modal loan-modal" role="dialog" aria-modal="true" aria-labelledby="new-loan-title">
      <div className="modal-head"><div><p className="eyebrow">NEW BORROWING</p><h2 id="new-loan-title">Create a loan</h2><p>Record money borrowed, its lender, interest, and repayment term.</p></div><button className="icon-button" onClick={close} aria-label="Close"><X size={18}/></button></div>
      <form onSubmit={submit}>
        <div className="loan-borrower-selector"><label>Lender type<select value={form.borrower_type} onChange={event => chooseBorrowerType(event.target.value)} disabled={loadingBorrowers}>{borrowerOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><p>{lenderDescription}</p></div>
        <div className="loan-form-grid">
          {form.borrower_type === 'company' && <label className="span-2">Lender — person or company
            <input value={form.party_name} onChange={event => update('party_name', event.target.value)} placeholder="Enter the lender's name" required/>
          </label>}
          {usesFinancialInstitution && <label className="span-2">Financial institution<select value={form.financial_institution_id} onChange={event => chooseFinancialInstitution(event.target.value)} required disabled={loadingChoices}><option value="">{loadingChoices ? 'Loading financial institutions…' : 'Select a financial institution'}</option>{financialInstitutions.map(institution => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select><small className="account-field-help">Select the institution lending the money.</small></label>}
          {usesUserAccount && form.financial_institution_id && <label className="span-2">User account<select value={form.user_account_choice_id} onChange={event => chooseUserAccount(event.target.value)} required disabled={loadingUserAccounts}><option value="">{loadingUserAccounts ? 'Loading user accounts…' : userAccountChoices.length ? 'Select a user account' : 'No user accounts available'}</option>{userAccountChoices.map(account => <option key={account.id} value={account.id}>{account.name || account.display_name || `User account ${account.id}`}</option>)}</select><small className="account-field-help">{selectedUserAccount ? `Selected user account: ${selectedUserAccount.name || selectedUserAccount.display_name || `User account ${selectedUserAccount.id}`}` : 'All user accounts are loaded from the user-account list.'}</small></label>}
          <label>Principal amount<input type="number" min="0.01" step="0.0001" value={form.principal_amount} onChange={event => update('principal_amount', event.target.value)} placeholder="e.g. 1,000,000" required/></label>
          <label>Total fixed interest<input type="number" min="0" step="0.0001" value={form.total_interest_amount} onChange={event => update('total_interest_amount', event.target.value)} placeholder="e.g. 200,000"/></label>
          <label className="span-2">First due date<input type="date" min={today} value={form.first_due_date} onChange={event => update('first_due_date', event.target.value)} required/><small className="account-field-help">{firstDueDay ? `Following installments will use day ${firstDueDay} of each month.` : 'This date sets the monthly payment day.'}</small></label>
          <label>Term in months<input type="number" min="1" max="600" value={form.term_months} onChange={event => update('term_months', event.target.value)} required/></label>
          <label>Currency<input value={form.currency} maxLength="3" onChange={event => update('currency', event.target.value.toUpperCase())} required/></label>
          <label className="span-2">Notes<textarea rows="3" value={form.notes} onChange={event => update('notes', event.target.value)} placeholder="Optional agreement details"/></label>
        </div>
        <div className="loan-preview"><div><span>Total repayable</span><strong>{money(total, form.currency)}</strong></div><div><span>Estimated monthly installment</span><strong>{money(monthly, form.currency)}</strong><small>{months} monthly payments</small></div></div>
        {error && <div className="loan-message error" role="alert"><CircleHelp size={16}/><span>{error}</span></div>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" disabled={submitting || loadingChoices || loadingBorrowers}>{submitting ? <><RefreshCw className="spin" size={16}/>Creating…</> : <><HandCoins size={16}/>Create loan</>}</button></div>
      </form>
    </section>
  </div>;
}

function LoanPaymentModal({ loan, installment, close, onPaid }) {
  const scheduledRemaining = installment
    ? Number(installment.outstanding_amount ?? Math.max(0, Number(installment.total_due || 0) - Number(installment.paid_amount || 0)))
    : 0;
  const installmentAmount = scheduledRemaining + Number(installment?.overdue_interest_due || 0);
  const [form, setForm] = useState({
    payment_method_id: '',
    financial_institution_id: '',
    financial_account_id: '',
    excess_treatment: '',
    payment_date: loanToday(),
    amount: installmentAmount > 0 ? String(Math.min(installmentAmount, Number(loan.balance_due || installmentAmount))) : '',
    reference: '',
    notes: '',
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [excessTreatments, setExcessTreatments] = useState([]);
  const [financialInstitutions, setFinancialInstitutions] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    setMethodsLoading(true);
    accountingApi.loanPaymentMethods(loan.id)
      .then(response => {
        if (!current) return;
        const root = response?.data && !Array.isArray(response.data) ? response.data : response || {};
        const methods = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : root.payment_methods || root.methods || [];
        const treatmentRecords = root.excess_treatments || root.excess_treatment_options || root.excess_options || [];
        setPaymentMethods(methods);
        setExcessTreatments(treatmentRecords.map(option => typeof option === 'string'
          ? { value: option, label: humanize(option) }
          : { ...option, value: option.value || option.code, label: option.label || option.name || humanize(option.value || option.code) }));
      })
      .catch(requestError => current && setError(loanErrorMessage(requestError, 'Payment methods could not be loaded.')))
      .finally(() => current && setMethodsLoading(false));
    return () => { current = false; };
  }, [loan.id]);

  useEffect(() => {
    if (!form.payment_method_id) {
      setFinancialInstitutions([]);
      setPaymentAccounts([]);
      return;
    }
    let current = true;
    setAccountsLoading(true);
    setPaymentAccounts([]);
    setError('');
    accountingApi.loanPaymentAccounts(loan.id, form.payment_method_id, form.financial_institution_id)
      .then(response => {
        if (!current) return;
        const root = response?.data && !Array.isArray(response.data) ? response.data : response || {};
        const accounts = Array.isArray(root)
          ? root
          : root.accounts || root.financial_accounts || (Array.isArray(response?.data) ? response.data : []);
        const returnedInstitutions = root.financial_institutions || root.institutions || [];
        const derivedInstitutions = accounts.map(account => account.financial_institution || account.institution).filter(Boolean);
        const institutions = [...returnedInstitutions, ...derivedInstitutions].filter((institution, index, list) => institution?.id && list.findIndex(item => String(item?.id) === String(institution.id)) === index);
        if (!form.financial_institution_id) setFinancialInstitutions(institutions);
        setPaymentAccounts(accounts);
      })
      .catch(requestError => current && setError(loanErrorMessage(requestError, 'Compatible payment accounts could not be loaded.')))
      .finally(() => current && setAccountsLoading(false));
    return () => { current = false; };
  }, [form.financial_institution_id, form.payment_method_id, loan.id]);

  const requiresInstitution = financialInstitutions.length > 0;
  const visibleAccounts = requiresInstitution && !form.financial_institution_id ? [] : paymentAccounts;
  const treatmentOptions = excessTreatments.length ? excessTreatments : [
    { value: 'overdue_interest', label: 'Overdue interest' },
    { value: 'overpayment', label: 'Overpayment' },
  ];
  const excessAmount = Math.max(0, Number(form.amount || 0) - scheduledRemaining);
  const hasExcess = excessAmount > .00005;
  const selectedTreatment = treatmentOptions.find(option => option.value === form.excess_treatment);
  const createsAutomaticExpense = loan.direction === 'borrowed' && hasExcess && form.excess_treatment === 'overdue_interest';
  const automaticExpense = selectedTreatment?.automatic_expense || selectedTreatment?.expense || {};
  const automaticExpenseType = selectedTreatment?.expense_type_name || selectedTreatment?.expense_type?.name || automaticExpense.type_name || automaticExpense.type?.name || 'Financial expense';
  const automaticExpenseCategory = selectedTreatment?.expense_category_name || selectedTreatment?.expense_category?.name || automaticExpense.category_name || automaticExpense.category?.name || 'Loan interest';
  const automaticExpenseItem = selectedTreatment?.expense_item_name || selectedTreatment?.expense_item?.name || automaticExpense.item_name || automaticExpense.item?.name || 'Borrowed-loan overdue interest';
  const automaticChartAccount = selectedTreatment?.chart_account_name || selectedTreatment?.chart_account?.name || automaticExpense.chart_account_name || automaticExpense.chart_account?.name || 'Selected automatically from expense item';
  const automaticExpenseReference = form.reference || `${loan.number}${installment ? ` · Installment ${installment.installment_number}` : ''}`;
  const selectedPaymentMethod = paymentMethods.find(method => String(method.id) === String(form.payment_method_id));
  const paymentMethodKey = String(selectedPaymentMethod?.code || selectedPaymentMethod?.slug || selectedPaymentMethod?.type || selectedPaymentMethod?.name || '').toLowerCase();
  const isChequePayment = paymentMethodKey.includes('cheque') || paymentMethodKey.includes('check');
  const paymentAccountLabel = account => {
    const institutionName = account.financial_institution?.name || account.institution?.name;
    const accountName = account.name || account.account_name || `Account ${account.id}`;
    const currentBalance = account.current_balance ?? account.currentBalance ?? account.balance;
    const balanceLabel = isChequePayment || currentBalance == null ? '' : ` · ${money(currentBalance, account.currency || loan.currency)} current balance`;
    return `${institutionName ? `${institutionName} · ` : ''}${accountName}${balanceLabel}`;
  };
  const choosePaymentMethod = value => {
    setFinancialInstitutions([]);
    setPaymentAccounts([]);
    setForm(current => ({ ...current, payment_method_id: value, financial_institution_id: '', financial_account_id: '' }));
  };
  const chooseInstitution = value => setForm(current => ({ ...current, financial_institution_id: value, financial_account_id: '' }));
  const submit = async event => {
    event.preventDefault(); setSubmitting(true); setError('');
    if (hasExcess && !form.excess_treatment) {
      setError('Choose how the amount above this installment should be treated.');
      setSubmitting(false);
      return;
    }
    try {
      await accountingApi.createLoanPayment(loan.id, {
        payment_method_id: Number(form.payment_method_id),
        financial_account_id: Number(form.financial_account_id),
        payment_date: form.payment_date,
        amount: Number(form.amount),
        ...(hasExcess ? { excess_treatment: form.excess_treatment } : {}),
        reference: form.reference || null,
        notes: form.notes || null,
      });
      onPaid();
    } catch (requestError) { setError(loanErrorMessage(requestError, 'Payment could not be recorded.')); }
    finally { setSubmitting(false); }
  };
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
<section className="modal loan-payment-modal" role="dialog" aria-modal="true">
<div className="modal-head">
<div>
<p className="eyebrow">RECORD PAYMENT</p>
<h2>{loan.direction === 'lent' ? 'Payment received' : 'Payment made'}</h2>
<p>{loan.number}{installment ? ` · Installment ${installment.installment_number} due ${calendarDate(installment.due_date)}` : ''}</p>
</div>
<button className="icon-button" onClick={close} aria-label="Close">
<X size={18}/>
</button>
</div>
<form onSubmit={submit}>
<div className="loan-payment-scroll">
<div className="loan-form-grid">
<label className="span-2">Payment method<select value={form.payment_method_id} onChange={event => choosePaymentMethod(event.target.value)} required disabled={methodsLoading}>
<option value="">{methodsLoading ? 'Loading payment methods…' : 'Select payment method first'}</option>{paymentMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}</select>
</label>{form.payment_method_id && requiresInstitution && <label className="span-2">Financial institution<select value={form.financial_institution_id} onChange={event => chooseInstitution(event.target.value)} required disabled={accountsLoading}>
<option value="">Select a financial institution</option>{financialInstitutions.map(institution => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select>
</label>}<label className="span-2">Financial account<select value={form.financial_account_id} onChange={event => setForm(current => ({ ...current, financial_account_id: event.target.value }))} required disabled={!form.payment_method_id || accountsLoading || (requiresInstitution && !form.financial_institution_id)}>
<option value="">{!form.payment_method_id ? 'Choose payment method first' : accountsLoading ? 'Loading compatible accounts…' : requiresInstitution && !form.financial_institution_id ? 'Choose financial institution first' : visibleAccounts.length ? 'Select a financial account' : 'No compatible accounts available'}</option>{visibleAccounts.map(account => <option key={account.id} value={account.id}>{paymentAccountLabel(account)}</option>)}</select>
</label>
<label>Payment date<input type="date" min={String(loan.start_date || '').slice(0, 10)} value={form.payment_date} onChange={event => setForm(current => ({ ...current, payment_date: event.target.value }))} required/>
</label>
<label>Amount<input type="number" min="0.0001" max={Number(loan.balance_due || 0)} step="0.0001" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value, ...(Number(event.target.value || 0) <= scheduledRemaining ? { excess_treatment: '' } : {}) }))} placeholder="0.00" required/>
</label>{hasExcess && <label className="span-2">Treat the extra {money(excessAmount, loan.currency)} as<select value={form.excess_treatment} onChange={event => setForm(current => ({ ...current, excess_treatment: event.target.value }))} required>
<option value="">Choose excess treatment</option>{treatmentOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
<small className="account-field-help">{selectedTreatment?.description || (form.excess_treatment === 'overdue_interest' ? `Record the extra amount as ${loan.direction === 'lent' ? 'interest income' : 'an interest expense'}.` : form.excess_treatment === 'overpayment' ? 'Apply the extra amount against the next installment.' : 'Choose whether the extra amount is interest or an advance payment.')}</small>
</label>}<label>Reference<input value={form.reference} onChange={event => setForm(current => ({ ...current, reference: event.target.value }))} placeholder="Receipt or transfer number"/>
</label>
<label>Notes<input value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Optional note"/>
</label>
</div>{createsAutomaticExpense && <fieldset className="loan-auto-expense" disabled aria-label="Automatic expense entry">
<div className="loan-auto-expense-head">
<span className="loan-auto-expense-icon"><ReceiptText size={16}/></span>
<div><strong>Automatic expense entry</strong><small>Created once when this borrowed-loan payment is recorded.</small></div>
<em>Locked</em>
</div>
<div className="loan-auto-expense-grid">
<label>Expense type<input value={automaticExpenseType} readOnly/></label>
<label>Expense category<input value={automaticExpenseCategory} readOnly/></label>
<label>Expense<input value={automaticExpenseItem} readOnly/></label>
<label>Chart account<input value={automaticChartAccount} readOnly/></label>
<label>Expense date<input value={form.payment_date} readOnly/></label>
<label>Expense amount<input value={money(excessAmount, loan.currency)} readOnly/></label>
<label className="span-2">Reference<input value={automaticExpenseReference} readOnly/></label>
</div>
<p>The fields are managed by accounting and cannot be edited here. Recording the payment posts this as a system-generated expense; no separate expense submission is sent.</p>
</fieldset>}{error && <div className="loan-message error">
<CircleHelp size={16}/>
<span>{error}</span>
</div>}
</div>
<div className="modal-actions">
<button type="button" className="secondary-button" onClick={close}>Cancel</button>
<button className="primary-button" disabled={submitting || methodsLoading || accountsLoading || !form.payment_method_id || !form.financial_account_id || (hasExcess && !form.excess_treatment)}>{submitting ? 'Recording…' : createsAutomaticExpense ? 'Record payment & expense' : 'Record payment'}</button>
</div>
</form>
</section>
</div>;
}

function LoanDetailPage({ loanId, onBack }) {
  const [asOf, setAsOf] = useState(loanToday());
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentInstallment, setPaymentInstallment] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    accountingApi.loan(loanId, `?as_of_date=${encodeURIComponent(asOf)}`)
      .then(record => { if (current) setLoan(record); })
      .catch(requestError => current && setError(loanErrorMessage(requestError, 'Loan details could not be loaded.')))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [loanId, asOf, refreshVersion]);
  const cancel = async () => {
    if (!window.confirm('Cancel this loan? This is only allowed before any payments are recorded.')) return;
    try { await accountingApi.cancelLoan(loanId); setRefreshVersion(value => value + 1); } catch (requestError) { setError(loanErrorMessage(requestError, 'Loan could not be cancelled.')); }
  };
  if (loading) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Back to loans</button><section className="panel transaction-state"><RefreshCw className="spin" size={22}/><strong>Loading loan…</strong></section></main>;
  if (error && !loan) return <main className="content inner-page"><button className="back-button" onClick={onBack}><ArrowLeft size={16}/>Back to loans</button><section className="panel transaction-state error-state"><CircleHelp size={22}/><strong>Unable to load loan</strong><span>{error}</span></section></main>;
  const installments = loan?.installments || [];
  const loanPaymentEntries = Array.isArray(loan?.payment_entries) ? loan.payment_entries : (loan?.payments || []);
  const paidTotal = loan?.amount_paid != null
    ? Number(loan.amount_paid)
    : loanPaymentEntries.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paymentMethodName = entry => entry?.payment_method?.name || entry?.payment_method_name || 'Payment method not specified';
  const paymentAccountName = entry => [entry?.financial_institution?.name, entry?.financial_account?.name || entry?.financial_account_name].filter(Boolean).join(' · ') || 'Account not specified';
  const paymentOrigin = entry => {
    const source = entry?.allocation_source || entry?.payment_source || entry?.source_type || entry?.origin;
    if (source) return humanize(source);
    if (entry?.is_overpayment === true || entry?.is_overpayment === 1 || entry?.is_overpayment === '1' || entry?.is_direct_payment === false || entry?.is_direct === false || entry?.source_installment_id) return 'Applied overpayment';
    return 'Direct payment';
  };
  return <main className="content inner-page loan-detail-page">
<div className="loan-detail-top">
<button className="back-button" onClick={onBack}>
<ArrowLeft size={16}/>Back to loans</button>
<label>Balance as of<input type="date" value={asOf} onChange={event => setAsOf(event.target.value)}/>
</label>
</div>{error && <div className="loan-message error">
<CircleHelp size={16}/>
<span>{error}</span>
</div>}<section className={`loan-hero ${loan.direction}`}>
<div>
<span className="loan-direction-label">{loan.direction === 'lent' ? 'LOAN RECEIVABLE' : 'LOAN PAYABLE'}</span>
<h1>{loanParty(loan)}</h1>
<p>{loan.number} · {loanAccount(loan)}</p>
</div>
<span className={`loan-state ${loan.status}`}>{humanize(loan.status)}</span>
<div className="loan-hero-balance">
<span>Balance due</span>
<strong>{money(loan.balance_due, loan.currency)}</strong>
<small>as of {calendarDate(loan.as_of_date)}</small>
</div>
<div className="loan-hero-actions">{loan.status === 'active' && (!loan.payments || loan.payments.length === 0) && <button className="loan-quiet-button" onClick={cancel}>Cancel loan</button>}</div>
</section>
<section className="loan-stat-grid">
<article>
<span>Original principal</span>
<strong>{money(loan.principal_amount, loan.currency)}</strong>
</article>
<article>
<span>Fixed interest</span>
<strong>{money(loan.total_interest_amount, loan.currency)}</strong>
</article>
<article>
<span>Paid to date</span>
<strong>{money(paidTotal, loan.currency)}</strong>
</article>
<article>
<span>Remaining balance</span>
<strong>{money(loan.balance_due, loan.currency)}</strong>
<small>Amount still payable</small>
</article>
<article className={Number(loan.overdue_interest_balance) > 0 ? 'late' : ''}>
<span>Outstanding overdue interest</span>
<strong>{money(loan.overdue_interest_balance, loan.currency)}</strong>
<small>Accrued but not yet paid</small>
</article>
</section>
<section className="loan-payment-breakdown" aria-label="Loan payment allocation">
<article><span>Scheduled interest paid</span><strong>{money(loan.interest_paid_amount, loan.currency)}</strong></article>
<article className="overdue"><span>Overdue interest paid (expense)</span><strong>{money(loan.overdue_interest_paid_amount, loan.currency)}</strong></article>
<article className="overpayment"><span>Overpayment</span><strong>{money(loan.overpayment_amount, loan.currency)}</strong></article>
<article><span>Total interest paid</span><strong>{money(loan.total_interest_paid_amount, loan.currency)}</strong></article>
<p>Outstanding overdue interest is still unpaid. Overdue interest paid is the cumulative amount already settled and recorded as an expense; it does not reduce future installment balances.</p>
</section>
<section className="loan-detail-grid">
<article className="panel loan-schedule">
<div className="panel-head">
<div>
<h2>Repayment schedule</h2>
<p>{installments.length} monthly installments · first due {calendarDate(loan.first_due_date)}</p>
</div>
<span className="loan-rate">
<Percent size={14}/>{Number(loan.overdue_interest_rate || 0)}% {loan.overdue_interest_period || 'annual'} overdue</span>
</div>
<div className="loan-schedule-table">
<div className="loan-installment-row loan-installment-head">
<span>#</span>
<span>Due date</span>
<span>Principal</span>
<span>Interest</span>
<span>Payment breakdown</span>
<span>Payment entries</span>
<span>Now due</span>
<span>Status</span>
<span>Action</span>
</div>{installments.map(item => { const isPaid = ['paid', 'settled'].includes(String(item.status || '').toLowerCase()) || Number(item.outstanding_amount) === 0; const hasPayment = Number(item.paid_amount || 0) !== 0 || Number(item.interest_paid_amount || 0) !== 0 || Number(item.overdue_interest_paid_amount || 0) !== 0 || Number(item.overpayment_amount || 0) !== 0 || Number(item.total_interest_paid_amount || 0) !== 0; const paymentEntries = Array.isArray(item.payment_entries) ? item.payment_entries : []; return <div className="loan-installment-row" key={item.id}>
<span>{item.installment_number}</span>
<span>{calendarDate(item.due_date)}</span>
<span>{money(item.principal_due, loan.currency)}</span>
<span>{money(item.interest_due, loan.currency)}</span>
<div className="loan-installment-payment"><strong>{money(item.paid_amount, loan.currency)}</strong>{hasPayment && <dl><div><dt>Scheduled interest</dt><dd>{money(item.interest_paid_amount, loan.currency)}</dd></div><div className="overdue"><dt>Overdue expense</dt><dd>{money(item.overdue_interest_paid_amount, loan.currency)}</dd></div><div className="overpayment"><dt>Overpayment</dt><dd>{money(item.overpayment_amount, loan.currency)}</dd></div><div className="total"><dt>Total interest</dt><dd>{money(item.total_interest_paid_amount, loan.currency)}</dd></div></dl>}</div>
<div className="loan-installment-entries">{paymentEntries.length ? paymentEntries.map((entry, index) => <article key={entry.payment_id || entry.id || `${item.id}-${index}`} title={entry.notes || ''}><div><strong>{paymentMethodName(entry)}</strong><b>{money(entry.allocated_amount ?? entry.amount, loan.currency)}</b></div><small>{calendarDate(entry.payment_date)} · {paymentOrigin(entry)}</small><small>{paymentAccountName(entry)}</small>{entry.reference && <small>Ref: {entry.reference}</small>}</article>) : <span>—</span>}</div>
<span>
<strong>{money(item.total_due, loan.currency)}</strong>{Number(item.overdue_interest_due) > 0 && <small>+ {money(item.overdue_interest_due, loan.currency)} late interest</small>}</span>
<span>
<em className={`installment-status ${item.status}`}>{humanize(item.status)}</em>
</span>
<span>{loan.status === 'active' && !isPaid ? <button type="button" className="loan-installment-action" onClick={() => setPaymentInstallment(item)}>Make payment</button> : '—'}</span>
</div>; })}</div>
</article>
<aside className="panel loan-side-panel">
<div className="panel-head">
<div>
<h2>Agreement</h2>
<p>Loan terms and activity</p>
</div>
</div>
<dl>
<div>
<dt>Direction</dt>
<dd>{loan.direction === 'lent' ? 'Business lent money' : 'Business borrowed money'}</dd>
</div>
<div>
<dt>Start date</dt>
<dd>{calendarDate(loan.start_date)}</dd>
</div>
<div>
<dt>Term</dt>
<dd>{loan.term_months} months</dd>
</div>
<div>
<dt>Total repayable</dt>
<dd>{money(loan.total_amount, loan.currency)}</dd>
</div>
<div>
<dt>Account</dt>
<dd>{loanAccount(loan)}</dd>
</div>
</dl>{loan.notes && <div className="loan-notes">
<span>Notes</span>
<p>{loan.notes}</p>
</div>}<div className="loan-payment-history">
<h3>Payment history</h3>{loanPaymentEntries.length === 0 ? <p>No payments recorded yet.</p> : [...loanPaymentEntries].reverse().map((payment, index) => <div key={payment.payment_id || payment.id || index}>
<span>
<strong>{money(payment.amount, loan.currency)}</strong>
<small>{calendarDate(payment.payment_date)} · {paymentMethodName(payment)}</small>
<small>{paymentAccountName(payment)}{payment.reference ? ` · Ref: ${payment.reference}` : ''}</small>
</span>
<span className="loan-payment-origin"><Check size={13}/>{paymentOrigin(payment)}</span>
</div>)}</div>
</aside>
</section>{paymentInstallment && <LoanPaymentModal loan={loan} installment={paymentInstallment} close={() => setPaymentInstallment(null)} onPaid={() => { setPaymentInstallment(null); setRefreshVersion(value => value + 1); }}/>}</main>;
}

function LoanListPage({ onSelectLoan, createInitially = false, onExitCreate }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [financialInstitutionId, setFinancialInstitutionId] = useState('');
  const [userAccountId, setUserAccountId] = useState('');
  const [institutionChoices, setInstitutionChoices] = useState([]);
  const [userAccountChoices, setUserAccountChoices] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loanTotals, setLoanTotals] = useState({});
  const [monthlyDues, setMonthlyDues] = useState({ amount: null, count: 0, overdueCount: 0, error: '' });
  const [createOpen, setCreateOpen] = useState(createInitially);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let current = true;
    Promise.allSettled([
      loadFinancialInstitutions('?type=bank&active=1'),
      accountingApi.userAccountList().then(apiRecords),
    ]).then(([institutionResult, userAccountResult]) => {
      if (!current) return;
      if (institutionResult.status === 'fulfilled') setInstitutionChoices(institutionResult.value);
      if (userAccountResult.status === 'fulfilled') setUserAccountChoices(userAccountResult.value);
    });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    const asOfDate = loanToday();
    const monthStart = `${asOfDate.slice(0, 7)}-01`;
    const monthEndDate = new Date(`${monthStart}T00:00:00`);
    monthEndDate.setMonth(monthEndDate.getMonth() + 1);
    monthEndDate.setDate(0);
    const params = new URLSearchParams({ day_from: monthStart, day_to: localIsoDate(monthEndDate), as_of_date: asOfDate, include_overdue: '1' });
    setMonthlyDues(currentValue => ({ ...currentValue, amount: null, error: '' }));
    accountingApi.loanInstallmentUpcomingDues(`?${params.toString()}`).then(response => {
      if (!current) return;
      const payload = response?.data && !Array.isArray(response.data) ? response.data : response || {};
      const summary = response?.summary || payload?.summary || payload;
      setMonthlyDues({
        amount: Number(summary.total_amount_due ?? 0),
        count: Number(summary.total_installments ?? payload.total ?? 0),
        overdueCount: Number(summary.overdue_count ?? 0),
        error: '',
      });
    }).catch(requestError => {
      if (current) setMonthlyDues({ amount: null, count: 0, overdueCount: 0, error: loanErrorMessage(requestError, 'Monthly dues could not be loaded.') });
    });
    return () => { current = false; };
  }, [refreshVersion]);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    const params = new URLSearchParams({ direction: 'borrowed', page: String(page), per_page: '15' });
    if (status !== 'all') params.set('status', status);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (financialInstitutionId) params.set('financial_institution_id', financialInstitutionId);
    if (userAccountId) params.set('user_account_id', userAccountId);
    accountingApi.loanList(`?${params.toString()}`).then(response => {
      if (!current) return;
      const records = apiRecords(response).map(loan => {
        const principalAmount = Number(loan.principal_amount || 0);
        const interestAmount = Number(loan.interest_amount ?? loan.total_interest_amount ?? loan.total_interest ?? 0);
        const totalLoanAmount = Number(loan.total_loan_amount ?? loan.total_amount ?? loan.total_repayable ?? (principalAmount + interestAmount));
        const balanceAmount = Number(loan.balance_amount ?? loan.balance_due ?? loan.balance ?? 0);
        return {
          ...loan,
          number: loan.number || loan.loan_number,
          funding_type: loan.funding_type || loan.borrower_type,
          total_interest_amount: interestAmount,
          total_amount: totalLoanAmount,
          balance_due: balanceAmount,
          amount_paid: Number(loan.amount_paid ?? loan.paid_amount ?? Math.max(0, totalLoanAmount - balanceAmount)),
          interest_expense_amount: Number(loan.interest_expense_amount || 0),
          overdue_interest_expense_amount: Number(loan.overdue_interest_expense_amount || 0),
          overdue_installment_count: loan.overdue_installment_count ?? loan.overdue_count,
        };
      });
      const responseTotals = response?.totals || response?.data?.totals || response?.meta?.totals || {};
      setLoans(records);
      setLoanTotals(responseTotals);
      setTotalCount(Number(response?.total ?? response?.data?.total ?? responseTotals.loan_count ?? records.length));
      setLastPage(Number(response?.last_page ?? response?.data?.last_page ?? 1));
    })
      .catch(requestError => current && setError(loanErrorMessage(requestError, 'Loans could not be loaded.')))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [status, debouncedSearch, financialInstitutionId, userAccountId, page, refreshVersion]);
  const visible = [...loans].sort((first, second) => {
    const firstDue = first.next_due_date ? new Date(`${first.next_due_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
    const secondDue = second.next_due_date ? new Date(`${second.next_due_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
    return firstDue - secondDue || Number(first.id || 0) - Number(second.id || 0);
  });
  const totalPrincipal = Number(loanTotals.principal_amount ?? loans.reduce((sum, loan) => sum + Number(loan.principal_amount || 0), 0));
  const totalLoan = Number(loanTotals.total_loan_amount ?? loans.reduce((sum, loan) => sum + Number(loan.total_amount || 0), 0));
  const totalInterest = Number(loanTotals.interest_amount ?? loans.reduce((sum, loan) => sum + Number(loan.total_interest_amount || 0), 0));
  const totalBalance = Number(loanTotals.balance_amount ?? loans.reduce((sum, loan) => sum + Number(loan.balance_due || 0), 0));
  const totalPaid = Number(loanTotals.paid_amount ?? Math.max(0, totalLoan - totalBalance));
  const totalInterestExpense = Number(loanTotals.interest_expense_amount ?? loans.reduce((sum, loan) => sum + Number(loan.interest_expense_amount || 0), 0));
  const totalOverdueInterestExpense = Number(loanTotals.overdue_interest_expense_amount ?? loans.reduce((sum, loan) => sum + Number(loan.overdue_interest_expense_amount || 0), 0));
  const displayedLoanCount = Number(loanTotals.loan_count ?? totalCount);
  const closeCreate = () => { setCreateOpen(false); onExitCreate?.(); };
  return <main className="content inner-page loans-page">
<div className="title-row">
<div>
<p className="eyebrow">MONEY</p>
<h1>Loan list</h1>
<p>Manage borrowed loans, installment schedules, and upcoming payments.</p>
</div>
<button className="primary-button" onClick={() => setCreateOpen(true)}>
<Plus size={17}/>New loan</button>
</div>
<section className="loan-overview">
<article className="loan-overview-feature">
<span>
<HandCoins size={18}/>Outstanding balance</span>
<strong>{money(totalBalance, loans[0]?.currency || 'PHP')}</strong>
<small>Current page · {displayedLoanCount} {status === 'all' ? '' : status} loan{displayedLoanCount === 1 ? '' : 's'}</small>
</article>
<article className="loan-principal-summary">
<span>Total loan principal</span>
<strong>{money(totalPrincipal, loans[0]?.currency || 'PHP')}</strong>
<small>Original amount borrowed</small>
</article>
<article className="loan-total-interest-summary">
<span>Total interest</span>
<strong>{money(totalInterest, loans[0]?.currency || 'PHP')}</strong>
<small>Interest over the full loan terms</small>
</article>
<article className="loan-total-repayable-summary">
<span>Total with interest</span>
<strong>{money(totalLoan, loans[0]?.currency || 'PHP')}</strong>
<small>Principal plus total interest</small>
</article>
<article>
<span>Paid amount</span>
<strong>{money(totalPaid, loans[0]?.currency || 'PHP')}</strong>
<small>Applied toward loan balances</small>
</article>
<article>
<span>Interest expense</span>
<strong>{money(totalInterestExpense, loans[0]?.currency || 'PHP')}</strong>
<small>Borrowed loans only</small>
</article>
<article>
<span>Overdue-interest expense</span>
<strong className={totalOverdueInterestExpense ? 'red' : ''}>{money(totalOverdueInterestExpense, loans[0]?.currency || 'PHP')}</strong>
<small>Borrowed loans only</small>
</article>
<article className="loan-monthly-due-summary" title={monthlyDues.error || undefined}>
<span>Payable this month</span>
<strong className={monthlyDues.overdueCount ? 'red' : ''}>{monthlyDues.error ? 'Unavailable' : monthlyDues.amount == null ? 'Loading…' : money(monthlyDues.amount, loans[0]?.currency || 'PHP')}</strong>
<small>{monthlyDues.error ? 'Could not load upcoming dues' : monthlyDues.amount == null ? 'Checking unpaid installments' : `${monthlyDues.count} unpaid installment${monthlyDues.count === 1 ? '' : 's'} · ${monthlyDues.overdueCount} overdue`}</small>
</article>
</section>
<section className="panel loan-list-panel">
<div className="loan-toolbar loan-list-toolbar">
<div className="loan-toolbar-right">
<label className="small-search">
<Search size={16}/>
<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search loan, institution, or user"/>
</label>
<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
<option value="all">All statuses</option>
<option value="active">Active</option>
<option value="paid">Paid</option>
<option value="cancelled">Cancelled</option>
</select>
<select value={financialInstitutionId} onChange={event => { setFinancialInstitutionId(event.target.value); setPage(1); }}>
<option value="">All institutions</option>{institutionChoices.map(institution => <option key={institution.id} value={institution.id}>{institution.name}</option>)}</select>
<select value={userAccountId} onChange={event => { setUserAccountId(event.target.value); setPage(1); }}>
<option value="">All user accounts</option>{userAccountChoices.map(account => <option key={account.id} value={account.id}>{account.name || account.display_name || `User account ${account.id}`}</option>)}</select>
<button className="icon-button" onClick={() => setRefreshVersion(value => value + 1)} aria-label="Refresh loans">
<RefreshCw className={loading ? 'spin' : ''} size={17}/>
</button>
</div>
</div>{loading && <div className="transaction-state">
<RefreshCw className="spin" size={21}/>
<strong>Loading loans…</strong>
</div>}{!loading && error && <div className="transaction-state error-state">
<CircleHelp size={21}/>
<strong>Unable to load loans</strong>
<span>{error}</span>
</div>}{!loading && !error && visible.length === 0 && <div className="loan-empty">
<span>
<HandCoins size={23}/>
</span>
<h2>{debouncedSearch || financialInstitutionId || userAccountId ? 'No loans match your filters' : 'No loans here yet'}</h2>
<p>{debouncedSearch || financialInstitutionId || userAccountId ? 'Try another loan number, institution, user account, or status.' : 'Create a borrowed loan and its payment schedule will appear here.'}</p>{!debouncedSearch && !financialInstitutionId && !userAccountId && <button className="primary-button" onClick={() => setCreateOpen(true)}>
<Plus size={16}/>Create first loan</button>}</div>}{!loading && !error && visible.length > 0 && <div className="loan-list">
<div className="loan-list-row loan-list-head">
<span>Loan / Funding</span>
<span>User account</span>
<span>Principal amount</span>
<span>Total interest</span>
<span>Next due date</span>
<span>Due amount</span>
<span>Remaining balance</span>
<span>Status</span>
<span/>
</div>{visible.map(loan => { const hasLate = Number(loan.overdue_interest_balance || 0) > 0 || Number(loan.overdue_installment_count || 0) > 0; const userAccountName = loanUserAccountName(loan); const partyName = loanParty(loan); const fundingName = loanAccount(loan); const showFundingName = fundingName && fundingName.toLowerCase() !== partyName.toLowerCase(); const dueNotice = loanDueNotice(loan.next_due_date); return <button className="loan-list-row" key={loan.id} onClick={() => onSelectLoan(loan.id)}>
<span className="loan-person">
<i>
<UserRound size={16}/>
</i>
<span className="loan-person-details">
<span className="loan-title-line"><small className="loan-compact-reference" title={loan.number || `Loan ${loan.id}`}>ID {loan.id}</small><strong>{partyName}</strong></span>
<span className="loan-meta-line"><small className="loan-funding-summary">{humanize(loan.funding_type || loan.financial_account?.kind || 'Account')}{showFundingName ? ` · ${fundingName}` : ''}</small><em className={`direction-badge ${loan.direction}`}>{loan.direction === 'lent' ? <ArrowUpRight size={11}/> : <ArrowDownLeft size={11}/>} {humanize(loan.direction)}</em></span>
</span>
</span>
<span className="loan-user-account-cell">
{userAccountName ? <><span><UserRound size={12}/><strong>{userAccountName}</strong></span><small>Linked user account</small></> : <small>Not applicable</small>}
</span>
<span className="loan-total-cell">
<strong>{money(loan.principal_amount, loan.currency)}</strong>
<small>{money(loan.total_amount, loan.currency)} total repayable</small>
</span>
<span className="loan-interest-total-cell">
<strong>{money(loan.total_interest_amount, loan.currency)}</strong>
<small>Interest over loan term</small>
</span>
<span className={`loan-next-due ${dueNotice.className}`}>
<strong>{loan.next_due_date ? calendarDate(loan.next_due_date) : '—'}</strong>
<small>{dueNotice.label}</small>
</span>
<span className="loan-due-amount">
<strong>{loan.next_due_date ? money(loan.next_due_amount ?? loan.installment_amount, loan.currency) : '—'}</strong>
<small>{loan.next_due_date ? 'Amount currently due' : 'No amount due'}</small>
</span>
<span className="loan-balance-cell">
<strong>{money(loan.balance_due, loan.currency)}</strong>
<small>{money(loan.amount_paid, loan.currency)} paid to date</small>
{(Number(loan.interest_expense_amount) > 0 || Number(loan.overdue_interest_expense_amount) > 0) && <span className="loan-expense-tags">{Number(loan.interest_expense_amount) > 0 && <small className="loan-interest-expense">{money(loan.interest_expense_amount, loan.currency)} interest</small>}{Number(loan.overdue_interest_expense_amount) > 0 && <small className="loan-overdue-expense">{money(loan.overdue_interest_expense_amount, loan.currency)} overdue</small>}</span>}
</span>
<span className="loan-status-cell">
<em className={`loan-state ${hasLate && loan.status === 'active' ? 'overdue' : loan.status}`}>{hasLate && loan.status === 'active' ? `${loan.overdue_installment_count || ''} Overdue`.trim() : humanize(loan.status)}</em>
</span>
<ChevronRight className="loan-list-chevron" size={17}/>
</button>; })}</div>}{!loading && !error && lastPage > 1 && <div className="transfer-pagination">
<button type="button" className="secondary-button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}>
<ArrowLeft size={15}/>Previous</button>
<span>Page {page} of {lastPage}</span>
<button type="button" className="secondary-button" onClick={() => setPage(current => Math.min(lastPage, current + 1))} disabled={page === lastPage}>Next<ChevronRight size={15}/>
</button>
</div>}</section>{createOpen && <NewLoanModal close={closeCreate} onCreated={created => { setCreateOpen(false); onSelectLoan(created.id); }}/>}</main>;
}

function LoanUpcomingDuesPage({ onSelectLoan, onAddLoan }) {
  const today = loanToday();
  const initialHorizon = new Date(`${today}T00:00:00`);
  initialHorizon.setDate(initialHorizon.getDate() + 30);
  const [filters, setFilters] = useState({ day_from: today, day_to: localIsoDate(initialHorizon), as_of_date: today, include_overdue: true, direction: '', financial_account_id: '' });
  const [result, setResult] = useState({ data: [], total_installments: 0, total_amount_due: 0, overdue_count: 0, overdue_amount: 0, due_within_7_days_count: 0, due_within_7_days_amount: 0 });
  const [accountChoices, setAccountChoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    let current = true;
    accountingApi.financialAccounts('?active=1').then(response => {
      if (current) setAccountChoices(apiRecords(response).map(normalizeAccount));
    }).catch(() => { /* Due records remain available without optional account choices. */ });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    const params = new URLSearchParams({ day_from: filters.day_from, day_to: filters.day_to, as_of_date: filters.as_of_date, include_overdue: filters.include_overdue ? '1' : '0' });
    accountingApi.loanInstallmentUpcomingDues(`?${params.toString()}`)
      .then(response => {
        if (!current) return;
        const payload = response?.data && !Array.isArray(response.data) ? response.data : response || {};
        const summary = response?.summary || payload?.summary || payload;
        const records = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.installments) ? payload.installments : [];
        const data = records.map(item => {
          const loan = item.loan || {};
          const financialAccount = item.financial_account || loan.financial_account || {};
          const institution = item.financial_institution || loan.financial_institution || financialAccount.financial_institution || {};
          const userAccount = item.user_account || loan.user_account || financialAccount.user_account || {};
          const direction = item.direction || loan.direction || 'borrowed';
          const dueDate = item.due_date || item.installment_due_date;
          const isOverdue = item.is_overdue ?? (Boolean(dueDate) && dueDate < filters.as_of_date && Number(item.outstanding_amount ?? item.amount_due ?? 0) > 0);
          const paymentEntries = Array.isArray(item.payment_entries) ? item.payment_entries : [];
          return {
            ...item,
            loan,
            id: item.id || item.installment_id,
            loan_id: item.loan_id || loan.id,
            loan_number: item.loan_number || loan.number || loan.loan_number || `Loan ${item.loan_id || loan.id || ''}`.trim(),
            installment_number: item.installment_number ?? item.number,
            term_months: item.term_months || loan.term_months,
            due_date: dueDate,
            direction,
            payment_direction: item.payment_direction || (direction === 'lent' ? 'inflow' : 'outflow'),
            party: item.party || item.borrower_name || loanParty({ ...loan, user_account: userAccount }),
            user_account_name: item.user_account_name || userAccount.name || userAccount.display_name || userAccount.username || '',
            funding_type: item.funding_type || loan.funding_type || loan.borrower_type,
            financial_account_id: item.financial_account_id || financialAccount.id,
            financial_account: financialAccount.name || financialAccount.account_name || institution.name || '',
            financial_institution: institution.name || item.financial_institution_name || '',
            currency: item.currency || loan.currency || 'PHP',
            principal_due: item.principal_due ?? item.principal_amount ?? item.principal ?? 0,
            interest_due: item.interest_due ?? item.interest_amount ?? item.interest ?? 0,
            paid_amount: item.paid_amount ?? item.amount_paid ?? 0,
            outstanding_amount: item.outstanding_amount ?? item.balance_amount ?? item.amount_due ?? 0,
            overdue_interest_due: item.overdue_interest_due ?? item.overdue_interest_amount ?? 0,
            overpayment_amount: item.overpayment_amount ?? item.overpayment ?? 0,
            total_loan_amount: item.total_loan_amount ?? loan.total_loan_amount ?? loan.total_amount ?? 0,
            loan_paid_amount: item.loan_paid_amount ?? loan.amount_paid ?? loan.paid_amount ?? 0,
            loan_balance_amount: item.loan_balance_amount ?? loan.balance_amount ?? loan.balance_due ?? 0,
            amount_due: item.amount_due ?? item.total_amount_due ?? (Number(item.outstanding_amount || 0) + Number(item.overdue_interest_due || item.overdue_interest_amount || 0)),
            status: item.status || (isOverdue ? 'overdue' : 'pending'),
            is_overdue: Boolean(isOverdue),
            urgency: item.urgency || (isOverdue ? 'Overdue' : 'Upcoming'),
            payment_entries: paymentEntries,
          };
        });
        setResult({
          ...payload,
          ...summary,
          data,
          total_installments: Number(summary.total_installments ?? payload.total ?? data.length),
          total_amount_due: Number(summary.total_amount_due ?? 0),
          overdue_count: Number(summary.overdue_count ?? 0),
          overdue_amount: Number(summary.overdue_amount ?? 0),
          due_within_7_days_count: Number(summary.due_within_7_days_count ?? 0),
          due_within_7_days_amount: Number(summary.due_within_7_days_amount ?? 0),
        });
      })
      .catch(requestError => current && setError(loanErrorMessage(requestError, 'Upcoming loan dues could not be loaded.')))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [filters.day_from, filters.day_to, filters.as_of_date, filters.include_overdue, refreshVersion]);
  const dues = (result.data || []).filter(item => (!filters.direction || item.direction === filters.direction) && (!filters.financial_account_id || String(item.financial_account_id) === String(filters.financial_account_id))).sort((first, second) => String(first.due_date || '').localeCompare(String(second.due_date || '')) || Number(first.id || 0) - Number(second.id || 0));
  const currency = dues[0]?.currency || 'PHP';
  const recordedPayments = dues.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const paymentEntryCount = dues.reduce((sum, item) => sum + (item.payment_entries || []).length, 0);
  const totalOverpayments = dues.reduce((sum, item) => sum + Number(item.overpayment_amount || 0), 0);
  const updateFilter = event => {
    const { name, value } = event.target;
    setFilters(current => {
      const next = { ...current, [name]: value };
      if (name === 'day_from' && value > current.day_to) next.day_to = value;
      if (name === 'day_to' && value < current.day_from) next.day_from = value;
      return next;
    });
  };
  return <main className="content inner-page loans-page loan-dues-page">
    <div className="title-row"><div><p className="eyebrow">LOANS</p><h1>Upcoming dues</h1><p>Review overdue installments and payments coming due across every active loan.</p></div><button className="primary-button" onClick={onAddLoan}><Plus size={17}/>Add loan</button></div>
    <section className="loan-overview loan-due-overview">
      <article className="loan-overview-feature"><span><CalendarDays size={18}/>{calendarDate(result.day_from || filters.day_from)} – {calendarDate(result.day_to || filters.day_to)}</span><strong>{money(result.total_amount_due, currency)}</strong><small>{result.total_installments || 0} unpaid installment{Number(result.total_installments) === 1 ? '' : 's'}</small></article>
      <article className="loan-due-overdue-card"><span>Overdue</span><strong className={Number(result.overdue_count) ? 'red' : ''}>{money(result.overdue_amount, currency)}</strong><small>{result.overdue_count || 0} overdue installment{Number(result.overdue_count) === 1 ? '' : 's'}</small></article>
      <article className="loan-due-soon-card"><span>Due within 7 days</span><strong className={Number(result.due_within_7_days_count) ? 'amber' : ''}>{money(result.due_within_7_days_amount, currency)}</strong><small>{result.due_within_7_days_count || 0} installment{Number(result.due_within_7_days_count) === 1 ? '' : 's'} due soon</small></article>
      <article><span>Payments recorded</span><strong>{money(recordedPayments, currency)}</strong><small>{paymentEntryCount} payment entr{paymentEntryCount === 1 ? 'y' : 'ies'}{totalOverpayments > 0 ? ` · ${money(totalOverpayments, currency)} overpaid` : ''}</small></article>
    </section>
    <section className="panel loan-due-panel">
      <div className="loan-due-filters"><label>From<input name="day_from" type="date" value={filters.day_from} onChange={updateFilter}/></label><label>Through<input name="day_to" type="date" min={filters.day_from} value={filters.day_to} onChange={updateFilter}/></label><label>As of<input name="as_of_date" type="date" value={filters.as_of_date} onChange={updateFilter}/></label><label>Direction<select name="direction" value={filters.direction} onChange={updateFilter}><option value="">All directions</option><option value="lent">Incoming</option><option value="borrowed">Outgoing</option></select></label><label>Financial account<select name="financial_account_id" value={filters.financial_account_id} onChange={updateFilter}><option value="">All accounts</option>{accountChoices.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="loan-overdue-toggle"><input name="include_overdue" type="checkbox" checked={filters.include_overdue} onChange={event => setFilters(current => ({ ...current, include_overdue: event.target.checked }))}/><span>Include older overdue</span></label><button className="icon-button" onClick={() => setRefreshVersion(value => value + 1)} aria-label="Refresh upcoming dues"><RefreshCw className={loading ? 'spin' : ''} size={17}/></button></div>
      {loading && <div className="transaction-state"><RefreshCw className="spin" size={21}/><strong>Loading upcoming dues…</strong></div>}
      {!loading && error && <div className="transaction-state error-state"><CircleHelp size={21}/><strong>Unable to load upcoming dues</strong><span>{error}</span></div>}
      {!loading && !error && dues.length === 0 && <div className="loan-empty"><span><CalendarDays size={23}/></span><h2>No loan payments due</h2><p>There are no unpaid installments from {calendarDate(filters.day_from)} through {calendarDate(filters.day_to)}.</p></div>}
      {!loading && !error && dues.length > 0 && <div className="loan-due-list">
        <div className="loan-due-row loan-due-head"><span>Due</span><span>Loan / funding</span><span>User account</span><span>Installment</span><span>Payment progress</span><span>Late charges</span><span>Total due</span><span/></div>
        {dues.map(item => {
          const methods = [...new Set((item.payment_entries || []).map(entry => entry.payment_method?.name || entry.payment_method_name).filter(Boolean))];
          const dueNotice = loanDueNotice(item.due_date, filters.as_of_date);
          const funding = [...new Set([item.financial_institution, item.financial_account].filter(Boolean))].join(' · ') || humanize(item.funding_type || 'Account');
          return <button key={item.id} className={`loan-due-row ${item.is_overdue ? 'overdue' : dueNotice.className}`} onClick={() => onSelectLoan(item.loan_id)}>
            <span className="loan-due-date"><strong>{new Date(`${item.due_date}T00:00:00`).toLocaleDateString('en-PH', { day: '2-digit' })}</strong><small>{new Date(`${item.due_date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short' }).toUpperCase()}</small><em>{dueNotice.label}</em></span>
            <span className="loan-due-identity" title={item.loan_number}><strong><b>ID {item.loan_id}</b>{item.party}</strong><small>{funding}</small><small>{money(item.total_loan_amount, item.currency)} total · {money(item.loan_paid_amount, item.currency)} paid · {money(item.loan_balance_amount, item.currency)} balance</small></span>
            <span className="loan-due-user">{item.user_account_name ? <><strong><UserRound size={11}/>{item.user_account_name}</strong><small>Linked user account</small></> : <><strong>Not applicable</strong><small>No linked user</small></>}</span>
            <span className="loan-due-installment"><strong>#{item.installment_number} of {item.term_months}</strong><small>{money(item.principal_due, item.currency)} principal</small><small>{money(item.interest_due, item.currency)} interest</small></span>
            <span className="loan-due-progress"><strong>{money(item.outstanding_amount, item.currency)} outstanding</strong><small>{money(item.paid_amount, item.currency)} paid</small>{methods.length > 0 && <small>{item.payment_entries.length} payment{item.payment_entries.length === 1 ? '' : 's'} · {methods.join(', ')}</small>}</span>
            <span className={Number(item.overdue_interest_due) > 0 ? 'loan-due-charges red' : 'loan-due-charges'}><strong>{money(item.overdue_interest_due, item.currency)}</strong><small>Overdue interest</small>{Number(item.overpayment_amount) > 0 && <small>{money(item.overpayment_amount, item.currency)} overpayment</small>}</span>
            <span className="loan-due-total"><strong>{money(item.amount_due, item.currency)}</strong><small><em className={`installment-status ${item.status}`}>{humanize(item.status)}</em></small></span>
            <ChevronRight size={16}/>
          </button>;
        })}
      </div>}
    </section>
  </main>;
}

function LoansPage({ view = 'list', selectedLoanId, onSelectLoan, onBack, onAddLoan }) {
  if (selectedLoanId) return <LoanDetailPage loanId={selectedLoanId} onBack={onBack}/>;
  if (view === 'upcoming') return <LoanUpcomingDuesPage onSelectLoan={onSelectLoan} onAddLoan={onAddLoan}/>;
  return <LoanListPage onSelectLoan={onSelectLoan} createInitially={view === 'new'} onExitCreate={onBack}/>;
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
          <button className="login-submit" disabled={submitting}>{submitting ? <><RefreshCw className="spin" size={17}/>{isRegister ? 'Creating account…' : 'Signing in…'}</> : <>{isRegister ? 'Create viewer account' : 'Sign in to MDR Accounting'}<ChevronRight size={17}/></>}</button>
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
  const navigate = (page, resourceId = null, options = {}) => {
    let path = pagePaths[page] || '/';
    if (page === 'user-accounts' && options.view === 'new') {
      path = '/user-accounts/new';
    } else if (page === 'user-accounts' && resourceId != null) {
      path = `/user-accounts/${encodeURIComponent(resourceId)}${options.view === 'edit' ? '/edit' : ''}`;
    } else if (page === 'accounts' && options.view === 'new') {
      path = '/financial-accounts/new';
    } else if (page === 'accounts' && resourceId != null) {
      const accountView = options.view === 'adjustments' ? '/adjustments' : options.view === 'edit' ? '/edit' : '';
      path = `/financial-accounts/${encodeURIComponent(resourceId)}${accountView}`;
      const params = new URLSearchParams();
      if (options.asOf) params.set('as_of', options.asOf);
      if (options.from) params.set('from', options.from);
      if (params.size) path += `?${params.toString()}`;
    }
    if (page === 'credit-cards' && resourceId != null) {
      path = `/credit-cards/${encodeURIComponent(resourceId)}${options.view === 'adjustments' ? '/adjustments' : ''}`;
      if (options.asOf) path += `?as_of=${encodeURIComponent(options.asOf)}`;
    }
    if (page === 'loans' && options.view === 'new') path = '/loans/new';
    else if (page === 'loans' && options.view === 'upcoming') path = '/loans/upcoming';
    else if (page === 'loans' && resourceId != null) path = `/loans/${encodeURIComponent(resourceId)}`;
    if (page === 'expenses') {
      const expenseView = ['chart-accounts', 'types', 'categories', 'items', 'ledger', 'approvals'].includes(options.view)
        ? options.view
        : 'ledger';
      path = `/expenses/${expenseView}`;
    }
    if (`${window.location.pathname}${window.location.search}` !== path) window.history.pushState({}, '', path);
    setCurrentPath(path.split('?')[0]);
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
    if (active === 'cash-balance') return <CashBalancePage onOpenAccount={id => navigate('accounts', id)}/>;
    if (active === 'collections') return <PaymentsPage title="Collections" direction="in"/>;
    if (active === 'user-accounts') {
      const creatingAccount = currentPath === '/user-accounts/new';
      const editAccountId = currentPath.match(/^\/user-accounts\/([^/]+)\/edit$/)?.[1];
      const accountId = currentPath.match(/^\/user-accounts\/([^/]+)$/)?.[1];
      const selectedId = decodeURIComponent(editAccountId || accountId || '');
      const view = creatingAccount ? 'new' : editAccountId ? 'edit' : accountId ? 'detail' : 'list';
      return <UserAccountsWorkspace
        view={view}
        accountId={selectedId || null}
        onList={() => navigate('user-accounts')}
        onCreate={() => navigate('user-accounts', null, { view: 'new' })}
        onView={id => navigate('user-accounts', id)}
        onEdit={id => navigate('user-accounts', id, { view: 'edit' })}
        onSaved={id => navigate('user-accounts', id)}
      />;
    }
    if (active === 'accounts') {
      const creatingAccount = currentPath === '/financial-accounts/new';
      const adjustmentAccountId = currentPath.match(/^\/financial-accounts\/([^/]+)\/adjustments$/)?.[1];
      const editAccountId = currentPath.match(/^\/financial-accounts\/([^/]+)\/edit$/)?.[1];
      const accountId = currentPath.match(/^\/financial-accounts\/([^/]+)$/)?.[1];
      if (adjustmentAccountId) {
        const decodedId = decodeURIComponent(adjustmentAccountId);
        const params = new URLSearchParams(window.location.search);
        const asOf = params.get('as_of');
        const from = params.get('from');
        const onBack = from === 'credit-card' ? () => navigate('credit-cards', decodedId, { asOf }) : () => navigate('accounts', decodedId);
        return <FinancialAccountAdjustmentsPage accountId={decodedId} onBack={onBack}/>;
      }
      if (editAccountId) {
        const decodedId = decodeURIComponent(editAccountId);
        return <FinancialAccountEditPage accountId={decodedId} onBack={() => navigate('accounts', decodedId)} onSaved={() => navigate('accounts')}/>;
      }
      if (creatingAccount) {
        return <FinancialAccountEditPage onBack={() => navigate('accounts')} onSaved={() => navigate('accounts')}/>;
      }
      return accountId
        ? <AccountTransactionsPage accountId={decodeURIComponent(accountId)} onBack={() => navigate('accounts')} onEdit={() => navigate('accounts', decodeURIComponent(accountId), { view: 'edit' })} onAdjust={() => navigate('accounts', decodeURIComponent(accountId), { view: 'adjustments' })}/>
        : <AccountsPage onSelectAccount={id => navigate('accounts', id)} onAddAccount={() => navigate('accounts', null, { view: 'new' })}/>;
    }
    if (active === 'payments') return <PaymentsPage direction="out"/>;
    if (active === 'refunds') return <CustomerRefundsPage onViewList={() => navigate('refund-list')}/>;
    if (active === 'refund-list') return <CustomerRefundListPage onNewRefund={() => navigate('refunds')}/>;
    if (active === 'upcoming-dues') return <UpcomingDuesPage/>;
    if (active === 'reconciliation') return <ReconciliationPage/>;
    if (active === 'transfers') return <TransfersPage onViewHistory={() => navigate('transfer-history')}/>;
    if (active === 'transfer-history') return <TransferHistoryPage onNewTransfer={() => navigate('transfers')}/>;
    if (active === 'credit-cards') {
      const adjustmentCardId = currentPath.match(/^\/credit-cards\/([^/]+)\/adjustments$/)?.[1];
      const cardId = currentPath.match(/^\/credit-cards\/([^/]+)$/)?.[1];
      if (adjustmentCardId) {
        const decodedId = decodeURIComponent(adjustmentCardId);
        const asOf = new URLSearchParams(window.location.search).get('as_of');
        return <CreditCardAdjustmentsPage cardId={decodedId} onBack={() => navigate('credit-cards', decodedId, { asOf })}/>;
      }
      return cardId
        ? <CreditCardDetailPage cardId={decodeURIComponent(cardId)} onBack={() => navigate('credit-cards')} onAdjust={asOf => navigate('accounts', decodeURIComponent(cardId), { view: 'adjustments', asOf, from: 'credit-card' })}/>
        : <CreditCardsPage onSelectCard={(id, asOf) => navigate('credit-cards', id, { asOf })}/>;
    }
    if (active === 'loans') {
      const loanView = currentPath === '/loans/new' ? 'new' : currentPath === '/loans/upcoming' ? 'upcoming' : 'list';
      const loanId = loanView === 'list' ? currentPath.match(/^\/loans\/([^/]+)$/)?.[1] : null;
      return <LoansPage view={loanView} selectedLoanId={loanId ? decodeURIComponent(loanId) : null} onSelectLoan={id => navigate('loans', id)} onBack={() => navigate('loans')} onAddLoan={() => navigate('loans', null, { view: 'new' })}/>;
    }
    if (active === 'expenses') {
      const expenseView = currentPath.match(/^\/expenses\/([^/]+)$/)?.[1] || 'ledger';
      return <ExpensesWorkspace view={expenseView} onNavigate={view => navigate('expenses', null, { view })} user={session}/>;
    }
    if (active === 'ledger') return <GeneralLedgerPage/>;
    if (active === 'reports') return <ReportsPage/>;
    if (active === 'interbranch') return <InterbranchPage/>;
    return <PlaceholderPage active={active}/>;
  }, [active, currentPath, session]);
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
  return <div className="app-shell"><Sidebar active={active} currentPath={currentPath} setActive={navigate} open={menuOpen} close={()=>setMenuOpen(false)} user={session} onLogout={logout}/><div className="main-shell"><Header active={active} onMenu={()=>setMenuOpen(true)} onNew={()=>setModalOpen(true)}/>{page}</div>{modalOpen && <NewTransactionModal close={()=>setModalOpen(false)}/>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
