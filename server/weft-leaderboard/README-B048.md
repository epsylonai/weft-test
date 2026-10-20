# B-048 · Late Night Violin · v6.24.9 server-first package

Prepared locally only. No deployment or database action has been performed.

1. Pin this package's exact canonical-replay.mjs at an immutable commit URL and make the existing Edge Function import that URL. The handler source remains unchanged; retain its key, CORS and rate-limit hardening.
2. Verify the genuine Window2 run, deterministic zero-board-ace retry, forged admission/trigger/score rejection and six historical authorities using the pinned acceptance ledger.
3. Publish the client only after the pinned canonical bundle is deployed.

**No migration in this round. Do not reapply 202610200001_window_secret_badge.sql.** The owner is applying that earlier v6.24.8 badge migration separately. Historical migration/wipe files retained elsewhere are not actions in this package. No scores or badges are reset or deleted.

Window2 changes only the versioned normal-Neon admission and the selected ace. The generator follows the ordinary B-004 salted candidate order but accepts a candidate only when the solver verifies it clearable and its 30 board cards contain an ace. The violin ace is the first such board ace. Window2 unlocks on a real Spool draw after any chain of at least one played card whose last card is that ace; no poker hand is required. Playing another board card after the ace instead does not unlock. Window1 retains its historical pair-or-better requirement. Client and canonical use the same unmodified B-002/B-004 engine modules and the same new admission module. The separate room keeps the next normal level's stock and level-v3 factor, multiplied unused-stock bonus and no normal-level Clear reward.

Window2 assisted local histories keep their admission through a Relaxed-mode latch but cannot be submitted as ranked Classic runs.

Window1 proofs and Continue keep their original generator, full-deal first ace and seed domain. The 05bd763a Window1 authority is archived byte-exact beside 756acac0, e32be620, 31c382ef, 1acc4654 and 02b96949. Historical verification remains available; current Classic clear-v2 writes still require an update, while Daily and Warp remain unchanged.
