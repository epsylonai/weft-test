# B-041 / v6.23.0 — prepared server-first handoff

**Prepared locally only. No SQL, Edge deployment or online write was performed.**

New replay bundle SHA-256:
`e32be62030f65a304446f82c5c419035e1efc7812af8ef85732d12931032573e`

The manifest pins30 actual source inputs. `verifySubmission` retains historical Classic6.6/6.7/6.9/6.14 and Warp warp-1 replay. The old live756acac0 executable is retained byte-exact in `historical/canonical-replay-756acac0.mjs`. New scoring is identified by an optional, proof-ID-bound `scoringVersion:"clear-v2"` marker. Missing markers select the historical score and star rules. Mechanics version, generation, card moves, stock curve and seed domains are unchanged.

`verifyCurrentSubmission` requires that marker before a write, replays the complete proof, and emits database version`6.23` for every derived row. Unknown markers, altered scores/fractions, Relaxed and Practice proofs fail closed. Current writes also require the current finite Classic6.14 mechanics(ten boards), Warp warp-1, or current detached board context. Re-labelling an old unbounded6.7/6.9 run with a new scoring marker cannot enter this season. Historical verification is available separately; an old client cannot repost its archived score into the new season.

## Claude-run publish order

1. Review the bundle, manifest, handler, exact migration and rollback. Back up the live database.
2. Publish this byte-exact bundle at a new commit-pinned URL and replace only the local replay import in the handler with that URL. Keep all existing deployed public-key, secret-key, CORS, size, rate-limit and verification-capacity hardening.
3. Apply `202610190001_clear_bonus_v2_season.sql` in the agreed maintenance window. It transactionally copies prior rows into private`private.scores_before_clear_v2`, verifies exact archive coverage before deleting anything, then requires database version`6.23`. It grants no public archive access. Repeated application preserves already accepted new-season rows.
4. Deploy the prepared handler importing the pinned new bundle. Its public POST boundary calls`verifyCurrentSubmission`; do not substitute the historical verifier.
5. Run a genuine current proof and a +100 forgery against the deployed function, hide any test entries, and confirm old-marker-free proofs cannot insert rows. The local genuine full-ten Classic proof is `../../test-output/clear-v2-genuine-classic-proof.json`.
6. Only after that server/reset confirmation, publish the client. No client publication has been done here.

GET categories, completion-first ranking and the private score schema are unchanged. New remote Classic rows retain ten-level completion presentation. The online proof still omits cosmetic starting-world metadata at the existing client projection.

## Scoring and resource accounting

On Clear, bonus=`round-half-up(chainCoins × unused / starting)`, using BigInt rational arithmetic once; final board coins=`chainCoins + bonus`. Display percentages never feed the calculation. No Clear gives no bonus. Relaxed retains its existing cumulative integer÷2 display.

Classic uses each board's original Spool size; Daily uses22. Warp unused is the disjoint sum of Spool, Reel and Spare token counts. Starting is the generated deal's24 tokens, including its initial Thread. Reel and Spare move existing tokens; current Charms and one-shots do not create additional stock cards. Therefore added stock is0 today and the denominator stays24. Moving tokens between those containers never double-counts or increases the denominator. A future mechanic that creates physical stock must version and extend this accounting explicitly.

Stars are2600/4200/8300 for clear-v2; old proofs retain2500/4000/7400. No source master, audio, artwork, card mechanic or solver was altered for scoring.

## Rollback

`ROLLBACK-clear-v2.sql` is prepared, not executed. It first privately archives any new-season rows and checks coverage, removes the current-only constraint and restores the exact old archive. Use it only with the prior756acac0 handler and old client in the same controlled window. New-season rows remain privately retained. Database permissions/functions were reviewed as source; no real Postgres execution is claimed.
