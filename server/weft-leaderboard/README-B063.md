# B-063 Speed server-first package — prepared, not deployed

This is additive to live Edge v18 / a747 and the already-applied player-transfer migration. No database or network request was executed to prepare it. Do not reapply an earlier season reset or player-transfer migration.

1. Apply **only `202610230002_speed_mode.sql`**. It extends the actual `scores_current_clear_v2` and `scores_kind_check` constraints with row version `6.24.25` and kind `speed`. Existing versions/kinds remain valid. The service-only leaderboard page keeps every existing ordering and all three badge projections, adding Speed ranked by score, then level, date and row id. No rows, badges, identities or archived visibility are changed.
2. Publish the byte-exact new `canonical-replay.mjs` at a commit-pinned URL. Its SHA is in `B063-PACKAGE.json`. Change the local canonical import in `index.ts` to that pinned URL as with prior packages. Publish the matching `index.ts` **and unchanged sibling `player-transfer.ts`**. Other hardenings, public-key validation, CORS, rate limits, size limits and private transfer behavior remain unchanged. `verify_jwt=false` remains the current deployment setting; the handler requires the publishable key.
3. Smoke-test the packaged genuine Speed proof (200), a forged total (400), invalid key (401), all ordinary score categories, and a private player backup read. Then publish the matching sealed client. The owner/Claude executes deployment; this package does not do it.

The canonical wrapper intercepts only `type: "speed-run"`. Every other historical/current proof delegates to the exact archived LIVE a747 bytes. All eighteen immutable replay authorities are retained. Old Classic clear-v2 writes still return the same update-required result. Existing Classic, Daily, Warp, scoring, unlocks, badges and private player transfer are unchanged.

A Speed proof contains its ruleset-tagged completed record: a failed terminal run or five cleared boards, seed, timed external actions, explicit pause segments and computed result claims. Candidate admission is independently regenerated from index zero; automatic dead-end draws are derived, never trusted from the client. Legal actions, earned-4 Joker inventory, tempo and integer scoring are replayed. There is only one Speed run row, never a Classic board/chain/run row, and no secret-badge award path.

Timing is **device-reported**. The verifier enforces bounded integer times, pause accounting, clock/tolerance, 100 ms play floor and the 70% rapid-play limit. This checks plausibility, not human reaction speed or an authenticated clock. Score/action forgery rejects, but client timing cannot be made authoritative by this package.

The included acceptance receipt records local actual-Edge tests with an in-memory RPC boundary plus static SQL/ACL assertions. PostgreSQL was not run here. Owner smoke testing must verify the additive migration and constraints in the intended environment.

Rollback: an older handler/client may be republished without deleting any data; its kind whitelist simply does not expose Speed. Retain the additive constraints and existing Speed rows. Never drop the new kind/version constraints while Speed rows exist, and never run a historical reset as rollback.
