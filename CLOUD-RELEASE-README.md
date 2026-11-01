# Private cloud journal, GPT collaboration and linked expenses review

Sites v4 source commit: `f433ed94f27fa2c9a96518219f766cd7dba9555d`. Reconstruct this version by extracting the existing **v3 base** `cloud-sites-source.tar.gz` (base source `021f5b0a08ff2dcef1cf67f42bf9155c84d08a3f`, SHA-256 `fa62e90e60a35ee0d443d8592b4a124c535b48553a830659d30c6413dce5df32`), then running `git apply ../cloud-linked-expenses.patch` inside `cloud-sites/`. This exact reconstruction was checked against all 143 current source files. No runtime secrets or private trip content are included.

This PR preserves GitHub main, development and the existing offline Pages runtime. The exact cloud application is maintained in the Sites source repository. `cloud-source-review.patch` and the other `cloud-*` runtime copies describe the v3 base; **`cloud-linked-expenses.patch` contains every v4 source change**, including readable UI, sync, tests and usage documentation. The base archive is intentionally retained; apply the delta for current source. The MCP route is `cloud-mcp-route.ts`; the journal API route is `cloud-route.ts`.

Owner-only ChatGPT login, durable offline outbox, cross-device sync, explicit conflicts, revocable itinerary-only sharing, and six finalized GPT co-edit tools retain their existing behavior. GPT multi-document edits use guarded D1 batches and preserve private before/after audit and reviewed undo.

Itinerary and expenses now link by stable ID. Save an itinerary and open a prefilled payment; record another payment from an existing card; or create a restaurant card while entering a payment. One card supports multiple payments. New cards have no copied payment amount or private note; budgets and actual spending remain separate. Payment descriptions/dates remain historical if the itinerary is renamed/rescheduled. Unlink/delete never cascades into the other record. See `cloud-linked-expenses.md` for semantics and limits.

56 checks passed: 17 cloud tests, 11 collaboration tests and 28 segment/money/wallet checks. Production build passed. Local browser verified both entry directions, multiple linked payments, loss of server connection with two durable pending documents, then sync and reload preserving the link. Physical phone/tablet airplane-mode and file-save/restore remain user trial checks. Offline pair creation is one IndexedDB transaction; server sync retains per-document conflict handling and eventual convergence.

All private starter content, imported records, exchange-rate settings, source emails and personal backups stay outside this public review and website static assets. The existing private database is retained without a schema migration. Publication follows this PR source update; no main merge or original Pages deployment is included.

Converted TWD amounts display exactly two decimal places; underlying exchange rates retain their full precision, including VND. Actual transaction amounts are preserved.
