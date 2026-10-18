# Six-world accents — v6.9.1

All delivered short accents are mono48kHz AAC64kbps, about1.26seconds each. Every third-party source below explicitly permits CC0/public-domain reuse. Original previews, primary-page URLs and hashes are retained in `tools/source-ambience-v6.9.1/sources.json` and `tools/source-world-ambience/sources.json`. BigSoundBank raw HTML returned403 for some pages; the primary pages were independently verified through the web reader and this retrieval limitation is recorded. New pond and bamboo primary HTML is retained and hashed.

## Natural sources

| Accent | Creator / primary source | Original SHA-256 |
|---|---|---|
| crackle | Joseph SARDIN; [https://bigsoundbank.com/big-branching-fire-2-s0988.html](https://bigsoundbank.com/big-branching-fire-2-s0988.html) | `0ddb2cce78fe6010b6f98ac134313cea2a1f705ccfe2285a449df6e4b0ebca42` |
| owl | Le tiroir du fond; [https://bigsoundbank.com/tawny-owl-4-s3460.html](https://bigsoundbank.com/tawny-owl-4-s3460.html) | `d28017d8d96d1f27bdaa16244a2692344604ed4fdcde1901e6bd90606715965d` |
| pond | kylecutsfilms; [https://freesound.org/people/kylecutsfilms/sounds/443380/](https://freesound.org/people/kylecutsfilms/sounds/443380/) | `f03c9a6a67f203e0facc6b3b45d7b833bb8d639fc5dcc676168baa51166ea768` |
| bamboo | DreamSweetInSeaMajor; [https://freesound.org/people/DreamSweetInSeaMajor/sounds/808163/](https://freesound.org/people/DreamSweetInSeaMajor/sounds/808163/) | `3087dd69cf360000256539176ab2b91ba4ef6617aa571ff44ffd3df7c8f571fe` |
| rain | Joseph SARDIN; [https://bigsoundbank.com/rain-on-puddle-s1290.html](https://bigsoundbank.com/rain-on-puddle-s1290.html) | `aa5a6824c92440431ec38b3de692a941b61fdfa3c29c69b14307651000269360` |
| drip | Joseph SARDIN; [https://bigsoundbank.com/drops-of-water-3-s1386.html](https://bigsoundbank.com/drops-of-water-3-s1386.html) | `4f54eaea78f41bc7605212106e8b1769bfa4762c51c9c012797ce7b0ef4e3248` |
| bubbles | calebrankin; [https://freesound.org/people/calebrankin/sounds/529383/](https://freesound.org/people/calebrankin/sounds/529383/) | `2a5c98ae2cc7f6be07f7a2c1cfd4e4d96000e6436fe351d5450b4be8dbc209f6` |
| whale | muri_kuri; [https://freesound.org/people/muri_kuri/sounds/684188/](https://freesound.org/people/muri_kuri/sounds/684188/) | `69d05bcea525213ba479ade17859344e40497142e5e95afc80bf5557d27fd2db` |
| wind | worthahep88; [https://freesound.org/people/worthahep88/sounds/319212/](https://freesound.org/people/worthahep88/sounds/319212/) | `832c054f2cc1b3d1c5b7eb567f04bb8f40fed92d0599343206c4545c5c766cfa` |
| ice | timbreknight; [https://freesound.org/people/timbreknight/sounds/342546/](https://freesound.org/people/timbreknight/sounds/342546/) | `b0fc5db758c884ed597de16c9c9093d3d91741dc02891f0f02ec0485861e8546` |

Golden Hall uses an actual temple koi-pond recording and wind in actual bamboo; fountain, dove and chime assets from the earlier candidate are retired. The whale is an artificial whale call published underCC0, not a claimed field recording. New natural extracts are filtered, softened at both ends and limited against their actual post-AAC decoded true peak.

## Original bronze temple bell

Five distant bronze bell notes are original deterministic synthesis in `tools/bake-ambience-v6.9.1.py`: A3,C4,D4,E4,G4,24ms soft attack, exponential decay and1/2.71/4.05/5.43 partials. There is no sampled instrument or third-party music. This original synthesis and generated bell audio are dedicated under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), to the extent copyright applies. Runtime playback rate remains exactly1 for these tuned notes. The Golden tracks use A-minor pentatonic; no background composition is changed.

## Grove preservation and cadence

All ten `music/birds/bird-*.m4a` files stay byte-identical. Their primary credits and cut times remain in `music/LICENSES.md`, `test-output/bird-source-provenance-v6.7.json`, and `test-output/bird-assets-v6.7.json`. The common effective accent gain remains−14dB. Only bird10 receives−1.7dB runtime correction: its original short-term value was3.6LU above the pack median. No Grove file is re-encoded.

The final owner amendment sets all six worlds to a uniform11–22second primary interval. A primary has15% chance of one answer after its actual source has ended, plus a0.5–1.5second gap. The answer never overlaps another call, never triggers a further answer, and never changes the already-scheduled next primary. The predicted mean is60/16.5×1.15≈4.18calls/minute; this is a statistical expectation, not a claim from a one-minute native recording. Rare owl, temple bell and whale each have a120second cooldown.

## Native digital measurements

FFmpeg decodes the delivered AAC to float PCM. EBU-R128 short-term loudness uses an explicit3second window: the complete brief call followed by silence, with every asset at the same−14dB bus gain. The unchanged Grove median is−32.1LUFS at that bus. Every active accent lies within±2LU; Neon receives a further−1.5dB runtime trim and has the lowest world mean. A25% music slider and master0.9 add−12.956dB to these numbers. These are digital levels, not acoustic or physical-phone measurements.

| Accent | Bus short-term LUFS | Delta from Grove LU | Decoded true peak dBTP | Bytes |
|---|---|---|---|
| crackle | -32.2 | -0.1 | -1.8 | 11,796 |
| owl | -32.3 | -0.2 | -3.1 | 11,390 |
| pond | -32.2 | -0.1 | -1.4 | 11,492 |
| bamboo | -32.3 | -0.2 | -3.7 | 11,381 |
| rain | -33.3 | -1.2 | -2.6 | 15,965 |
| drip | -33.8 | -1.7 | -2.5 | 11,460 |
| bubbles | -32.2 | -0.1 | -1.8 | 11,491 |
| whale | -32.2 | -0.1 | -4.9 | 11,372 |
| wind | -32.2 | -0.1 | -4.5 | 11,358 |
| ice | -32.2 | -0.1 | -2.8 | 11,654 |
| bell-a | -32.2 | -0.1 | -4.0 | 11,084 |
| bell-c | -32.3 | -0.2 | -3.7 | 11,175 |
| bell-d | -32.2 | -0.1 | -4.0 | 11,195 |
| bell-e | -32.2 | -0.1 | -3.5 | 11,207 |
| bell-g | -32.2 | -0.1 | -3.9 | 11,253 |

The15 active new files total175,273bytes; the ten existing Grove files are reused.

## Shared memory and lifecycle

There is one accent factory, one short mono buffer and no added context or impulse. The inherited1.8second stereo impulse is1,382,400bytes at96kHz; a1.32second mono reservation is506,880bytes. Combined maximum reservation:1,889,280bytes. Cache and active-source identity are counted once. A stopped source remains reserved until its actual `onended`; an abandoned fetch or decode remains reserved until its real promise settles. No new decode begins while either exists. Answers wait for the first source to release before scheduling/decode. The old separate Grove factory is unused.

Clear/interludes, panels, music mute, volume zero and backgrounding stop accents. Foregrounding alone does not restart them; a later trusted shared-audio gesture re-arms the scheduler. Slow-fetch, slow-decode, stopped-tail and rapid-world transition tests cover the full96kHz reservation.

Measured asset/source locks: `test-output/world-ambience-v6.9.1.json`. Focused lifecycle/cadence checks: `tests/world-ambience-v6.9.1.test.cjs`. Native actual game evidence is reported separately and is not substituted for these deterministic edge cases.
