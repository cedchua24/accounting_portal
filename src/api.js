const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const token = import.meta.env.VITE_API_TOKEN || sessionStorage.getItem('accounting_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const requestError = new Error(error.message || `Request failed (${response.status})`);
    requestError.status = response.status;
    requestError.details = error.errors;
    if (response.status === 401 && token) window.dispatchEvent(new Event('accounting:unauthorized'));
    throw requestError;
  }
  return response.status === 204 ? null : response.json();
}

export const authApi = {
  login: (login, password) => request('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password, device_name: 'ledgerly-web' }),
  }),
  register: (payload) => request('/register', {
    method: 'POST',
    body: JSON.stringify({ ...payload, device_name: 'ledgerly-web' }),
  }),
  logout: () => request('/logout', { method: 'POST' }),
};

export const accountingApi = {
  dashboardTotalCashBalance: (dayFrom, dayTo) => {
    const params = new URLSearchParams();
    if (dayFrom) params.set('day_from', dayFrom);
    if (dayTo) params.set('day_to', dayTo);
    const query = params.toString();
    return request(`/dashboard/total-cash-balance${query ? `?${query}` : ''}`);
  },
  dashboardCollections: (dayFrom, dayTo) => {
    const params = new URLSearchParams();
    if (dayFrom) params.set('day_from', dayFrom);
    if (dayTo) params.set('day_to', dayTo);
    const query = params.toString();
    return request(`/dashboard/collections${query ? `?${query}` : ''}`);
  },
  dashboardPayments: (dayFrom, dayTo) => {
    const params = new URLSearchParams();
    if (dayFrom) params.set('day_from', dayFrom);
    if (dayTo) params.set('day_to', dayTo);
    const query = params.toString();
    return request(`/dashboard/payments${query ? `?${query}` : ''}`);
  },
  dashboardUpcomingDues: (dayFrom, dayTo) => {
    const params = new URLSearchParams();
    if (dayFrom) params.set('day_from', dayFrom);
    if (dayTo) params.set('day_to', dayTo);
    const query = params.toString();
    return request(`/dashboard/upcoming-dues${query ? `?${query}` : ''}`);
  },
  dashboardUpcomingDuesList: (params = '') => request(`/dashboard/upcoming-dues-list${params}`),
  dashboardCashFlow: (dayFrom, dayTo) => {
    const params = new URLSearchParams();
    if (dayFrom) params.set('day_from', dayFrom);
    if (dayTo) params.set('day_to', dayTo);
    const query = params.toString();
    return request(`/dashboard/cash-flow${query ? `?${query}` : ''}`);
  },
  dashboardRecentActivity: (params = '') => request(`/dashboard/recent-activity${params}`),
  creditCards: (params = '') => request(`/credit-cards${params}`),
  financialInstitutions: (params = '') => request(`/financial-institutions${params}`),
  creditCard: (id, params = '') => request(`/credit-cards/${id}${params}`),
  creditCardPaymentMethods: (id) => request(`/credit-cards/${id}/payment-methods`),
  creditCardFundingAccounts: (id, paymentMethodId, branchId) => {
    const params = new URLSearchParams({
      payment_method_id: String(paymentMethodId),
      branch_id: String(branchId),
    });
    return request(`/credit-cards/${id}/funding-accounts?${params.toString()}`);
  },
  creditCardAdjustments: (id) => request(`/credit-cards/${id}/adjustments`),
  creditCardAdjustment: (id, adjustmentId) => request(`/credit-cards/${id}/adjustments/${adjustmentId}`),
  createCreditCardAdjustment: (id, payload) => request(`/credit-cards/${id}/adjustments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  voidCreditCardAdjustment: (id, adjustmentId, reason) => request(`/credit-cards/${id}/adjustments/${adjustmentId}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  createCreditCardPayment: (id, payload) => request(`/credit-cards/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  financialAccounts: (params = '') => request(`/financial-accounts${params}`),
  userAccounts: (params = '') => request(`/user-accounts${params}`),
  userAccountList: () => request('/user-accounts/list'),
  userAccount: (id) => request(`/user-accounts/${id}`),
  createUserAccount: (payload) => request('/user-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateUserAccount: (id, payload) => request(`/user-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  replaceUserAccount: (id, payload) => request(`/user-accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteUserAccount: (id) => request(`/user-accounts/${id}`, { method: 'DELETE' }),
  financialAccountApplicationTypes: (params = '?active=1') => request(`/financial-account-application-types${params}`),
  financialAccount: (id) => request(`/financial-accounts/${id}`),
  createFinancialAccount: (payload) => request('/financial-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateFinancialAccount: (id, payload) => request(`/financial-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  financialAccountAdjustments: (id) => request(`/financial-accounts/${id}/adjustments`),
  financialAccountAdjustment: (id, adjustmentId) => request(`/financial-accounts/${id}/adjustments/${adjustmentId}`),
  createFinancialAccountAdjustment: (id, payload) => request(`/financial-accounts/${id}/adjustments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  voidFinancialAccountAdjustment: (id, adjustmentId, reason) => request(`/financial-accounts/${id}/adjustments/${adjustmentId}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  paymentMethods: (params = '?active=1') => request(`/payment-methods${params}`),
  chartAccounts: (params = '') => request(`/chart-accounts${params}`),
  chartAccountGroups: (params = '') => request(`/chart-account-groups/list${params}`),
  chartAccountList: (params = '') => request(`/chart-accounts/list${params}`),
  chartAccountTree: (params = '') => request(`/chart-accounts/tree${params}`),
  expenseSetup: () => request('/expense-setup'),
  expenseTypes: (params = '') => request(`/expense-types/list${params}`),
  expenseCategories: (params = '') => request(`/expense-categories/list${params}`),
  expenseItems: (params = '') => request(`/expense-items/list${params}`),
  expenses: (params = '') => request(`/expenses${params}`),
  expenseLedger: (params = '') => request(`/expenses/ledger${params}`),
  approveExpense: (id) => request(`/expenses/${id}/approve`, { method: 'POST' }),
  rejectExpense: (id, reason) => request(`/expenses/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason, rejection_reason: reason }),
  }),
  counterparties: (params = '') => request(`/counterparties${params}`),
  branches: (params = '') => request(`/branches${params}`),
  accountTransactions: (id, params = '') => request(`/financial-accounts/${id}/transactions${params}`),
  updatePaymentLineConfirmation: (id, confirmed) => request(`/integrations/customer-payment-lines/${id}/confirmation`, {
    method: 'PUT',
    body: JSON.stringify({ confirmed }),
  }),
  accountMovements: (id) => request(`/financial-accounts/${id}/movements`),
  payments: (type) => request(`/payments?type=${type}`),
  obligations: () => request('/payment-obligations'),
  journals: (params = '') => request(`/journal-entries${params}`),
  transfers: (params = '') => request(`/account-transfers${params}`),
  createTransfer: (payload) => request('/account-transfers', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(payload),
  }),
  postTransfer: (id) => request(`/account-transfers/${id}/post`, { method: 'POST' }),
  voidTransfer: (id, reason) => request(`/account-transfers/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  customerRefunds: (params = '') => request(`/customer-refunds${params}`),
  createCustomerRefund: (payload) => request('/customer-refunds', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(payload),
  }),
  postCustomerRefund: (id) => request(`/customer-refunds/${id}/post`, { method: 'POST' }),
  voidCustomerRefund: (id, reason) => request(`/customer-refunds/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
  loans: (params = '') => request(`/loans${params}`),
  loanList: (params = '') => request(`/loans/list${params}`),
  loanCreationOptions: (currency = 'PHP') => request(`/loans/creation-options?currency=${encodeURIComponent(currency)}`),
  loanUpcomingDues: (params = '') => request(`/loans/upcoming-dues${params}`),
  loanInstallmentUpcomingDues: (params = '') => request(`/loan-installments/upcoming-dues${params}`),
  loan: (id, params = '') => request(`/loans/${id}${params}`),
  createLoan: (payload) => request('/loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateLoan: (id, payload) => request(`/loans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  cancelLoan: (id) => request(`/loans/${id}/cancel`, { method: 'POST' }),
  deleteLoan: (id) => request(`/loans/${id}`, { method: 'DELETE' }),
  loanPaymentMethods: (id) => request(`/loans/${id}/payment-methods`),
  loanPaymentAccounts: (id, paymentMethodId, financialInstitutionId = '') => {
    const params = new URLSearchParams({ payment_method_id: String(paymentMethodId) });
    if (financialInstitutionId) params.set('financial_institution_id', String(financialInstitutionId));
    return request(`/loans/${id}/payment-accounts?${params.toString()}`);
  },
  loanPayments: (id, params = '') => request(`/loans/${id}/payments${params}`),
  createLoanPayment: (id, payload) => request(`/loans/${id}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteLoanPayment: (loanId, paymentId) => request(`/loans/${loanId}/payments/${paymentId}`, { method: 'DELETE' }),
  interbranchOrders: (params = '') => request(`/interbranch-orders${params}`),
  createPayment: (payload) => request('/payments', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(payload),
  }),
  voidPayment: (id, reason) => request(`/payments/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),
};
