# Sites cloud release review

Source commit: `b827d305a34bc93d8fead82da33080ee9f948982` in the Sites source repository for project `appgprj_6ae3057b2f208191bb31ad526047824b`.

This PR preserves GitHub main, development's existing offline runtime, and GitHub Pages. The complete independently deployable cloud application is in `cloud-sites-source.tar.gz`, extracted as `cloud-sites/`; SHA-256 `d85a9cbcb925319a445235a88f35ee0944a8b499d8cad584bcad3cabfa6b71bd`. It contains the exact committed source tree, not browser data or credentials.

`cloud-source-review.patch` exposes the primary application source as text for review. Other `cloud-*` text files are direct review copies of the named files inside the source archive: `cloud-cloud.js` is public/cloud.js; `cloud-sync-core.js` is public/sync-core.js; `cloud-journal-api.mjs` is lib/journal-api.mjs; `cloud-route.ts` is app/api/journal/[...path]/route.ts; `cloud-schema.ts` and `cloud-0000_mute_microchip.sql` define storage.

See `cloud-cloud-release.md` for migration, privacy, backup semantics, limits, testing evidence and remaining physical-device checks.

Validation: 15 cloud scenarios and 28 existing segment/money/wallet checks passed. Local browser two-origin sync, concurrent conflict resolution, private photo pull, share privacy and revocation passed. Production build passed. This is a trial release, and no physical phone/tablet offline or file-save/restore result is claimed.

The browser-based GitHub upload is used because the GitHub connector still returns 403 for code writes. No main merge or existing Pages deployment is part of this PR. Sites publication uses the exact source commit above.
