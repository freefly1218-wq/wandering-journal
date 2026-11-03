# Private cloud journal: advances and repayments

Sites v7 source: `699c56d139639ed19f6cb1a1e966bf13bbd64554`. Reconstruct it by extracting the existing v3 `cloud-sites-source.tar.gz` (source `021f5b0a08ff2dcef1cf67f42bf9155c84d08a3f`, SHA-256 `fa62e90e60a35ee0d443d8592b4a124c535b48553a830659d30c6413dce5df32`), then running these commands inside `cloud-sites/`:

```sh
git apply ../cloud-linked-expenses.patch
git apply ../cloud-offline-startup.patch
git apply ../cloud-cash-impact.patch
git apply ../cloud-advances.patch
```

This reconstruction matches all 149 current source files exactly. The source archive and other `cloud-*` runtime copies remain the v3 base; the four complete delta files contain every subsequent UI, sync, test and documentation change. No environment secrets, local runtime files or personal travel records are included.

## iPhone Home Screen setup

1. Keep the phone online and open the journal **from its Home Screen icon**. Sign in with the owner's existing ChatGPT account.
2. Press **準備離線使用** on a personally controlled device. Wait for **可離線開啟・已準備本機行程與記帳**, then confirm cloud synchronization.
3. Close the app, turn on airplane mode, and reopen using the icon. Edits save locally; reconnect and keep the app open to synchronize.

Safari tabs and Home Screen apps may use different data spaces; prepare the installed app itself. Do not clear site data or delete the app to fix this. Sync pending edits and keep a full backup before considering reinstallation. Existing account ownership, local database names, private documents, money, conflicts and backups are preserved.

## Advances and repayments

An expense keeps the complete original payment in `amt`, with optional `ownAmt` for personal share. Repayment documents use `kind=reimbursement`, a stable `expenseId`, and actual amount/currency/payment method. Personal spending counts only the own share; the full actual TWD card charge is retained and prorated for personal reporting. Cash repayments increase physical cash, transfers do not. Partial repayments, outstanding totals and overcollection warnings are visible. Form checks protect paid links; concurrent receipts remain explicit. Private PDF and daily totals use the same accounting. JSON backups use moneyVersion 3 and retain all links. Old clients and incompatible queued changes cannot silently erase advance data. No existing expenses are automatically reclassified. See `docs/advances.md`.

## Cash impact clarity

Cash expenses and exchanges already recompute from the physical-count baseline. An entry marked `cashIncluded` is intentionally excluded to prevent double deduction. The updated list makes this exclusion and uncounted currencies visible; the editor previews the resulting balance before saving and explicitly explains that new expenses/exchanges should not use the historical-entry checkbox. No existing records are automatically reclassified. The offline shell revision is bumped to deliver the updated editor. See `docs/cash-impact.md`.

## Offline startup fix

The old startup waited for cloud requests before showing cached data and registered the worker only after sync. Optional PDF/map download failures could prevent the entire shell installation, errors were hidden, and canonical redirects could contaminate navigation responses. The new version checks the public shell early, verifies its core cache, opens trusted local data immediately, bounds network waits, and serves prepared launch URLs from a coherent cache. Old `.html`, root, clean, trailing-slash and query launch URLs work. API/auth/share/private resources are never placed in the public shell cache. Cloud 401/403 still lock access; remembered offline identity never authorizes cloud requests.

The icon remains the existing dark green mountain/sun PNG, with 192 and 512 pixel sizes. iPhone Apple Touch Icon, localized Home Screen name and manifest metadata now reside in valid HTML head. The manifest launches `/trip` and keeps the previous `/trip.html` app identity. Photos and external maps are available offline only to the extent already downloaded.

## Existing features

Private ChatGPT login, cloud sync, durable offline outbox, explicit revision conflicts, itinerary-only revocable friend links, linked itinerary/payments, two-decimal TWD display, and finalized GPT edits with private audit/undo retain their behavior. The private database is not migrated or overwritten.

## Validation

83 checks passed: 21 cloud, 12 GPT collaboration, 13 offline startup, 8 advances and 29 segment/money/wallet checks. Browser QA confirmed full card payment, own share, linked cash repayment, settled receivable and unchanged personal expense after collection. Cash regression checks cover correcting an excluded exchange, immediate offline recomputation and convergence on another device. Browser QA uses synthetic balances for expense deduction and exclusion previews. The earlier offline validation below remains applicable: Production build passed. Real Chrome browser QA prepared a new origin, closed the tab, stopped the local server, reopened both legacy and canonical launch URLs without a server, edited offline, reopened again with the pending edit preserved, and synchronized after reconnecting. Final cold-start UI verifies the current cache revision. This is desktop browser evidence; the physical iPhone Home Screen airplane-mode check remains the user's acceptance test.

Current app: https://lun-wanderer-journal.freefly1218.chatgpt.site
GitHub main, development and the original Pages app are unchanged by this update. Code is reviewed in PR #6 before Sites publication. Private data and rate settings are absent from source and schema migrations.
