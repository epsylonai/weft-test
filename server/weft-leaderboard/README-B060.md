# B-060 private player-code transfer — prepared, not deployed

Apply only `202610230001_player_transfer.sql`, then publish this handler and its sibling `player-transfer.ts`. Keep the existing commit-pinned canonical import (`a74732bb…10608`). The score-row version remains 6.24.21; no new score version constraint, season reset, leaderboard change, score migration or badge migration is needed. Never reapply 007 or an older reset.

The existing full UUIDv4 player code is a private bearer capability. Keep it out of URLs, analytics and logs. Requests use POST and the existing public `apikey`; there is no GET profile enumeration or direct anonymous/authenticated database permission. Private responses are `Cache-Control: no-store`.

- `player-read`: `{action:'player-read',deviceId}` returns schemaVersion1, lowercase deviceId, revision, snapshot/null and legacy `{name,highestWorld,badges,rows}`.
- `player-write`: `{action:'player-write',deviceId,expectedRevision,snapshot}` returns accepted:true and revision+1. A stale writer receives409/PLAYER_REVISION_CONFLICT with the current revision. Read again before explicitly replacing a conflicting backup.
- Snapshot: `{schemaVersion:1,deviceId,savedAt,values,mirrors?}`. Raw string values are opaque to the server: at most128 local-storage keys and32 registered IndexedDB store strings; total encoded snapshot at most8MiB. Mirrors may be omitted or empty. Client adapter owns its exact storage allowlist. The server never executes or submits a restored proof.
- Edge requests are incrementally bounded to8MiB+64KiB; ordinary score proofs keep the existing1MiB bound. Device read/write limits are60/12 per minute; shared limits600/120. A storage outage returns retryable503, and a rate limit429. CAS is an atomic conditional update/insert, never last-writer-wins.

Legacy read projects every own score row, including hidden rows, without moves or other players' identities. It supplies all permanent badge keys and latest nickname. Hidden rows have `archived:true` for personal history only. Highest world is a capped numbered-Classic reach fallback (not Warp/Daily); old custom world order cannot be recovered exactly from rows lacking that cosmetic route. A genuine snapshot's unlock map takes precedence. Before the source device has uploaded a snapshot, server rows cannot reconstruct its device-only Continue, settings or records. Reads never create a backup.

Database validation/ACL/CAS are reviewed statically and exercised with a stateful local RPC model. No SQL has been executed against PostgreSQL here. Claude/owner should smoke-test the migration and the two RPCs server-first before publishing the client. No database, network or deployment action was performed by this package.

Only nickname's client import method changed among the42 replay source inputs. Its validation/filter prefix is exact. An independent in-memory replay build (normalizing only esbuild source-path comment labels to the published21 namespace) reproduces every byte of a747; the manifest accurately re-pins the current sources. All17 historical authority files remain exact.
