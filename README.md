# MDR Accounting Portal

A responsive React portal for a centralized, multi-branch accounting API. The interface covers company-wide balances, payments, reconciliation, transfers, obligations, interbranch activity, and journal history.

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

In development, Vite proxies `/api` to the centralized accounting Laravel app at `http://localhost/accounting/public`. Authentication and registration use that same API (`POST /api/login`, `POST /api/register`, and `POST /api/logout`) and its `accounting` database. Override `VITE_API_PROXY_TARGET` if Laravel is served elsewhere. Never point the browser directly at MySQL or an individual branch database.

The Financial accounts page calls `GET /financial-accounts` relative to that base URL and reads both plain arrays and Laravel paginated `{ "data": [...] }` responses. Open `/financial-accounts` directly to see all accounts, or `/financial-accounts/:id` to bookmark a selected account.

The User accounts workspace is available at `/user-accounts`, with dedicated create, detail, and edit routes. It supports paginated search plus type/status filters, sends uppercase account codes, uses partial `PATCH` updates, shows linked financial accounts and loans on the detail page, and offers deactivation when the API protects an in-use record from deletion with `409 Conflict`.

Financial-account responses treat `account_holder` as the linked `user_accounts.id`; holder names are read from `user_account.name`. The create/edit form loads active choices from `GET /user-accounts?active=1&per_page=100` and sends the selected numeric ID (or `null`) to `POST /financial-accounts` and `PATCH /financial-accounts/:id`.

Financial-account screens use the stored `current_balance` and `available_balance` fields, show `credit_limit` only for credit cards, and display `balance_updated_at` as the balance snapshot time. The legacy `outstanding_balance` and `available_credit` names remain fallback aliases only.

The optional Payment method selector loads active methods from `GET /payment-methods?active=1`. Selecting one refreshes the list through `GET /financial-accounts?payment_method_id=<id>`; selecting All payment methods omits the filter.

The Credit cards page calls `GET /credit-cards?as_of=YYYY-MM-DD` and displays cards in the API's closest-due-date order. It reads the holder label from `user_account.name`, loads searchable institution choices from `GET /financial-institutions`, and optionally adds `financial_institution_id` to the card request. The monitor summarizes outstanding and due balances and shows each card's utilization, nearest deadline, and unpaid statements.

Selecting a card opens `/credit-cards/:id` and calls `GET /credit-cards/:id?as_of=YYYY-MM-DD`. The detail view includes complete statement history and payments applied to each statement. Its payment form loads applicable methods from `GET /credit-cards/:id/payment-methods`, then loads backend-approved source accounts from `GET /credit-cards/:id/funding-accounts?payment_method_id=<id>&branch_id=<id>`. It posts to `POST /credit-cards/:id/payments` and supports optional statement allocation, partial/full/overpayment amounts, confirmation, idempotency, and a posted-payment receipt.

The card detail Adjust action points to the unified `/financial-accounts/:id/adjustments` workspace. For a credit-card account, that route automatically presents the statement-specific workflow: it compares the portal amount due with the issuer's actual statement, posts through `POST /credit-cards/:id/adjustments`, lists prior corrections, loads complete audit and journal details, and requires a reason when voiding an adjustment.

The expandable Loans sidebar menu links to Add loan (`/loans/new`), Loan list (`/loans`), and Upcoming dues (`/loans/upcoming`). The workspace is borrowing-only: every new agreement sends `direction=borrowed`, and list and due requests are restricted to borrowed loans. The Add Loan form loads `GET /loans/creation-options?currency=PHP` and offers External person/company, Bank, and Credit Card lender types. External loans send `borrower_type=company` and a direct `party_name`. In Bank and Credit Card flows, selecting a financial institution reveals a User account selector populated by the direct `GET /user-accounts/list` response, without filtering users by institution. Choosing a user account resolves its associated account internally and submits that account ID as `financial_account_id`; the bank account name is not shown and there is no loan-level `user_account_id`. The institution directory comes from the non-paginated `GET /financial-institutions?type=bank&active=1` array. Loan screens make single requests without page-by-page expansion. The list uses `GET /loans` with search, status, financial-account, and as-of filters. Selecting a loan opens `/loans/:id` and fetches the full `GET /loans/{id}` representation. Upcoming dues uses `GET /loans/upcoming-dues` directly with date-range, as-of, and financial-account filters. Party labels prefer `borrower_name` and the selected financial account's `user_account.name`; counterparty lookups are not used by the loan workspace.

Loan creation asks for one first due date. Its day-of-month becomes the recurring pattern for the remaining monthly installments; the frontend supplies the current date as the hidden agreement start date required by the API.

Selecting an account navigates to `/financial-accounts/:id`, then loads the account from `GET /financial-accounts/:id` and its paginated history from `GET /financial-accounts/:id/transactions`. The dedicated page lists each debit/credit event and its payment, customer-order, purchase-order, expense, transfer, refund, settlement, adjustment, or direct-journal context.

Every financial account exposes an adjustment action at `/financial-accounts/:id/adjustments`. The route detects the account type: bank, savings, checking, cash, and e-wallet accounts use the actual-balance API, while credit cards use the statement/amount-due API. Both experiences share one frontend location and audit pattern while retaining their separate backend accounting rules.

Adjustment forms load every page of active leaf accounts from `GET /chart-accounts`, then limit the offset choices to accounts named for opening/prior balances, fees/charges, or interest/finance charges. Choices appear as `code — name (type)`, and the selected financial account's own control account is excluded so users never need to enter raw chart-account IDs.

Transaction history can optionally be filtered by `branch_id`, `date_from`, `date_to`, exact `debit`, exact `credit`, `status`, and `event`, and sorted with `sort=latest|oldest`. Latest-first is the default, so it is omitted from the query unless the user chooses oldest-first.

Payment transactions display confirmation from `transaction.payment_line`, using `confirmed_at`, `confirmed`/`is_confirmed`, and optional confirmer details. Rows without an applicable payment line show a simple dash, while older API responses that omit `payment_line` are marked unavailable rather than incorrectly treated as unconfirmed.

Confirmed and Not confirmed badges are interactive for every posted payment line, including customer payments, expenses, purchase-order payments, and direct payments. They update through `PUT /integrations/customer-payment-lines/:id/confirmation`; non-payment rows and non-posted payments remain read-only.

The transaction response includes `summary.total_debit` and `summary.total_credit`, calculated across the full filtered result set. These totals appear in the account summary above the ledger and are not limited to the current pagination page.

## Production build

```bash
npm run build
```

The production output is written to `dist/`.
