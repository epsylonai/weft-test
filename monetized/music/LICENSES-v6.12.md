# Calm six-world ambience — v6.12

Current assets are `music/world-ambience-v6.12/*.m4a`. Earlier folders/reports remain historical and byte-exact. No external download was made for this revision. Music tracks and their metadata are outside this edit.

The ten bird identities and owl, pond, bamboo wind, whale and wind derive from the retained CC0 AACs listed, with input SHA-256 and original creator/source records, in `test-output/world-ambience-v6.12.json`. Bird credits and original cut/source provenance are retained in `music/LICENSES.md` and `ChatGPT/B-011/test-output/bird-source-provenance-v6.7.json`. Natural-source original credits are in `music/LICENSES-v6.9.1.md`; the new report carries their full source objects, hashes and CC0 declarations. These retained identities receive new gentle envelopes/filtering and are not claimed byte-identical to their predecessors.

The old crackle, rain/drip impulses, discrete bubbles, ice and struck bronze sounds are retired from the active scheduler. Their replacements are original deterministic diffuse flame breath, slow continuous harmonic rain, glassy shimmer, continuous underwater harmonics, glass-harmonica swell and rubbed bowl swells. Original generation is in `tools/bake-ambience-v6.12.py`; the generated sounds and synthesis are dedicated under CC0 1.0 to the extent copyright applies. There are no third-party sampled instruments. Five bowl notes are retained as useful assets; the active Golden choice is the soft A3 swell (220Hz), a pitch present in both Golden track scales.

Every new mono AAC is shorter than1.32s and is baked with a350ms sin² onset,400ms sin² tail and5kHz lowpass. Maximum randomized pitch is1.04, so the filter's effective corner stays at or below5.2kHz. No nonlinear limiter or compressor is added. Existing music-volume/mute/shared-context routing remains in use. The common runtime bus changes from−14dB to−18.4369749923dB, exactly×0.6. Source normalization and the gentler envelopes are separate from that exact bus change and can further lower a source's energy.

Primary spacing is22–44s, with a15% chance of one sequential answer0.5–1.5s after actual source end. Predicted rate60/33×1.15≈2.09accents/minute. This is a statistical expectation, not a fabricated native observation. The standalone legacy Grove factory uses the same bird files, cadence, gain reduction and sequential-answer rule. It remains unused by the game's six-world factory.

## Digital measurements

FFmpeg7.1 decodes each delivered AAC to48kHz mono float PCM. LUFS is BS.1770/EBU-R128 short-term over the complete short call followed by silence to3s, at its actual common bus and per-call trim. Attack is first10%→first90% of maximum20ms RMS with5ms hop; it is not interchangeable with the declared350ms envelope. Full-call crest factor uses sample peak/full-call RMS. Natural bird syllables can have a shorter RMS rise inside the slow outer envelope. All original replacements have a longer attack and lower crest than the conservative bird comparison bounds; individual values follow.

| Asset | Bus LUFS | Δ bird LU | Attack ms | Crest dB | Source |
|---|---:|---:|---:|---:|---|
| bird-1 | -38.7 | +0.04 | 530 | 14.46 | retained-CC0-bird-identity |
| bird-10 | -38.7 | +0.04 | 305 | 12.86 | retained-CC0-bird-identity |
| bird-2 | -39.7 | -0.96 | 115 | 18.20 | retained-CC0-bird-identity |
| bird-3 | -38.8 | -0.06 | 190 | 16.07 | retained-CC0-bird-identity |
| bird-4 | -38.8 | -0.06 | 285 | 14.98 | retained-CC0-bird-identity |
| bird-5 | -38.7 | +0.04 | 340 | 15.02 | retained-CC0-bird-identity |
| bird-6 | -38.7 | +0.04 | 430 | 15.39 | retained-CC0-bird-identity |
| bird-7 | -38.7 | +0.04 | 90 | 14.04 | retained-CC0-bird-identity |
| bird-8 | -38.7 | +0.04 | 115 | 15.12 | retained-CC0-bird-identity |
| bird-9 | -38.9 | -0.16 | 110 | 15.59 | retained-CC0-bird-identity |
| owl | -38.7 | +0.04 | 480 | 12.41 | retained-CC0-natural-identity |
| pond | -38.8 | -0.06 | 305 | 14.12 | retained-CC0-natural-identity |
| bamboo | -38.9 | -0.16 | 465 | 14.86 | retained-CC0-natural-identity |
| whale | -38.8 | -0.06 | 240 | 10.19 | retained-CC0-natural-identity |
| wind | -38.8 | -0.06 | 385 | 12.14 | retained-CC0-natural-identity |
| crackle | -39.0 | -0.26 | 205 | 13.79 | original-soft-replacement |
| rain | -38.8 | -0.06 | 220 | 10.10 | original-soft-replacement |
| drip | -38.7 | +0.04 | 220 | 8.61 | original-soft-replacement |
| bubbles | -38.7 | +0.04 | 205 | 7.63 | original-soft-replacement |
| ice | -38.7 | +0.04 | 220 | 7.26 | original-soft-replacement |
| bell-a | -38.8 | -0.06 | 210 | 6.54 | original-rubbed-bowl-swell |
| bell-c | -38.5 | +0.24 | 330 | 9.27 | original-rubbed-bowl-swell |
| bell-d | -38.8 | -0.06 | 210 | 6.19 | original-rubbed-bowl-swell |
| bell-e | -38.9 | -0.16 | 365 | 9.44 | original-rubbed-bowl-swell |
| bell-g | -38.8 | -0.06 | 205 | 6.12 | original-rubbed-bowl-swell |

New files total282,760bytes. Median processed-bird reference is-38.737LUFS. All are within±2LU. All measured AAC sample/true peaks remain below−1dBFS/TP. This is digital calibration, not an acoustic or physical-device listening claim.

The existing production reservation remains1,382,400bytes for the shared1.8s stereo impulse at96kHz plus506,880bytes for one1.32s mono call:1,889,280bytes, below2MB. In-flight fetch/decode and retiring voices retain their reservations until the real promise/onended finishes. No context, impulse, media player or long PCM collection is added. Panels, mute, volume0, Clear and background lifecycle retain their gates.

Verification:25/25 focused tests in `tests/world-ambience-v6.12.test.cjs` and `tests/ambience-v6.12.test.cjs`, plus strict TypeScript check. Historical predecessors remain unchanged. Asset hashes, provenance, source hashes and exact analysis method: `test-output/world-ambience-v6.12.json`.
