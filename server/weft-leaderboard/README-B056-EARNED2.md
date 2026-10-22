# B-056 combined release — v6.24.18 / earned-2

PREPARED ONLY. No deployment, SQL execution, network submission or phone action was performed. This replaces prepared v6.24.17 / canonical0379 / packagee784 before deployment. Do not deploy either previous package.

The owner’s final Joker rules are versioned as `earned-2`: hold one; any free board card may be selected at any time. That action banks the old combo, then the selected card becomes a new Thread/anchor and contributes no play/link/coin of its own. Ten following ordinary clean plays award one Joker. Final-card Clear banks and can award before carry. No rank dead-end automatically banks or loses. A real Spool draw banks; an empty Spool explicitly finishes only when neither a legal ordinary play nor a held Joker remains. No timer. Daily and Warp retain their exact authority.

Hugo7 / Window7 / Anabelle2 insertion is unchanged: a secret receives the next numbered position’s seed/stock/factor/Spool and Clear reward; the ordinary world cursor is preserved. Every ordinary world still appears in order. All secrets use the same Joker adapter and carry.

## Owner deployment order

1. Stop or pause writes during the combined authority/season swap if needed.
2. Apply `202610220002_earned_jokers_season.sql` ONCE. It is byte-exact B055: write lock, immutable archive, validation before hide, idempotent marker, no DELETE; permanent badges retained.
3. Apply `202610220004_anabelle_earned2.sql`. It adds the three-badge projection/award rule and admits public6.24.18; no separate score reset. Prepared003 was never deployed and is superseded by004 for this combined release.
4. Pin this package’s exact `canonical-replay.mjs` with the unchanged hardened handler. Run genuine, forged and historical checks server-first.
5. Publish only the matching sealed client, then enable writes. `B055-ROLLBACK.sql` hides every post-reset row not in the archive across all kinds and restores original archived visibility. No rows or badges are deleted.

All fourteen immutable authority files are retained. `verifySubmission` preserves historical rows and IDs exactly, including earned-1 cap3/autobank/Joker-as-play semantics. `verifyCurrentSubmission` requires earned-2 for Classic and gives earlier level-scoring Classic the existing update-required response. Historical unsupported legacy status is unchanged. Daily/Warp6.23 remains accepted. Current Classic rows are6.24.18.

Identity/player code is reversible full-entropy UUID encoding stored on device, not a new server identity table. Import never reassigns another identity’s local proofs. No extra identity SQL or new personal data is introduced here.

The packet, ledger and acceptance receipt pin every authority, current input, SQL and genuine fixture. No source master/audio/video encoding changes are in this server change.
