# Weft music and Grove calls

The nine music masters were supplied by the owner for Weft in `MOTE/Music/`. The delivered files are AAC edits of those masters: Deep Humming; Candlelit Hall; Candlelit Hall 2; Golden Dawn; Golden Palace Groove; Woodland Hush; Forest; Neon Arrival; Midnight Temple 1. Their input hashes, exact source edits and encoded hashes are recorded in `test-output/music-measurements-v6.7.json`. Music is normalized to −16 LUFS; source files remain untouched.

Every Grove call below is adapted from a recording whose publisher explicitly lists **CC0 1.0 / public domain**, commercial reuse and modification permitted, with no attribution or account required. Licence: [BigSoundBank licence](https://bigsoundbank.com/licenses.html), [CC0 dedication](https://creativecommons.org/publicdomain/zero/1.0/). Checked 15 October 2026. Credits are included here voluntarily.

| Delivered file | Recording / author | Primary source |
|---|---|---|
| birds/bird-1.m4a; birds/bird-2.m4a | Robin #4 — Joseph SARDIN | https://bigsoundbank.com/rouge-gorge-4-s1670.html |
| birds/bird-3.m4a | Robin #6 — Joseph SARDIN | https://bigsoundbank.com/robin-6-s1672.html |
| birds/bird-4.m4a; birds/bird-5.m4a | Robin #7 — Joseph SARDIN | https://bigsoundbank.com/rouge-gorge-7-s1673.html |
| birds/bird-6.m4a; birds/bird-7.m4a | Common Blackbird #23 — Le tiroir du fond | https://bigsoundbank.com/merle-noir-23-s3496.html |
| birds/bird-8.m4a; birds/bird-9.m4a | Common Blackbird #3 — Le tiroir du fond | https://bigsoundbank.com/merle-noir-3-s3476.html |
| birds/bird-10.m4a | Common Nightingale #2 — Joseph SARDIN | https://bigsoundbank.com/rossignol-philomele-2-s3087.html |

Each phrase uses a distinct disjoint source region, up to1.3 seconds, with25ms softened ends, a650Hz high-pass and9kHz low-pass. They are mono48kHz AAC64kbps. The complete compressed call pack is118,323 bytes. The runtime retains at most two decoded calls, shares the existing audio context/music volume bus, and releases Grove samples after leaving. `BIRD_GAIN_DB = −8` is the single relative level control. Source URLs/hashes and trim times are in `test-output/bird-source-provenance-v6.7.json` and `test-output/bird-assets-v6.7.json`.

The music entries begin at the owner's source time A=4 seconds. A one-second codec guard is skipped. The four-second baked overlap begins a subsequent cyclic period at source A+4, represented by `loopStart=5`, while every manual or world-entry start uses `entryStart=1`. Restoring a legacyv1 position adds four seconds in the new resource, preserving its original source-time position. New v2 snapshots store the new media time directly.
