# B-042 / v6.24.0 — Hugo2 server-first handoff

**Prepared and verified locally; not deployed. Owner inbox18 authorises the MAIN web merge now. Claude deploys this server package first, then publishes the main client. No new SQL/reset.**

Current replay bundle SHA-256:
`1acc4654f68958217a0ecfe6b8c06d3e6082ba0277ea949c6ab7a4db7ba4a897`

The manifest pins32 actual inputs. Earlier B-042 bundle`31c382ef…8ed6f7` is **SUPERSEDED for fresh clients** and retained as the Hugo1 historical authority. B-041`e32be620…32573e` and original live`756acac0…b1ea` are also retained byte-exact under`historical/`.

## Owner §8 rules, versioned

Fresh eligible Classic runs bind`hugoVersion:"hugo-2"`. Hugo2 can trigger only on the actual Green Grove world(identity3), regardless of its position in a rotated/Random run. Fresh Relaxed/Daily/Practice/Warp/tutorial/showcase runs do not opt in. Missing feature metadata retains B-041; explicit`hugo-1` retains the former B-042 replay semantics, including its original seed domain and IDs.

The actual Grove board carries`admission:"grove-hugo-2"`. Its positional seed, Spool count, Peaks dependency graph, card multiset, card mechanics and scoring stay intact. Its versioned deterministic admission places a pure alternating6–7 Thread/three-card sequence and leaves another legal play. B-004's unchanged solver must produce a clearing continuation **after** the voluntary sacrifice draw. That full line is replayed through B-002 before acceptance.

Every eligible Grove deal is guaranteed, stronger than the required every second attempt. Admission tries32 seed-derived candidates with a fixed100,000-node remaining-DAG proof budget(no wall-clock admission decisions), then uses a fixed independently verified fallback for that positional stock size. No local visit count or client-supplied witness grants admission. The fallback is also freshly solver verified. All10 current stock sizes are covered; unsupported rules fail closed. Local sampling verified200 deals across the ten difficulties; every sampled seed admitted in≤3 attempts.

The first accepted pure6–7–6–7 or7–6–7–6 chain(including Thread, exactly three played cards), ended by a voluntary Spool draw while another play exists, records a canonical trigger witness. Forced draws, longer/impure chains, other worlds and disabled contexts cannot trigger. Independent replay derives the first witness rather than trusting it.

Switching the still-normal run to Relaxed/Practice before Clear binds`hugoDisabled:true` and drops any pending unlock. It preserves the already-dealt admission, moves and exact Continue; stripping the feature would wrongly change those cards. The opt-out is part of completion identity. Fresh Relaxed has no admission. An already-entered/finished secret remains part of its exact history.

The player must clear Grove. Its loss ends that run and never enters Hugo. On Clear, Hugo uses a separate`weft-hugo:hugo-2:<root>:<afterLevel>` seed, solver-verified normal board and fixed Spool22; its result lives in`hugo.result`, not normal level11. Then the next normal difficulty board resumes. The published normal world order is unchanged: after default Grove(board3) comes Sunken Temple(board4, identity5). “World4 as normal” means that fourth normal board, not moving Neon(identity4) from its published position6.

Secret coins, clear-v2 bonus, longest chain, best board/hand and stars count. Normal levelsCleared and ten-board ranking do not count the extra as a level. Clearing all ten normal boards retains Classic completion even if an inserted final Hugo is lost. Standalone secret **and admitted Grove** board submissions are rejected: their rows are derived only from a full validated run proof.

## Route authority and compatibility

Hugo2's actual world route now controls admission. Therefore its seeded/rotated route stays in the online proof and completion ID. The server verifies every world against that route, the positional difficulty/seed, exact admitted deck and every action. It rejects altered routes, stripped feature/admission, forged score and witness. Older proofs retain the former cosmetic-route projection unchanged.

Local genuine examples:
- `../../test-output/hugo-2-genuine-run-proof.json`: Grove-first trigger and secret loss.
- `../../test-output/hugo-2-full-ten-genuine-proof.json`: all ten normal boards plus Hugo.

## Claude-run server-first deployment order for the authorised main merge

1. Review this bundle, manifest, handler and historical files.
2. Publish the current byte-exact bundle under a new commit-pinned URL. Replace only the handler's replay import with that pinned URL; preserve its publishable/secret-key handling, CORS, body-size, rate-limit and retryable-verification protections.
3. Deploy the handler before any ranked Hugo2 client. `verifyCurrentSubmission` remains the current-write boundary. Historical verification remains available. Existing B-041 clear-v2 and Hugo1 proofs still replay/write unchanged.
4. Verify the genuine full Hugo2 proof, a forged score/witness and the historical examples. Hide test rows.
5. Publish the main web client after the server passes the genuine/forged/historical checks. Inbox18 records the owner’s13:45 decision to skip the separate test gate and merge B-042 now. No owner phone action is part of this web delivery.

The corrected isolated `/hugo/` preview still has no online backend or score writes. Its earlier owner-test gate is superseded by inbox18. This package was verified locally only; Claude performs steps1–4 before publishing the ranked main client. The builder has performed no deployment, SQL/reset or production request.

**No SQL, reset or migration is required for B-042.** All derived current rows stay in score era`6.23`. Inherited B-041 SQL/rollback files are historical; do not reapply/reset them for this feature.

## Local evidence scope

`tests/hugo-grove-v2.test.cjs`:14 current cases, including200 real admissions, ten fallback proofs, exact Continue, world/mode restrictions, opt-out, forgery rejection and full ten-normal-board runs with Hugo in position3 or after10.

`tests/hugo-run.test.cjs`:17 explicitly historical Hugo1 compatibility cases; genuine rows match retained authorities byte-for-byte. `test-output/hugo-code-verification.json` pins the current source, helpers, bundle and immutable ordinary engine/solver/world/scoring/Warp/migration authorities.

This package makes no deployed-server, native, physical-phone or performance claim. Current exact local server evidence is `../../test-output/hugo-main-preview-entry/verification.json` (8/8 cases, genuine Hugo2/Grove-first accepted; forged/stripped rejected; B-041 e32 +756 historical parity). Approved-media and main-browser evidence is separately pinned in the root NOTES and B042-MAIN-READY receipt.
