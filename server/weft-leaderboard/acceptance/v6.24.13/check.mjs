import fs from 'node:fs';
const m = await import('./server/weft-leaderboard/canonical-replay.mjs');
const live = await import('./server/weft-leaderboard/historical/canonical-replay-156cfcd3.mjs');
const load = f => { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return d.proof ?? d; };
const run = (lib, p) => lib.verifyCurrentSubmission(p);
const tryv = (lib, label, p) => {
  try {
    const rows = run(lib, p); const r = rows.find(x => x.kind === 'run');
    return { label, ok: true, rows: rows.length, score: r?.score, lvl: r?.level_reached, h: r?.moves?.hugo?.version ?? '', w: r?.moves?.window?.version ?? '' };
  } catch (e) { return { label, ok: false, code: e.code ?? '', msg: String(e.message).slice(0, 60) }; }
};
const clone = o => JSON.parse(JSON.stringify(o));
const out = [];
const S = 'test-output/b051-secret5/', R = 'test-output/b051-secret5-server/';
const fx = { hugo5: 'hugo5-full-ten', window5: 'window5-full-ten', dual5: 'dual5-full-ten', hugo5final: 'hugo5-final-position' };
const P = {};
for (const [k, f] of Object.entries(fx)) {
  P[k] = load(S + f + '.json');
  out.push(tryv(m, 'new:' + k, P[k]));
  try { const mine = run(m, P[k]); const theirs = JSON.parse(fs.readFileSync(R + f + '-rows.json', 'utf8')); out.push({ label: 'rows-equal:' + k, ok: JSON.stringify(mine) === JSON.stringify(theirs.rows ?? theirs) }); } catch (e) { out.push({ label: 'rows-equal:' + k, ok: false, msg: String(e.message).slice(0, 60) }); }
  out.push(tryv(live, 'live156:' + k, P[k]));
}
// historical proofs: new canonical must give byte-identical rows to the deployed 156cfcd3
const hist = [
  '/home/claude/b049s4/test-output/b049-secret4/hugo4-genuine-run-proof.json',
  '/home/claude/b049s4/test-output/b049-secret4/window4-genuine-run-proof.json',
  '/home/claude/b049s4/test-output/b049-secret4/dual-secret4-genuine-run-proof.json',
  '/home/claude/b049s4/test-output/b049-secret4/hugo4-full-ten-final-secret-clear-proof.json',
  '/home/claude/b048srv10/fx/owner-auto-bank-window3-proof.json',
  '/home/claude/b048srv10/fx/owner-one-card-window3-proof.json',
  '/home/claude/b048srv10/fx/b048-window-v2-genuine-run-proof.json',
  '/home/claude/b048srv9/fx/owner-ace-on-two-window2-proof.json',
  '/home/claude/b049srv/fx/hugo2-historical-genuine-run-proof.json',
  '/home/claude/b049srv/fx/hugo3-genuine-run-proof.json',
  '/home/claude/b049srv/fx/hugo3-full-ten-final-secret-loss-proof.json',
  S + 'historical-hugo-4-final-loss.json',
];
for (const f of hist) {
  const p = load(f); const a = tryv(m, 'hist:' + f.split('/').pop().slice(0, 34), p);
  let same = false; try { same = JSON.stringify(run(m, p)) === JSON.stringify(run(live, p)); } catch (e) { same = !a.ok && !tryv(live, '', p).ok; }
  out.push({ ...a, sameAs156: same });
}
const forge = (k, label, fn) => { const p = clone(P[k]); fn(p.record ?? p); out.push(tryv(m, 'forge:' + k + ':' + label, p)); };
forge('window5', 'score+1', r => { r.window.result.score += 1; });
forge('window5', 'runScore+1', r => { r.runScore += 1; });
forge('window5', 'spool+2', r => { r.window.result.spool += 2; });
forge('window5', 'version=window-4', r => { r.window.version = 'window-4'; r.windowVersion = 'window-4'; });
forge('window5', 'drop-level-bonus', r => { const d = r.window.result.clearBonusDetails; r.window.result.score -= (d?.levelBonus ?? 0); if (d) { d.score -= d.levelBonus; d.clearBonus -= d.levelBonus; d.levelBonus = 0; } });
forge('window5', 'secret-at-level3', r => { r.window.result.level = 3; });
forge('window5', 'delete-secret(skip L2)', r => { delete r.window; delete r.windowVersion; });
forge('window5', 'replay-ordinary-L2', r => { const l3 = r.perLevel.find(x => x.level === 3); const dup = clone(l3); dup.level = 2; r.perLevel.splice(1, 0, dup); });
forge('hugo5', 'score+1', r => { r.hugo.result.score += 1; });
forge('hugo5', 'afterLevel=2', r => { r.hugo.afterLevel = 2; });
forge('hugo5', 'version=hugo-4', r => { r.hugo.version = 'hugo-4'; r.hugoVersion = 'hugo-4'; });
forge('hugo5', 'trigger.moveIndex+1', r => { if (r.hugo.trigger) r.hugo.trigger.moveIndex = (r.hugo.trigger.moveIndex ?? 0) + 1; });
forge('dual5', 'graft-window-from-window5', r => { r.window = clone((P.window5.record ?? P.window5).window); });
try { out.push(tryv(m, 'old-clear-v2', JSON.parse(fs.readFileSync('/tmp/cv2min.min.json', 'utf8')))); } catch (e) { out.push({ label: 'old-clear-v2 fixture missing', ok: null }); }
console.table(out);
const exp = r => r.label.startsWith('forge') || r.label === 'old-clear-v2' || r.label.startsWith('live156') ? r.ok === false : (r.ok === true && (r.sameAs156 === undefined || r.sameAs156 === true));
const bad = out.filter(r => r.ok !== null && !exp(r));
console.log(bad.length ? 'UNEXPECTED: ' + bad.map(b => b.label).join(', ') : 'ALL AS EXPECTED (' + out.length + ' checks)');
