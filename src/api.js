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
  financialAccounts: (params = '') => request(`/financial-accounts${params}`),
  accountMovements: (id) => request(`/financial-accounts/${id}/movements`),
  payments: (type) => request(`/payments?type=${type}`),
  obligations: () => request('/payment-obligations'),
  journals: () => request('/journal-entries'),
  transfers: () => request('/account-transfers'),
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
