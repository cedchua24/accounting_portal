import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Building2, Check, ChevronLeft, ChevronRight, CircleHelp,
  CreditCard, Edit3, HandCoins, Mail, Phone, Plus, Power,
  RefreshCw, RotateCcw, Save, Search, ShieldCheck, Trash2, UserRound,
  Users, X,
} from 'lucide-react';
import { accountingApi } from './api.js';
import './user-accounts.css';

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

const emptyForm = {
  code: '',
  type: 'individual',
  name: '',
  email: '',
  phone: '',
  is_active: true,
};

function asBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return !['0', 'false', 'no', 'inactive'].includes(value.toLowerCase());
  return Boolean(value);
}

function unwrapRecord(response) {
  if (response?.data && !Array.isArray(response.data)) return response.data;
  return response || {};
}

function pageFromResponse(response) {
  if (Array.isArray(response)) {
    return {
      records: response,
      currentPage: 1,
      lastPage: 1,
      perPage: response.length || 15,
      total: response.length,
      from: response.length ? 1 : 0,
      to: response.length,
    };
  }

  const container = response?.data && !Array.isArray(response.data) && Array.isArray(response.data.data)
    ? response.data
    : response || {};
  const records = Array.isArray(container.data) ? container.data : [];
  const meta = container.meta || response?.meta || container;
  const currentPage = Number(meta.current_page ?? meta.currentPage ?? 1) || 1;
  const perPage = Number(meta.per_page ?? meta.perPage ?? records.length ?? 15) || 15;
  const total = Number(meta.total ?? records.length) || 0;
  const lastPage = Number(meta.last_page ?? meta.lastPage ?? Math.max(1, Math.ceil(total / perPage))) || 1;

  return {
    records,
    currentPage,
    lastPage,
    perPage,
    total,
    from: Number(meta.from ?? (records.length ? (currentPage - 1) * perPage + 1 : 0)) || 0,
    to: Number(meta.to ?? (records.length ? (currentPage - 1) * perPage + records.length : 0)) || 0,
  };
}

function normalizeUserAccount(record = {}) {
  const financialRelation = record.financial_accounts ?? record.financialAccounts ?? [];
  const loanRelation = record.loans ?? [];
  const financialAccounts = Array.isArray(financialRelation) ? financialRelation : financialRelation?.data || [];
  const loans = Array.isArray(loanRelation) ? loanRelation : loanRelation?.data || [];
  const type = String(record.type || 'individual').toLowerCase() === 'company' ? 'company' : 'individual';

  return {
    ...record,
    id: record.id,
    code: String(record.code || '').toUpperCase(),
    type,
    name: record.name || 'Unnamed account',
    email: record.email || '',
    phone: record.phone || '',
    isActive: asBoolean(record.is_active ?? record.isActive, true),
    financialAccounts: Array.isArray(financialAccounts) ? financialAccounts : [],
    loans: Array.isArray(loans) ? loans : [],
    financialAccountsCount: Number(
      record.financial_accounts_count
      ?? record.financialAccountsCount
      ?? financialAccounts.length,
    ) || 0,
    loansCount: Number(record.loans_count ?? record.loansCount ?? loans.length) || 0,
    createdAt: record.created_at || record.createdAt || null,
    updatedAt: record.updated_at || record.updatedAt || null,
  };
}

function humanize(value) {
  return String(value || '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function initials(name) {
  return String(name || 'Account')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function dateLabel(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function validationMessage(details, field) {
  const value = details?.[field];
  return Array.isArray(value) ? value[0] : value || '';
}

function AccountAvatar({ account, large = false }) {
  return <span className={`ua-avatar ${account.type === 'company' ? 'company' : ''} ${large ? 'large' : ''}`} aria-hidden="true">
    {account.type === 'company' ? <Building2 size={large ? 22 : 16}/> : initials(account.name)}
  </span>;
}

function UserAccountsList({ onCreate, onView }) {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, from: 0, to: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let current = true;
    const params = new URLSearchParams({ page: String(page), per_page: '15' });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (status) params.set('active', status === 'active' ? '1' : '0');

    setLoading(true);
    setError(null);
    accountingApi.userAccounts(`?${params.toString()}`)
      .then(response => {
        if (!current) return;
        const parsed = pageFromResponse(response);
        setRecords(parsed.records.map(normalizeUserAccount));
        setPagination(parsed);
        if (parsed.currentPage > parsed.lastPage) setPage(parsed.lastPage);
      })
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setLoading(false));

    return () => { current = false; };
  }, [page, reloadKey, search, status, type]);

  const visibleStats = useMemo(() => ({
    individuals: records.filter(account => account.type === 'individual').length,
    companies: records.filter(account => account.type === 'company').length,
    active: records.filter(account => account.isActive).length,
  }), [records]);

  const setTypeFilter = event => {
    setType(event.target.value);
    setPage(1);
  };
  const setStatusFilter = event => {
    setStatus(event.target.value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setType('');
    setStatus('');
    setPage(1);
  };
  const hasFilters = Boolean(search || type || status);

  return <main className="content inner-page ua-page ua-list-page">
    <div className="title-row ua-title-row">
      <div>
        <p className="eyebrow">ACCOUNT DIRECTORY</p>
        <h1>User accounts</h1>
        <p>Manage the people and companies connected to financial accounts and loans.</p>
      </div>
      <button className="primary-button" type="button" onClick={onCreate}><Plus size={17}/>New user account</button>
    </div>

    <section className="ua-summary" aria-label="User account summary">
      <div className="featured"><span>Total matches</span><strong>{pagination.total}</strong><small>Across the directory</small></div>
      <div><span>Individuals</span><strong>{visibleStats.individuals}</strong><small>On this page</small></div>
      <div><span>Companies</span><strong>{visibleStats.companies}</strong><small>On this page</small></div>
      <div><span>Active</span><strong>{visibleStats.active}</strong><small>On this page</small></div>
    </section>

    <section className="panel ua-directory" aria-busy={loading}>
      <div className="ua-toolbar">
        <label className="ua-search">
          <Search size={17}/>
          <input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search name, code, email, or phone" aria-label="Search user accounts"/>
          {searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><X size={14}/></button>}
        </label>
        <div className="ua-filter-group">
          <label><span>Type</span><select value={type} onChange={setTypeFilter}><option value="">All types</option><option value="individual">Individuals</option><option value="company">Companies</option></select></label>
          <label><span>Status</span><select value={status} onChange={setStatusFilter}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <button className="ua-refresh" type="button" onClick={() => setReloadKey(value => value + 1)} disabled={loading} aria-label="Refresh user accounts"><RefreshCw className={loading ? 'spin' : ''} size={16}/><span>Refresh</span></button>
        </div>
      </div>

      {loading && <div className="ua-state"><RefreshCw className="spin" size={23}/><strong>Loading user accounts…</strong><span>Fetching the latest directory records.</span></div>}
      {!loading && error && <div className="ua-state error"><CircleHelp size={25}/><strong>User accounts could not be loaded</strong><span>{error.message || 'Please try again.'}</span><button className="secondary-button" type="button" onClick={() => setReloadKey(value => value + 1)}><RotateCcw size={15}/>Try again</button></div>}
      {!loading && !error && records.length === 0 && <div className="ua-state empty"><Users size={26}/><strong>{hasFilters ? 'No matching user accounts' : 'Your directory is empty'}</strong><span>{hasFilters ? 'Try a different search or clear the filters.' : 'Create the first user account to link it with financial accounts and loans.'}</span>{hasFilters ? <button className="secondary-button" type="button" onClick={clearFilters}><X size={15}/>Clear filters</button> : <button className="primary-button" type="button" onClick={onCreate}><Plus size={15}/>New user account</button>}</div>}

      {!loading && !error && records.length > 0 && <div className="ua-table-wrap" role="table" aria-label="User accounts">
        <div className="ua-table-row ua-table-head" role="row"><span role="columnheader">Account</span><span role="columnheader">Contact</span><span role="columnheader">Type</span><span role="columnheader">Financial accounts</span><span role="columnheader">Loans</span><span role="columnheader">Status</span><span role="columnheader" aria-label="Actions"/></div>
        {records.map(account => <div className="ua-table-row" role="row" key={account.id}>
          <span className="ua-account-cell" role="cell"><AccountAvatar account={account}/><span><button type="button" onClick={() => onView(account.id)}>{account.name}</button><small>{account.code || 'NO CODE'}</small></span></span>
          <span className="ua-contact-cell" role="cell"><strong>{account.email || 'No email'}</strong><small>{account.phone || 'No phone number'}</small></span>
          <span role="cell"><span className={`ua-type-badge ${account.type}`}>{account.type === 'company' ? <Building2 size={12}/> : <UserRound size={12}/>} {humanize(account.type)}</span></span>
          <span className="ua-link-count" role="cell"><strong>{account.financialAccountsCount}</strong><small>{account.financialAccountsCount === 1 ? 'account' : 'accounts'}</small></span>
          <span className="ua-link-count" role="cell"><strong>{account.loansCount}</strong><small>{account.loansCount === 1 ? 'loan' : 'loans'}</small></span>
          <span role="cell"><span className={`ua-status ${account.isActive ? 'active' : 'inactive'}`}><i/>{account.isActive ? 'Active' : 'Inactive'}</span></span>
          <span className="ua-row-action" role="cell"><button type="button" onClick={() => onView(account.id)} aria-label={`View ${account.name}`}><ChevronRight size={17}/></button></span>
        </div>)}
      </div>}

      {!loading && !error && records.length > 0 && <div className="ua-pagination">
        <span>Showing <strong>{pagination.from}–{pagination.to}</strong> of <strong>{pagination.total}</strong></span>
        <div><button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1}><ChevronLeft size={16}/>Previous</button><span>Page {pagination.currentPage} of {pagination.lastPage}</span><button type="button" onClick={() => setPage(value => Math.min(pagination.lastPage, value + 1))} disabled={page >= pagination.lastPage}>Next<ChevronRight size={16}/></button></div>
      </div>}
    </section>
  </main>;
}

function RelatedFinancialAccounts({ accounts }) {
  if (!accounts.length) return <div className="ua-related-empty"><CreditCard size={20}/><strong>No linked financial accounts</strong><span>This user account is not attached to a cash, bank, e-wallet, or credit account.</span></div>;

  return <div className="ua-related-list">{accounts.map((account, index) => {
    const balance = account.current_balance ?? account.balance ?? account.outstanding_balance;
    return <div className="ua-related-row" key={account.id ?? index}>
      <span className="ua-related-icon"><CreditCard size={16}/></span>
      <span><strong>{account.name || account.account_name || account.financial_institution?.name || 'Financial account'}</strong><small>{account.account_number || account.number || humanize(account.type)}</small></span>
      <span className="ua-related-meta"><strong>{balance !== undefined && balance !== null ? peso.format(Number(balance) || 0) : humanize(account.type)}</strong><small>{humanize(account.status || (asBoolean(account.is_active, true) ? 'active' : 'inactive'))}</small></span>
    </div>;
  })}</div>;
}

function RelatedLoans({ loans }) {
  if (!loans.length) return <div className="ua-related-empty"><HandCoins size={20}/><strong>No linked loans</strong><span>This user account is not connected to any borrowing history.</span></div>;

  return <div className="ua-related-list">{loans.map((loan, index) => {
    const amount = loan.outstanding_balance ?? loan.principal_amount ?? loan.amount;
    return <div className="ua-related-row" key={loan.id ?? index}>
      <span className="ua-related-icon loan"><HandCoins size={16}/></span>
      <span><strong>{loan.loan_number || loan.reference || loan.name || `Loan ${loan.id || index + 1}`}</strong><small>{loan.party_name || loan.lender_name || loan.borrower_name || humanize(loan.direction)}</small></span>
      <span className="ua-related-meta"><strong>{amount !== undefined && amount !== null ? peso.format(Number(amount) || 0) : '—'}</strong><small>{humanize(loan.status)}</small></span>
    </div>;
  })}</div>;
}

function UserAccountDetail({ accountId, onBack, onEdit, onDeleted }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [actionError, setActionError] = useState('');
  const [working, setWorking] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef(null);
  const dialogCancelRef = useRef(null);
  const dialogTriggerRef = useRef(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    accountingApi.userAccount(accountId)
      .then(response => current && setAccount(normalizeUserAccount(unwrapRecord(response))))
      .catch(requestError => current && setError(requestError))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [accountId, reloadKey]);

  useEffect(() => {
    if (!dialog) return undefined;
    const frame = window.requestAnimationFrame(() => dialogCancelRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [dialog]);

  const linkedCount = (account?.financialAccountsCount || 0) + (account?.loansCount || 0);
  const hideDialog = () => {
    setDialog(null);
    setActionError('');
    setDeleteBlocked(false);
    const trigger = dialogTriggerRef.current;
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus();
    });
  };
  const closeDialog = () => {
    if (working) return;
    hideDialog();
  };
  const openDialog = nextDialog => {
    dialogTriggerRef.current = document.activeElement;
    setActionError('');
    setDeleteBlocked(false);
    setDialog(nextDialog);
  };
  const handleDialogKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const updateStatus = async isActive => {
    setWorking(true);
    setActionError('');
    try {
      const response = await accountingApi.updateUserAccount(account.id, { is_active: isActive });
      const returnedFields = response ? unwrapRecord(response) : {};
      const updated = normalizeUserAccount({ ...account, ...returnedFields, is_active: isActive });
      setAccount(updated);
      hideDialog();
      setNotice(isActive ? 'User account reactivated.' : 'User account deactivated. Historical links remain intact.');
    } catch (requestError) {
      setActionError(requestError.message || 'The status could not be updated.');
    } finally {
      setWorking(false);
    }
  };
  const deleteAccount = async () => {
    setWorking(true);
    setActionError('');
    try {
      await accountingApi.deleteUserAccount(account.id);
      onDeleted();
    } catch (requestError) {
      if (requestError.status === 409) {
        setDeleteBlocked(true);
        setActionError('This account is in use and cannot be deleted. Deactivate it to preserve its accounting history.');
      } else {
        setActionError(requestError.message || 'The user account could not be deleted.');
      }
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <main className="content inner-page ua-page"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={16}/>User accounts</button><section className="panel ua-state ua-detail-state"><RefreshCw className="spin" size={23}/><strong>Loading account details…</strong><span>Fetching linked financial accounts and loans.</span></section></main>;
  if (error || !account) return <main className="content inner-page ua-page"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={16}/>User accounts</button><section className="panel ua-state ua-detail-state error"><CircleHelp size={25}/><strong>Account details could not be loaded</strong><span>{error?.message || 'The requested account was not found.'}</span><button className="secondary-button" type="button" onClick={() => setReloadKey(value => value + 1)}><RotateCcw size={15}/>Try again</button></section></main>;

  const deletionBlocked = linkedCount > 0 || deleteBlocked;
  return <main className="content inner-page ua-page ua-detail-page">
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={16}/>User accounts</button>
    <div className="title-row ua-detail-title">
      <div className="ua-detail-identity"><AccountAvatar account={account} large/><div><p className="eyebrow">{account.code || 'USER ACCOUNT'}</p><h1>{account.name}</h1><p>{account.type === 'company' ? 'Company account' : 'Individual account'}</p></div></div>
      <div className="ua-detail-actions"><span className={`ua-status ${account.isActive ? 'active' : 'inactive'}`}><i/>{account.isActive ? 'Active' : 'Inactive'}</span><button className="secondary-button" type="button" onClick={onEdit}><Edit3 size={15}/>Edit account</button></div>
    </div>

    {notice && <div className="ua-notice success"><Check size={17}/><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={14}/></button></div>}

    <section className="ua-detail-grid">
      <div className="panel ua-profile-card">
        <div className="ua-section-heading"><div><h2>Account profile</h2><p>Primary identity and contact information</p></div><ShieldCheck size={20}/></div>
        <dl className="ua-profile-list">
          <div><dt>Account code</dt><dd>{account.code || '—'}</dd></div>
          <div><dt>Account type</dt><dd>{humanize(account.type)}</dd></div>
          <div><dt>Email address</dt><dd>{account.email ? <a href={`mailto:${account.email}`}><Mail size={14}/>{account.email}</a> : 'Not provided'}</dd></div>
          <div><dt>Phone number</dt><dd>{account.phone ? <a href={`tel:${account.phone}`}><Phone size={14}/>{account.phone}</a> : 'Not provided'}</dd></div>
          <div><dt>Last updated</dt><dd>{dateLabel(account.updatedAt)}</dd></div>
        </dl>
      </div>
      <div className="ua-detail-summary">
        <div><span className="ua-summary-icon"><CreditCard size={18}/></span><span><small>Financial accounts</small><strong>{account.financialAccountsCount}</strong></span></div>
        <div><span className="ua-summary-icon loan"><HandCoins size={18}/></span><span><small>Linked loans</small><strong>{account.loansCount}</strong></span></div>
        <div><span className={`ua-summary-icon ${account.isActive ? 'active' : 'inactive'}`}><Power size={18}/></span><span><small>Directory status</small><strong>{account.isActive ? 'Active' : 'Inactive'}</strong></span></div>
      </div>
    </section>

    <section className="ua-related-grid">
      <div className="panel ua-related-panel"><div className="ua-section-heading"><div><h2>Financial accounts</h2><p>Cash, bank, e-wallet, and credit accounts under this holder</p></div><span>{account.financialAccountsCount}</span></div><RelatedFinancialAccounts accounts={account.financialAccounts}/></div>
      <div className="panel ua-related-panel"><div className="ua-section-heading"><div><h2>Loans</h2><p>Borrowing records connected to this account</p></div><span>{account.loansCount}</span></div><RelatedLoans loans={account.loans}/></div>
    </section>

    <section className="panel ua-account-controls">
      <div><span className={`ua-control-icon ${account.isActive ? 'warning' : 'success'}`}><Power size={18}/></span><div><h2>{account.isActive ? 'Deactivate this account' : 'Reactivate this account'}</h2><p>{account.isActive ? 'Hide it from active selectors while preserving linked records and accounting history.' : 'Make this account available in active selectors again.'}</p></div></div>
      <button className="secondary-button" type="button" onClick={() => openDialog(account.isActive ? 'deactivate' : 'activate')}>{account.isActive ? 'Deactivate' : 'Reactivate'}</button>
    </section>
    <section className="panel ua-danger-zone">
      <div><span className="ua-control-icon danger"><Trash2 size={18}/></span><div><h2>Delete user account</h2><p>{deletionBlocked ? 'Linked financial accounts or loans protect this record from deletion. Deactivate it instead.' : 'This account has no linked records and can be permanently deleted.'}</p></div></div>
      <button className="ua-danger-button" type="button" onClick={() => openDialog('delete')}>Delete account</button>
    </section>

    {dialog && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && closeDialog()}>
      <section ref={dialogRef} className="modal ua-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="ua-confirm-title" onKeyDown={handleDialogKeyDown}>
        <div className={`ua-confirm-icon ${dialog === 'delete' ? 'danger' : 'warning'}`}>{dialog === 'delete' ? <Trash2 size={23}/> : <Power size={23}/>}</div>
        <h2 id="ua-confirm-title">{dialog === 'delete' ? (deletionBlocked ? 'This account is part of your history' : 'Delete this user account?') : dialog === 'activate' ? 'Reactivate this account?' : 'Deactivate this account?'}</h2>
        <p>{dialog === 'delete' ? (deletionBlocked ? 'It cannot be deleted while linked to a financial account or loan. Deactivating keeps every historical relationship intact.' : `This permanently removes ${account.name}. This action cannot be undone.`) : dialog === 'activate' ? 'The account will appear in active account selectors again.' : 'The account will no longer appear in active selectors, but its linked records will stay available.'}</p>
        {actionError && <div className="ua-inline-error"><CircleHelp size={15}/><span>{actionError}</span></div>}
        <div className="modal-actions"><button ref={dialogCancelRef} className="text-button" type="button" onClick={closeDialog} disabled={working}>Cancel</button>{dialog === 'delete' && !deletionBlocked ? <button className="ua-danger-button solid" type="button" onClick={deleteAccount} disabled={working}>{working ? <RefreshCw className="spin" size={15}/> : <Trash2 size={15}/>}Delete permanently</button> : dialog === 'activate' ? <button className="primary-button" type="button" onClick={() => updateStatus(true)} disabled={working}>{working ? <RefreshCw className="spin" size={15}/> : <Check size={15}/>}Reactivate</button> : account.isActive ? <button className="primary-button" type="button" onClick={() => updateStatus(false)} disabled={working}>{working ? <RefreshCw className="spin" size={15}/> : <Power size={15}/>}Deactivate account</button> : null}</div>
      </section>
    </div>}
  </main>;
}

function UserAccountForm({ accountId, onBack, onSaved }) {
  const editing = accountId !== null && accountId !== undefined;
  const [form, setForm] = useState(emptyForm);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!editing) return undefined;
    let current = true;
    setLoading(true);
    setLoadError(null);
    accountingApi.userAccount(accountId)
      .then(response => {
        if (!current) return;
        const account = normalizeUserAccount(unwrapRecord(response));
        const nextForm = {
          code: account.code,
          type: account.type,
          name: account.name === 'Unnamed account' ? '' : account.name,
          email: account.email,
          phone: account.phone,
          is_active: account.isActive,
        };
        setForm(nextForm);
        setOriginal(nextForm);
      })
      .catch(requestError => current && setLoadError(requestError))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [accountId, editing]);

  const updateField = event => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : name === 'code' ? value.toUpperCase() : value;
    setForm(current => ({ ...current, [name]: nextValue }));
    setFieldErrors(current => ({ ...current, [name]: '' }));
    setSaveError('');
    setNotice('');
  };
  const chooseType = type => {
    setForm(current => ({ ...current, type }));
    setFieldErrors(current => ({ ...current, type: '' }));
  };

  const submit = async event => {
    event.preventDefault();
    const localErrors = {};
    if (!form.code.trim()) localErrors.code = 'Enter a unique account code.';
    if (!form.name.trim()) localErrors.name = 'Enter the account holder or company name.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) localErrors.email = 'Enter a valid email address.';
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      return;
    }

    const normalized = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      is_active: Boolean(form.is_active),
    };
    let payload = normalized;
    if (editing && original) {
      const normalizedOriginal = {
        code: original.code.trim().toUpperCase(),
        type: original.type,
        name: original.name.trim(),
        email: original.email.trim() || null,
        phone: original.phone.trim() || null,
        is_active: Boolean(original.is_active),
      };
      payload = Object.fromEntries(Object.entries(normalized).filter(([key, value]) => value !== normalizedOriginal[key]));
      if (!Object.keys(payload).length) {
        setNotice('No changes to save.');
        return;
      }
    }

    setSaving(true);
    setSaveError('');
    setNotice('');
    setFieldErrors({});
    try {
      const response = editing
        ? await accountingApi.updateUserAccount(accountId, payload)
        : await accountingApi.createUserAccount(normalized);
      const saved = normalizeUserAccount(unwrapRecord(response));
      onSaved(saved.id ?? accountId);
    } catch (requestError) {
      setSaveError(requestError.message || 'The user account could not be saved.');
      setFieldErrors(requestError.details || {});
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="content inner-page ua-page"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={16}/>User accounts</button><section className="panel ua-state ua-detail-state"><RefreshCw className="spin" size={23}/><strong>Loading account…</strong><span>Preparing the account details for editing.</span></section></main>;
  if (loadError) return <main className="content inner-page ua-page"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={16}/>User accounts</button><section className="panel ua-state ua-detail-state error"><CircleHelp size={25}/><strong>Account could not be loaded</strong><span>{loadError.message || 'Please return to the directory and try again.'}</span></section></main>;

  const previewAccount = normalizeUserAccount({ ...form, is_active: form.is_active });
  return <main className="content inner-page ua-page ua-form-page">
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={16}/>{editing ? 'Account details' : 'User accounts'}</button>
    <div className="title-row ua-title-row"><div><p className="eyebrow">{editing ? 'EDIT USER ACCOUNT' : 'NEW USER ACCOUNT'}</p><h1>{editing ? 'Update account details' : 'Create a user account'}</h1><p>{editing ? 'Keep identity and contact details current without changing linked history.' : 'Add an individual or company that can own financial accounts and loans.'}</p></div><span className={`ua-status ${form.is_active ? 'active' : 'inactive'}`}><i/>{form.is_active ? 'Active' : 'Inactive'}</span></div>

    {saveError && <div className="ua-notice error"><CircleHelp size={17}/><span><strong>Could not save the account.</strong>{saveError}</span><button type="button" onClick={() => setSaveError('')} aria-label="Dismiss error"><X size={14}/></button></div>}
    {notice && <div className="ua-notice info"><CircleHelp size={17}/><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={14}/></button></div>}

    <form className="ua-form-layout" onSubmit={submit} noValidate>
      <div className="ua-form-sections">
        <section className="panel ua-form-section">
          <div className="ua-form-heading"><span><Users size={18}/></span><div><h2>Account identity</h2><p>Choose the account type and its unique directory reference.</p></div></div>
          <fieldset className="ua-type-options">
            <legend>Account type</legend>
            <button className={form.type === 'individual' ? 'selected' : ''} type="button" aria-pressed={form.type === 'individual'} onClick={() => chooseType('individual')}><span><UserRound size={19}/></span><span><strong>Individual</strong><small>A person who owns accounts or participates in a loan.</small></span>{form.type === 'individual' && <Check size={16}/>}</button>
            <button className={form.type === 'company' ? 'selected' : ''} type="button" aria-pressed={form.type === 'company'} onClick={() => chooseType('company')}><span><Building2 size={19}/></span><span><strong>Company</strong><small>A business or organization that owns linked records.</small></span>{form.type === 'company' && <Check size={16}/>}</button>
          </fieldset>
          {validationMessage(fieldErrors, 'type') && <small className="ua-field-error">{validationMessage(fieldErrors, 'type')}</small>}
          <div className="ua-form-grid">
            <label>Account code<input autoFocus={!editing} name="code" value={form.code} onChange={updateField} placeholder="e.g. CARL-CEDRICK" autoComplete="off" className={validationMessage(fieldErrors, 'code') ? 'invalid' : ''}/><small className="ua-field-help">Codes are stored in uppercase and should be easy to recognize.</small>{validationMessage(fieldErrors, 'code') && <small className="ua-field-error">{validationMessage(fieldErrors, 'code')}</small>}</label>
            <label>Display name<input name="name" value={form.name} onChange={updateField} placeholder={form.type === 'company' ? 'Company legal or trading name' : 'Full name'} autoComplete="name" className={validationMessage(fieldErrors, 'name') ? 'invalid' : ''}/>{validationMessage(fieldErrors, 'name') && <small className="ua-field-error">{validationMessage(fieldErrors, 'name')}</small>}</label>
          </div>
        </section>

        <section className="panel ua-form-section">
          <div className="ua-form-heading"><span><Mail size={18}/></span><div><h2>Contact information</h2><p>Optional details used to identify and contact this account holder.</p></div></div>
          <div className="ua-form-grid">
            <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} placeholder="name@example.com" autoComplete="email" className={validationMessage(fieldErrors, 'email') ? 'invalid' : ''}/>{validationMessage(fieldErrors, 'email') && <small className="ua-field-error">{validationMessage(fieldErrors, 'email')}</small>}</label>
            <label>Phone number<input name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="+63 900 000 0000" autoComplete="tel" className={validationMessage(fieldErrors, 'phone') ? 'invalid' : ''}/>{validationMessage(fieldErrors, 'phone') && <small className="ua-field-error">{validationMessage(fieldErrors, 'phone')}</small>}</label>
          </div>
        </section>
      </div>

      <aside className="panel ua-form-sidebar">
        <div className="ua-preview"><AccountAvatar account={previewAccount} large/><div><small>ACCOUNT PREVIEW</small><strong>{form.name.trim() || (form.type === 'company' ? 'Company name' : 'Account holder')}</strong><span>{form.code.trim() || 'ACCOUNT-CODE'}</span></div></div>
        <div className="ua-review-list"><span>Type<strong>{humanize(form.type)}</strong></span><span>Email<strong>{form.email.trim() || 'Not provided'}</strong></span><span>Phone<strong>{form.phone.trim() || 'Not provided'}</strong></span></div>
        <label className="ua-active-toggle"><input name="is_active" type="checkbox" checked={form.is_active} onChange={updateField}/><span><strong>Active account</strong><small>Active accounts appear in financial-account and loan selectors.</small></span></label>
        {validationMessage(fieldErrors, 'is_active') && <small className="ua-field-error">{validationMessage(fieldErrors, 'is_active')}</small>}
        <button className="primary-button ua-save-button" type="submit" disabled={saving}>{saving ? <RefreshCw className="spin" size={16}/> : <Save size={16}/>} {saving ? 'Saving account…' : editing ? 'Save changes' : 'Create account'}</button>
        <button className="text-button" type="button" onClick={onBack} disabled={saving}>Cancel</button>
        <p className="ua-form-note"><ShieldCheck size={14}/>Changes to identity details do not alter existing financial transactions or loan history.</p>
      </aside>
    </form>
  </main>;
}

export default function UserAccountsWorkspace({ view = 'list', accountId = null, onList, onCreate, onView, onEdit, onSaved }) {
  if (view === 'new') return <UserAccountForm onBack={onList} onSaved={onSaved}/>;
  if (view === 'edit') return <UserAccountForm accountId={accountId} onBack={() => onView(accountId)} onSaved={onSaved}/>;
  if (view === 'detail') return <UserAccountDetail accountId={accountId} onBack={onList} onEdit={() => onEdit(accountId)} onDeleted={onList}/>;
  return <UserAccountsList onCreate={onCreate} onView={onView}/>;
}
