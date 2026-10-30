import React from 'react';

export const pagePaths = {
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
  help: '/help',
  settings: '/settings',
};

export function pagePath(page, resourceId = null, options = {}) {
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

  return path;
}

export function visitPath(path, { replace = false } = {}) {
  const next = new URL(path, window.location.href);
  const nextLocation = `${next.pathname}${next.search}${next.hash}`;
  const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextLocation !== currentLocation) {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', nextLocation);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function isPlainInternalClick(event, href, target) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (target && target !== '_self') return false;
  const destination = new URL(href, window.location.href);
  return destination.origin === window.location.origin;
}

/**
 * A real anchor for every in-app destination. Normal clicks keep the SPA fast;
 * Ctrl/Cmd-click, middle-click, and the browser context menu retain native new-tab behavior.
 */
export function AppLink({ href, onClick, onNavigate, className = '', target, children, disabled = false, ...props }) {
  const handleClick = event => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
    if (!isPlainInternalClick(event, href, target)) return;
    event.preventDefault();
    visitPath(href);
    onNavigate?.();
  };

  return <a {...props} href={href} target={target} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : props.tabIndex} className={`app-link ${className}`.trim()} onClick={handleClick}>{children}</a>;
}
