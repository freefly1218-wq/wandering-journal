# Cloud trial release — 2026-10-31

The existing journal UI now uses Sites-managed D1/R2 and ChatGPT sign-in. No Supabase account is required. The original GitHub Pages offline app and GitHub main branch are unchanged.

## Owner use and migration

1. Export a full content backup from the original phone app before changing URLs. Keep that file separately.
2. Open the new Sites URL and sign in with the owner's existing ChatGPT account.
3. In the Expenses tab, import the phone backup once. This replaces the cloud itinerary and financial documents. Existing private notes are preserved/updated by ID rather than erased implicitly.
4. Wait for the top bar to say synced; sign in with the same account on other devices.
5. On a personally controlled device, enable trusted-device offline access and complete an online sync before travelling. Cached private data is not encrypted at the application layer. Do not enable this on shared devices.

No actual phone data or private starter travel file was uploaded during development. Test data stays in the local preview database.

## Sharing

The owner creates a revocable, seven-day bearer link. Friends need only that link and can see the selected itinerary, dates, locations and times. Item notes are off by default and may be explicitly included. The server selects allowed fields: no journal entries, receipts, money, cash, private information, photos or editing API access. Forwarding a link forwards its access; revocation stops future requests but cannot erase screenshots or previously seen information.

The site shell must be publicly reachable for anonymous friend links. All owner APIs independently require the server-verified ChatGPT identity plus the configured owner email. No first-visitor ownership claim is used. Production owner email is a Sites secret, never bundled into the client. The local mock identity is for preview only.

## Sync and recovery behavior

- Writes first commit to per-account IndexedDB and a durable outbox. Foreground sync runs after edits, on reconnect, on focus and roughly every twelve seconds; it is not background sync while the app is closed.
- Per-document revision checks reject concurrent stale overwrites. Different documents merge; conflicting versions require an explicit choice. Both variants are archived locally and included in complete backups.
- Idempotent operation receipts prevent replay from duplicating writes. Change pagination includes document deletion tombstones.
- Private images/attachments upload to owner-scoped R2 objects, with hash checks on download. Limits in this trial: 20 MB per asset, 2,000 active assets and 250,000 characters per document.
- Complete JSON backups include documents, locally cached photos, pending changes and local conflict history. Keep a separate copy outside the site. This is a manual backup feature, not an unattended disaster-recovery service.
- Restoring a backup creates new sync operations; old operation IDs and revision positions are deliberately not replayed. Conflict history is forensic backup data, not an automatic undo interface. The UI currently supports one journey per owner.
- Logging out clears the remembered offline identity. Cached documents and pending edits remain in IndexedDB for recovery; clearing browser storage removes them. Online login denial does not silently fall back to offline access.

## Validation evidence

- 15 cloud tests using real SQLite plus the production sync algorithm: ownership and Origin checks, revisions/tombstones, retries, pagination, independent-device convergence, same-document conflicts, in-flight edits, offline retry, login expiry, public-field privacy, share revocation/expiry, private immutable assets and stale editor submission, clean production URL offline caching, and waiting for in-flight sync.
- 28 existing route, segment, currency and wallet checks run against the cloud HTML.
- Local browser: two independent origins/IndexedDB stores signed in as the same preview owner. Imported synthetic itinerary/finance/private-note/photo fixture, pulled onto the second origin, edited one item concurrently, resolved the conflict and observed both views converge. A private photo loaded on the second origin. Sharing was read-only; revocation removed access. Imported unsafe HTML was removed.
- Full backup generation produced a downloadable Blob. This browser-control connection cannot retrieve Blob downloads, so a physical-device file-save/restore round trip remains a user trial check. Likewise the desktop viewport override did not actually change the viewport; no claim of physical phone/tablet or airplane-mode testing is made.
- Build and migration results are recorded in the publication evidence outside the source tree.

Apple Journal import remains a separate planned feature and is not represented as shipped by this cloud release.

Production smoke check: native Sites publication succeeded; the existing ChatGPT owner signed in and the real site reached synced status. The platform canonicalizes /trip.html to /trip; the service worker now maps that clean URL and / to the cached shell. Direct automated HTTP probes were blocked by the edge (1010), so their 403 responses are not asserted as application authorization evidence.
