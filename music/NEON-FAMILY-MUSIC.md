# New-world music — v6.14

All four new worlds still use the explicitly requested temporary pairs. Existing world IDs stay stable; the run table decides their level order.

| World ID | World | Track A | Track B | Current status |
|---:|---|---|---|---|
| 7 | Frost Sanctum | Quiet Night | Sparse Light | Placeholder pair |
| 8 | Umbra | Midnight Temple 1 | Neon Arrival | Placeholder pair |
| 9 | Prism | Oceanic Temple | Piano and Lute | Placeholder pair |
| 10 | Eclipse | Northern Stone | Submerged Temple | Placeholder pair |

The two retired tracks are recovered byte for byte from the approved v6.9.1 AACs; they do not return to Golden Palace. Their exact source paths, hashes, measured beat/phrase clocks and sizes are in `test-output/neon-family-placeholders-v6.14.json`. No owner's master or existing twelve active AACs is modified. New world-local track IDs preserve each world's selection/history independently even when two worlds share an AAC resource.

## Mechanical owner-master swap

Save two complete FLAC or WAV files per world in `MOTE/Music/`, using the prefixes `Frost_`, `Umbra_`, `Prism_` or `Eclipse_`. Every build scans those prefixes. A pair must have both files, be unchanged for at least two seconds and fully decode; a partial, corrupt or unsettled pair keeps the previous valid pair. Extra matching files are listed and the first two in deterministic name order are selected.

The portable entry is `node tools/ingest-neon-family-music-v6.14.cjs`. It scans, measures, encodes and rebuilds. The main build uses the same command with `--no-rebuild` to avoid recursion. `WEFT_PYTHON` and `FFMPEG` may select installed build tools; the local bundled numerical Python/FFmpeg are used by default. NumPy and FFmpeg with AAC/loudnorm are build dependencies, never client dependencies. There is no scheduled monitor, network request or credential step.

The encoder retains source order, derives a conservative loop from source 1 s to five seconds before the end, prepares a four-second equal-power seam, normalises to −16 LUFS / ≤ −1 dBTP and encodes stereo AAC-LC at 96 kbps. It measures the actual decoded AAC's loudness, loop join, key candidates, tempo and phase. Source hashes name the resulting AAC generations so an invalid second file cannot replace the first track of an already valid pair. Metadata is committed only after both tracks pass. Original source files stay untouched.

Scale estimation is whole-track chroma versus major/minor tonal profiles. All twelve tonics and both modes are supported by the bowls/card notes through transposed pentatonic sets. Relative-key ambiguity and candidate scores remain explicit. Beat/phrase anchors use the B-017 analysis: a weak metre receives a qualified slow phrase clock; no automatic output claims a proven bar-one downbeat. Owner-authored loop/key notes can refine these estimates later without changing the transport.

Read `test-output/neon-family-ingest-v6.14.json` after every build for the active pair, missing placeholders, source/output hashes, measured key/timing and any retained invalid pair. The isolated integration fixture uses two generated WAV signals under `test-output/`, then demonstrates an idempotent repeat and atomic rejection of a corrupt replacement. It does not alter production metadata or represent listening or physical-phone testing.
