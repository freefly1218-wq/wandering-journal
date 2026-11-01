# Private cloud journal and GPT collaboration review

Sites source commit: `021f5b0a08ff2dcef1cf67f42bf9155c84d08a3f`. Full source: `cloud-sites-source.tar.gz`, extracted as `cloud-sites/`; SHA-256 `fa62e90e60a35ee0d443d8592b4a124c535b48553a830659d30c6413dce5df32`. No runtime secrets or private trip content are included.

This PR preserves GitHub main, development and the existing offline Pages runtime. The exact cloud application is maintained in the Sites source repository. `cloud-source-review.patch` exposes the main source as text; `cloud-*` runtime files are direct review copies using their original basenames. The MCP route is `cloud-mcp-route.ts`; the journal API route is `cloud-route.ts`.

New behavior: six owner-only GPT tools read the latest itinerary and document revisions, preview proposed edits, commit only finalized decisions, list audit history and prepare undo. Multi-document writes use a single guarded D1 batch; conflicts fail without partial writes, retries are idempotent, and every accepted edit preserves before/after/source data in private synced documents. Browser GPT collaboration history supports reviewed undo.

The MCP capability creates a Sites-managed private plugin on publication. Installation/connection must be separately verified. Friend links retain their existing read-only whitelist, and offline edits keep the existing outbox/conflict behavior. Migration 0001 adds only the private proposal table.

54 checks passed: 15 cloud tests, 11 collaboration tests and 28 existing segment/money/wallet checks. Local HTTP /mcp and browser history/undo were tested with a synthetic todo. The separate private starter JSON was structurally verified and imported in the local UI; no personal itinerary is embedded in source, migration, website assets or this PR.

See `cloud-gpt-collaboration.md` and `cloud-cloud-release.md` for data semantics, limits, deployment workflow and earlier offline evidence. Production publication follows the PR source update. No main merge or existing Pages deployment is part of this PR.
