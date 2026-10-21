# B-051 · v6.24.13 · secret levels replace the next position

Prepared locally; not deployed. Claude deploys this package server-first, then publishes the client.

The new versions are `hugo-5` and `window-5`. A qualifying ordinary Clear at position N is followed by its secret at position N+1, using exactly N+1's stock, coin factor, multiplied unused-stock bonus and level Clear reward. Clearing the secret advances to position N+2. The ordinary board at N+1 is omitted. A finished run has exactly ten played positions, including secrets. Both secret board totals are included once, in full, in the run score and every verified board/chain row. Each new version has its own deterministic secret-seed domain.

The proof envelope stays compatible: ordinary results remain in `perLevel`, with their actual position numbers; the independently journaled secret stays in `hugo.result` or `window.result`. The canonical verifier derives each omitted position from the exact preceding trigger and Clear, regenerates every board and recomputes its score. It rejects a skipped position without a secret, an ordinary board replayed at the replaced position, a duplicate secret, wrong position, stock, factor, bonus or total. Client-supplied gaps are never accepted as authority.

At position 10, a qualifying trigger can be recorded, but there is no position 11 and no secret board or secret-Clear badge is awarded from that trigger. The run finishes normally; an earlier eligible world on another run can earn the badge. This is the documented finite-run interpretation of the unspecified after-last case.

Hugo1/2/3/4 and Window1/2/3/4 keep their exact historic interlude progression, seeds, stock, scoring and row identities. Old Continue data remains valid without conversion. Nine immutable historical authorities, including deployed `156cfcd3`, are retained and checked by row-for-row equality. Current Classic remains `level-v3`; Daily and Warp stay `clear-v2`. Ranking and score-row shape are unchanged.

**SQL: none.** No migration, season reset, score deletion, badge deletion, or reapplication of inherited SQL. The existing version-independent badge triggers already derive awards from server-verified `moves.hugo.result.cleared` and `moves.window.result.cleared`.

Deployment order for Claude:

1. Pin the exact `canonical-replay.mjs` named in `B051-PACKAGE.json` at an immutable URL.
2. Deploy the supplied unchanged hardened Edge handler, replacing only its local replay import with that URL. Keep the live `run-score` / `warp-run-score` read kinds and all authentication, rate-limit, CORS and key handling.
3. Run the genuine Hugo5, Window5 and dual-secret full-ten proofs in `test-output/b051-secret5/`; altered totals/positions must reject. The currently live156 bundle deliberately rejects these unknown new feature versions, so client publication must follow deployment.
4. Publish v6.24.13 only after the server verifies the new proofs.
