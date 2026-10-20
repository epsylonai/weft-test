# B-048 · Late Night Violin · server-first package

Prepared locally only. No deployment or database action has been performed.

1. Pin this package's exact canonical-replay.mjs at a commit URL and make the existing Edge Function import that URL. The handler source remains unchanged; keep its key, CORS and rate-limit hardening.
2. Apply only 202610200001_window_secret_badge.sql. It extends the permanent-badge allowlist, retains the Hugo award, awards window-secret only from a canonical verified run's moves.window.result.cleared boolean, includes an idempotent backfill and projects windowBadge beside secretBadge. No scores are reset/deleted, no client badge-write path is added, and public/anon/authenticated receive no new permissions.
3. Verify a genuine Neon unlock and room clear, then reject a changed room result/trigger. Replay acceptance and historical parity are pinned in B048-PACKAGE.json.
4. Publish the client only after the pinned canonical bundle is deployed.

The room does not consume a normal level. It inherits the next normal level's Spool and level-v3 coin factor, has a multiplied unused-Spool bonus and no normal-level Clear reward. A room loss ends the run. Its seed, trigger, complete moves and result are independently regenerated/replayed server-side. A moon-door replay stays local/practice and does not create an online proof or new badge-write request.

All four required historical bundles (756acac0, e32be620, 31c382ef and 1acc4654) and the predecessor level-v3 authority 02b96949 are retained byte-exact. Historical verifySubmission stays available; new Classic writes still require level-v3, while Daily and Warp remain clear-v2.
