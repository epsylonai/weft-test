import fs from 'node:fs';
const m = await import('./server/weft-leaderboard/canonical-replay.mjs');
const live = await import('./server/weft-leaderboard/historical/canonical-replay-e730d478.mjs');
const load = f => { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return d.proof ?? d; };
const run = (lib, p) => lib.verifyCurrentSubmission(p);
const tryv = (lib, label, p) => { try { const rows = run(lib, p); const r = rows.find(x => x.kind === 'run'); return { label, ok: true, rows: rows.length, score: r?.score, lvl: r?.level_reached, ver: r?.version }; } catch (e) { return { label, ok: false, code: e.code ?? '', msg: String(e.message).slice(0, 60) }; } };
const clone = o => JSON.parse(JSON.stringify(o)); const out = [];
const fx = { floor: ['test-output/b052-endless/long-floor-run.json', 'test-output/b052-server/long-floor-run-rows.json'], hugo6: ['test-output/b052-endless/hugo6-run.json', 'test-output/b052-server/hugo6-run-rows.json'], window6: ['test-output/b052-endless/window6-run.json', 'test-output/b052-server/window6-run-rows.json'] };
const P = {};
for (const [k, [f, rf]] of Object.entries(fx)) { P[k] = load(f); out.push(tryv(m, 'new:' + k, P[k])); try { const th = JSON.parse(fs.readFileSync(rf, 'utf8')); out.push({ label: 'rows-equal:' + k, ok: JSON.stringify(run(m, P[k])) === JSON.stringify(th.rows ?? th) }); } catch (e) { out.push({ label: 'rows-equal:' + k, ok: false, msg: String(e.message).slice(0, 60) }); } out.push(tryv(live, 'livee730:' + k, P[k])); }
const S5 = '/home/claude/b051srv/test-output/b051-secret5/';
const hist = [S5 + 'hugo5-full-ten.json', S5 + 'window5-full-ten.json', S5 + 'dual5-full-ten.json', S5 + 'hugo5-final-position.json', S5 + 'historical-hugo-4-final-loss.json',
  '/home/claude/b049s4/test-output/b049-secret4/hugo4-genuine-run-proof.json', '/home/claude/b049s4/test-output/b049-secret4/window4-genuine-run-proof.json', '/home/claude/b049s4/test-output/b049-secret4/dual-secret4-genuine-run-proof.json', '/home/claude/b049s4/test-output/b049-secret4/hugo4-full-ten-final-secret-clear-proof.json',
  '/home/claude/b048srv10/fx/owner-auto-bank-window3-proof.json', '/home/claude/b048srv10/fx/b048-window-v2-genuine-run-proof.json', '/home/claude/b048srv9/fx/owner-ace-on-two-window2-proof.json', '/home/claude/b049srv/fx/hugo2-historical-genuine-run-proof.json', '/home/claude/b049srv/fx/hugo3-full-ten-final-secret-loss-proof.json'];
for (const f of hist) { const p = load(f); const a = tryv(m, 'hist:' + f.split('/').pop().slice(0, 34), p); let same = false; try { same = JSON.stringify(run(m, p)) === JSON.stringify(run(live, p)); } catch (e) { same = !a.ok; } out.push({ ...a, sameAsE730: same }); }
const forge = (k, label, fn) => { const p = clone(P[k]); fn(p.record); out.push(tryv(m, 'forge:' + k + ':' + label, p)); };
const L = (r, n) => r.perLevel.find(x => x.level === n);
forge('floor', 'runScore+1', r => { r.runScore += 1; });
forge('floor', 'L15 spool+1', r => { L(r, 15).spool += 1; });
forge('floor', 'L26 spool=2', r => { L(r, 26).spool = 2; });
forge('floor', 'L12 factor 25', r => { const d = L(r, 12).clearBonusDetails; d.levelFactor = 25; });
forge('floor', 'L12 score+1', r => { L(r, 12).score += 1; });
forge('floor', 'skip L13', r => { r.perLevel = r.perLevel.filter(x => x.level !== 13); });
forge('floor', 'version=6.14', r => { r.version = '6.14'; });
forge('hugo6', 'version=hugo-5', r => { r.hugo.version = 'hugo-5'; r.hugoVersion = 'hugo-5'; });
forge('hugo6', 'secret score+1', r => { r.hugo.result.score += 1; });
forge('window6', 'afterLevel+1', r => { r.window.afterLevel += 1; });
try { out.push(tryv(m, 'old-clear-v2', JSON.parse(fs.readFileSync('/tmp/cv2min.min.json', 'utf8')))); } catch (e) {}
console.table(out);
const exp = r => (r.label.startsWith('forge') || r.label === 'old-clear-v2' || r.label.startsWith('livee730')) ? r.ok === false : (r.ok === true && (r.sameAsE730 === undefined || r.sameAsE730 === true));
const bad = out.filter(r => !exp(r)); console.log(bad.length ? 'UNEXPECTED: ' + bad.map(b => b.label).join(', ') : 'ALL AS EXPECTED (' + out.length + ' checks)');
