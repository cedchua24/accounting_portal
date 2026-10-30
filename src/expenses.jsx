import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Eye, Landmark,
  ReceiptText, RefreshCw, Search, Tag, X,
} from 'lucide-react';
import { accountingApi } from './api.js';

const setupViews = [
  ['chart-accounts', 'Chart of Accounts', Landmark],
  ['types', 'Expense Type', BookOpen],
  ['categories', 'Expense Category', Tag],
  ['items', 'Expense', ReceiptText],
  ['ledger', 'Expense Transaction', ReceiptText],
];

const collectionKeys = [
  'data', 'records', 'rows', 'results', 'items', 'groups', 'accounts',
  'chart_account_groups', 'chart_accounts', 'expense_types', 'types',
  'expense_categories', 'categories', 'expense_items', 'expenses', 'ledger',
];

function recordsFrom(value, preferred = [], depth = 0) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object' || depth > 4) return [];
  for (const key of [...preferred, ...collectionKeys]) {
    if (!(key in value)) continue;
    if (Array.isArray(value[key])) return value[key];
    const nested = recordsFrom(value[key], preferred, depth + 1);
    if (nested.length) return nested;
  }
  return [];
}

function namedRecords(value, keys, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  for (const wrapper of ['data', 'payload', 'result']) {
    if (value[wrapper] && !Array.isArray(value[wrapper])) {
      const nested = namedRecords(value[wrapper], keys, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
}

function paginationOf(response) {
  for (const value of [response, response?.data, response?.meta, response?.data?.meta].filter(Boolean)) {
    const current = Number(value.current_page ?? value.currentPage ?? value.page);
    const last = Number(value.last_page ?? value.lastPage ?? value.total_pages ?? value.totalPages);
    if (Number.isFinite(current) && Number.isFinite(last) && last > 1) return { current, last };
  }
  return null;
}

async function loadAll(requestPage, preferred = [], { perPage } = {}) {
  const pageSize = perPage ? Math.min(Math.max(Number(perPage) || 1, 1), 100) : null;
  const queryForPage = page => {
    const params = new URLSearchParams();
    if (pageSize) params.set('per_page', String(pageSize));
    if (pageSize || page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `?${query}` : '';
  };
  const firstResponse = await requestPage(queryForPage(1));
  let records = recordsFrom(firstResponse, preferred);
  const pagination = paginationOf(firstResponse);
  if (!pagination) return records;
  for (let page = pagination.current + 1; page <= pagination.last; page += 1) {
    const response = await requestPage(queryForPage(page));
    records = records.concat(recordsFrom(response, preferred));
  }
  return records;
}

function field(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function relatedText(record, directKeys, nestedKeys) {
  const direct = field(record, ...directKeys);
  if (direct && typeof direct !== 'object') return direct;
  return field(direct, ...nestedKeys);
}

function truthy(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function hiddenRecord(record) {
  return truthy(field(record, 'is_hidden', 'hidden', 'is_confidential', 'confidential'));
}

function systemRecord(record) {
  if (truthy(field(record, 'is_system_generated', 'system_generated', 'is_system', 'automatic', 'is_automatic'))) return true;
  return /system|automatic|generated|\bauto\b|loan|credit.?card|bank.?fee|bank.?charge/i.test(
    String(field(record, 'source_type', 'source', 'origin', 'entry_source')),
  );
}

function recordStatus(record) {
  if (hiddenRecord(record)) return 'Hidden';
  const active = field(record, 'is_active', 'active', 'enabled');
  if (active !== '') return truthy(active) ? 'Active' : 'Inactive';
  const status = field(record, 'status', 'record_status');
  if (typeof status === 'string' && status.trim() && !/^\d+$/.test(status.trim())) return humanizeExpense(status);
  if (status !== '') return Number(status) === 1 ? 'Inactive' : 'Active';
  return 'Active';
}

function humanizeExpense(value = '') {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function expenseId(record) {
  return field(record, 'id', 'expense_id', 'expense_item_id', 'chart_account_id', 'chart_account_group_id');
}

function moneyExpense(value, currency = 'PHP') {
  const parsed = Number(String(value ?? 0).replaceAll(',', ''));
  const amount = Number.isFinite(parsed) ? parsed : 0;
  const code = /^[A-Z]{3}$/.test(String(currency).toUpperCase()) ? String(currency).toUpperCase() : 'PHP';
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

function dateExpense(value) {
  if (!value) return '—';
  const raw = String(value);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
}

function isoExpenseDay(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

function slug(value) {
  return String(value || 'unknown').toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function setupHierarchy(payload) {
  const types = recordsFrom(payload, ['expense_types', 'types']);
  const directCategories = namedRecords(payload, ['expense_categories', 'categories']);
  const categories = directCategories.length
    ? directCategories
    : types.flatMap(type => recordsFrom(type, ['expense_categories', 'categories']));
  const directItems = namedRecords(payload, ['expense_items', 'items', 'expenses']);
  const items = directItems.length
    ? directItems
    : categories.flatMap(category => recordsFrom(category, ['expense_items', 'items', 'expenses']));
  return { types, categories, items };
}

function ExpenseSectionNav({ active, onNavigate }) {
  return <div className="expense-section-nav" aria-label="Expense sections">
    {setupViews.map(([id, label, Icon]) => <button type="button" key={id} className={active === id || (active === 'approvals' && id === 'ledger') ? 'active' : ''} onClick={() => onNavigate?.(id)}><Icon size={15}/><span>{label}</span></button>)}
  </div>;
}

function ExpenseState({ loading, error, empty, icon: Icon = CircleHelp, emptyTitle, emptyCopy, retry }) {
  if (loading) return <div className="expense-state"><RefreshCw className="spin" size={21}/><strong>Loading expense records…</strong></div>;
  if (error) return <div className="expense-state error-state"><CircleHelp size={21}/><strong>Unable to load expense records</strong><span>{error}</span><button type="button" className="secondary-button" onClick={retry}><RefreshCw size={14}/>Retry</button></div>;
  if (empty) return <div className="expense-state"><Icon size={24}/><strong>{emptyTitle}</strong><span>{emptyCopy}</span></div>;
  return null;
}

function ExpenseChip({ children, tone = 'neutral' }) {
  return <span className={`expense-chip ${tone}`}>{children}</span>;
}

function groupId(record) { return field(record, 'id', 'chart_account_group_id', 'group_id'); }
function groupName(record) { return field(record, 'chart_account_group_name', 'group_name', 'name', 'title') || 'Ungrouped accounts'; }
function groupCode(record) { return field(record, 'chart_account_group_code', 'group_code', 'code'); }
function accountGroupId(record) { return field(record, 'chart_account_group_id', 'group_id', 'account_group_id'); }
function nestedAccounts(record) { return recordsFrom(record, ['chart_accounts', 'accounts', 'children']); }

function normalizeAccountGroups(treePayload, groupRecords, accountRecords) {
  const treeGroups = recordsFrom(treePayload, ['chart_account_groups', 'groups']);
  const sourceGroups = groupRecords.length ? groupRecords : treeGroups;
  const flatAccounts = accountRecords.length ? accountRecords : treeGroups.flatMap(nestedAccounts);
  const groups = sourceGroups.map((group, index) => {
    const id = groupId(group) || `group-${index}`;
    const accounts = nestedAccounts(group);
    return {
      id,
      code: groupCode(group),
      name: groupName(group),
      status: recordStatus(group),
      accounts: accounts.length ? accounts : flatAccounts.filter(account => String(accountGroupId(account)) === String(id)),
    };
  });
  const assigned = new Set(groups.flatMap(group => group.accounts.map(account => String(expenseId(account)))));
  const ungrouped = flatAccounts.filter(account => !assigned.has(String(expenseId(account))));
  if (ungrouped.length) groups.push({ id: 'ungrouped', code: '', name: 'Ungrouped accounts', status: 'Active', accounts: ungrouped });
  return groups;
}

function ChartAccountsPage({ onNavigate }) {
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    Promise.allSettled([
      accountingApi.chartAccountTree(),
      loadAll(accountingApi.chartAccountGroups, ['chart_account_groups', 'groups']),
      loadAll(accountingApi.chartAccountList, ['chart_accounts', 'accounts']),
    ]).then(([treeResult, groupResult, accountResult]) => {
      if (!current) return;
      if ([treeResult, groupResult, accountResult].every(result => result.status === 'rejected')) throw treeResult.reason;
      const next = normalizeAccountGroups(
        treeResult.status === 'fulfilled' ? treeResult.value : {},
        groupResult.status === 'fulfilled' ? groupResult.value : [],
        accountResult.status === 'fulfilled' ? accountResult.value : [],
      );
      setGroups(next);
      setExpanded(new Set(next.map(group => String(group.id))));
    }).catch(requestError => current && setError(requestError.message || 'Chart accounts could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [version]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return groups.map(group => ({
      ...group,
      accounts: group.accounts.filter(account => {
        const text = [field(account, 'chart_account_code', 'account_code', 'code'), field(account, 'chart_account_name', 'account_name', 'name'), field(account, 'account_type', 'type'), field(account, 'account_nature', 'normal_balance')].join(' ').toLowerCase();
        const matchesQuery = !term || `${group.code} ${group.name}`.toLowerCase().includes(term) || text.includes(term);
        return matchesQuery && (status === 'all' || recordStatus(account).toLowerCase() === status);
      }),
    })).filter(group => group.accounts.length || (!term && status === 'all'));
  }, [groups, query, status]);
  const totalAccounts = groups.reduce((sum, group) => sum + group.accounts.length, 0);
  const expenseAccounts = groups.reduce((sum, group) => sum + group.accounts.filter(account => /expense/i.test(String(field(account, 'account_type', 'type', 'chart_account_name', 'name')))).length, 0);
  const toggle = id => setExpanded(current => { const next = new Set(current); const key = String(id); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  return <main className="content inner-page expense-page"><ExpenseSectionNav active="chart-accounts" onNavigate={onNavigate}/><div className="title-row"><div><p className="eyebrow">EXPENSE SETUP</p><h1>Chart of Accounts</h1><p>Review the account groups that classify manual and system-generated expenses.</p></div><button type="button" className="secondary-button" onClick={() => setVersion(value => value + 1)}><RefreshCw className={loading ? 'spin' : ''} size={16}/>Refresh</button></div><section className="summary-strip expense-summary"><div><span>Account groups</span><strong>{groups.length}</strong></div><div><span>Chart accounts</span><strong>{totalAccounts}</strong></div><div><span>Expense accounts</span><strong>{expenseAccounts}</strong></div></section><section className="panel expense-panel"><div className="expense-panel-head"><div><h2>Account hierarchy</h2><p>Expand a group to inspect its linked chart accounts.</p></div><div className="expense-toolbar"><label className="small-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search account or code"/></label><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="hidden">Hidden</option></select></div></div><ExpenseState loading={loading} error={error} retry={() => setVersion(value => value + 1)} empty={!visible.length} icon={Landmark} emptyTitle="No chart accounts found" emptyCopy="Change the search or status filter and try again."/>{!loading && !error && visible.length > 0 && <div className="expense-table-wrap"><table className="expense-table account-tree-table"><thead><tr><th>Code</th><th>Account / group</th><th>Type</th><th>Normal balance</th><th>Linked items</th><th>Status</th></tr></thead><tbody>{visible.map(group => { const open = expanded.has(String(group.id)) || Boolean(query.trim()); return <React.Fragment key={group.id}><tr className="expense-group-row"><td>{group.code || '—'}</td><td colSpan="4"><button type="button" onClick={() => toggle(group.id)} aria-expanded={open}>{open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}<strong>{group.name}</strong><small>{group.accounts.length} account{group.accounts.length === 1 ? '' : 's'}</small></button></td><td><ExpenseChip tone={slug(group.status)}>{group.status}</ExpenseChip></td></tr>{open && group.accounts.map((account, index) => { const accountStatus = recordStatus(account); return <tr key={expenseId(account) || `${group.id}-${index}`}><td><code>{field(account, 'chart_account_code', 'account_code', 'code') || '—'}</code></td><td><strong>{field(account, 'chart_account_name', 'account_name', 'name') || 'Unnamed account'}</strong></td><td>{field(account, 'account_type', 'type', 'classification') || '—'}</td><td>{field(account, 'account_nature', 'normal_balance', 'nature') || '—'}</td><td>{field(account, 'expense_items_count', 'items_count', 'linked_items_count') || 0}</td><td><ExpenseChip tone={slug(accountStatus)}>{accountStatus}</ExpenseChip></td></tr>; })}</React.Fragment>; })}</tbody></table></div>}</section></main>;
}

function typeId(record) { return field(record, 'expense_type_id', 'type_id', 'id'); }
function typeName(record, own = false) { return relatedText(record, ['expense_type_name', 'type_name', 'expense_type'], ['name', 'expense_type_name']) || (own ? field(record, 'name') : ''); }
function typeCode(record, own = false) { return field(record, 'expense_type_code', 'type_code') || (own ? field(record, 'code') : ''); }
function categoryId(record) { return field(record, 'expense_category_id', 'category_id', 'id'); }
function categoryName(record, own = false) { return relatedText(record, ['expense_category_name', 'category_name', 'expense_category'], ['name', 'expense_category_name']) || (own ? field(record, 'name') : ''); }
function categoryCode(record, own = false) { return field(record, 'expense_category_code', 'category_code') || (own ? field(record, 'code') : ''); }
function itemId(record) { return field(record, 'expense_item_id', 'item_id', 'id'); }
function itemName(record) { return relatedText(record, ['expense_item_name', 'expense_name', 'item_name', 'expense_item'], ['name', 'expense_name']) || field(record, 'name'); }
function itemCode(record) { return field(record, 'expense_item_code', 'expense_code', 'item_code', 'code'); }
function accountId(record) { return field(record, 'chart_account_id', 'chart_of_account_id', 'account_id', 'id'); }
function accountName(record, own = false) { return relatedText(record, ['chart_account_name', 'chart_of_account_name', 'account_name', 'chart_account'], ['name', 'chart_account_name']) || (own ? field(record, 'name') : ''); }
function accountCode(record, own = false) { return field(record, 'chart_account_code', 'chart_of_account_code', 'account_code') || field(record?.chart_account, 'code') || (own ? field(record, 'code') : ''); }

const masterConfig = {
  types: { title: 'Expense Types', copy: 'Top-level classifications used by the familiar expense workflow.', noun: 'type', Icon: BookOpen },
  categories: { title: 'Expense Categories', copy: 'Categories grouped below each configured expense type.', noun: 'category', Icon: Tag },
  items: { title: 'Expenses', copy: 'Manual and system expense items, including bank, credit-card, and loan charges.', noun: 'expense', Icon: ReceiptText },
};

function ExpenseMasterPage({ view, onNavigate }) {
  const config = masterConfig[view];
  const [records, setRecords] = useState({ types: [], categories: [], items: [], accounts: [] });
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    Promise.all([
      loadAll(accountingApi.expenseTypes, ['expense_types', 'types']),
      loadAll(accountingApi.expenseCategories, ['expense_categories', 'categories']),
      loadAll(accountingApi.expenseItems, ['expense_items', 'items', 'expenses']),
      loadAll(accountingApi.chartAccountList, ['chart_accounts', 'accounts']),
    ]).then(([types, categories, items, accounts]) => current && setRecords({ types, categories, items, accounts }))
      .catch(requestError => current && setError(requestError.message || `Expense ${config.noun}s could not be loaded.`))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [config.noun, version]);
  const typeMap = useMemo(() => new Map(records.types.map(record => [String(typeId(record)), record])), [records.types]);
  const categoryMap = useMemo(() => new Map(records.categories.map(record => [String(categoryId(record)), record])), [records.categories]);
  const accountMap = useMemo(() => new Map(records.accounts.map(record => [String(accountId(record)), record])), [records.accounts]);
  const categoryTypeId = record => field(record, 'expense_type_id', 'type_id') || field(record?.expense_type, 'id');
  const itemCategoryId = record => field(record, 'expense_category_id', 'category_id') || field(record?.expense_category, 'id');
  const itemTypeId = record => field(record, 'expense_type_id', 'type_id') || categoryTypeId(categoryMap.get(String(itemCategoryId(record))));
  const rows = useMemo(() => {
    if (view === 'types') return records.types.map(record => {
      const id = typeId(record);
      return { raw: record, id, code: typeCode(record, true), name: typeName(record, true) || 'Unnamed expense type', accountName: accountName(record), accountCode: accountCode(record), description: field(record, 'description', 'details', 'notes'), count: field(record, 'categories_count', 'expense_categories_count') || records.categories.filter(category => String(categoryTypeId(category)) === String(id)).length, status: recordStatus(record) };
    });
    if (view === 'categories') return records.categories.map(record => {
      const id = categoryId(record); const parentId = categoryTypeId(record); const parent = typeMap.get(String(parentId));
      return { raw: record, id, typeId: parentId, typeName: typeName(record) || typeName(parent, true) || '—', typeCode: typeCode(record) || typeCode(parent, true), code: categoryCode(record, true), name: categoryName(record, true) || 'Unnamed category', description: field(record, 'description', 'details', 'notes'), count: field(record, 'items_count', 'expense_items_count', 'expenses_count') || records.items.filter(item => String(itemCategoryId(item)) === String(id)).length, status: recordStatus(record) };
    });
    return records.items.map(record => {
      const parentCategoryId = itemCategoryId(record); const category = categoryMap.get(String(parentCategoryId)); const parentTypeId = itemTypeId(record); const parentType = typeMap.get(String(parentTypeId)); const linkedAccountId = field(record, 'chart_account_id', 'chart_of_account_id', 'account_id') || field(record?.chart_account, 'id'); const linkedAccount = accountMap.get(String(linkedAccountId));
      return { raw: record, id: itemId(record), typeId: parentTypeId, typeName: typeName(record) || typeName(category) || typeName(parentType, true) || '—', typeCode: typeCode(record) || typeCode(category) || typeCode(parentType, true), categoryId: parentCategoryId, categoryName: categoryName(record) || categoryName(category, true) || '—', categoryCode: categoryCode(record) || categoryCode(category, true), code: itemCode(record), name: itemName(record) || 'Unnamed expense', accountName: accountName(record) || accountName(linkedAccount, true) || '—', accountCode: accountCode(record) || accountCode(linkedAccount, true), description: field(record, 'description', 'details', 'notes'), system: systemRecord(record), status: recordStatus(record) };
    });
  }, [view, records, typeMap, categoryMap, accountMap]);
  const availableCategories = records.categories.filter(record => !selectedType || String(categoryTypeId(record)) === String(selectedType));
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter(row => {
      const text = [row.id, row.code, row.name, row.typeName, row.typeCode, row.categoryName, row.categoryCode, row.accountName, row.accountCode, row.description].join(' ').toLowerCase();
      return (!term || text.includes(term)) && (!selectedType || String(row.typeId || row.id) === String(selectedType)) && (!selectedCategory || String(row.categoryId) === String(selectedCategory)) && (selectedStatus === 'all' || row.status.toLowerCase() === selectedStatus) && (selectedSource === 'all' || (selectedSource === 'system' ? row.system : !row.system));
    });
  }, [rows, query, selectedType, selectedCategory, selectedStatus, selectedSource]);
  const hidden = visible.filter(row => hiddenRecord(row.raw)).length;
  const system = visible.filter(row => row.system).length;
  const codeParts = row => <code className="expense-code">{[row.accountCode, row.typeCode, row.categoryCode, row.code].filter(Boolean).join('.') || '—'}</code>;
  return <main className="content inner-page expense-page"><ExpenseSectionNav active={view} onNavigate={onNavigate}/><div className="title-row"><div><p className="eyebrow">EXPENSE SETUP</p><h1>{config.title}</h1><p>{config.copy}</p></div><button type="button" className="secondary-button" onClick={() => setVersion(value => value + 1)}><RefreshCw className={loading ? 'spin' : ''} size={16}/>Refresh</button></div><section className="summary-strip expense-summary"><div><span>Visible results</span><strong>{visible.length}</strong></div><div><span>Hidden</span><strong>{hidden}</strong></div><div><span>{view === 'items' ? 'System items' : `Configured ${config.noun}s`}</span><strong>{view === 'items' ? system : rows.length}</strong></div></section><section className="panel expense-panel"><div className="expense-panel-head"><div><h2>{config.title} directory</h2><p>Read-only setup supplied by the accounting API.</p></div><div className="expense-toolbar master-toolbar">{view !== 'types' && <select value={selectedType} onChange={event => { setSelectedType(event.target.value); setSelectedCategory(''); }}><option value="">All expense types</option>{records.types.map(record => <option key={typeId(record)} value={typeId(record)}>{typeName(record, true)}</option>)}</select>}{view === 'items' && <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}><option value="">All categories</option>{availableCategories.map(record => <option key={categoryId(record)} value={categoryId(record)}>{categoryName(record, true)}</option>)}</select>}{view === 'items' && <select value={selectedSource} onChange={event => setSelectedSource(event.target.value)}><option value="all">All sources</option><option value="manual">Manual</option><option value="system">System</option></select>}<select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="hidden">Hidden</option></select><label className="small-search"><Search size={15}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${config.noun}s`}/></label></div></div><ExpenseState loading={loading} error={error} retry={() => setVersion(value => value + 1)} empty={!visible.length} icon={config.Icon} emptyTitle={`No ${config.noun}s found`} emptyCopy="Change the filters or search term and try again."/>{!loading && !error && visible.length > 0 && <div className="expense-table-wrap"><table className={`expense-table expense-master-table ${view}`}>
    {view === 'types' && <><thead><tr><th>Code</th><th>Expense type</th><th>Chart account</th><th>Description</th><th>Categories</th><th>Status</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td>{codeParts(row)}</td><td><strong>{row.name}</strong></td><td>{row.accountCode ? <code>{row.accountCode}</code> : null} {row.accountName || '—'}</td><td className="expense-description">{row.description || '—'}</td><td>{row.count}</td><td><ExpenseChip tone={slug(row.status)}>{row.status}</ExpenseChip></td></tr>)}</tbody></>}
    {view === 'categories' && <><thead><tr><th>Code</th><th>Expense type</th><th>Category</th><th>Description</th><th>Items</th><th>Status</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td>{codeParts(row)}</td><td>{row.typeName}</td><td><strong>{row.name}</strong></td><td className="expense-description">{row.description || '—'}</td><td>{row.count}</td><td><ExpenseChip tone={slug(row.status)}>{row.status}</ExpenseChip></td></tr>)}</tbody></>}
    {view === 'items' && <><thead><tr><th>Full code</th><th>Expense item</th><th>Expense type</th><th>Category</th><th>Chart account</th><th>Source</th><th>Status</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td>{codeParts(row)}</td><td><strong>{row.name}</strong>{row.description && <small>{row.description}</small>}</td><td>{row.typeName}</td><td>{row.categoryName}</td><td>{row.accountCode && <code>{row.accountCode}</code>} {row.accountName}</td><td><ExpenseChip tone={row.system ? 'system' : 'manual'}>{row.system ? 'System' : 'Manual'}</ExpenseChip></td><td><ExpenseChip tone={slug(row.status)}>{row.status}</ExpenseChip></td></tr>)}</tbody></>}
  </table></div>}</section></main>;
}

function approvalLabel(record, system) {
  if (system) return 'System';
  const value = humanizeExpense(field(record, 'approval_status', 'status', 'approval') || 'Pending');
  if (/pending/i.test(value)) return 'Pending';
  if (/approv/i.test(value)) return 'Approved';
  if (/reject/i.test(value)) return 'Rejected';
  return value;
}

function receivedLabel(record) {
  const value = field(record, 'received_status', 'is_received', 'received', 'receipt_status');
  if (value === true || value === 1 || value === '1') return 'Received';
  if (value === false || value === 0 || value === '0') return 'Not received';
  return value ? humanizeExpense(value) : 'Not specified';
}

function userCanApproveExpenses(user) {
  const explicit = field(user, 'can_approve_expenses', 'can_approve', 'is_expense_approver');
  if (explicit !== '') return truthy(explicit);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  if (permissions.some(permission => /expense.*approv|approv.*expense/i.test(String(field(permission, 'name', 'code') || permission)))) return true;
  const roles = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
    .map(role => String(field(role, 'name', 'code') || role));
  return roles.some(role => /^(super[ _-]?admin|admin|owner|finance[ _-]?manager|accounting[ _-]?manager|expense[ _-]?approver)$/i.test(role));
}

function LedgerPage({ approvalOnly, onNavigate, user }) {
  const [records, setRecords] = useState([]);
  const [setup, setSetup] = useState({ types: [], categories: [], items: [], accounts: [] });
  const [filters, setFilters] = useState({ query: '', from: '', to: '', type: '', category: '', item: '', account: '', source: approvalOnly ? 'manual' : 'all', approval: approvalOnly ? 'pending' : 'all', received: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  const [details, setDetails] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [saving, setSaving] = useState(false);
  const sessionCanApprove = useMemo(() => userCanApproveExpenses(user), [user]);
  useEffect(() => {
    setFilters(current => ({ ...current, source: approvalOnly ? 'manual' : 'all', approval: approvalOnly ? 'pending' : 'all' }));
  }, [approvalOnly]);
  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    Promise.allSettled([
      loadAll(
        approvalOnly ? accountingApi.expenses : accountingApi.expenseLedger,
        approvalOnly ? ['expenses', 'records'] : ['ledger', 'expenses', 'records'],
        { perPage: 100 },
      ),
      accountingApi.expenseSetup(),
      loadAll(accountingApi.expenseTypes, ['expense_types', 'types']),
      loadAll(accountingApi.expenseCategories, ['expense_categories', 'categories']),
      loadAll(accountingApi.expenseItems, ['expense_items', 'items', 'expenses']),
      loadAll(accountingApi.chartAccountList, ['chart_accounts', 'accounts']),
    ]).then(([ledgerResult, setupResult, typeResult, categoryResult, itemResult, accountResult]) => {
      if (!current) return;
      if (ledgerResult.status === 'rejected') throw ledgerResult.reason;
      const hierarchy = setupResult.status === 'fulfilled' ? setupHierarchy(setupResult.value) : { types: [], categories: [], items: [] };
      setRecords(ledgerResult.value);
      setSetup({
        types: typeResult.status === 'fulfilled' && typeResult.value.length ? typeResult.value : hierarchy.types,
        categories: categoryResult.status === 'fulfilled' && categoryResult.value.length ? categoryResult.value : hierarchy.categories,
        items: itemResult.status === 'fulfilled' && itemResult.value.length ? itemResult.value : hierarchy.items,
        accounts: accountResult.status === 'fulfilled' ? accountResult.value : [],
      });
    }).catch(requestError => current && setError(requestError.message || 'The expense ledger could not be loaded.'))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [approvalOnly, version]);
  const typeMap = useMemo(() => new Map(setup.types.map(record => [String(typeId(record)), record])), [setup.types]);
  const categoryMap = useMemo(() => new Map(setup.categories.map(record => [String(categoryId(record)), record])), [setup.categories]);
  const itemMap = useMemo(() => new Map(setup.items.map(record => [String(itemId(record)), record])), [setup.items]);
  const accountMap = useMemo(() => new Map(setup.accounts.map(record => [String(accountId(record)), record])), [setup.accounts]);
  const rows = useMemo(() => records.map((record, index) => {
    const system = systemRecord(record);
    const linkedItemId = field(record, 'expense_item_id', 'item_id', 'expense_v2_id'); const linkedItem = itemMap.get(String(linkedItemId));
    const linkedCategoryId = field(record, 'expense_category_id', 'category_id') || field(linkedItem, 'expense_category_id', 'category_id'); const linkedCategory = categoryMap.get(String(linkedCategoryId));
    const linkedTypeId = field(record, 'expense_type_id', 'type_id') || field(linkedItem, 'expense_type_id', 'type_id') || field(linkedCategory, 'expense_type_id', 'type_id'); const linkedType = typeMap.get(String(linkedTypeId));
    const linkedAccountId = field(record, 'chart_account_id', 'chart_of_account_id', 'account_id') || field(linkedItem, 'chart_account_id', 'chart_of_account_id', 'account_id'); const linkedAccount = accountMap.get(String(linkedAccountId));
    const permission = field(record, 'can_approve', 'can_decide', 'is_approver');
    return {
      raw: record, key: `${system ? 'system' : 'manual'}-${expenseId(record) || field(record, 'source_id', 'reference') || index}-${index}`, id: expenseId(record),
      date: field(record, 'expense_date', 'transaction_date', 'posted_at', 'date', 'created_at'), reference: field(record, 'reference', 'reference_no', 'reference_number', 'transaction_reference', 'source_reference') || '—',
      itemId: linkedItemId, itemName: relatedText(record, ['expense_item_name', 'expense_name', 'item_name', 'expense_item'], ['name', 'expense_name']) || itemName(linkedItem) || 'Unclassified expense',
      typeId: linkedTypeId, typeName: typeName(record) || typeName(linkedType, true) || '—', categoryId: linkedCategoryId, categoryName: categoryName(record) || categoryName(linkedCategory, true) || '—',
      accountId: linkedAccountId, accountName: accountName(record) || accountName(linkedAccount, true) || '—', accountCode: accountCode(record) || accountCode(linkedAccount, true),
      system, source: system ? 'System' : 'Manual', amount: Number(String(field(record, 'amount', 'expense_amount', 'total_amount', 'interest_amount') || 0).replaceAll(',', '')) || 0, currency: field(record, 'currency', 'currency_code') || 'PHP',
      approval: approvalLabel(record, system), received: receivedLabel(record), createdBy: field(record, 'creator_name', 'created_by_name', 'requestor_name', 'user_name', 'created_by') || '—', decidedBy: field(record, 'approver_name', 'approved_by_name', 'rejected_by_name', 'decided_by_name') || '—',
      payee: field(record, 'payee', 'payee_name', 'vendor', 'source_entity_name') || '—', notes: field(record, 'notes', 'details', 'description', 'remarks') || '—', rejectionReason: field(record, 'rejection_reason', 'reject_reason', 'reason') || '—', canDecide: permission === '' ? sessionCanApprove : truthy(permission),
    };
  }), [records, itemMap, categoryMap, typeMap, accountMap, sessionCanApprove]);
  const availableCategories = setup.categories.filter(record => !filters.type || String(field(record, 'expense_type_id', 'type_id')) === String(filters.type));
  const availableItems = setup.items.filter(record => { const category = categoryMap.get(String(field(record, 'expense_category_id', 'category_id'))); const linkedTypeId = field(record, 'expense_type_id', 'type_id') || field(category, 'expense_type_id', 'type_id'); return (!filters.type || String(linkedTypeId) === String(filters.type)) && (!filters.category || String(field(record, 'expense_category_id', 'category_id')) === String(filters.category)); });
  const visible = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    return rows.filter(row => {
      const text = [row.reference, row.itemName, row.typeName, row.categoryName, row.accountName, row.accountCode, row.createdBy, row.decidedBy, row.payee, row.notes].join(' ').toLowerCase(); const day = isoExpenseDay(row.date);
      return (!term || text.includes(term)) && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to) && (!filters.type || String(row.typeId) === String(filters.type)) && (!filters.category || String(row.categoryId) === String(filters.category)) && (!filters.item || String(row.itemId) === String(filters.item)) && (!filters.account || String(row.accountId) === String(filters.account)) && (filters.source === 'all' || row.source.toLowerCase() === filters.source) && (filters.approval === 'all' || row.approval.toLowerCase() === filters.approval) && (filters.received === 'all' || slug(row.received) === filters.received);
    });
  }, [rows, filters]);
  const pending = rows.filter(row => !row.system && row.approval === 'Pending').length;
  const systemCount = visible.filter(row => row.system).length;
  const totals = visible.reduce((byCurrency, row) => {
    const currency = /^[A-Z]{3}$/.test(String(row.currency).toUpperCase()) ? String(row.currency).toUpperCase() : 'PHP';
    byCurrency.set(currency, (byCurrency.get(currency) || 0) + row.amount);
    return byCurrency;
  }, new Map());
  const totalLabel = [...totals.entries()].map(([currency, amount]) => moneyExpense(amount, currency)).join(' + ') || moneyExpense(0);
  const updateFilter = event => { const { name, value } = event.target; setFilters(current => ({ ...current, [name]: value, ...(name === 'type' ? { category: '', item: '' } : {}), ...(name === 'category' ? { item: '' } : {}) })); };
  const clearFilters = () => setFilters({ query: '', from: '', to: '', type: '', category: '', item: '', account: '', source: approvalOnly ? 'manual' : 'all', approval: approvalOnly ? 'pending' : 'all', received: 'all' });
  const isPending = row => !row.system && row.approval === 'Pending' && row.canDecide;
  const decide = (row, action) => { setDetails(null); setDecision({ row, action }); setReason(''); setDecisionError(''); };
  const submitDecision = async () => {
    if (!decision?.row?.id) return;
    if (decision.action === 'reject' && !reason.trim()) { setDecisionError('Enter a rejection reason so the requestor knows what to correct.'); return; }
    setSaving(true); setDecisionError('');
    try {
      if (decision.action === 'approve') await accountingApi.approveExpense(decision.row.id);
      else await accountingApi.rejectExpense(decision.row.id, reason.trim());
      setNotice(`Expense ${decision.action === 'approve' ? 'approved' : 'rejected'} successfully.`); setDecision(null); setDetails(null); setVersion(value => value + 1);
    } catch (requestError) { setDecisionError(requestError.message || `The expense could not be ${decision.action}d.`); }
    finally { setSaving(false); }
  };
  useEffect(() => {
    if (!details && !decision) return undefined;
    const closeOnEscape = event => {
      if (event.key !== 'Escape' || saving) return;
      if (decision) setDecision(null);
      else setDetails(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [details, decision, saving]);
  return <main className="content inner-page expense-page">
<ExpenseSectionNav active={approvalOnly ? 'approvals' : 'ledger'} onNavigate={onNavigate}/>
<div className="title-row">
<div>
<p className="eyebrow">EXPENSE TRANSACTION</p>
<h1>{approvalOnly ? 'Pending Expense Approvals' : 'Expense Ledger'}</h1>
<p>{approvalOnly ? 'Review manual expense requests without changing system-generated entries.' : 'Manual expenses and automatic bank, credit-card, and borrowed-loan interest in one ledger.'}</p>
</div>
<div className="expense-title-actions">
<button type="button" className={!approvalOnly ? 'expense-view-button active' : 'expense-view-button'} onClick={() => onNavigate?.('ledger')}>Ledger</button>
<button type="button" className={approvalOnly ? 'expense-view-button active' : 'expense-view-button'} onClick={() => onNavigate?.('approvals')}>Pending approvals{pending > 0 && <em>{pending}</em>}</button>
<button type="button" className="icon-button" onClick={() => setVersion(value => value + 1)} aria-label="Refresh expenses">
<RefreshCw className={loading ? 'spin' : ''} size={17}/>
</button>
</div>
</div>{notice && <div className="expense-notice">
<Check size={16}/>
<span>{notice}</span>
<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
<X size={14}/>
</button>
</div>}<section className="summary-strip expense-summary">
<div>
<span>Visible total</span>
<strong>{totalLabel}</strong>
</div>
<div>
<span>Pending approval</span>
<strong>{pending}</strong>
</div>
<div>
<span>System entries</span>
<strong>{systemCount}</strong>
</div>
</section>
<section className="panel expense-filter-panel">
<div className="expense-panel-head">
<div>
<h2>Filter expenses</h2>
<p>Search references, payees, accounts, creators, and the legacy hierarchy.</p>
</div>
<button type="button" className="link-button" onClick={clearFilters}>Clear filters</button>
</div>
<div className="expense-filter-grid">
<label>Search<span>
<Search size={14}/>
<input name="query" value={filters.query} onChange={updateFilter} placeholder="Reference, payee, account…"/>
</span>
</label>
<label>Date from<input name="from" type="date" value={filters.from} onChange={updateFilter}/>
</label>
<label>Date to<input name="to" type="date" min={filters.from} value={filters.to} onChange={updateFilter}/>
</label>
<label>Expense type<select name="type" value={filters.type} onChange={updateFilter}>
<option value="">All types</option>{setup.types.map(record => <option key={typeId(record)} value={typeId(record)}>{typeName(record, true)}</option>)}</select>
</label>
<label>Category<select name="category" value={filters.category} onChange={updateFilter}>
<option value="">All categories</option>{availableCategories.map(record => <option key={categoryId(record)} value={categoryId(record)}>{categoryName(record, true)}</option>)}</select>
</label>
<label>Expense<select name="item" value={filters.item} onChange={updateFilter}>
<option value="">All expenses</option>{availableItems.map(record => <option key={itemId(record)} value={itemId(record)}>{itemName(record)}</option>)}</select>
</label>
<label>Chart account<select name="account" value={filters.account} onChange={updateFilter}>
<option value="">All accounts</option>{setup.accounts.map(record => <option key={accountId(record)} value={accountId(record)}>{accountCode(record, true)} · {accountName(record, true)}</option>)}</select>
</label>
<label>Source<select name="source" value={filters.source} onChange={updateFilter}>
<option value="all">All sources</option>
<option value="manual">Manual</option>
<option value="system">System</option>
</select>
</label>
<label>Approval<select name="approval" value={filters.approval} onChange={updateFilter}>
<option value="all">All statuses</option>
<option value="pending">Pending</option>
<option value="approved">Approved</option>
<option value="rejected">Rejected</option>
<option value="system">System</option>
</select>
</label>
<label>Received<select name="received" value={filters.received} onChange={updateFilter}>
<option value="all">All statuses</option>
<option value="received">Received</option>
<option value="not-received">Not received</option>
<option value="not-specified">Not specified</option>
</select>
</label>
</div>
</section>
<section className="panel expense-panel expense-ledger-panel">
<div className="expense-panel-head">
<div>
<h2>{approvalOnly ? 'Manual expense requests' : 'All expense entries'}</h2>
<p>{visible.length} result{visible.length === 1 ? '' : 's'} · System entries are read-only.</p>
</div>
</div>
<ExpenseState loading={loading} error={error} retry={() => setVersion(value => value + 1)} empty={!visible.length} icon={ReceiptText} emptyTitle="No expense entries found" emptyCopy="Change the filters or refresh the ledger."/>{!loading && !error && visible.length > 0 && <div className="expense-table-wrap">
<table className="expense-table expense-ledger-table">
<thead>
<tr>
<th>Date</th>
<th>Reference</th>
<th>Expense</th>
<th>Type / category</th>
<th>Chart account</th>
<th>Source</th>
<th>Amount</th>
<th>Received</th>
<th>Approval</th>
<th>Created by</th>
<th>Decided by</th>
<th>Actions</th>
</tr>
</thead>
<tbody>{visible.map(row => <tr key={row.key} className={row.system ? 'system-row' : ''}>
<td>{dateExpense(row.date)}</td>
<td>
<code>{row.reference}</code>
</td>
<td>
<strong>{row.itemName}</strong>{row.payee !== '—' && <small>{row.payee}</small>}</td>
<td>{row.typeName}<small>{row.categoryName}</small>
</td>
<td>{row.accountCode && <code>{row.accountCode}</code>} {row.accountName}</td>
<td>
<ExpenseChip tone={row.system ? 'system' : 'manual'}>{row.source}</ExpenseChip>
</td>
<td className="expense-amount">{moneyExpense(row.amount, row.currency)}</td>
<td>
<ExpenseChip tone={slug(row.received)}>{row.received}</ExpenseChip>
</td>
<td>
<ExpenseChip tone={slug(row.approval)}>{row.approval}</ExpenseChip>
</td>
<td>{row.createdBy}</td>
<td>{row.decidedBy}</td>
<td className="expense-actions">
<button type="button" onClick={() => setDetails(row)}>
<Eye size={13}/>Details</button>{isPending(row) && <>
<button type="button" className="approve" onClick={() => decide(row, 'approve')}>Approve</button>
<button type="button" className="reject" onClick={() => decide(row, 'reject')}>Reject</button>
</>}</td>
</tr>)}</tbody>
</table>
</div>}</section>{details && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setDetails(null)}>
<div className="modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-details-title">
<div className="modal-head">
<div>
<p className="eyebrow">EXPENSE TRANSACTION</p>
<h2 id="expense-details-title">{details.itemName}</h2>
<small>{details.reference}</small>
</div>
<button type="button" className="icon-button" onClick={() => setDetails(null)} aria-label="Close expense details">
<X size={18}/>
</button>
</div>
<div className="expense-detail-grid">
<div>
<span>Date</span>
<strong>{dateExpense(details.date)}</strong>
</div>
<div>
<span>Amount</span>
<strong>{moneyExpense(details.amount, details.currency)}</strong>
</div>
<div>
<span>Source</span>
<strong>{details.source}</strong>
</div>
<div>
<span>Approval</span>
<strong>{details.approval}</strong>
</div>
<div>
<span>Expense type</span>
<strong>{details.typeName}</strong>
</div>
<div>
<span>Category</span>
<strong>{details.categoryName}</strong>
</div>
<div>
<span>Chart account</span>
<strong>{details.accountCode ? `${details.accountCode} · ` : ''}{details.accountName}</strong>
</div>
<div>
<span>Received</span>
<strong>{details.received}</strong>
</div>
<div>
<span>Payee / source</span>
<strong>{details.payee}</strong>
</div>
<div>
<span>Created by</span>
<strong>{details.createdBy}</strong>
</div>
<div>
<span>Decided by</span>
<strong>{details.decidedBy}</strong>
</div>
<div>
<span>Rejection reason</span>
<strong>{details.rejectionReason}</strong>
</div>
<div className="wide">
<span>Notes</span>
<strong>{details.notes}</strong>
</div>
</div>
<div className="modal-actions">
<button type="button" className="text-button" onClick={() => setDetails(null)}>Close</button>{isPending(details) && <>
<button type="button" className="secondary-button danger" onClick={() => decide(details, 'reject')}>Reject</button>
<button type="button" className="primary-button" onClick={() => decide(details, 'approve')}>Approve expense</button>
</>}</div>
</div>
</div>}{decision && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && setDecision(null)}>
<div className="modal expense-modal decision-modal" role="dialog" aria-modal="true" aria-labelledby="expense-decision-title">
<div className="modal-head">
<div>
<p className="eyebrow">EXPENSE APPROVAL</p>
<h2 id="expense-decision-title">{decision.action === 'approve' ? 'Approve expense' : 'Reject expense'}</h2>
<small>{decision.row.itemName} · {decision.row.reference}</small>
</div>
<button type="button" className="icon-button" onClick={() => setDecision(null)} disabled={saving} aria-label="Close expense approval">
<X size={18}/>
</button>
</div>{decisionError && <div className="expense-inline-error">
<CircleHelp size={15}/>{decisionError}</div>}<p>{decision.action === 'approve' ? 'Confirm that this manual expense is accurate and ready to post.' : 'The requestor will see this reason and can correct the expense before resubmitting.'}</p>{decision.action === 'reject' && <label>Rejection reason<textarea autoFocus value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={4} placeholder="Explain what must be corrected…"/>
</label>}<div className="modal-actions">
<button type="button" className="text-button" onClick={() => setDecision(null)} disabled={saving}>Cancel</button>
<button type="button" className={decision.action === 'approve' ? 'primary-button' : 'primary-button danger'} onClick={submitDecision} disabled={saving} autoFocus={decision.action === 'approve'}>{saving ? <>
<RefreshCw className="spin" size={14}/>Saving…</> : decision.action === 'approve' ? 'Approve expense' : 'Reject expense'}</button>
</div>
</div>
</div>}</main>;
}

export default function ExpensesWorkspace({ view = 'ledger', onNavigate, user }) {
  if (view === 'chart-accounts') return <ChartAccountsPage onNavigate={onNavigate}/>;
  if (view === 'types' || view === 'categories' || view === 'items') return <ExpenseMasterPage view={view} onNavigate={onNavigate}/>;
  return <LedgerPage approvalOnly={view === 'approvals'} onNavigate={onNavigate} user={user}/>;
}
