# B-051 Note 8 — run position and score accounting

Hugo5 and Window5 consume the next ordinary position; after an L2 secret the next board is L3. A run has ten actual boards. Historical feature versions stay untouched and resume under their original rules. The new client, replay verifier and server package use the same run module.

Concrete full-run controller traces are in `test-output/b051-secret5/`:

- Hugo5, seed104, Grove-first: L1 4,556; Hugo L2 adds8,086 (3,661 chain coins +675 unused-Spool coins +3,750 level reward), giving12,642 before L3; ten-board run total411,610.
- Window5, actual fixed-heart auto-bank-and-draw witness: L1 4,419; Violin L2 adds13,293 (8,493 chain coins +1,050 unused-Spool coins +3,750 level reward), giving17,712 before L3; ten-board total1,215,920.
- Both secrets in one genuine seed104 run: normal1, Hugo2, normal3–4, Violin5, normal6–10. Total409,232. There are eight ordinary results and two secret results, exactly ten played boards; neither position is replayed.

The owner's screenshot displays12,807 in the pouch and“Board6,207” under the hand. Those numbers are consistent with6,600 previously earned +6,207 room coins =12,807. An unchanged12,807 on the following board is expected: entering a board adds no coins. The v6.24.12 controller credits the complete replayed secret score (chains, unused-Spool bonus and level reward) before displaying its listening screen, and its checkpoint/record validator rejects a total missing those coins. The screenshots alone do not contain the root seed, complete moves, pre-room total or saved score facts, so they cannot establish the precise bonus arithmetic of that individual game. We do not claim to have reconstructed his unsaved moves. The reproducible new traces above check credit at the source, immediately after Clear, on Continue and in emitted server rows.

An unlock on position10 records its verified trigger but starts no eleventh board and earns no secret-Clear badge; the finite run ends at10. This interpretation is explicit because there is no next difficulty slot. No schema or SQL change is needed.
