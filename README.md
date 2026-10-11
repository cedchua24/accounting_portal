# Ledgerly Accounting Portal

A responsive React portal for a centralized, multi-branch accounting API. The interface covers company-wide balances, payments, reconciliation, transfers, obligations, interbranch activity, and journal history.

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the centralized Laravel API. Never point this frontend at individual branch databases.

## Production build

```bash
npm run build
```

The production output is written to `dist/`.
