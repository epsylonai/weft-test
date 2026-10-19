# Bundled interface typefaces

The interface uses unchanged official Google Fonts Latin WOFF2 resources, served locally with no font service request. The official variable resource is identical for each requested pair of weights, so only one file per family/style is included.

| File | Family / active weights | Bytes |
|---|---|---|
| cinzel-roman-latin.woff2 | Cinzel Roman600/700 |25,888|
| eb-garamond-roman-latin.woff2 | EB Garamond Roman500/600 |44,172|
| eb-garamond-italic-latin.woff2 | EB Garamond italic500/600 |47,824|

Total WOFF2 bytes:117,884. The Roman resources are preloaded; italic loads when used. All three are available to the offline cache. `font-display:swap` keeps first paint independent of the download; adjusted local fallbacks retain explicit line boxes.

Cinzel is by Natanael Gama / NDISCOVER. EB Garamond is by Georg Duffner and Octavio Pardo / The EB Garamond Project Authors. Both are licensed under the SIL Open Font License1.1. The complete unedited texts are included as `cinzel-OFL.txt` and `eb-garamond-OFL.txt`; original publisher metadata is retained beside them.

Primary sources: [Cinzel official repository](https://github.com/NDISCOVER/Cinzel), [EB Garamond official repository](https://github.com/octaviopardo/EBGaramond12), [Google Fonts Cinzel package](https://github.com/google/fonts/tree/main/ofl/cinzel), [Google Fonts EB Garamond package](https://github.com/google/fonts/tree/main/ofl/ebgaramond). Exact downloaded URLs, official CSS response and SHA-256 locks are in `test-output/fonts-v6.11.json` and `tools/source-fonts/google-fonts.css`.

Card rank/suit markings retain their approved embedded font attributes and exact SVG geometry. The existing custom W logo path and fixed text length are retained; its remaining letters use the bundled EB Garamond600. These are intentional distinctions between standard card markings, the brand and interface typography.
