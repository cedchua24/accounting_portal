# Ledgerly Accounting Portal

A responsive React portal for a centralized, multi-branch accounting API. The interface covers company-wide balances, payments, reconciliation, transfers, obligations, interbranch activity, and journal history.

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

In development, Vite proxies `/api` to the centralized accounting Laravel app at `http://localhost/accounting/public`. Authentication and registration use that same API (`POST /api/login`, `POST /api/register`, and `POST /api/logout`) and its `accounting` database. Override `VITE_API_PROXY_TARGET` if Laravel is served elsewhere. Never point the browser directly at MySQL or an individual branch database.

The Financial accounts page calls `GET /financial-accounts` relative to that base URL and reads both plain arrays and Laravel paginated `{ "data": [...] }` responses. Open `/financial-accounts` directly to see all accounts, or `/financial-accounts/:id` to bookmark a selected account.

## Production build

```bash
npm run build
```

The production output is written to `dist/`.
