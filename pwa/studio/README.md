# D — Just a Moment / production hand-off

Main entry: [splash-final.svg](splash-final.svg). It contains the complete 390 × 844 artwork and its own CSS. [splash-final.css](splash-final.css) is the same stylesheet supplied separately for an inline-SVG host. No font, script, image or network dependency is required.

[splash-final.html](splash-final.html) demonstrates whole-screen tap-to-skip and repeatable Replay using only native links, SVG and CSS. [final-frame.svg](final-frame.svg) is the immediate static fallback.

The default production copy is the red-ring version. Identical production entries are also in `gold-on-black/`, `black-on-white/`, `white-on-black/` and `red-ring/`.

| Phase | Time |
| --- | --- |
| Clock fades in at exactly 5:00 | 0.00–0.50 s |
| Minute and hour hands move together, at 12:1 | 0.50–2.80 s |
| Hands meet at 6:32:43.636; subtle glint and pivot settle | 2.80 s |
| Clock turns edge-on, then reveals the sign | 2.90–3.60 s |
| Both name lines fade and rise together | 3.60–4.60 s |
| STUDIOS follows | 4.40–5.00 s |
| Final frame holds | From 5.00 s |

The minute hand travels 556.363636°, while the hour hand travels 46.363636° from 150° to 196.363636°. Both use identical soft-start, steady and soft-stop timing segments. The minute hand passes 12 again, with the hour hand at 6, at 1.9375 s. The hands stop at their exact meeting angles; the small pivot pulse supplies the settle without reversing their movement.

The production SVG itself has a native full-canvas Skip link. On Skip, the clock is removed and the complete final sign/name is displayed immediately. It also supports Tab and Enter. Use the SVG inline or in an interactive SVG document/object to retain that link. If the host displays the SVG as an image, supply a host tap/Skip overlay. Reduced motion goes straight to the final frame through the included CSS.

For the game integration, keep the canvas proportions, respect reduced motion, and make Skip advance immediately to the next app stage. The animation finishes at 5.00 s; the final composition can hold until the host advances. Do not add a second startup wait. Use one inline instance per screen, or namespace the `fmm-r3-finished` fragment target if placing multiple instances in the same document. The demonstration already namespaces its Replay instances.

The owner-review GIF is a browser capture at 50 fps: 5.00 s of animation followed by 1.00 s of final-frame hold. It repeats for review. The production animation plays once and then holds.
