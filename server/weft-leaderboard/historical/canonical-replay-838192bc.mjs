// ChatGPT/B-002/engine/layout.ts
function makeLayout(name, graph) {
  const coveredBy = graph.map((covers) => [...covers]);
  const children = coveredBy.map(() => []);
  coveredBy.forEach((covers, p) => {
    if (new Set(covers).size !== covers.length) throw new Error("Duplicate cover edge");
    for (const q of covers) {
      if (!Number.isInteger(q) || q < 0 || q >= graph.length || q === p)
        throw new Error("Invalid cover position");
      children[q].push(p);
    }
  });
  const counts = coveredBy.map((c) => c.length);
  const queue = counts.flatMap((n, p) => n === 0 ? [p] : []);
  for (let i = 0; i < queue.length; i++)
    for (const p of children[queue[i]]) if (--counts[p] === 0) queue.push(p);
  if (queue.length !== graph.length) throw new Error("Cover graph must be acyclic");
  return {
    name,
    coveredBy,
    children,
    size: graph.length,
    initialFree: coveredBy.filter((c) => c.length === 0).length
  };
}
function rows(name, groups) {
  const positions = [];
  groups.forEach((widths, g) => widths.forEach((width, r) => {
    for (let i = 0; i < width; i++) positions.push([g, r, i]);
  }));
  const indices = new Map(positions.map((p, i) => [p.join(","), i]));
  return makeLayout(name, positions.map(([g, r, i]) => {
    const covers = [
      indices.get([g, r + 1, i].join(",")),
      indices.get([g, r + 1, i + 1].join(","))
    ];
    return covers.filter((p) => p !== void 0);
  }));
}
var layoutPeaks = () => rows("peaks", [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]]);
var layoutWeave = () => rows("weave", [[4, 5, 6, 7, 8]]);
var layoutFlat = () => makeLayout("flat", Array.from({ length: 30 }, () => []));
function layoutFor(name) {
  switch (name) {
    case "peaks":
      return layoutPeaks();
    case "weave":
      return layoutWeave();
    case "flat":
      return layoutFlat();
    default:
      throw new Error(`Unknown layout: ${String(name)}`);
  }
}

// ChatGPT/B-002/engine/scoring.ts
function baseScore(n) {
  return 5 * n * (n + 1);
}

// ChatGPT/B-002/engine/hands.ts
var HIGH = 0;
var PAIR = 1;
var TWO_PAIR = 2;
var TRIPS = 3;
var STRAIGHT = 4;
var FLUSH = 5;
var FULL_HOUSE = 6;
var QUADS = 7;
var STRAIGHT_FLUSH = 8;
var ROYAL = 9;
var NAMES = [
  "high",
  "pair",
  "two_pair",
  "trips",
  "straight",
  "flush",
  "full_house",
  "quads",
  "straight_flush",
  "royal"
];
var MULT = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 8, 12];
var ROYAL_SET = [0, 9, 10, 11, 12];
function evalRanks(ranks, flush, loop) {
  const counts = /* @__PURE__ */ new Map();
  for (const rank2 of ranks) counts.set(rank2, (counts.get(rank2) ?? 0) + 1);
  const repeated = [...counts.values()].sort((a, b) => b - a);
  const royal = ranks.length === 5 && ranks.every((rank2, i) => rank2 === ROYAL_SET[i]);
  let straight = false;
  if (ranks.length === 5 && counts.size === 5) {
    if (ranks[4] - ranks[0] === 4 || royal) {
      straight = true;
    } else if (loop) {
      const gaps = ranks.slice(1).map((rank2, i) => rank2 - ranks[i]);
      gaps.push(ranks[0] + 13 - ranks[4]);
      straight = Math.max(...gaps) === 9;
    }
  }
  flush = flush && ranks.length === 5;
  if (straight && flush) return royal ? ROYAL : STRAIGHT_FLUSH;
  if (repeated[0] === 4) return QUADS;
  if (ranks.length === 5 && repeated[0] === 3 && repeated[1] === 2) return FULL_HOUSE;
  if (flush) return FLUSH;
  if (straight) return STRAIGHT;
  if (repeated[0] === 3) return TRIPS;
  if (repeated[0] === 2 && repeated[1] === 2) return TWO_PAIR;
  if (repeated[0] === 2) return PAIR;
  return HIGH;
}
function evalCards(cards, loop, flush4) {
  const ranks = cards.map((card) => card % 13).sort((a, b) => a - b);
  if (flush4 && cards.length >= 4) {
    const suits = [0, 0, 0, 0];
    for (const card of cards) {
      const suit3 = Math.floor(card / 13);
      suits[suit3] = suits[suit3] + 1;
    }
    const mostSuited = Math.max(...suits);
    const type = evalRanks(ranks, mostSuited === 5, loop);
    return mostSuited >= 4 && type < FLUSH ? FLUSH : type;
  }
  const suit2 = Math.floor(cards[0] / 13);
  const flush = cards.length === 5 && cards.every((card) => Math.floor(card / 13) === suit2);
  return evalRanks(ranks, flush, loop);
}
var runs = (loop) => loop ? Array.from({ length: 13 }, (_, start) => Array.from({ length: 5 }, (_2, i) => (start + i) % 13)) : [...Array.from({ length: 9 }, (_, start) => Array.from({ length: 5 }, (_2, i) => start + i)), ROYAL_SET];
var STRAIGHTS = [runs(false), runs(true)];
var maskOf = (ranks) => ranks.reduce((mask, rank2) => mask | 1 << rank2, 0);
var STRAIGHT_MASKS = STRAIGHTS.map((patterns) => patterns.map(maskOf));
var fastCards = (cards) => cards.length > 7 && cards.every((card) => Number.isInteger(card) && card >= 0 && card < 52) && new Set(cards).size === cards.length;
function bestFromMany(cards, loop, flush4) {
  const ranks = Array.from({ length: 13 }, () => []);
  const suits = Array.from({ length: 4 }, () => []);
  const suitRank = Array.from({ length: 4 }, () => Array(13).fill(-1));
  const suitMasks = [0, 0, 0, 0];
  let allRanks = 0;
  cards.forEach((card, index) => {
    const rank2 = card % 13, suit2 = Math.floor(card / 13);
    ranks[rank2].push(index);
    suits[suit2].push(index);
    suitRank[suit2][rank2] = index;
    allRanks |= 1 << rank2;
    suitMasks[suit2] = suitMasks[suit2] | 1 << rank2;
  });
  let best;
  const consider = (indices) => {
    const candidate2 = [...indices].sort((a, b) => a - b);
    if (!best) {
      best = candidate2;
      return;
    }
    for (let i = 0; i < 5; i++) {
      if (candidate2[i] === best[i]) continue;
      if (candidate2[i] < best[i]) best = candidate2;
      return;
    }
  };
  const fill = (indices) => {
    const result2 = [...indices];
    for (let i = 0; result2.length < 5 && i < cards.length; i++) if (!result2.includes(i)) result2.push(i);
    return result2;
  };
  const result = () => best.map((index) => cards[index]);
  const royalMask = maskOf(ROYAL_SET);
  for (let suit2 = 0; suit2 < 4; suit2++) if ((suitMasks[suit2] & royalMask) === royalMask)
    consider(ROYAL_SET.map((rank2) => suitRank[suit2][rank2]));
  if (best) return result();
  const patterns = STRAIGHTS[Number(loop)], masks = STRAIGHT_MASKS[Number(loop)];
  for (let suit2 = 0; suit2 < 4; suit2++) for (let i = 0; i < patterns.length; i++)
    if ((suitMasks[suit2] & masks[i]) === masks[i]) consider(patterns[i].map((rank2) => suitRank[suit2][rank2]));
  if (best) return result();
  for (const group of ranks) if (group.length === 4) consider(fill(group));
  if (best) return result();
  for (let three = 0; three < 13; three++) if (ranks[three].length >= 3) {
    for (let two = 0; two < 13; two++) if (two !== three && ranks[two].length >= 2)
      consider([...ranks[three].slice(0, 3), ...ranks[two].slice(0, 2)]);
  }
  if (best) return result();
  for (const group of suits) {
    if (group.length >= 5) consider(group.slice(0, 5));
    if (flush4 && group.length >= 4) consider(fill(group.slice(0, 4)));
  }
  if (best) return result();
  for (let i = 0; i < patterns.length; i++) if ((allRanks & masks[i]) === masks[i])
    consider(patterns[i].map((rank2) => ranks[rank2][0]));
  if (best) return result();
  for (const group of ranks) if (group.length === 3) consider(fill(group));
  if (best) return result();
  for (let a = 0; a < 13; a++) if (ranks[a].length >= 2) {
    for (let b = a + 1; b < 13; b++) if (ranks[b].length >= 2)
      consider(fill([...ranks[a].slice(0, 2), ...ranks[b].slice(0, 2)]));
  }
  if (best) return result();
  for (const group of ranks) if (group.length === 2) consider(fill(group));
  return best ? result() : cards.slice(0, 5);
}
function bestFiveCards(chain, window2, loop, flush4 = false) {
  if (window2 === 5 || chain.length <= 5) return chain.slice(-5);
  const cards = chain.slice(-window2);
  if (cards.length < 5) return [];
  if (fastCards(cards)) return bestFromMany(cards, loop, flush4);
  let best = -1, witness = [];
  const combo = [];
  function choose(start) {
    if (combo.length === 5) {
      const type = evalCards(combo, loop, flush4);
      if (type > best) {
        best = type;
        witness = [...combo];
      }
      return;
    }
    for (let i = start; i <= cards.length - (5 - combo.length); i++) {
      combo.push(cards[i]);
      choose(i + 1);
      combo.pop();
    }
  }
  choose(0);
  return witness;
}
function handType(chain, window2, loop, flush4 = false) {
  if (chain.length === 0) return HIGH;
  if (window2 === 5 || chain.length <= 5) return evalCards(chain.slice(-5), loop, flush4);
  const cards = chain.slice(-window2);
  if (fastCards(cards)) return evalCards(bestFromMany(cards, loop, flush4), loop, flush4);
  let best = HIGH;
  const combo = [];
  function choose(start) {
    if (combo.length === 5) {
      best = Math.max(best, evalCards(combo, loop, flush4));
      return;
    }
    const needed = 5 - combo.length;
    for (let i = start; i <= cards.length - needed; i += 1) {
      combo.push(cards[i]);
      choose(i + 1);
      combo.pop();
    }
  }
  choose(0);
  return best;
}

// ChatGPT/B-002/engine/rules.ts
function resolveRules(input = {}) {
  const deltas = [...new Set(input.deltas ?? (input.wide ? [1, 2] : [1]))].sort((a, b) => a - b);
  if (!deltas.length || deltas.some((d) => !Number.isInteger(d) || d <= 0))
    throw new Error("Rank deltas must be positive integers");
  const rules = {
    layout: input.layout ?? "weave",
    spool: input.spool ?? 22,
    deltas,
    twins: input.twins ?? false,
    wide: deltas.includes(2),
    loop: input.loop ?? false,
    window: input.window ?? 5,
    openWeave: input.openWeave ?? false,
    anchor: input.anchor ?? false,
    flush4: input.flush4 ?? false,
    links: input.links ?? false,
    spark: input.spark ?? false
  };
  if (!Number.isInteger(rules.spool) || rules.spool < 1) throw new Error("Spool must include a starting Thread");
  if (!Number.isInteger(rules.window) || rules.window < 1) throw new Error("Hand window must be positive");
  layoutFor(rules.layout);
  return rules;
}
function isAdjacent(rules, top, next) {
  const diff = next % 13 - top % 13;
  if (rules.twins && diff === 0) return true;
  const equivalent = (a, b) => rules.loop ? ((a - b) % 13 + 13) % 13 === 0 : a === b;
  return rules.deltas.some((d) => equivalent(diff, d) || equivalent(diff, -d));
}
var legalMoves = (state) => state.free.filter((p) => isAdjacent(state.rules, state.top, state.weave[p]));
function terminalStatus(state) {
  if (state.remaining === 0) return "cleared";
  return legalMoves(state).length === 0 && state.spoolIndex === state.spool.length ? "stuck" : "active";
}
function createState(input, deal2) {
  const rules = resolveRules(input);
  const layout = deal2.coveredBy ? makeLayout(rules.layout, deal2.coveredBy) : layoutFor(rules.layout);
  if (deal2.weave.length !== layout.size) throw new Error("Weave size must match its cover graph");
  if (!deal2.spoolOrder.length) throw new Error("Deal needs a starting Thread");
  for (const card of [...deal2.weave, ...deal2.spoolOrder, ...deal2.burned])
    if (!Number.isInteger(card) || card < 0 || card >= 52) throw new Error("Card must be an integer 0\u201351");
  const weave = [...deal2.weave], spool = [...deal2.spoolOrder], burned = [...deal2.burned];
  const cover = layout.coveredBy.map((c) => c.length);
  const free = cover.flatMap((n, p) => n === 0 ? [p] : []);
  const unseen = Array(13).fill(0);
  for (let p = 0; p < weave.length; p++) if (cover[p] && !rules.openWeave) unseen[weave[p] % 13]++;
  for (const c of [...spool.slice(1), ...burned]) unseen[c % 13]++;
  const state = {
    rules,
    layout,
    weave,
    spool,
    burned,
    free,
    cover,
    played: [],
    top: spool[0],
    anchor: spool[0],
    spoolIndex: 1,
    remaining: weave.length,
    chain: [],
    links: 0,
    score: 0,
    suitedPlays: 0,
    unseen,
    unseenTotal: unseen.reduce((a, b) => a + b, 0),
    longestChain: 0,
    voluntaryBanks: 0,
    draws: 0,
    terminal: "active"
  };
  return { ...state, terminal: terminalStatus(state) };
}
function handInput(state) {
  return state.rules.anchor ? [state.anchor, ...state.chain] : state.chain;
}
function bankInternal(state, reason) {
  if (state.chain.length === 0) return { state, events: [] };
  const kind = handType(handInput(state), state.rules.window, state.rules.loop, state.rules.flush4);
  const n = state.chain.length, scoringLength = n + (state.rules.links ? state.links : 0);
  const points = baseScore(scoringLength) * MULT[kind];
  const next = {
    ...state,
    score: state.score + points,
    chain: [],
    links: 0,
    longestChain: Math.max(state.longestChain, n),
    anchor: reason === "manual" ? state.top : state.anchor,
    voluntaryBanks: state.voluntaryBanks + (reason === "manual" ? 1 : 0)
  };
  return { state: next, events: [{
    type: "banked",
    reason,
    chainLength: n,
    scoringLength,
    handName: NAMES[kind],
    points
  }] };
}
function settle(state) {
  const result = state.remaining === 0 || legalMoves(state).length === 0 ? bankInternal(state, "automatic") : { state, events: [] };
  return { state: { ...result.state, terminal: terminalStatus(result.state) }, events: result.events };
}
function bank(state) {
  if (state.terminal !== "active") throw new Error("Cannot bank a terminal board");
  const result = bankInternal(state, "manual");
  return { state: { ...result.state, terminal: terminalStatus(result.state) }, events: result.events };
}
function draw(state) {
  if (state.terminal !== "active") throw new Error("Cannot draw on a terminal board");
  if (state.spoolIndex >= state.spool.length) throw new Error("Spool is empty");
  const result = bankInternal(state, "automatic");
  const top = state.spool[state.spoolIndex], unseen = [...state.unseen];
  unseen[top % 13]--;
  const next = {
    ...result.state,
    top,
    anchor: top,
    spoolIndex: state.spoolIndex + 1,
    unseen,
    unseenTotal: state.unseenTotal - 1,
    draws: state.draws + 1
  };
  const settled = settle(next);
  return { state: settled.state, events: [...result.events, ...settled.events] };
}
function applyMove(state, move) {
  if (move.type === "bank") return bank(state);
  if (move.type === "draw") return draw(state);
  if (move.type !== "play") throw new Error("Unknown move");
  if (state.terminal !== "active") throw new Error("Cannot play on a terminal board");
  if (!legalMoves(state).includes(move.position)) throw new Error("Card is covered, removed or not adjacent");
  const position = move.position, c = state.weave[position], matched = Math.floor(c / 13) === Math.floor(state.top / 13);
  const free = state.free.filter((p) => p !== position), cover = [...state.cover], unseen = [...state.unseen];
  let unseenTotal = state.unseenTotal;
  for (const child of state.layout.children[position]) {
    if (--cover[child] === 0) {
      free.push(child);
      if (!state.rules.openWeave) {
        unseen[state.weave[child] % 13]--;
        unseenTotal--;
      }
    }
  }
  return settle({
    ...state,
    top: c,
    free,
    cover,
    unseen,
    unseenTotal,
    played: [...state.played, position].sort((a, b) => a - b),
    remaining: state.remaining - 1,
    chain: [...state.chain, c],
    links: state.links + (state.rules.links && matched ? 1 : 0),
    suitedPlays: state.suitedPlays + (matched ? 1 : 0)
  });
}
function snapshot(state) {
  const input = handInput(state);
  const kind = handType(input, state.rules.window, state.rules.loop, state.rules.flush4);
  const scoringLength = state.chain.length + (state.rules.links ? state.links : 0);
  return {
    legalMoves: legalMoves(state),
    free: [...state.free],
    cover: [...state.cover],
    played: [...state.played],
    top: state.top,
    anchor: state.anchor,
    spoolIndex: state.spoolIndex,
    spoolRemaining: state.spool.length - state.spoolIndex,
    remaining: state.remaining,
    chain: [...state.chain],
    chainLength: state.chain.length,
    links: state.links,
    scoringLength,
    handCards: input.slice(-state.rules.window),
    handType: kind,
    handName: NAMES[kind],
    multiplier: MULT[kind],
    score: state.score,
    bankValue: state.chain.length ? baseScore(scoringLength) * MULT[kind] : 0,
    suitedPlays: state.suitedPlays,
    sparksEarned: state.rules.spark ? state.suitedPlays : 0,
    unseen: [...state.unseen],
    unseenTotal: state.unseenTotal,
    terminal: state.terminal
  };
}

// ChatGPT/B-055/v6.24.16/src/earned-jokers.ts
var EARNED_JOKER_VERSION = "earned-1";
var MAX_EARNED_JOKERS = 3;
var JOKER_CHAIN_THRESHOLD = 10;
var hasEarnedJokers = (value) => !!value && typeof value === "object" && value.jokerVersion === EARNED_JOKER_VERSION;
function jokerMetadata(value) {
  if (value.jokerVersion === void 0) return {};
  if (!hasEarnedJokers(value)) throw new TypeError("Unknown earned-joker version");
  return { jokerVersion: EARNED_JOKER_VERSION };
}
var jokerCount = (state) => hasEarnedJokers(state) ? state.jokers : 0;
var ordinaryRunMove = (move) => move.type === "joker" ? { type: "play", position: move.position } : move;
var validRunMove = (move, manual = false) => !!move && typeof move === "object" && (move.type === "draw" || manual && move.type === "bank" || ["play", "joker"].includes(move.type) && Number.isInteger(move.position) && Number(move.position) >= 0 && Number(move.position) < 30);
function count(value) {
  if (!Number.isInteger(value) || value < 0 || value > 3) throw new RangeError("Earned-joker inventory must be 0\u20133");
  return value;
}
function rescue(state, jokers) {
  return state.terminal === "stuck" && jokers > 0 && state.free.length ? { ...state, terminal: "active" } : state;
}
function createRunState(rules, deal2, options = {}) {
  const state = createState(rules, deal2);
  jokerMetadata(options);
  if (!hasEarnedJokers(options)) return state;
  const jokers = count(options.jokers ?? 0);
  return { ...rescue(state, jokers), jokerVersion: EARNED_JOKER_VERSION, jokers, jokerChainAwarded: false, jokerEarned: 0, jokerSpent: 0 };
}
function jokerPlay(state, position) {
  if (!Number.isInteger(position) || !state.free.includes(position)) throw new Error("Joker requires a free, present card");
  const c = state.weave[position], matched = Math.floor(c / 13) === Math.floor(state.top / 13), free = state.free.filter((p) => p !== position), cover = [...state.cover], unseen = [...state.unseen];
  let unseenTotal = state.unseenTotal;
  for (const child of state.layout.children[position]) if (--cover[child] === 0) {
    free.push(child);
    if (!state.rules.openWeave) {
      unseen[state.weave[child] % 13]--;
      unseenTotal--;
    }
  }
  let next = { ...state, anchor: state.chain.length === 0 ? state.top : state.anchor, top: c, free, cover, unseen, unseenTotal, played: [...state.played, position].sort((a, b) => a - b), remaining: state.remaining - 1, chain: [...state.chain, c], links: state.links + (state.rules.links && matched ? 1 : 0), suitedPlays: state.suitedPlays + (matched ? 1 : 0) };
  const events = [];
  if (next.remaining === 0 || legalMoves(next).length === 0) {
    const n = next.chain.length, scoringLength = n + (next.rules.links ? next.links : 0), kind = handType(next.rules.anchor ? [next.anchor, ...next.chain] : next.chain, next.rules.window, next.rules.loop, next.rules.flush4), points = baseScore(scoringLength) * MULT[kind];
    next = { ...next, score: next.score + points, chain: [], links: 0, longestChain: Math.max(next.longestChain, n) };
    events.push({ type: "banked", reason: "automatic", chainLength: n, scoringLength, handName: NAMES[kind], points });
  }
  return { state: { ...next, terminal: next.remaining === 0 ? "cleared" : legalMoves(next).length === 0 && next.spoolIndex === next.spool.length ? "stuck" : "active" }, events };
}
function applyRunMove(state, move) {
  if (!hasEarnedJokers(state)) {
    if (move.type === "joker") throw new Error("This historical board has no earned jokers");
    return applyMove(state, move);
  }
  const before = state;
  count(before.jokers);
  if (state.terminal !== "active") throw new Error("Cannot move on a terminal board");
  if (!validRunMove(move, true)) throw new Error("Invalid run move");
  if (move.type === "joker" && before.jokers === 0) throw new Error("No earned joker available");
  const result = move.type === "joker" ? jokerPlay(state, move.position) : applyMove(state, move);
  const played = move.type === "play" || move.type === "joker", earned = played && !before.jokerChainAwarded && state.chain.length + 1 >= JOKER_CHAIN_THRESHOLD;
  const jokers = Math.min(MAX_EARNED_JOKERS, before.jokers - Number(move.type === "joker") + Number(earned));
  return { ...result, state: { ...rescue(result.state, jokers), jokerVersion: EARNED_JOKER_VERSION, jokers, jokerChainAwarded: result.state.chain.length > 0 && (before.jokerChainAwarded || earned), jokerEarned: before.jokerEarned + Number(earned), jokerSpent: before.jokerSpent + Number(move.type === "joker") } };
}
function runSnapshot(state) {
  return { ...snapshot(state), jokers: jokerCount(state), jokerMoves: hasEarnedJokers(state) && jokerCount(state) > 0 && state.terminal === "active" ? [...state.free] : [] };
}

// ChatGPT/B-055/v6.24.16/src/hugo-trigger.ts
var ENDLESS_HUGO_VERSION = "hugo-6";
var HUGO_VERSION = "hugo-5";
var REWARD_HUGO_VERSION = "hugo-4";
var NEXT_SPOOL_HUGO_VERSION = "hugo-3";
var GROVE_HUGO_VERSION = "hugo-2";
var LEGACY_HUGO_VERSION = "hugo-1";
var HUGO_SPOOL = 22;
function hugoVersionOf(value) {
  const feature = value && typeof value === "object" ? value.hugoVersion : void 0;
  if (feature !== void 0 && feature !== ENDLESS_HUGO_VERSION && feature !== HUGO_VERSION && feature !== REWARD_HUGO_VERSION && feature !== NEXT_SPOOL_HUGO_VERSION && feature !== GROVE_HUGO_VERSION && feature !== LEGACY_HUGO_VERSION) throw new TypeError("Unsupported Hugo feature version");
  const disabled = value && typeof value === "object" ? value.hugoDisabled : void 0;
  if (disabled !== void 0 && (disabled !== true || feature !== ENDLESS_HUGO_VERSION && feature !== HUGO_VERSION && feature !== REWARD_HUGO_VERSION && feature !== NEXT_SPOOL_HUGO_VERSION && feature !== GROVE_HUGO_VERSION)) throw new TypeError("Invalid disabled Hugo feature");
  return feature;
}
var hasHugoFeature = (value) => hugoVersionOf(value) !== void 0;
var hasGroveHugoFeature = (value) => {
  const version = hugoVersionOf(value);
  return version === ENDLESS_HUGO_VERSION || version === HUGO_VERSION || version === REWARD_HUGO_VERSION || version === NEXT_SPOOL_HUGO_VERSION || version === GROVE_HUGO_VERSION;
};
var hugoTriggerEligible = (value, world3) => hugoVersionOf(value) === LEGACY_HUGO_VERSION || hasGroveHugoFeature(value) && value.hugoDisabled !== true && world3 === 3;
function isHugoSacrifice(state, move) {
  if (move.type !== "draw" || state.terminal !== "active" || state.spoolIndex >= state.spool.length || !state.rules.anchor || state.chain.length !== 3 || legalMoves(state).length === 0) return false;
  const ranks = [state.anchor, ...state.chain].map((card) => card % 13);
  return (ranks[0] === 5 || ranks[0] === 6) && ranks.every((rank2, index) => rank2 === (index % 2 ? ranks[0] === 5 ? 6 : 5 : ranks[0]));
}
function hugoSeed(root2, afterLevel, version = HUGO_VERSION) {
  if (!Number.isSafeInteger(afterLevel) || afterLevel < 1 || version !== ENDLESS_HUGO_VERSION && afterLevel > 10 || typeof root2 === "number" && !Number.isSafeInteger(root2) || !/^-?\d{1,30}$/.test(String(root2))) throw new TypeError("Invalid Hugo seed domain");
  if (version !== ENDLESS_HUGO_VERSION && version !== HUGO_VERSION && version !== REWARD_HUGO_VERSION && version !== NEXT_SPOOL_HUGO_VERSION && version !== GROVE_HUGO_VERSION && version !== LEGACY_HUGO_VERSION) throw new TypeError("Unsupported Hugo seed version");
  let hash = 14695981039346656037n;
  for (const c of `weft-hugo:${version}:${BigInt(root2)}:${afterLevel}`) hash = BigInt.asUintN(64, (hash ^ BigInt(c.charCodeAt(0))) * 1099511628211n);
  return hash;
}
var sameHugoWitness = (a, b) => a === void 0 ? b === void 0 : b !== void 0 && a.seed === b.seed && a.moveIndex === b.moveIndex;

// ChatGPT/B-055/v6.24.16/src/window-trigger.ts
var ENDLESS_WINDOW_VERSION = "window-6";
var WINDOW_VERSION = "window-5";
var REWARD_WINDOW_VERSION = "window-4";
var AUTO_BANK_WINDOW_VERSION = "window-3";
var BOARD_WINDOW_VERSION = "window-2";
var LEGACY_WINDOW_VERSION = "window-1";
var WINDOW_VIOLIN_ACE = 13;
function windowVersionOf(value) {
  const version = value && typeof value === "object" ? value.windowVersion : void 0;
  if (version !== void 0 && version !== ENDLESS_WINDOW_VERSION && version !== WINDOW_VERSION && version !== REWARD_WINDOW_VERSION && version !== AUTO_BANK_WINDOW_VERSION && version !== BOARD_WINDOW_VERSION && version !== LEGACY_WINDOW_VERSION) throw new TypeError("Unsupported Window feature version");
  const disabled = value && typeof value === "object" ? value.windowDisabled : void 0;
  if (disabled !== void 0 && (disabled !== true || version !== ENDLESS_WINDOW_VERSION && version !== WINDOW_VERSION && version !== REWARD_WINDOW_VERSION && version !== AUTO_BANK_WINDOW_VERSION && version !== BOARD_WINDOW_VERSION)) throw new TypeError("Invalid disabled Window feature");
  return version;
}
var hasFixedWindowAce = (value) => {
  const version = windowVersionOf(value);
  return version === ENDLESS_WINDOW_VERSION || version === WINDOW_VERSION || version === REWARD_WINDOW_VERSION || version === AUTO_BANK_WINDOW_VERSION;
};
var hasWindowAutoBank = hasFixedWindowAce;
var hasWindowFeature = (value) => windowVersionOf(value) !== void 0;
var windowTriggerEligible = (value, world3) => hasWindowFeature(value) && !value.windowDisabled && world3 === 4;
function chosenWindowAce(deal2, version = WINDOW_VERSION) {
  windowVersionOf({ windowVersion: version });
  const cards = Array.isArray(deal2) ? version === LEGACY_WINDOW_VERSION ? deal2 : deal2.slice(0, 30) : version === LEGACY_WINDOW_VERSION ? [...deal2.weave, ...deal2.spoolOrder, ...deal2.burned] : deal2.weave;
  const ace = hasFixedWindowAce({ windowVersion: version }) ? cards.find((card) => card === WINDOW_VIOLIN_ACE) : cards.find((card) => card % 13 === 0);
  if (ace === void 0) throw new Error("Generated Neon board has no ace required by its Window version");
  return ace;
}
function windowAutoBankedAce(transition, move, ace, version = WINDOW_VERSION) {
  return hasWindowAutoBank({ windowVersion: version }) && ace === WINDOW_VIOLIN_ACE && move.type === "play" && transition.state.weave[move.position] === ace && transition.state.top === ace && transition.state.chain.length === 0 && transition.state.terminal === "active" && transition.state.spoolIndex < transition.state.spool.length && legalMoves(transition.state).length === 0 && transition.events.some((event) => event.reason === "automatic" && event.chainLength >= 1);
}
function isWindowSacrifice(state, move, ace, version = WINDOW_VERSION, autoBankedAce = false) {
  windowVersionOf({ windowVersion: version });
  const direct = state.chain.length > 0 && state.chain[state.chain.length - 1] === ace, banked = hasWindowAutoBank({ windowVersion: version }) && autoBankedAce && state.chain.length === 0 && legalMoves(state).length === 0;
  return move.type === "draw" && state.terminal === "active" && state.spoolIndex < state.spool.length && Number.isInteger(ace) && ace >= 0 && ace < 52 && ace % 13 === 0 && (!hasFixedWindowAce({ windowVersion: version }) || ace === WINDOW_VIOLIN_ACE) && (direct || banked) && state.top === ace && (version !== LEGACY_WINDOW_VERSION || snapshot(state).handType >= 1);
}
function windowSeed(root2, afterLevel, version = WINDOW_VERSION) {
  if (!Number.isSafeInteger(afterLevel) || afterLevel < 1 || version !== ENDLESS_WINDOW_VERSION && afterLevel > 10 || typeof root2 === "number" && !Number.isSafeInteger(root2) || !/^-?\d{1,30}$/.test(String(root2))) throw new TypeError("Invalid Window seed domain");
  windowVersionOf({ windowVersion: version });
  let hash = 14695981039346656037n;
  for (const c of `weft-window:${version}:${BigInt(root2)}:${afterLevel}`) hash = BigInt.asUintN(64, (hash ^ BigInt(c.charCodeAt(0))) * 1099511628211n);
  return hash;
}
var sameWindowWitness = (a, b) => a === void 0 ? b === void 0 : b !== void 0 && a.seed === b.seed && a.moveIndex === b.moveIndex && a.ace === b.ace;

// ChatGPT/B-055/v6.24.16/src/score-config.ts
var CURRENT_SCORING_VERSION = "clear-v2";
var CLASSIC_SCORING_VERSION = "level-v3";
var ENDLESS_SCORING_VERSION = "level-v4";
var isLevelScoring = (version) => version === CLASSIC_SCORING_VERSION || version === ENDLESS_SCORING_VERSION;
var SCORE_CONFIG = Object.freeze({
  version: "6.7",
  scoringVersion: CURRENT_SCORING_VERSION,
  clearBonusPerSpoolCard: 50,
  starThresholds: Object.freeze([2600, 4200, 8300]),
  legacyStarThresholds: Object.freeze([2500, 4e3, 7400])
});
function scoringVersionOf(value) {
  const version = value && typeof value === "object" ? value.scoringVersion : void 0;
  if (version === void 0) return "legacy";
  if (version !== CURRENT_SCORING_VERSION && !isLevelScoring(version)) throw new TypeError("Unsupported scoring version");
  return version;
}
var isCurrentScoring = (value) => !!value && typeof value === "object" && [CURRENT_SCORING_VERSION, CLASSIC_SCORING_VERSION, ENDLESS_SCORING_VERSION].includes(value.scoringVersion);
var scoringMetadata = (version) => version === "legacy" ? {} : { scoringVersion: version };
var starThresholds = (version = CURRENT_SCORING_VERSION) => version === "legacy" ? SCORE_CONFIG.legacyStarThresholds : SCORE_CONFIG.starThresholds;
function starCount(score, version = CURRENT_SCORING_VERSION) {
  if (!Number.isFinite(score) || score < 0) return 0;
  const thresholds = starThresholds(version);
  return thresholds.filter((threshold) => score >= threshold).length;
}
var integer = (value) => Number.isSafeInteger(value) && value >= 0;
function clearBonus(cleared, spoolRemaining, chainCoins, spoolStarted, version = CURRENT_SCORING_VERSION) {
  if (!cleared || !integer(spoolRemaining)) return 0;
  if (chainCoins === void 0 || version === "legacy") {
    const bonus = spoolRemaining * SCORE_CONFIG.clearBonusPerSpoolCard;
    return integer(bonus) ? bonus : 0;
  }
  if (!integer(chainCoins) || !integer(spoolStarted ?? NaN) || !spoolStarted || spoolRemaining > spoolStarted) return 0;
  const numerator = BigInt(chainCoins) * BigInt(spoolRemaining), denominator = BigInt(spoolStarted);
  const result = (2n * numerator + denominator) / (2n * denominator);
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || BigInt(chainCoins) + result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Board score exceeds safe integer range");
  return Number(result);
}
function clearBonusDetails(cleared, spoolRemaining, chainCoins, spoolStarted, version = CURRENT_SCORING_VERSION) {
  if (!integer(chainCoins) || !integer(spoolRemaining) || !integer(spoolStarted) || spoolStarted < 1 || spoolRemaining > spoolStarted) throw new RangeError("Invalid clear-bonus inputs");
  const bonus = clearBonus(cleared, spoolRemaining, chainCoins, spoolStarted, version), score = chainCoins + bonus;
  if (!integer(score)) throw new RangeError("Board score exceeds safe integer range");
  return { chainCoins, spoolRemaining, spoolStarted, clearBonus: bonus, score, percentage: Math.round(100 * spoolRemaining / spoolStarted) };
}
var LEVEL_FACTORS_TENTHS = Object.freeze([10, 15, 20, 30, 40, 55, 75, 100, 140, 200]);
var HAND_NAMES = ["high", "pair", "two_pair", "trips", "straight", "flush", "full_house", "quads", "straight_flush", "royal"];
var HAND_MULTIPLIERS_TENTHS = [10, 12, 15, 20, 25, 30, 40, 50, 80, 120];
function levelCoinFactor(level, version = CLASSIC_SCORING_VERSION) {
  if (!Number.isSafeInteger(level) || level < 1 || version === CLASSIC_SCORING_VERSION && level > 10) throw new RangeError("Invalid scoring level");
  return isLevelScoring(version) ? LEVEL_FACTORS_TENTHS[Math.min(level, 10) - 1] / 10 : 1;
}
function levelChainCoins(event, level, version = CLASSIC_SCORING_VERSION) {
  levelCoinFactor(level, version);
  if (!isLevelScoring(version)) {
    const points = typeof event === "number" ? event : event.points;
    if (!integer(points)) throw new RangeError("Invalid chain coins");
    return points;
  }
  if (typeof event !== "object" || !event || !integer(event.scoringLength)) throw new TypeError("Level scoring requires the original Bank event");
  const hand = HAND_NAMES.indexOf(event.handName), base = baseScore(event.scoringLength);
  if (hand < 0 || !integer(base)) throw new RangeError("Invalid scoring hand/base");
  const result = BigInt(base) * BigInt(HAND_MULTIPLIERS_TENTHS[hand]) * BigInt(LEVEL_FACTORS_TENTHS[Math.min(level, 10) - 1]) / 100n;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Chain coins exceed safe integer range");
  return Number(result);
}
function boardScoreDetails(cleared, left, rawChainCoins, start, context) {
  if (!isLevelScoring(context.version)) return clearBonusDetails(cleared, left, rawChainCoins, start, context.version);
  if (!integer(rawChainCoins) || !integer(left) || !integer(start) || start < 1 || left > start) throw new RangeError("Invalid clear-bonus inputs");
  const levelFactor = levelCoinFactor(context.level, context.version), chainCoins = context.chainCoins, unmultipliedChainCoins = context.unmultipliedChainCoins ?? rawChainCoins;
  if (!integer(chainCoins ?? NaN) || !integer(unmultipliedChainCoins)) throw new RangeError("Missing derived level chain coins");
  const normalReward = context.version === ENDLESS_SCORING_VERSION || !context.secret || context.secret === "hugo" && [HUGO_VERSION, REWARD_HUGO_VERSION].includes(hugoVersionOf(context)) || context.secret === "window" && [WINDOW_VERSION, REWARD_WINDOW_VERSION].includes(windowVersionOf(context));
  const factor10 = LEVEL_FACTORS_TENTHS[Math.min(context.level, 10) - 1], spoolBonus = cleared ? 5 * left * factor10 : 0, levelBonus = cleared && normalReward ? 250 * factor10 : 0, clearBonus2 = spoolBonus + levelBonus, score = chainCoins + clearBonus2;
  const starCoins = unmultipliedChainCoins + (cleared ? 50 * left : 0) + (cleared && normalReward ? 2500 : 0);
  if (!integer(score) || !integer(starCoins)) throw new RangeError("Board score exceeds safe integer range");
  return { rawChainCoins, unmultipliedChainCoins, chainCoins, spoolRemaining: left, spoolStarted: start, spoolBonus, levelBonus, level: context.level, levelFactor, clearBonus: clearBonus2, score, starCoins, percentage: Math.round(100 * left / start) };
}
var starCoinScore = (facts) => facts.starCoins ?? facts.score;

// ChatGPT/B-055/v6.24.16/src/replay-practice.ts
var ownsPractice = (value) => !!value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "practice");
function canRankReplayRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && !ownsPractice(value);
}

// ChatGPT/B-055/v6.24.16/src/play-mode.ts
function canSubmitOnlineScore(record) {
  if (!record || typeof record !== "object" || !canRankReplayRecord(record)) return false;
  const mode = record.playMode;
  return mode === void 0 || mode === "classic";
}

// ChatGPT/B-055/v6.24.16/src/score-codec.ts
var MAX_SCORE_MOVES = 256;
function compressMoves(moves2) {
  if (!Array.isArray(moves2) || moves2.length > MAX_SCORE_MOVES) throw new TypeError("Invalid move count");
  return Array.from(moves2).map((move) => {
    if (move?.type === "play" && Number.isInteger(move.position) && move.position >= 0 && move.position < 30) return move.position;
    if (move?.type === "joker" && Number.isInteger(move.position) && move.position >= 0 && move.position < 30) return 32 + move.position;
    if (move?.type === "draw") return 30;
    if (move?.type === "bank") return 31;
    throw new TypeError("Invalid score action");
  });
}
function decompressMoves(bytes) {
  if (!Array.isArray(bytes) || bytes.length > MAX_SCORE_MOVES) throw new TypeError("Invalid compressed move count");
  return Array.from(bytes).map((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 61) throw new TypeError("Invalid compressed score action");
    return value < 30 ? { type: "play", position: value } : value === 30 ? { type: "draw" } : value === 31 ? { type: "bank" } : { type: "joker", position: value - 32 };
  });
}

// ChatGPT/B-055/v6.24.16/src/leaderboard-wire.ts
function decodeLeaderboardProof(value) {
  if (!value || typeof value !== "object") throw new TypeError("Invalid leaderboard proof");
  const input = value;
  if (input.type === "board" && input.record) return { ...input, record: { ...input.record, moves: decompressMoves(input.record.moves) } };
  if (input.type === "run" && input.record && Array.isArray(input.record.perLevel) && input.record.perLevel.length <= 1e4) return { ...input, record: { ...input.record, ...input.record.hugo?.result ? { hugo: { ...input.record.hugo, result: { ...input.record.hugo.result, moves: decompressMoves(input.record.hugo.result.moves) } } } : {}, ...input.record.window?.result ? { window: { ...input.record.window, result: { ...input.record.window.result, moves: decompressMoves(input.record.window.result.moves) } } } : {}, perLevel: input.record.perLevel.map((board2) => ({ ...board2, moves: decompressMoves(board2.moves) })) } };
  throw new TypeError("Invalid leaderboard proof");
}

// ChatGPT/B-002/engine/configs.ts
var peaksLoop = { layout: "peaks", loop: true };
var anchor = { ...peaksLoop, anchor: true };
var CONFIGS = {
  base: {},
  peaks: { layout: "peaks" },
  flat: { layout: "flat" },
  best7: { window: 7 },
  loop: { loop: true },
  wide: { deltas: [1, 2] },
  twins: { twins: true },
  spool18: { spool: 18 },
  spool26: { spool: 26 },
  open: { openWeave: true },
  tp: peaksLoop,
  tp7: { ...peaksLoop, window: 7 },
  tp18: { ...peaksLoop, spool: 18 },
  tp26: { ...peaksLoop, spool: 26 },
  tpopen: { ...peaksLoop, openWeave: true },
  tpA: anchor,
  tpA7: { ...anchor, window: 7 },
  W1: { ...anchor, window: 6 },
  O1: { ...anchor, openWeave: true },
  S1: { ...anchor, flush4: true },
  S2: { ...anchor, links: true },
  S3: { ...anchor, spark: true },
  S4: { ...anchor, flush4: true, links: true },
  chainBest: { ...anchor, links: true, window: 99 }
};
function getConfig(name) {
  if (!Object.hasOwnProperty.call(CONFIGS, name)) throw new Error(`Unknown config: ${name}`);
  return resolveRules(CONFIGS[name]);
}

// ChatGPT/B-002/engine/deck.ts
var PythonRandom = class {
  constructor(seed3) {
    this.mt = new Uint32Array(624);
    this.index = 624;
    if (typeof seed3 === "number" && !Number.isSafeInteger(seed3)) {
      throw new RangeError("Seed must be a safe integer or bigint");
    }
    let value = BigInt(seed3);
    if (value < 0n) value = -value;
    const words = [];
    do {
      words.push(Number(value & 0xffffffffn));
      value >>= 32n;
    } while (value > 0n);
    this.mt[0] = 19650218;
    for (let i2 = 1; i2 < 624; i2++) {
      const previous = this.mt[i2 - 1];
      this.mt[i2] = Math.imul(previous ^ previous >>> 30, 1812433253) + i2 >>> 0;
    }
    let i = 1;
    let j = 0;
    for (let count4 = Math.max(624, words.length); count4 > 0; count4--) {
      const previous = this.mt[i - 1];
      this.mt[i] = (this.mt[i] ^ Math.imul(previous ^ previous >>> 30, 1664525)) + words[j] + j >>> 0;
      if (++i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
      if (++j >= words.length) j = 0;
    }
    for (let count4 = 623; count4 > 0; count4--) {
      const previous = this.mt[i - 1];
      this.mt[i] = (this.mt[i] ^ Math.imul(previous ^ previous >>> 30, 1566083941)) - i >>> 0;
      if (++i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
    }
    this.mt[0] = 2147483648;
  }
  uint32() {
    if (this.index >= 624) {
      for (let i = 0; i < 624; i++) {
        const y2 = this.mt[i] & 2147483648 | this.mt[(i + 1) % 624] & 2147483647;
        this.mt[i] = (this.mt[(i + 397) % 624] ^ y2 >>> 1 ^ (y2 & 1 ? 2567483615 : 0)) >>> 0;
      }
      this.index = 0;
    }
    let y = this.mt[this.index++];
    y ^= y >>> 11;
    y ^= y << 7 & 2636928640;
    y ^= y << 15 & 4022730752;
    y ^= y >>> 18;
    return y >>> 0;
  }
  random() {
    const high = this.uint32() >>> 5;
    const low = this.uint32() >>> 6;
    return (high * 67108864 + low) / 9007199254740992;
  }
  /** Python packs generated 32-bit words least-significant first. */
  getrandbits(bits) {
    if (!Number.isSafeInteger(bits) || bits < 0) throw new RangeError("Invalid bit count");
    let value = 0n;
    for (let offset = 0; offset < bits; offset += 32) {
      const width = Math.min(32, bits - offset);
      const word = width === 32 ? this.uint32() : this.uint32() >>> 32 - width;
      value |= BigInt(word) << BigInt(offset);
    }
    return value;
  }
  randrange(stop) {
    if (!Number.isSafeInteger(stop) || stop <= 0) throw new RangeError("Empty or invalid range");
    const limit2 = BigInt(stop);
    const bits = limit2.toString(2).length;
    let value;
    do {
      value = this.getrandbits(bits);
    } while (value >= limit2);
    return Number(value);
  }
  shuffle(values) {
    for (let i = values.length - 1; i > 0; i--) {
      const j = this.randrange(i + 1);
      [values[i], values[j]] = [values[j], values[i]];
    }
  }
};
function deal(rules, seed3) {
  const rng = new PythonRandom(seed3);
  const deck = Array.from({ length: 52 }, (_, card) => card);
  rng.shuffle(deck);
  const size = layoutFor(rules.layout).size;
  const weave = deck.slice(0, size);
  const rest = deck.slice(size);
  if (rules.spool <= rest.length) {
    return { weave, spoolOrder: rest.slice(0, rules.spool), burned: rest.slice(rules.spool) };
  }
  const extra = Array.from({ length: 52 }, (_, card) => card);
  rng.shuffle(extra);
  return { weave, spoolOrder: [...rest, ...extra.slice(0, rules.spool - rest.length)], burned: [] };
}

// ChatGPT/B-004/engine/solver.ts
function population(mask) {
  mask -= mask >>> 1 & 1431655765;
  mask = (mask & 858993459) + (mask >>> 2 & 858993459);
  return (mask + (mask >>> 4) & 252645135) * 16843009 >>> 24;
}
function limit(value, name, integer2 = false) {
  if (value !== Infinity && (!Number.isFinite(value) || value < 0 || integer2 && !Number.isInteger(value)))
    throw new RangeError(`${name} must be nonnegative${integer2 ? " integer" : ""} or Infinity`);
}
var peaksCovers = layoutPeaks().coveredBy.map((c) => c.reduce((mask, p) => mask | 1 << p, 0));
var idealIndex = new Int16Array(1 << 10).fill(-1);
var idealMasks = [];
var idealFree = [];
for (let played = 0; played < idealIndex.length; played++) {
  if (peaksCovers.slice(0, 10).every((covers, p) => !(played & 1 << p) || !(covers & ~played))) {
    idealIndex[played] = idealMasks.length;
    idealMasks.push(played);
    idealFree.push(peaksCovers.slice(0, 10).reduce((free, covers, p) => !(played & 1 << p) && !(covers & ~played) ? free | 1 << p : free, 0));
  }
}
var idealCount = idealMasks.length;
var strides = [idealCount ** 2, idealCount, 1];
var peaksStateCount = idealCount ** 3;
var peaksFree = new Int32Array(peaksStateCount);
var nextIdeal = new Int16Array(idealCount * 10).fill(-1);
for (let local = 0; local < idealCount; local++) for (let p = 0; p < 10; p++)
  if (idealFree[local] & 1 << p) nextIdeal[local * 10 + p] = idealIndex[idealMasks[local] | 1 << p];
for (let code = 0; code < peaksStateCount; code++) peaksFree[code] = idealFree[Math.floor(code / strides[0])] | idealFree[Math.floor(code / strides[1]) % idealCount] << 10 | idealFree[code % idealCount] << 20;
function solvePeaks(initial, started, deadline, maxNodes) {
  const slots = peaksStateCount * 13, stock = initial.spool.map((card) => card % 13);
  const ranks = initial.weave.map((card) => card % 13);
  const earliest = new Uint8Array(slots), parents = new Int32Array(slots), actions = new Int8Array(slots);
  const nextStock = new Uint8Array((stock.length + 1) * 13);
  for (let sp = stock.length - 1; sp >= 0; sp--) {
    nextStock.set(nextStock.subarray((sp + 1) * 13, (sp + 2) * 13), sp * 13);
    nextStock[sp * 13 + stock[sp]] = sp + 1;
  }
  const predecessors = Array.from({ length: 13 }, (_, rank2) => Array.from({ length: 13 }, (_2, top) => top).filter((top) => isAdjacent(initial.rules, top, rank2)));
  const startKey = initial.top % 13;
  earliest[startKey] = initial.spoolIndex;
  parents[startKey] = -1;
  let nodes = 0, memoStates = 1, dominated = 0;
  const result = (clearable, reason, extra = {}) => ({
    clearable,
    nodes,
    ms: performance.now() - started,
    memoStates,
    reason,
    pruned: {
      memo: dominated,
      rankCapacity: 0,
      rankPairCapacity: 0,
      rankHallCapacity: 0,
      rankReachability: 0,
      coverReachability: 0
    },
    ...extra
  });
  const record = (key, sp, parent, action) => {
    if (earliest[key] === 0) memoStates++;
    earliest[key] = sp;
    parents[key] = parent;
    actions[key] = action;
  };
  for (let code = 0; code < peaksStateCount; code++) {
    if (deadline !== Infinity && (code & 127) === 0 && performance.now() >= deadline)
      return result("unknown", "time-budget");
    const base = code * 13;
    let minimum = Infinity, sourceKey = -1;
    for (let top = 0; top < 13; top++) {
      const sp = earliest[base + top];
      if (sp && sp < minimum) {
        minimum = sp;
        sourceKey = base + top;
      }
    }
    if (sourceKey < 0) continue;
    if (code !== peaksStateCount - 1) for (let rank2 = 0; rank2 < 13; rank2++) {
      const sp = nextStock[minimum * 13 + rank2], key = base + rank2;
      if (sp && (!earliest[key] || sp < earliest[key])) record(key, sp, sourceKey, -1);
    }
    for (let top = 0; top < 13; top++) if (earliest[base + top]) {
      if (nodes >= maxNodes) return result("unknown", "node-budget");
      nodes++;
    }
    if (code === peaksStateCount - 1) {
      const line = [];
      for (let key = sourceKey; parents[key] >= 0; key = parents[key]) {
        const parent = parents[key];
        if (actions[key] === -1) {
          for (let draws = earliest[key] - earliest[parent]; draws > 0; draws--) line.push({ type: "draw" });
        } else line.push({ type: "play", position: actions[key] });
      }
      line.reverse();
      let replay2 = initial;
      for (const move of line) replay2 = applyMove(replay2, move).state;
      if (replay2.terminal !== "cleared" || replay2.remaining !== 0) throw new Error("Internal solver witness failed engine replay");
      if (performance.now() >= deadline) return result("unknown", "time-budget");
      return result(true, "exhaustive", { line, witnessScore: replay2.score });
    }
    let free = peaksFree[code];
    while (free) {
      const bit2 = free & -free, p = 31 - Math.clz32(bit2), rank2 = ranks[p];
      free ^= bit2;
      let bestIndex = Infinity, parent = -1;
      for (const top of predecessors[rank2]) {
        const sp = earliest[base + top];
        if (sp && sp < bestIndex) {
          bestIndex = sp;
          parent = base + top;
        }
      }
      if (parent < 0) continue;
      const group = Math.floor(p / 10), stride = strides[group];
      const local = Math.floor(code / stride) % idealCount;
      const nextCode = code + (nextIdeal[local * 10 + p % 10] - local) * stride;
      const key = nextCode * 13 + rank2;
      if (!earliest[key] || bestIndex < earliest[key]) record(key, bestIndex, parent, p);
      else dominated++;
    }
  }
  if (performance.now() >= deadline) return result("unknown", "time-budget");
  return result(false, "exhaustive");
}
function solve(input, deal2, options = {}) {
  const started = performance.now();
  const timeBudgetMs = options.timeBudgetMs ?? 50, maxNodes = options.maxNodes ?? Infinity;
  limit(timeBudgetMs, "timeBudgetMs");
  limit(maxNodes, "maxNodes", true);
  if (deal2.weave.length > 30) throw new RangeError("Solver supports at most 30 Weave cards");
  const initial = createState(input, deal2), count4 = initial.weave.length;
  const pruned = { memo: 0, rankCapacity: 0, rankPairCapacity: 0, rankHallCapacity: 0, rankReachability: 0, coverReachability: 0 };
  let nodes = 0;
  const failed = /* @__PURE__ */ new Map();
  const result = (clearable, reason, extra = {}) => ({
    clearable,
    nodes,
    ms: performance.now() - started,
    memoStates: failed.size,
    reason,
    pruned,
    ...extra
  });
  const deadline = timeBudgetMs === Infinity ? Infinity : started + timeBudgetMs;
  if (performance.now() >= deadline) return result("unknown", "time-budget");
  if (count4 === 0) return result(true, "exhaustive", { line: [], witnessScore: initial.score });
  if (maxNodes === 0) return result("unknown", "node-budget");
  const allPlayed = 2 ** count4 - 1;
  if (!Number.isSafeInteger(allPlayed * 13 + 12)) throw new RangeError("Memo key exceeds safe integer range");
  const ranks = initial.weave.map((card) => card % 13);
  const stockRanks = initial.spool.map((card) => card % 13);
  const covers = initial.layout.coveredBy.map((positions) => positions.reduce((mask, p) => mask | 1 << p, 0));
  if (count4 === 30 && initial.spool.length <= 255 && covers.every((mask, p) => mask === peaksCovers[p]))
    return solvePeaks(initial, started, deadline, maxNodes);
  const children = initial.layout.children;
  const byRank = new Int32Array(13), remainingCounts = new Uint8Array(13);
  let initialRanks = 0;
  ranks.forEach((rank2, p) => {
    byRank[rank2] |= 1 << p;
    remainingCounts[rank2]++;
    initialRanks |= 1 << rank2;
  });
  const adjacentRanks = new Uint16Array(13), adjacentPositions = new Int32Array(13);
  const adjacentLists = Array.from({ length: 13 }, () => []);
  for (let top = 0; top < 13; top++) for (let rank2 = 0; rank2 < 13; rank2++) {
    if (isAdjacent(initial.rules, top, rank2)) {
      adjacentRanks[top] |= 1 << rank2;
      adjacentPositions[top] |= byRank[rank2];
      adjacentLists[top].push(rank2);
    }
  }
  const adjacentUnion = new Uint16Array(1 << 13);
  const positionsUnion = new Int32Array(1 << 13);
  for (let mask = 1; mask < adjacentUnion.length; mask++) {
    const bit2 = mask & -mask, rank2 = 31 - Math.clz32(bit2);
    adjacentUnion[mask] = adjacentUnion[mask ^ bit2] | adjacentRanks[rank2];
    positionsUnion[mask] = positionsUnion[mask ^ bit2] | byRank[rank2];
  }
  const suffixRanks = new Uint16Array(stockRanks.length + 1);
  const suffixCapacity = Array.from({ length: stockRanks.length + 1 }, () => new Uint32Array(13));
  const suffixCounts = Array.from({ length: stockRanks.length + 1 }, () => new Uint32Array(13));
  for (let sp = stockRanks.length - 1; sp >= 0; sp--) {
    const rank2 = stockRanks[sp];
    suffixRanks[sp] = suffixRanks[sp + 1] | 1 << rank2;
    suffixCounts[sp].set(suffixCounts[sp + 1]);
    suffixCounts[sp][rank2]++;
    for (let target = 0; target < 13; target++) suffixCapacity[sp][target] = suffixCapacity[sp + 1][target] + (adjacentRanks[rank2] & 1 << target ? 1 : 0);
  }
  const hallFamilies = Array.from({ length: 13 }, (_, start) => {
    let predecessors = 0;
    return Array.from({ length: 6 }, (_2, step) => {
      const target = (start + step * 2) % 13, added = adjacentRanks[target] & ~predecessors;
      predecessors |= added;
      return {
        target,
        added,
        ranks: Array.from({ length: 13 }, (_3, rank2) => rank2).filter((rank2) => added & 1 << rank2)
      };
    });
  });
  const line = [];
  let stopReason;
  const remember = (key, sp) => {
    const old = failed.get(key);
    if (old === void 0 || sp < old) failed.set(key, sp);
  };
  const search = (played, free2, top, sp, remainingRanks) => {
    if (nodes >= maxNodes) {
      stopReason = "node-budget";
      return 0;
    }
    if (deadline !== Infinity && (nodes & 127) === 0 && performance.now() >= deadline) {
      stopReason = "time-budget";
      return 0;
    }
    nodes++;
    if (played === allPlayed) return 1;
    const key = played * 13 + top;
    const priorFailure = failed.get(key);
    if (priorFailure !== void 0 && priorFailure <= sp) {
      pruned.memo++;
      return -1;
    }
    let rankBits = remainingRanks;
    while (rankBits) {
      const bit2 = rankBits & -rankBits, rank2 = 31 - Math.clz32(bit2);
      rankBits ^= bit2;
      let capacity = suffixCapacity[sp][rank2] + (adjacentRanks[top] & bit2 ? 1 : 0);
      for (const neighbour of adjacentLists[rank2]) capacity += remainingCounts[neighbour];
      if (remainingCounts[rank2] > capacity) {
        pruned.rankCapacity++;
        remember(key, sp);
        return -1;
      }
    }
    for (const family of hallFamilies) if (remainingCounts[family[0].target]) {
      let demand = 0, capacity = 0, step = 0;
      for (const part of family) {
        demand += remainingCounts[part.target];
        capacity += part.added & 1 << top ? 1 : 0;
        for (const rank2 of part.ranks) capacity += remainingCounts[rank2] + suffixCounts[sp][rank2];
        if (step > 0 && demand > capacity) {
          if (step === 1) pruned.rankPairCapacity++;
          else pruned.rankHallCapacity++;
          remember(key, sp);
          return -1;
        }
        step++;
      }
    }
    const seedRanks = 1 << top | suffixRanks[sp];
    const immediateRanks = adjacentUnion[seedRanks] & remainingRanks;
    let reachable = immediateRanks;
    for (; ; ) {
      const expanded = reachable | adjacentUnion[reachable] & remainingRanks;
      if (expanded === reachable) break;
      reachable = expanded;
    }
    if (reachable !== remainingRanks) {
      pruned.rankReachability++;
      remember(key, sp);
      return -1;
    }
    if (immediateRanks !== remainingRanks) {
      let virtualPlayed = played, virtualFree = free2, roots = seedRanks;
      while (virtualPlayed !== allPlayed) {
        let possible = virtualFree & positionsUnion[adjacentUnion[roots]];
        if (!possible) {
          pruned.coverReachability++;
          remember(key, sp);
          return -1;
        }
        virtualPlayed |= possible;
        virtualFree &= ~possible;
        while (possible) {
          const bit2 = possible & -possible, p = 31 - Math.clz32(bit2);
          possible ^= bit2;
          roots |= 1 << ranks[p];
          for (const child of children[p]) if ((covers[child] & ~virtualPlayed) === 0) virtualFree |= 1 << child;
        }
      }
    }
    let candidates = free2 & adjacentPositions[top];
    while (candidates) {
      let scan = candidates, chosen = 0, chosenP = 0, chosenFree = 0, priority = -1;
      while (scan) {
        const bit2 = scan & -scan, p = 31 - Math.clz32(bit2);
        scan ^= bit2;
        const nextPlayed = played | bit2;
        let nextFree = free2 & ~bit2, reveals = 0;
        for (const child of children[p]) if ((covers[child] & ~nextPlayed) === 0) {
          nextFree |= 1 << child;
          reveals++;
        }
        const score = reveals * 64 + population(nextFree & adjacentPositions[ranks[p]]) * 4;
        if (score > priority) {
          priority = score;
          chosen = bit2;
          chosenP = p;
          chosenFree = nextFree;
        }
      }
      candidates ^= chosen;
      const rank2 = ranks[chosenP];
      remainingCounts[rank2]--;
      const nextRanks = remainingCounts[rank2] === 0 ? remainingRanks & ~(1 << rank2) : remainingRanks;
      line.push({ type: "play", position: chosenP });
      const found = search(played | chosen, chosenFree, rank2, sp, nextRanks);
      remainingCounts[rank2]++;
      if (found === 1) return 1;
      line.pop();
      if (found === 0) return 0;
    }
    if (sp < stockRanks.length) {
      line.push({ type: "draw" });
      const found = search(played, free2, stockRanks[sp], sp + 1, remainingRanks);
      if (found === 1) return 1;
      line.pop();
      if (found === 0) return 0;
    }
    remember(key, sp);
    return -1;
  };
  const free = initial.free.reduce((mask, p) => mask | 1 << p, 0);
  const answer = search(0, free, initial.top % 13, initial.spoolIndex, initialRanks);
  if (answer === 0) return result("unknown", stopReason);
  if (performance.now() >= deadline) return result("unknown", "time-budget");
  if (answer === -1) return result(false, "exhaustive");
  let replay2 = initial;
  for (const move of line) replay2 = applyMove(replay2, move).state;
  if (replay2.terminal !== "cleared" || replay2.remaining !== 0) throw new Error("Internal solver witness failed engine replay");
  if (performance.now() >= deadline) return result("unknown", "time-budget");
  return result(true, "exhaustive", { line: [...line], witnessScore: replay2.score });
}

// ChatGPT/B-004/engine/generator.ts
var GENERATOR_SALT = 0x9e3779b9n;
var GenerationBudgetError = class extends Error {
  constructor(seed3, subSeed, attempts, verification) {
    super(`Generation stopped at candidate ${attempts}: ${verification.reason}`);
    this.seed = seed3;
    this.subSeed = subSeed;
    this.attempts = attempts;
    this.verification = verification;
    this.code = "GENERATION_BUDGET_EXHAUSTED";
    this.name = "GenerationBudgetError";
  }
};
var GenerationAttemptsError = class extends Error {
  constructor(seed3, attempts) {
    super(`No verified deal after ${attempts} exhaustive candidates`);
    this.seed = seed3;
    this.attempts = attempts;
    this.code = "GENERATION_ATTEMPTS_EXHAUSTED";
    this.name = "GenerationAttemptsError";
  }
};
function generateDeal(input, seed3, options = {}) {
  if (typeof seed3 === "number" && !Number.isSafeInteger(seed3))
    throw new RangeError("Seed must be a safe integer or bigint");
  const original = BigInt(seed3), rules = resolveRules(input);
  const maxAttempts = options.maxAttempts ?? 1e3;
  if (maxAttempts !== Infinity && (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1))
    throw new RangeError("maxAttempts must be a positive safe integer or Infinity");
  const solverOptions = {
    timeBudgetMs: options.timeBudgetMs ?? Infinity,
    maxNodes: options.maxNodes ?? Infinity
  };
  const checks = [];
  for (let index = 0; index < maxAttempts; index += 1) {
    const subSeed = original + BigInt(index) * GENERATOR_SALT;
    const candidate2 = deal(rules, subSeed), started = performance.now();
    const verification = solve(rules, candidate2, solverOptions);
    checks.push({ subSeed, verification, wallMs: performance.now() - started });
    if (verification.clearable === "unknown")
      throw new GenerationBudgetError(original, subSeed, index + 1, verification);
    if (verification.clearable === true) {
      if (!verification.line) throw new Error("A verified deal must include a clearing witness");
      return {
        deal: candidate2,
        line: verification.line,
        attempts: index + 1,
        seed: original,
        subSeed,
        salt: GENERATOR_SALT,
        verification,
        checks
      };
    }
  }
  throw new GenerationAttemptsError(original, maxAttempts);
}

// ChatGPT/B-055/v6.24.16/src/records.ts
function recordId(record) {
  const actions = record.moves.map((move) => move.type === "play" || move.type === "joker" ? [move.type, move.position] : [move.type]);
  const text = JSON.stringify([record.version, ...hasEarnedJokers(record) ? ["joker", record.jokerVersion] : [], record.seed, actions, record.dailyDate ?? null, ...scoringVersionOf(record) === "legacy" ? [] : ["scoring", scoringVersionOf(record)], ...isLevelScoring(scoringVersionOf(record)) ? ["level", record.clearBonusDetails?.level ?? null] : [], ...record.secret === void 0 ? [] : ["secret", record.secret], ...record.admission === void 0 ? [] : ["admission", record.admission]]);
  let hash = 14695981039346656037n;
  for (let index = 0; index < text.length; index++) hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(index))) * 1099511628211n);
  return "weft-" + hash.toString(16).padStart(16, "0");
}

// ChatGPT/B-055/v6.24.16/src/endless-deal.ts
var ENDLESS_MAX_CANDIDATES = 32;
var ENDLESS_CANDIDATE_NODES = 1e6;
var DOMAIN = 0x656e646c65737331n;
function seedValue(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new RangeError("Seed must be a safe integer or bigint");
  return BigInt(value);
}
function classicRules(input) {
  const rules = resolveRules(input);
  if (rules.spool > 28) throw new RangeError("Endless Spool must be between1 and28");
  if (JSON.stringify({ ...rules, spool: 22 }) !== JSON.stringify({ ...getConfig("chainBest"), spool: 22 })) throw new Error("Endless admission requires Classic chainBest rules");
  return rules;
}
function topologicalOrder(rng, forcedFree = 0) {
  const layout = layoutFor("peaks"), cover = layout.coveredBy.map((row) => row.length), free = cover.flatMap((count4, p) => count4 === 0 ? [p] : []), order = [];
  const first = [...free];
  rng.shuffle(first);
  const prefix = first.slice(0, forcedFree);
  for (let i = 0; i < layout.size; i++) {
    const p = i < prefix.length ? prefix[i] : free[rng.randrange(free.length)];
    const index = free.indexOf(p);
    if (index < 0) throw new Error("Invalid constructive topological order");
    free.splice(index, 1);
    order.push(p);
    for (const child of layout.children[p]) if (--cover[child] === 0) free.push(child);
  }
  return order;
}
function rankWalk(rng, length, start, prior = [], fallback) {
  for (let attempt = 0; attempt < 64; attempt++) {
    const counts2 = Array(13).fill(0);
    for (const rank2 of prior) counts2[rank2]++;
    const result2 = [start];
    if (++counts2[start] > 4) throw new Error("Constructive rank capacity");
    while (result2.length < length) {
      const last = result2.at(-1), options = [(last + 1) % 13, (last + 12) % 13].filter((rank2) => counts2[rank2] < 4);
      if (!options.length) break;
      const next = options[rng.randrange(options.length)];
      result2.push(next);
      counts2[next]++;
    }
    if (result2.length === length) return result2;
  }
  const result = fallback ? [...fallback] : Array.from({ length }, (_, i) => (start + i) % 13), counts = Array(13).fill(0);
  for (const rank2 of [...prior, ...result]) if (++counts[rank2] > 4) throw new Error("Constructive fallback rank capacity");
  return result;
}
function cardsFor(ranks, rng, reservedIndex) {
  const pools = Array.from({ length: 13 }, (_, rank2) => [rank2, rank2 + 13, rank2 + 26, rank2 + 39]);
  for (const pool of pools) rng.shuffle(pool);
  if (reservedIndex !== void 0) {
    if (ranks[reservedIndex] !== 0) throw new Error("Violin reservation must be an ace");
    pools[0].splice(pools[0].indexOf(13), 1);
  }
  return ranks.map((rank2, index) => index === reservedIndex ? 13 : pools[rank2].pop() ?? (() => {
    throw new Error("Constructed deck exceeds four cards of one rank");
  })());
}
function finishDeck(weave, initialStock, rules, rng) {
  const used = /* @__PURE__ */ new Set([...weave, ...initialStock]);
  if (used.size !== weave.length + initialStock.length) throw new Error("Constructive deck repeats a physical card");
  const unused = Array.from({ length: 52 }, (_, card) => card).filter((card) => !used.has(card));
  rng.shuffle(unused);
  const need = rules.spool - initialStock.length, extra = need > unused.length ? Array.from({ length: 52 }, (_, card) => card) : [];
  rng.shuffle(extra);
  return { weave, spoolOrder: [...initialStock, ...unused.slice(0, need), ...extra.slice(0, Math.max(0, need - unused.length))], burned: unused.slice(Math.max(0, need)) };
}
function replay(rules, deal2, line) {
  let state = createState(rules, deal2);
  for (const move of line) state = applyMove(state, move).state;
  if (state.terminal !== "cleared" || state.remaining !== 0) throw new Error("Constructive witness failed unchanged engine replay");
}
function constructEndlessDeal(input, seed3, options = {}) {
  const rules = classicRules(input), original = seedValue(seed3), rng = new PythonRandom(original ^ DOMAIN), grove = options.grove === true && rules.spool >= 2;
  if (options.grove && options.neon) throw new Error("A board cannot be both Grove and Neon");
  const order = topologicalOrder(rng, grove ? 4 : 0), weave = Array(30), line = [], stock = [];
  let opportunity;
  if (grove) {
    const mirror = rng.randrange(2) === 1, reflect = (rank2) => mirror ? (24 - rank2) % 13 : rank2;
    const rest = rankWalk(rng, 27, 5, [5, 6, 5, 6, 4], [5, 4, 3, 2, 1, 0, 12, 11, 10, 9, 8, 7, 6, 7, 8, 9, 10, 11, 12, 0, 1, 2, 3, 4, 3, 2, 1]);
    const ranks = [5, 6, 5, 6, 4, ...rest].map(reflect), cards = cardsFor(ranks, rng);
    stock.push(cards[0], cards[4]);
    for (let i = 0; i < 3; i++) {
      weave[order[i]] = cards[i + 1];
      line.push({ type: "play", position: order[i] });
    }
    line.push({ type: "draw" });
    opportunity = [...line];
    for (let i = 0; i < 27; i++) {
      weave[order[i + 3]] = cards[i + 5];
      line.push({ type: "play", position: order[i + 3] });
    }
  } else {
    const walk = rankWalk(rng, 31, 0), chosen = options.neon ? walk[1 + rng.randrange(30)] : rng.randrange(13), offset = options.neon ? (13 - chosen) % 13 : chosen, direction = rng.randrange(2) ? 1 : -1, ranks = walk.map((rank2) => (rank2 * direction + offset + 26) % 13);
    if (options.neon) {
      const target = 1 + rng.randrange(30), delta = (13 - ranks[target]) % 13;
      for (let i = 0; i < ranks.length; i++) ranks[i] = (ranks[i] + delta) % 13;
    }
    const aceIndex = options.neon ? ranks.findIndex((rank2, index) => index > 0 && rank2 === 0) : void 0, cards = cardsFor(ranks, rng, aceIndex);
    stock.push(cards[0]);
    for (let i = 0; i < 30; i++) {
      weave[order[i]] = cards[i + 1];
      line.push({ type: "play", position: order[i] });
    }
  }
  const deal2 = finishDeck(weave, stock, rules, rng);
  replay(rules, deal2, line);
  if (grove) {
    let state = createState(rules, deal2);
    for (const move of opportunity.slice(0, 3)) state = applyMove(state, move).state;
    if (state.chain.length !== 3 || !legalMoves(state).length || state.spoolIndex >= state.spool.length) throw new Error("Constructive Grove sacrifice is not voluntary");
  }
  if (options.neon && !deal2.weave.includes(13)) throw new Error("Constructive Neon omitted the violin ace");
  const started = performance.now(), verification = solve(rules, deal2, { timeBudgetMs: Infinity, maxNodes: Infinity });
  if (verification.clearable !== true || !verification.line) throw new Error("Constructive deal failed fresh exact solver");
  return { deal: deal2, line, attempts: 1, seed: original, subSeed: original, salt: GENERATOR_SALT, verification, checks: [{ subSeed: original, verification, wallMs: performance.now() - started }], method: "constructive", ...opportunity ? { opportunity } : {}, ...options.neon ? { violinAce: 13 } : {} };
}
function generateEndlessDeal(input, seed3, options = {}) {
  const rules = classicRules(input), original = seedValue(seed3);
  if (options.grove && options.neon) throw new Error("A board cannot be both Grove and Neon");
  if (options.grove && rules.spool >= 2) return constructEndlessDeal(rules, original, options);
  const checks = [];
  for (let index = 0; index < ENDLESS_MAX_CANDIDATES; index++) {
    const subSeed2 = original + BigInt(index) * GENERATOR_SALT, deal2 = deal(rules, subSeed2), started = performance.now(), verification = solve(rules, deal2, { timeBudgetMs: Infinity, maxNodes: ENDLESS_CANDIDATE_NODES });
    checks.push({ subSeed: subSeed2, verification, wallMs: performance.now() - started });
    if (verification.clearable === true && verification.line && (!options.neon || deal2.weave.includes(13))) return { deal: deal2, line: verification.line, attempts: index + 1, seed: original, subSeed: subSeed2, salt: GENERATOR_SALT, verification, checks, method: "rejection", ...options.neon ? { violinAce: 13 } : {} };
  }
  const subSeed = original + BigInt(ENDLESS_MAX_CANDIDATES) * GENERATOR_SALT, fallback = constructEndlessDeal(rules, subSeed, options);
  return { ...fallback, seed: original, subSeed, attempts: ENDLESS_MAX_CANDIDATES + 1, checks: [...checks, ...fallback.checks] };
}

// ChatGPT/B-055/v6.24.16/src/neon-window-admission.ts
var NEON_WINDOW_ADMISSION = "neon-window-3";
var LEGACY_NEON_WINDOW_ADMISSION = "neon-window-2";
function generateNeonOpportunity(input, seed3, options = {}, admission = NEON_WINDOW_ADMISSION) {
  if (admission !== NEON_WINDOW_ADMISSION && admission !== LEGACY_NEON_WINDOW_ADMISSION) throw new TypeError("Unsupported Neon admission");
  if (typeof seed3 === "number" && !Number.isSafeInteger(seed3)) throw new RangeError("Seed must be a safe integer or bigint");
  const original = BigInt(seed3), rules = resolveRules(input), maxAttempts = options.maxAttempts ?? 1e3;
  if (maxAttempts !== Infinity && (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1)) throw new RangeError("maxAttempts must be a positive safe integer or Infinity");
  const solverOptions = { timeBudgetMs: options.timeBudgetMs ?? Infinity, maxNodes: options.maxNodes ?? Infinity }, checks = [];
  for (let index = 0; index < maxAttempts; index++) {
    const subSeed = original + BigInt(index) * GENERATOR_SALT, candidate2 = deal(rules, subSeed), started = performance.now(), verification = solve(rules, candidate2, solverOptions);
    checks.push({ subSeed, verification, wallMs: performance.now() - started });
    if (verification.clearable === "unknown") throw new GenerationBudgetError(original, subSeed, index + 1, verification);
    const violinAce = candidate2.weave.find((card) => admission === NEON_WINDOW_ADMISSION ? card === WINDOW_VIOLIN_ACE : card % 13 === 0);
    if (verification.clearable === true && violinAce !== void 0) {
      if (!verification.line) throw new Error("A verified Neon deal needs a clearing witness");
      return { deal: candidate2, line: verification.line, attempts: index + 1, seed: original, subSeed, salt: GENERATOR_SALT, verification, checks, violinAce };
    }
  }
  throw new GenerationAttemptsError(original, maxAttempts);
}

// ChatGPT/B-055/v6.24.16/src/grove-opportunity.ts
var GROVE_ADMISSION = "grove-hugo-2";
var SALT = 0x9e3779b9n;
var STOCKS = [15, 20, 21, 22, 23, 24, 25, 26, 27, 28];
var GROVE_MAX_CANDIDATES = 32;
var GROVE_FALLBACK_SEEDS = Object.freeze(Object.fromEntries(STOCKS.map((stock) => [stock, stock === 15 ? "2654435770" : "1"])));
function continuation(state) {
  const positions = state.weave.flatMap((_, p) => state.played.includes(p) ? [] : [p]), map = new Map(positions.map((p, i) => [p, i]));
  const reduced = { weave: positions.map((p) => state.weave[p]), spoolOrder: [state.top, ...state.spool.slice(state.spoolIndex)], burned: state.burned, coveredBy: positions.map((p) => state.layout.coveredBy[p].filter((q) => map.has(q)).map((q) => map.get(q))) };
  const proof = solve(state.rules, reduced, { timeBudgetMs: Infinity, maxNodes: 1e5 });
  return proof.clearable === true && proof.line ? { line: proof.line.map((move) => move.type === "play" ? { type: "play", position: positions[move.position] } : move), nodes: proof.nodes } : void 0;
}
function candidate(input, seed3) {
  const rules = resolveRules(input), base = deal(rules, seed3), rng = new PythonRandom(seed3 ^ 0x6875676f32n);
  const free = [...createState(rules, base).free];
  rng.shuffle(free);
  if (free.length < 4) return;
  const slots = [...base.weave, ...base.spoolOrder, ...base.burned], reserved = /* @__PURE__ */ new Set(), first = 5 + rng.randrange(2), targets = [{ index: base.weave.length, rank: first }, ...free.slice(0, 4).map((position, index) => ({ index: position, rank: index % 2 ? first : 11 - first }))];
  for (const target of targets) {
    const choices = slots.flatMap((card, index) => !reserved.has(index) && card % 13 === target.rank ? [index] : []);
    if (!choices.length) return;
    const from = choices[rng.randrange(choices.length)];
    [slots[target.index], slots[from]] = [slots[from], slots[target.index]];
    reserved.add(target.index);
  }
  const deal2 = { weave: slots.slice(0, base.weave.length), spoolOrder: slots.slice(base.weave.length, base.weave.length + base.spoolOrder.length), burned: slots.slice(base.weave.length + base.spoolOrder.length) };
  const prefix = free.slice(0, 3).map((position) => ({ type: "play", position }));
  let state = createState(rules, deal2);
  for (const move of prefix) state = applyMove(state, move).state;
  if (!isHugoSacrifice(state, { type: "draw" })) return;
  prefix.push({ type: "draw" });
  state = applyMove(state, { type: "draw" }).state;
  const rest = continuation(state);
  if (!rest) return;
  const line = [...prefix, ...rest.line];
  let end = createState(rules, deal2);
  for (const move of line) end = applyMove(end, move).state;
  if (end.terminal !== "cleared") throw Error("Grove admission witness failed canonical replay");
  return { deal: deal2, prefix, line, nodes: rest.nodes };
}
function generateGroveOpportunity(input, seed3) {
  if (typeof seed3 === "number" && !Number.isSafeInteger(seed3)) throw Error("Invalid Grove admission seed");
  const original = BigInt(seed3), rules = resolveRules(input), started = performance.now();
  if (!STOCKS.includes(rules.spool) || JSON.stringify({ ...rules, spool: 22 }) !== JSON.stringify({ ...getConfig("chainBest"), spool: 22 })) throw Error("Grove admission requires a current Classic board");
  for (let index = 0; index <= GROVE_MAX_CANDIDATES; index++) {
    const subSeed = index === GROVE_MAX_CANDIDATES ? BigInt(GROVE_FALLBACK_SEEDS[rules.spool]) : original + BigInt(index) * SALT, result = candidate(rules, subSeed);
    if (!result) continue;
    return { deal: result.deal, line: result.line, opportunity: result.prefix, attempts: index + 1, seed: original, subSeed, salt: SALT, checks: [], verification: { clearable: true, line: result.line, nodes: result.nodes, ms: performance.now() - started, memoStates: result.nodes, reason: "exhaustive", pruned: { memo: 0, rankCapacity: 0, rankPairCapacity: 0, rankHallCapacity: 0, rankReachability: 0, coverReachability: 0 } } };
  }
  throw Error("Verified Grove fallback invariant failed");
}

// ChatGPT/B-055/v6.24.16/src/world-config.ts
var world = (id, name, scene, background, paper, ink, inner, outer) => {
  const rgb = (hex) => Object.freeze([
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ]);
  return Object.freeze({
    id,
    name,
    title: `The ${name}`,
    scene,
    accent: inner,
    rimInner: inner,
    rimOuter: outer,
    palette: Object.freeze({ background, paper, ink, accent: inner }),
    halo: Object.freeze({ inner, outer, innerRgb: rgb(inner), outerRgb: rgb(outer) })
  });
};
var WORLD_CONFIG = Object.freeze({
  1: world(1, "Night Hall", "hall", "#101c25", "#eaf0e9", "#102b39", "#8ec9ff", "#3e6fd8"),
  2: world(2, "Golden Hall", "golden", "#382716", "#f9edce", "#102b39", "#e0a93c", "#b8741f"),
  3: world(3, "Green Grove", "grove", "#182b22", "#e6eed8", "#183329", "#b6f0a0", "#3e9b5a"),
  4: world(4, "Neon Sanctum", "neon", "#0d0916", "#16131f", "#fff7e8", "#ff7bea", "#7b5cff"),
  5: world(5, "Sunken Temple", "sunken", "#092832", "#eaf4ed", "#113844", "#92f6ef", "#279eb7"),
  6: world(6, "Aurora Observatory", "aurora", "#111e30", "#eff3fa", "#172e48", "#f3f7ff", "#94afcf"),
  7: world(7, "Frost Sanctum", "frost", "#f5f9ff", "#f5f9ff", "#173e58", "#6fd6ff", "#f5f9ff"),
  8: world(8, "Umbra", "umbra", "#040507", "#07090d", "#ffffff", "#ffffff", "#aab6ca"),
  9: world(9, "Prism", "prism", "#111027", "#edf3fa", "#202443", "#f3eeff", "#bfa5ff"),
  10: world(10, "Eclipse", "eclipse", "#070912", "#101017", "#ffe9ad", "#f1cd7d", "#fff2d1")
});
var ENDLESS_RULES_VERSION = "6.24.14";
var CLASSIC_MIN_SPOOL = 1;
var CLASSIC_RULES_VERSION = "6.14";
var CLASSIC_LEVEL_COUNT = 10;
var LEGACY_LEVEL_CONFIG = Object.freeze([
  Object.freeze({ level: 1, world: 1, spool: 28 }),
  Object.freeze({ level: 2, world: 2, spool: 26 }),
  Object.freeze({ level: 3, world: 3, spool: 24 }),
  Object.freeze({ level: 4, world: 4, spool: 22 }),
  Object.freeze({ level: 5, world: 1, spool: 20 })
]);
var SIX_WORLD_LEVEL_CONFIG = Object.freeze([28, 27, 26, 25, 24, 23].map((spool, index) => Object.freeze({ level: index + 1, world: index + 1, spool })));
var LEVEL_CONFIG = Object.freeze([
  [1, 28],
  [2, 27],
  [3, 26],
  [5, 25],
  [6, 24],
  [4, 23],
  [7, 22],
  [8, 21],
  [9, 20],
  [10, 15]
].map(([world3, spool], index) => Object.freeze({ level: index + 1, world: world3, spool })));
function isEndlessRun(value) {
  return value === ENDLESS_RULES_VERSION || !!value && typeof value === "object" && (value.rulesVersion == ENDLESS_RULES_VERSION || value.version === ENDLESS_RULES_VERSION);
}
function runLevelCount(version = CLASSIC_RULES_VERSION) {
  return version === CLASSIC_RULES_VERSION ? CLASSIC_LEVEL_COUNT : null;
}
function levelConfig(level, version = CLASSIC_RULES_VERSION) {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError("Level must be a positive safe integer");
  if (version === ENDLESS_RULES_VERSION) {
    const first = LEVEL_CONFIG[(level - 1) % CLASSIC_LEVEL_COUNT];
    return Object.freeze({ level, world: first.world, spool: level <= 10 ? LEVEL_CONFIG[level - 1].spool : Math.max(CLASSIC_MIN_SPOOL, 25 - level) });
  }
  if (version === CLASSIC_RULES_VERSION) {
    const config = LEVEL_CONFIG[level - 1];
    if (!config) throw new RangeError("Classic has exactly10 levels");
    return config;
  }
  const legacy = version === "6.7", table = legacy ? LEGACY_LEVEL_CONFIG : SIX_WORLD_LEVEL_CONFIG;
  return table[level - 1] ?? Object.freeze({ level, world: (level - 1) % (legacy ? 4 : 6) + 1, spool: legacy ? 20 : 23 });
}

// ChatGPT/B-055/v6.24.16/src/run-plan.ts
var canonical = Object.freeze(LEVEL_CONFIG.map((level) => level.world));
function world2(value) {
  if (!Number.isSafeInteger(value) || !canonical.includes(value)) throw new TypeError("Invalid starting world");
  return value;
}
function root(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value) || !["string", "number", "bigint"].includes(typeof value) || !/^-?\d{1,30}$/.test(String(value))) throw new TypeError("Invalid world-route seed");
  return String(BigInt(value));
}
function rotatedClassicWorlds(start) {
  const index = canonical.indexOf(world2(start));
  return Object.freeze([...canonical.slice(index), ...canonical.slice(0, index)]);
}
function seededClassicWorldOrder(value) {
  let state = 14695981039346656037n;
  for (const char of `weft-classic-worlds:1:${root(value)}`) state = BigInt.asUintN(64, (state ^ BigInt(char.charCodeAt(0))) * 1099511628211n);
  const next = () => {
    state = BigInt.asUintN(64, state + 0x9e3779b97f4a7c15n);
    let z = state;
    z = BigInt.asUintN(64, (z ^ z >> 30n) * 0xbf58476d1ce4e5b9n);
    z = BigInt.asUintN(64, (z ^ z >> 27n) * 0x94d049bb133111ebn);
    return BigInt.asUintN(64, z ^ z >> 31n);
  };
  const order = [...canonical];
  for (let index = order.length - 1; index > 0; index--) {
    const other = Number(next() % BigInt(index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  return Object.freeze(order);
}
function hasClassicRoute(value) {
  return value.worldRoute !== void 0 || value.startWorld !== void 0 || value.worldOrder !== void 0;
}
function resolveClassicRoute(value, metadata = {}) {
  if (!hasClassicRoute(metadata)) return canonical;
  if (metadata.worldRoute !== "rotate-v1" && metadata.worldRoute !== "random-v1") throw new TypeError("Invalid Classic world-route kind");
  const first = world2(metadata.startWorld), expected = metadata.worldRoute === "random-v1" ? seededClassicWorldOrder(value) : rotatedClassicWorlds(first);
  if (first !== expected[0] || !Array.isArray(metadata.worldOrder) || metadata.worldOrder.length !== 10 || metadata.worldOrder.some((id, index) => id !== expected[index])) throw new TypeError("World order disagrees with its canonical route");
  return expected;
}

// ChatGPT/B-055/v6.24.16/src/run.ts
var RUN_VERSION = ENDLESS_RULES_VERSION;
var isRunVersion = (value) => value === "6.7" || value === "6.9" || value === CLASSIC_RULES_VERSION || value === ENDLESS_RULES_VERSION;
var copy = (value) => JSON.parse(JSON.stringify(value));
var count2 = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function seed(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new RangeError("Seed must be a safe integer");
  if (!["string", "number", "bigint"].includes(typeof value) || !/^-?\d{1,30}$/.test(String(value))) throw new TypeError("Invalid run seed");
  return String(BigInt(value));
}
var proofSeed = (value) => {
  if (typeof value !== "string" || !/^-?\d{1,40}$/.test(value)) throw new TypeError("Invalid generated sub-seed");
  return String(BigInt(value));
};
function date(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? (/* @__PURE__ */ new Date(value + "T00:00:00.000Z")).toISOString().slice(0, 10) === value : new Date(value).toISOString() === value;
}
function moves(value) {
  return Array.isArray(value) && value.length <= 256 && value.every((move) => validRunMove(move));
}
function runLevelSeed(rootSeed, level, version = RUN_VERSION) {
  const root2 = seed(rootSeed);
  levelConfig(level, version);
  if (level === 1) return BigInt(root2);
  let hash = 14695981039346656037n;
  for (const char of `weft-run:${version}:${root2}:${level}`)
    hash = BigInt.asUintN(64, (hash ^ BigInt(char.charCodeAt(0))) * 1099511628211n);
  return hash;
}
function rulesForLevel(level, version = RUN_VERSION) {
  return resolveRules({ ...getConfig("chainBest"), spool: levelConfig(level, version).spool });
}
function board(rootSeed, level, version = RUN_VERSION, presentationWorld, feature = {}) {
  const config = { ...levelConfig(level, version), ...presentationWorld === void 0 ? {} : { world: presentationWorld } };
  return { ...config, ...version === ENDLESS_RULES_VERSION ? { generation: "endless-1" } : {}, seed: String(runLevelSeed(rootSeed, level, version)), ...hasGroveHugoFeature(feature) && config.world === 3 && (version !== ENDLESS_RULES_VERSION || config.spool > 1) ? { admission: GROVE_ADMISSION } : config.world === 4 && hasFixedWindowAce(feature) ? { admission: NEON_WINDOW_ADMISSION } : config.world === 4 && windowVersionOf(feature) === BOARD_WINDOW_VERSION ? { admission: LEGACY_NEON_WINDOW_ADMISSION } : {} };
}
function runPlan(run) {
  if (run.rulesVersion !== CLASSIC_RULES_VERSION && run.rulesVersion !== ENDLESS_RULES_VERSION) {
    if (hasClassicRoute(run)) throw new TypeError("Historical runs cannot carry world routes");
    return null;
  }
  return resolveClassicRoute(run.rootSeed, run);
}
function worldForRunLevel(run, level) {
  const order = runPlan(run);
  return order?.[isEndlessRun(run) ? (level - 1) % order.length : level - 1] ?? levelConfig(level, run.rulesVersion).world;
}
function routeMetadata(value) {
  return hasClassicRoute(value) ? { worldRoute: value.worldRoute, startWorld: value.startWorld, worldOrder: [...value.worldOrder] } : {};
}
function generateRunBoard(rules, descriptor) {
  return descriptor.generation === "endless-1" ? generateEndlessDeal(rules, BigInt(descriptor.seed), { grove: descriptor.admission === GROVE_ADMISSION, neon: descriptor.admission === NEON_WINDOW_ADMISSION }) : descriptor.admission === GROVE_ADMISSION ? generateGroveOpportunity(rules, BigInt(descriptor.seed)) : descriptor.admission === NEON_WINDOW_ADMISSION || descriptor.admission === LEGACY_NEON_WINDOW_ADMISSION ? generateNeonOpportunity(rules, BigInt(descriptor.seed), {}, descriptor.admission) : generateDeal(rules, BigInt(descriptor.seed));
}
function featureMetadata(value) {
  const version = hugoVersionOf(value);
  return version ? { hugoVersion: version, ...value.hugoDisabled ? { hugoDisabled: true } : {} } : {};
}
function replayBoard(input, level, version = RUN_VERSION, presentationWorld, scoring = {}, secret = false, afterLevel = level, jokerStart = 0) {
  if (!input || !moves(input.moves) || !count2(input.score)) throw new TypeError("Invalid run board result");
  jokerMetadata(scoring);
  if (hasEarnedJokers(scoring) && (version !== ENDLESS_RULES_VERSION || scoringVersionOf(scoring) !== ENDLESS_SCORING_VERSION)) throw new TypeError("Earned jokers require the versioned endless Classic rules");
  const ordinary = board(input.seed, level, version, presentationWorld, scoring), { admission: _admission, ...plain } = ordinary, config = secret ? { ...plain, spool: secret === "hugo" ? hugoSpoolForLevel(scoring, afterLevel, version) : levelConfig(level, version).spool, secret } : ordinary, original = seed(input.seed);
  if (input.generation !== config.generation) throw new Error("Run generation version disagrees with replay");
  if (input.admission !== config.admission) throw new Error("Grove admission context disagrees with replay");
  if (input.secret !== (secret || void 0)) throw new Error("Secret board context disagrees with replay");
  for (const field of ["level", "world", "spool"])
    if (input[field] !== void 0 && input[field] !== config[field]) throw new Error(`Run board ${field} disagrees with its level`);
  if (input.cleared !== void 0 && typeof input.cleared !== "boolean") throw new TypeError("Invalid Clear marker");
  const rules = { ...rulesForLevel(level, version), spool: config.spool }, generated = generateRunBoard(rules, { ...config, seed: original });
  if (input.subSeed !== void 0 && proofSeed(input.subSeed) !== String(generated.subSeed)) throw new Error("Run board sub-seed disagrees with exact generation");
  let chainCoins = 0, unmultipliedChainCoins = 0, pendingWindowAutoBank = false;
  let state = createRunState(rules, generated.deal, { ...jokerMetadata(scoring), jokers: jokerStart }), bestHand = 0, trigger, windowTrigger;
  const violin = !secret && windowTriggerEligible(scoring, config.world) ? chosenWindowAce(generated.deal, windowVersionOf(scoring)) : void 0;
  input.moves.forEach((move, moveIndex) => {
    const eligible = isHugoSacrifice(state, ordinaryRunMove(move)), windowEligible = violin !== void 0 && isWindowSacrifice(state, ordinaryRunMove(move), violin, windowVersionOf(scoring), pendingWindowAutoBank);
    const transition = applyRunMove(state, move);
    pendingWindowAutoBank = violin !== void 0 && windowAutoBankedAce(transition, ordinaryRunMove(move), violin, windowVersionOf(scoring));
    chainCoins += transition.events.reduce((sum, event) => sum + levelChainCoins(event, level, scoringVersionOf(scoring)), 0);
    unmultipliedChainCoins += transition.events.reduce((sum, event) => sum + levelChainCoins(event, 1, scoringVersionOf(scoring)), 0);
    bestHand = Math.max(bestHand, snapshot(state).handType, snapshot(transition.state).handType, ...transition.events.map((event) => NAMES.indexOf(event.handName)));
    state = transition.state;
    if (eligible && !trigger) trigger = { seed: original, moveIndex };
    if (windowEligible && !windowTrigger) windowTrigger = { seed: original, moveIndex, ace: violin };
  });
  if (state.terminal === "active") throw new Error("Run board is not finished");
  const cleared = state.terminal === "cleared", facts = boardScoreDetails(cleared, state.spool.length - state.spoolIndex, state.score, rules.spool, { ...featureMetadata(scoring), ...windowMetadata(scoring), version: scoringVersionOf(scoring), level, ...secret ? { secret } : {}, chainCoins, unmultipliedChainCoins }), bonus = facts.clearBonus;
  if (input.clearBonusDetails !== void 0 && JSON.stringify(Object.entries(input.clearBonusDetails).sort()) !== JSON.stringify(Object.entries(facts).sort())) throw new Error("Clear-bonus details disagree with replay");
  if (hasEarnedJokers(scoring) && input.longestChain !== void 0 && input.longestChain !== state.longestChain) throw new Error("Run longest chain disagrees with exact replay");
  if (input.cleared !== void 0 && input.cleared !== cleared) throw new Error("Run board Clear marker disagrees with replay");
  if (input.score !== facts.score) throw new Error("Run board score disagrees with replay");
  return {
    ...config,
    seed: original,
    moves: copy(input.moves),
    score: input.score,
    cleared,
    subSeed: String(generated.subSeed),
    ...hasEarnedJokers(scoring) ? { _jokers: jokerCount(state), _longestChain: state.longestChain, _bestHand: bestHand, longestChain: state.longestChain } : {},
    chainScore: facts.chainCoins,
    clearBonus: bonus,
    ...scoringVersionOf(scoring) === "legacy" ? {} : { clearBonusDetails: facts },
    ...trigger && !secret && hugoTriggerEligible(scoring, config.world) ? { _hugoTrigger: trigger } : {},
    ...windowTrigger && !secret && windowTriggerEligible(scoring, config.world) ? { _windowTrigger: windowTrigger } : {}
  };
}
var completion = ({ chainScore: _chain, clearBonus: _bonus, _hugoTrigger: _trigger, _windowTrigger: _window, _jokers, _longestChain, _bestHand, ...result }) => result;
function hugoSpoolForLevel(feature, afterLevel, version = RUN_VERSION) {
  if (!Number.isSafeInteger(afterLevel) || afterLevel < 1 || version !== ENDLESS_RULES_VERSION && afterLevel > 10) throw new RangeError("Invalid Hugo insertion position");
  return [ENDLESS_HUGO_VERSION, HUGO_VERSION, REWARD_HUGO_VERSION, NEXT_SPOOL_HUGO_VERSION].includes(hugoVersionOf(feature)) ? levelConfig(version === ENDLESS_RULES_VERSION ? afterLevel + 1 : Math.min(afterLevel + 1, 10), version).spool : HUGO_SPOOL;
}
function secretRunBoard(run, afterLevel) {
  const normal = board(run.rootSeed, afterLevel, run.rulesVersion, worldForRunLevel(run, afterLevel));
  return { ...normal, ...[ENDLESS_HUGO_VERSION, HUGO_VERSION, REWARD_HUGO_VERSION].includes(hugoVersionOf(run)) ? { level: run.rulesVersion === ENDLESS_RULES_VERSION ? afterLevel + 1 : Math.min(afterLevel + 1, 10) } : {}, spool: hugoSpoolForLevel(run, afterLevel, run.rulesVersion), seed: String(hugoSeed(run.rootSeed, afterLevel, hugoVersionOf(run) ?? LEGACY_HUGO_VERSION)), secret: "hugo" };
}
function checkedHugo(value, feature, root2, order, rules = CLASSIC_RULES_VERSION) {
  if (value === void 0) return;
  if (!hasHugoFeature(feature) || Object.keys(value).some((key) => !["version", "afterLevel", "trigger", "result"].includes(key)) || value.version !== hugoVersionOf(feature) || !Number.isSafeInteger(value.afterLevel) || value.afterLevel < 1 || rules !== ENDLESS_RULES_VERSION && value.afterLevel > 10 || !value.trigger || Object.keys(value.trigger).some((key) => !["seed", "moveIndex"].includes(key)) || value.trigger.seed !== String(runLevelSeed(root2, value.afterLevel, rules)) || !count2(value.trigger.moveIndex) || value.trigger.moveIndex >= 256) throw new Error("Invalid Hugo trigger context");
  if (hasGroveHugoFeature(feature) && (order?.[rules === ENDLESS_RULES_VERSION ? (value.afterLevel - 1) % order.length : value.afterLevel - 1] !== 3 || feature.hugoDisabled)) throw new Error("Grove Hugo requires an enabled Grove opportunity");
  return copy(value);
}
function expectedHugo(replayed) {
  const index = replayed.findIndex((result) => result._hugoTrigger !== void 0);
  return index < 0 ? void 0 : { afterLevel: replayed[index].level, trigger: replayed[index]._hugoTrigger };
}
function verifyHugoWitness(expected, hugo, allowPendingLevel) {
  if (expected) {
    if (!hugo || hugo.afterLevel !== expected.afterLevel || !sameHugoWitness(hugo.trigger, expected.trigger)) throw new Error("Hugo trigger disagrees with canonical history");
  } else if (hugo && hugo.afterLevel !== allowPendingLevel) throw new Error("Hugo trigger has no canonical witness");
}
function windowMetadata(value) {
  const version = windowVersionOf(value);
  return version ? { windowVersion: version, ...value.windowDisabled ? { windowDisabled: true } : {} } : {};
}
function windowRunBoard(run, afterLevel) {
  if (!Number.isSafeInteger(afterLevel) || afterLevel < 1 || run.rulesVersion !== ENDLESS_RULES_VERSION && afterLevel > 10 || run.rulesVersion !== CLASSIC_RULES_VERSION && run.rulesVersion !== ENDLESS_RULES_VERSION) throw new Error("Invalid Window insertion position");
  const config = levelConfig(run.rulesVersion === ENDLESS_RULES_VERSION ? afterLevel + 1 : Math.min(afterLevel + 1, 10), run.rulesVersion);
  return { ...config, ...isEndlessRun(run) ? { generation: "endless-1" } : {}, world: 4, seed: String(windowSeed(run.rootSeed, afterLevel, windowVersionOf(run) ?? LEGACY_WINDOW_VERSION)), secret: "window" };
}
function checkedWindow(value, feature, root2, order, rules = CLASSIC_RULES_VERSION) {
  if (value === void 0) return;
  if (!windowTriggerEligible(feature, 4) || Object.keys(value).some((k) => !["version", "afterLevel", "trigger", "result"].includes(k)) || value.version !== windowVersionOf(feature) || !count2(value.afterLevel) || value.afterLevel < 1 || rules !== ENDLESS_RULES_VERSION && value.afterLevel > 10 || order?.[rules === ENDLESS_RULES_VERSION ? (value.afterLevel - 1) % order.length : value.afterLevel - 1] !== 4 || !value.trigger || Object.keys(value.trigger).some((k) => !["seed", "moveIndex", "ace"].includes(k)) || value.trigger.seed !== String(runLevelSeed(root2, value.afterLevel, rules)) || !count2(value.trigger.moveIndex) || value.trigger.moveIndex >= 256 || !count2(value.trigger.ace) || value.trigger.ace >= 52 || value.trigger.ace % 13 !== 0 || hasFixedWindowAce(feature) && value.trigger.ace !== WINDOW_VIOLIN_ACE) throw new Error("Invalid Window trigger context");
  return copy(value);
}
function expectedWindow(replayed) {
  const index = replayed.findIndex((result) => result._windowTrigger !== void 0);
  return index < 0 ? void 0 : { afterLevel: replayed[index].level, trigger: replayed[index]._windowTrigger };
}
function verifyWindowWitness(expected, window2, allowPendingLevel) {
  if (expected) {
    if (!window2 || window2.afterLevel !== expected.afterLevel || !sameWindowWitness(window2.trigger, expected.trigger)) throw new Error("Window trigger disagrees with canonical history");
  } else if (window2 && window2.afterLevel !== allowPendingLevel) throw new Error("Window trigger has no canonical witness");
}
var runUsesReplacementSecrets = (value) => isEndlessRun(value) || hugoVersionOf(value) === ENDLESS_HUGO_VERSION || windowVersionOf(value) === ENDLESS_WINDOW_VERSION || hugoVersionOf(value) === HUGO_VERSION || windowVersionOf(value) === WINDOW_VERSION;
function replacementHistory(input, checkpoint) {
  const rules = "rulesVersion" in input ? input.rulesVersion : input.version;
  jokerMetadata(input);
  if (hasEarnedJokers(input) && rules !== ENDLESS_RULES_VERSION) throw new Error("Earned jokers require endless Classic");
  const endless = rules === ENDLESS_RULES_VERSION;
  if (endless ? scoringVersionOf(input) !== ENDLESS_SCORING_VERSION : rules !== CLASSIC_RULES_VERSION || scoringVersionOf(input) !== CLASSIC_SCORING_VERSION) throw new Error("Replacement secrets require their versioned Classic scoring");
  if (hugoVersionOf(input) !== void 0 && hugoVersionOf(input) !== (endless ? ENDLESS_HUGO_VERSION : HUGO_VERSION) || windowVersionOf(input) !== void 0 && windowVersionOf(input) !== (endless ? ENDLESS_WINDOW_VERSION : WINDOW_VERSION)) throw new Error("Replacement feature versions cannot mix with historical interludes");
  if (!Array.isArray(input.perLevel) || !endless && input.perLevel.length > 10 || !count2(input.runScore) || input.rootSeed === void 0) throw new Error("Invalid replacement history");
  const root2 = seed(input.rootSeed), route = routeMetadata(input), feature = { ...featureMetadata(input), ...windowMetadata(input), ...jokerMetadata(input) }, routeInput = { rootSeed: root2, rulesVersion: rules, ...route, ...feature }, order = runPlan(routeInput), hugo = checkedHugo(input.hugo, input, root2, order, rules), window2 = checkedWindow(input.window, input, root2, order, rules), normal = [], ordered = [];
  let index = 0, jokers = 0;
  for (let level = 1, limit2 = endless ? input.perLevel.length + Number(!!hugo?.result) + Number(!!window2?.result) : 10; level <= limit2; level++) {
    const key = hugo?.afterLevel === level - 1 ? "hugo" : window2?.afterLevel === level - 1 ? "window" : void 0, progress = key === "hugo" ? hugo : key === "window" ? window2 : void 0;
    if (key && progress) {
      if (!ordered.at(-1)?.cleared) throw new Error("Secret replacement has no preceding Clear");
      if (!progress.result) break;
      const descriptor = key === "hugo" ? secretRunBoard(routeInput, progress.afterLevel) : windowRunBoard(routeInput, progress.afterLevel), result = normalizeSecretResult(progress.result, descriptor), replayed = replayBoard(result, level, rules, descriptor.world, input, key, progress.afterLevel, jokers);
      ordered.push(replayed);
      jokers = replayed._jokers ?? 0;
    } else {
      const result = input.perLevel[index];
      if (!result) break;
      const descriptor = board(root2, level, rules, worldForRunLevel(routeInput, level), input);
      if (result.secret !== void 0 || result.level !== void 0 && result.level !== level || result.world !== void 0 && result.world !== descriptor.world || result.spool !== void 0 && result.spool !== descriptor.spool || result.admission !== descriptor.admission || seed(result.seed) !== descriptor.seed) throw new Error("Ordinary board does not occupy its canonical replacement position");
      const replayed = replayBoard(result, level, rules, descriptor.world, input, false, level, jokers);
      normal.push(replayed);
      ordered.push(replayed);
      jokers = replayed._jokers ?? 0;
      index++;
    }
    if (!ordered.at(-1).cleared) break;
  }
  if (index !== input.perLevel.length) throw new Error("Extra ordinary board after a replacement or lost board");
  for (const [key, progress] of [["hugo", hugo], ["window", window2]]) if (progress?.result && !ordered.some((result) => result.secret === key)) throw new Error("Secret result is outside the ten-board run");
  if (ordered.reduce((sum, result) => sum + result.score, 0) !== input.runScore) throw new Error("Run total does not equal all canonical boards exactly once");
  const pending = checkpoint && input.current.secret === void 0 ? input.current.level : void 0;
  if (hasHugoFeature(input)) verifyHugoWitness(expectedHugo(normal), hugo, pending);
  if (hasWindowFeature(input)) verifyWindowWitness(expectedWindow(normal), window2, pending);
  const normalize = (progress, key) => progress ? { ...progress, ...progress.result ? { result: completion(ordered.find((result) => result.secret === key)) } : {} } : void 0;
  return { normal, ordered, hugo: normalize(hugo, "hugo"), window: normalize(window2, "window"), root: root2, route, feature, rules, order, jokers };
}
function normalizeReplacementRecord(input) {
  if (!date(input.date) || !count2(input.levelsCleared) || !input.perLevel.length) throw new Error("Invalid replacement run record");
  const h = replacementHistory(input, false), cleared = h.ordered.filter((result) => result.cleared).length, last = h.ordered.at(-1), complete = h.rules === CLASSIC_RULES_VERSION && h.ordered.length === 10 && cleared === 10;
  if (!last || last.cleared && !complete || input.levelsCleared !== cleared || input.totalLevels !== void 0 && input.totalLevels !== runLevelCount(h.rules) || input.classicComplete !== void 0 && input.classicComplete !== complete) throw new Error("Invalid replacement completion progression");
  const metadata = { ...jokerMetadata(input), ...h.route, ...scoringMetadata(scoringVersionOf(input)), ...h.feature, ...h.hugo ? { hugo: h.hugo } : {}, ...h.window ? { window: h.window } : {} }, perLevel = h.normal.map(completion), id = runRecordId({ version: h.rules, perLevel, ...metadata });
  if (input.id !== void 0 && input.id !== id) throw new Error("Run completion id disagrees with its proof");
  return { id, date: input.date, version: h.rules, rootSeed: h.root, levelsCleared: cleared, runScore: input.runScore, perLevel, ...runLevelCount(h.rules) === null ? {} : { totalLevels: 10 }, ...complete ? { classicComplete: true } : {}, ...metadata };
}
function validateReplacementRecord(record) {
  const h = replacementHistory(record, false), secret = h.ordered.find((result) => result.secret === "hugo"), windowSecret = h.ordered.find((result) => result.secret === "window");
  return { valid: true, record, boards: h.normal, ...secret ? { secret } : {}, ...windowSecret ? { windowSecret } : {} };
}
function runRecordId(record) {
  if (!record.perLevel.every((result) => moves(result.moves))) throw new TypeError("Invalid run moves");
  const text = JSON.stringify([record.version, ...hasEarnedJokers(record) ? ["joker", record.jokerVersion] : [], record.perLevel.map((result) => [seed(result.seed), result.moves.map((move) => move.type === "play" || move.type === "joker" ? [move.type, move.position] : ["draw"])]), ...hasClassicRoute(record) ? ["classic-world-route-v1", record.worldRoute, record.startWorld, record.worldOrder] : [], ...scoringVersionOf(record) === "legacy" ? [] : ["scoring", scoringVersionOf(record)], ...hasHugoFeature(record) ? ["hugo", hugoVersionOf(record), record.hugo ? [record.hugo.afterLevel, record.hugo.trigger, record.hugo.result ? [record.hugo.result.seed, record.hugo.result.moves.map((move) => move.type === "play" || move.type === "joker" ? [move.type, move.position] : ["draw"])] : null] : null, ...record.hugoDisabled ? ["disabled"] : []] : [], ...hasWindowFeature(record) ? ["window", windowVersionOf(record), record.window ? [record.window.afterLevel, [record.window.trigger.seed, record.window.trigger.moveIndex, record.window.trigger.ace], record.window.result ? [record.window.result.seed, record.window.result.moves.map((move) => move.type === "play" || move.type === "joker" ? [move.type, move.position] : ["draw"])] : null] : null, ...record.windowDisabled ? ["disabled"] : []] : []]);
  let hash = 14695981039346656037n;
  for (const char of text) hash = BigInt.asUintN(64, (hash ^ BigInt(char.charCodeAt(0))) * 1099511628211n);
  return "weft-run-" + hash.toString(16).padStart(16, "0");
}
function normalizeSecretResult(input, descriptor) {
  if (!input || !moves(input.moves) || !count2(input.score) || typeof input.cleared !== "boolean" || input.secret !== descriptor.secret || input.seed !== descriptor.seed || typeof input.subSeed !== "string") throw new Error("Invalid secret board result");
  for (const field of ["level", "world", "spool", "generation"]) if (input[field] !== descriptor[field]) throw new Error("Secret board descriptor disagrees");
  return { ...descriptor, level: descriptor.level, world: descriptor.world, spool: descriptor.spool, seed: descriptor.seed, moves: copy(input.moves), score: input.score, cleared: input.cleared, ...input.longestChain === void 0 ? {} : { longestChain: input.longestChain }, subSeed: proofSeed(input.subSeed), ...input.clearBonusDetails === void 0 ? {} : { clearBonusDetails: copy(input.clearBonusDetails) } };
}
function normalizeRunRecord(value) {
  if (!value || typeof value !== "object") throw new TypeError("Invalid run record");
  const input = value;
  if (runUsesReplacementSecrets(input)) return normalizeReplacementRecord(input);
  if (!date(input.date) || !isRunVersion(input.version) || !count2(input.levelsCleared) || !count2(input.runScore) || !Array.isArray(input.perLevel) || !input.perLevel.length || input.perLevel.length > 1e4) throw new TypeError("Invalid completed run record");
  if (scoringVersionOf(input) === CLASSIC_SCORING_VERSION && input.version !== CLASSIC_RULES_VERSION) throw new Error("Level scoring requires finite ten-board Classic mechanics");
  const rootSeed = input.rootSeed === void 0 ? void 0 : seed(input.rootSeed), root2 = rootSeed ?? seed(input.perLevel[0].seed), feature = hasHugoFeature(input), windowFeature = hasWindowFeature(input), scoring = scoringMetadata(scoringVersionOf(input));
  if ((hasClassicRoute(input) || feature || windowFeature) && rootSeed === void 0) throw new TypeError("Current feature metadata requires its root seed");
  if (feature && (input.version !== CLASSIC_RULES_VERSION || scoringVersionOf(input) === "legacy")) throw new Error("Hugo requires current finite Classic scoring");
  if (windowFeature && (input.version !== CLASSIC_RULES_VERSION || scoringVersionOf(input) !== CLASSIC_SCORING_VERSION)) throw new Error("Window requires level-v3 Classic scoring");
  const route = routeMetadata(input), routeInput = { rootSeed: root2, rulesVersion: input.version, ...route, ...featureMetadata(input), ...windowMetadata(input) }, order = runPlan(routeInput), limit2 = runLevelCount(input.version), hugo = checkedHugo(input.hugo, input, root2, order, input.version), window2 = checkedWindow(input.window, input, root2, order, input.version);
  const secret = hugo?.result ? normalizeSecretResult(hugo.result, secretRunBoard(routeInput, hugo.afterLevel)) : void 0, windowResult = window2?.result ? normalizeSecretResult(window2.result, windowRunBoard(routeInput, window2.afterLevel)) : void 0;
  const complete = limit2 !== null && input.levelsCleared === limit2 && input.perLevel.length === limit2, secretLoss = !!secret && !secret.cleared && hugo.afterLevel === input.perLevel.length && input.levelsCleared === input.perLevel.length || !!windowResult && !windowResult.cleared && window2.afterLevel === input.perLevel.length && input.levelsCleared === input.perLevel.length;
  if (input.levelsCleared !== input.perLevel.length - 1 && !complete && !secretLoss || limit2 !== null && input.perLevel.length > limit2) throw new TypeError("Invalid completed run progression");
  if (input.classicComplete !== void 0 && input.classicComplete !== complete || input.totalLevels !== void 0 && input.totalLevels !== limit2) throw new TypeError("Invalid Classic completion marker");
  const perLevel = input.perLevel.map((result, index) => {
    if (!result || !moves(result.moves) || !count2(result.score) || result.secret !== void 0) throw new TypeError("Invalid run board record");
    const config = board(root2, index + 1, input.version, order?.[index], input);
    if (result.admission !== config.admission) throw new Error("Run record admission metadata is inconsistent");
    for (const field of ["level", "world", "spool", "generation"]) if (result[field] !== void 0 && result[field] !== config[field]) throw new Error("Run record level metadata is inconsistent");
    const cleared = index < input.levelsCleared;
    if (result.cleared !== void 0 && result.cleared !== cleared) throw new Error("A lost board must end the run");
    return { ...config, seed: seed(result.seed), moves: copy(result.moves), score: result.score, cleared, ...result.subSeed === void 0 ? {} : { subSeed: proofSeed(result.subSeed) }, ...result.clearBonusDetails === void 0 ? {} : { clearBonusDetails: copy(result.clearBonusDetails) } };
  });
  for (const [progress, result] of [[hugo, secret], [window2, windowResult]]) if (progress && (progress.afterLevel > perLevel.length || result && progress.afterLevel > input.levelsCleared || !result && progress.afterLevel <= input.levelsCleared || result?.cleared && perLevel.length === progress.afterLevel && !complete && !secretLoss)) throw new Error("Secret result disagrees with run progression");
  const featureMeta = { ...featureMetadata(input), ...windowMetadata(input), ...hugo ? { hugo: { ...hugo, ...secret ? { result: secret } : {} } } : {}, ...window2 ? { window: { ...window2, ...windowResult ? { result: windowResult } : {} } } : {} };
  if (perLevel.reduce((sum, result) => sum + result.score, 0) + (secret?.score ?? 0) + (windowResult?.score ?? 0) !== input.runScore) throw new Error("Run total does not equal its board scores");
  const id = runRecordId({ version: input.version, perLevel, ...route, ...scoring, ...featureMeta });
  if (input.id !== void 0 && input.id !== id) throw new Error("Run completion id disagrees with its proof");
  if (rootSeed !== void 0 && perLevel.some((result, index) => result.seed !== String(runLevelSeed(rootSeed, index + 1, input.version)))) throw new Error("Run record seed sequence disagrees with root");
  return { id, date: input.date, version: input.version, levelsCleared: input.levelsCleared, runScore: input.runScore, perLevel, ...rootSeed === void 0 ? {} : { rootSeed }, ...limit2 === null ? {} : { totalLevels: limit2 }, ...complete ? { classicComplete: true } : {}, ...route, ...scoring, ...featureMeta };
}
function validateRunRecord(value) {
  try {
    const record = normalizeRunRecord(value);
    if (runUsesReplacementSecrets(record)) return validateReplacementRecord(record);
    const routeInput = { rootSeed: record.rootSeed ?? record.perLevel[0].seed, rulesVersion: record.version, ...routeMetadata(record), ...featureMetadata(record), ...windowMetadata(record) }, order = runPlan(routeInput), boards = record.perLevel.map((result, index) => replayBoard(result, index + 1, record.version, order?.[index], record));
    if (boards.some((result, index) => result.cleared !== index < record.levelsCleared)) throw new Error("Run terminal sequence disagrees with replay");
    if (hasHugoFeature(record)) verifyHugoWitness(expectedHugo(boards), record.hugo);
    if (hasWindowFeature(record)) verifyWindowWitness(expectedWindow(boards), record.window);
    const secret = record.hugo?.result ? replayBoard(record.hugo.result, secretRunBoard(routeInput, record.hugo.afterLevel).level, record.version, secretRunBoard(routeInput, record.hugo.afterLevel).world, record, "hugo", record.hugo.afterLevel) : void 0, windowBoard = record.window ? windowRunBoard(routeInput, record.window.afterLevel) : void 0, windowSecret = record.window?.result ? replayBoard(record.window.result, windowBoard.level, record.version, windowBoard.world, record, "window") : void 0;
    const hugo = record.hugo ? { ...record.hugo, ...secret ? { result: completion(secret) } : {} } : void 0, window2 = record.window ? { ...record.window, ...windowSecret ? { result: completion(windowSecret) } : {} } : void 0;
    return { valid: true, record: { ...record, perLevel: boards.map(completion), ...hugo ? { hugo } : {}, ...window2 ? { window: window2 } : {} }, boards, ...secret ? { secret } : {}, ...windowSecret ? { windowSecret } : {} };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ChatGPT/B-055/v6.24.16/src/leaderboard-validation.ts
var clone = (value) => JSON.parse(JSON.stringify(value));
var handNames = NAMES;
var day = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && (/* @__PURE__ */ new Date(value + "T00:00:00.000Z")).toISOString().slice(0, 10) === value;
function checkDate(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || !(day(value) || new Date(value).toISOString() === value)) throw new TypeError("Invalid completion date");
}
function createLeaderboardVerifier(options = {}) {
  const ruleResolver = options.rulesForBoard ?? ((version, level) => {
    if (!isRunVersion(version)) throw new TypeError("Unsupported run version");
    return rulesForLevel(level, version);
  });
  function verifyBoard(input) {
    const record = input?.record;
    if (!canSubmitOnlineScore(record)) throw new TypeError("Relaxed scores stay on this device");
    if (!record || !["6.6", "6.7", "6.9", "6.14", "6.24.14"].includes(record.version)) throw new TypeError("Unsupported board version");
    if (hasEarnedJokers(record) || record.secret !== void 0 || record.admission !== void 0) throw new TypeError("Secret/admitted boards require a complete run proof");
    checkDate(record.date);
    if (typeof record.seed !== "string" || !/^-?\d{1,30}$/.test(record.seed)) throw new TypeError("Invalid board seed");
    const moves2 = decompressMoves(compressMoves(record.moves)), level = input.level ?? 1;
    if (moves2.some((move) => move.type === "bank")) throw new TypeError("Manual Bank is not legal in these score versions");
    if (!Number.isSafeInteger(level) || level < 1) throw new TypeError("Invalid board level");
    const rules = input.level !== void 0 ? ruleResolver(input.runVersion ?? record.version, level) : getConfig("chainBest");
    if (!rules) throw new TypeError("No canonical rules for this run version");
    if (isLevelScoring(scoringVersionOf(record)) && (record.dailyDate !== void 0 || input.level === void 0 || input.runVersion !== (scoringVersionOf(record) === ENDLESS_SCORING_VERSION ? "6.24.14" : "6.14"))) throw new TypeError("Level scoring requires a finite Classic level context");
    if (record.dailyDate !== void 0) {
      if (!day(record.dailyDate) || BigInt(record.seed) !== BigInt(record.dailyDate.replace(/-/g, "")) || rules.spool !== 22) throw new TypeError("Daily date and seed disagree");
    }
    const generated = input.runVersion === "6.24.14" ? generateRunBoard(rules, { level, world: 1, spool: rules.spool, seed: record.seed, generation: "endless-1" }) : generateDeal(rules, BigInt(record.seed));
    let chainCoins = 0, unmultipliedChainCoins = 0;
    let state = createRunState(rules, generated.deal), bestHand = 0;
    for (const move of moves2) {
      bestHand = Math.max(bestHand, runSnapshot(state).handType);
      const result = applyRunMove(state, move);
      chainCoins += result.events.reduce((sum, event) => sum + levelChainCoins(event, level, scoringVersionOf(record)), 0);
      unmultipliedChainCoins += result.events.reduce((sum, event) => sum + levelChainCoins(event, 1, scoringVersionOf(record)), 0);
      state = result.state;
      bestHand = Math.max(bestHand, runSnapshot(state).handType, ...result.events.map((event) => handNames.indexOf(event.handName)));
    }
    if (state.terminal === "active") throw new TypeError("Board is unfinished");
    const version = scoringVersionOf(record), cleared = state.terminal === "cleared", facts = boardScoreDetails(cleared, state.spool.length - state.spoolIndex, state.score, rules.spool, { version, level, chainCoins, unmultipliedChainCoins }), score = facts.score, stars = starCount(starCoinScore(facts), version);
    if (record.clearBonusDetails !== void 0 && JSON.stringify(Object.entries(record.clearBonusDetails).sort()) !== JSON.stringify(Object.entries(facts).sort())) throw new TypeError("Clear-bonus details disagree with canonical replay");
    if (record.score !== score || record.longestChain !== state.longestChain || record.cleared !== cleared || record.stars !== stars || record.bestHand !== bestHand) throw new TypeError("Board result disagrees with canonical replay");
    const normalized = { ...clone(record), seed: String(BigInt(record.seed)), moves: moves2, ...isLevelScoring(version) ? { clearBonusDetails: facts } : {} };
    const sourceId = recordId(normalized);
    return { record: normalized, level, spool: rules.spool, sourceId };
  }
  function verifyRun(value) {
    if (!canSubmitOnlineScore(value)) throw new TypeError("Relaxed scores stay on this device");
    const validated = (options.validateRun ?? validateRunRecord)(value);
    if (!validated.valid) throw new TypeError(validated.error);
    const record = validated.record;
    if (!isRunVersion(record.version)) throw new TypeError("Unsupported run version");
    const root2 = record.rootSeed ?? record.perLevel[0].seed;
    if (record.perLevel.some((board2, index) => BigInt(board2.seed) !== runLevelSeed(root2, runUsesReplacementSecrets(record) ? board2.level : index + 1, record.version))) throw new TypeError("Run boards do not follow one root seed");
    const boards = validated.boards.map((board2, index) => {
      const level = runUsesReplacementSecrets(record) ? board2.level : index + 1, rules = ruleResolver(record.version, level);
      if (!rules) throw new TypeError("No canonical rules for this run version");
      const generated = generateRunBoard(rules, board2);
      let state = createRunState(rules, generated.deal), bestHand = 0;
      if (board2.moves.some((move) => move.type === "bank")) throw new TypeError("Manual Bank is not legal in these run versions");
      if (!hasEarnedJokers(record)) for (const move of board2.moves) {
        bestHand = Math.max(bestHand, runSnapshot(state).handType);
        const result2 = applyRunMove(state, move);
        state = result2.state;
        bestHand = Math.max(bestHand, runSnapshot(state).handType, ...result2.events.map((event) => handNames.indexOf(event.handName)));
      }
      const result = { id: record.id + ":" + (index + 1), date: record.date, seed: board2.seed, version: record.version, ...board2.admission ? { admission: board2.admission } : {}, moves: clone([...board2.moves]), score: board2.score, ...scoringMetadata(scoringVersionOf(record)), ...board2.clearBonusDetails ? { clearBonusDetails: board2.clearBonusDetails } : {}, stars: starCount(starCoinScore(board2.clearBonusDetails ?? { score: board2.score }), scoringVersionOf(record)), cleared: board2.cleared, longestChain: hasEarnedJokers(record) ? board2._longestChain : state.longestChain, bestHand: hasEarnedJokers(record) ? board2._bestHand : bestHand, ...jokerMetadata(record) };
      return { record: result, level, spool: rules.spool, sourceId: recordId(result) };
    });
    if (validated.secret) {
      const board2 = validated.secret, rules = { ...getConfig("chainBest"), spool: board2.spool }, generated = generateRunBoard(rules, board2);
      let state = createRunState(rules, generated.deal), bestHand = 0;
      if (!hasEarnedJokers(record)) for (const move of board2.moves) {
        bestHand = Math.max(bestHand, runSnapshot(state).handType);
        const result2 = applyRunMove(state, move);
        state = result2.state;
        bestHand = Math.max(bestHand, runSnapshot(state).handType, ...result2.events.map((event) => handNames.indexOf(event.handName)));
      }
      const result = { id: record.id + ":hugo", date: record.date, seed: board2.seed, version: record.version, secret: "hugo", moves: clone([...board2.moves]), score: board2.score, ...scoringMetadata(scoringVersionOf(record)), ...board2.clearBonusDetails ? { clearBonusDetails: board2.clearBonusDetails } : {}, stars: starCount(starCoinScore(board2.clearBonusDetails ?? { score: board2.score }), scoringVersionOf(record)), cleared: board2.cleared, longestChain: hasEarnedJokers(record) ? board2._longestChain : state.longestChain, bestHand: hasEarnedJokers(record) ? board2._bestHand : bestHand, ...jokerMetadata(record) };
      const predecessor = boards.findIndex((item) => item.record.secret === void 0 && item.level === record.hugo.afterLevel);
      if (predecessor < 0) throw new TypeError("Hugo has no preceding normal board");
      boards.splice(predecessor + 1, 0, { record: result, level: board2.level, spool: rules.spool, sourceId: recordId(result) });
    }
    if (validated.windowSecret) {
      const board2 = validated.windowSecret, rules = { ...getConfig("chainBest"), spool: board2.spool }, generated = generateRunBoard(rules, board2);
      let state = createRunState(rules, generated.deal), bestHand = 0;
      if (!hasEarnedJokers(record)) for (const move of board2.moves) {
        bestHand = Math.max(bestHand, runSnapshot(state).handType);
        const result2 = applyRunMove(state, move);
        state = result2.state;
        bestHand = Math.max(bestHand, runSnapshot(state).handType, ...result2.events.map((event) => handNames.indexOf(event.handName)));
      }
      const result = { id: record.id + ":window", date: record.date, seed: board2.seed, version: record.version, secret: "window", moves: clone([...board2.moves]), score: board2.score, ...scoringMetadata(scoringVersionOf(record)), ...board2.clearBonusDetails ? { clearBonusDetails: board2.clearBonusDetails } : {}, stars: starCount(starCoinScore(board2.clearBonusDetails ?? { score: board2.score }), scoringVersionOf(record)), cleared: board2.cleared, longestChain: hasEarnedJokers(record) ? board2._longestChain : state.longestChain, bestHand: hasEarnedJokers(record) ? board2._bestHand : bestHand, ...jokerMetadata(record) };
      const predecessor = boards.findIndex((item) => item.record.secret === void 0 && item.level === record.window.afterLevel);
      if (predecessor < 0) throw new TypeError("Window Room has no preceding normal board");
      boards.splice(predecessor + 1, 0, { record: result, level: board2.level, spool: rules.spool, sourceId: recordId(result) });
    }
    return { record: clone(record), boards };
  }
  return { verifyBoard, verifyRun };
}

// ChatGPT/B-055/v6.24.16/warp-core/config.ts
var WARP_VERSION = "warp-1";
var HELPFUL_IDS = Object.freeze(["joker", "needle", "reel", "spare", "mirror", "leap", "unpick", "lantern"]);
var CHARM_IDS = Object.freeze(["needle-thread", "joker-weave", "double-stitch", "deep-pocket", "mirror-light", "long-stride", "lantern-eye", "unpick-thread"]);
var SNAG_TEXT = Object.freeze({ snuffed: "Play a neighbouring card to bring a dark card into the light.", knot: "Play a golden key card to untie its matching knot.", overgrowth: "Play beside the vine to uncover its two cards.", tide: "Every fifth draw carries the next Spool card to the bottom.", drift: "A drifting card moves one rank after every draw.", flicker: "A flickering card changes between two ranks after each draw.", frozen: "Play a neighbouring card to thaw the ice.", shade: "A shaded rank appears when its card is uncovered.", "split-gate": "Split cards offer two ranks; gates need a matching suit.", totality: "Aces and Kings do not join. Play the gold key to reveal the eclipsed pillar." });
var worlds = [1, 2, 3, 5, 6, 4, 7, 8, 9, 10];
var snags = ["snuffed", "knot", "overgrowth", "tide", "drift", "flicker", "frozen", "shade", "split-gate", "totality"];
var WARP_LEVELS = Object.freeze(worlds.map((world3, index) => Object.freeze({ level: index + 1, world: world3, snag: snags[index], boss: index === 4 || index === 9, strength: [6, 1, 2, 3, 6, 5, 7, 9, 4, 10][index], helpful: Object.freeze([
  ["joker", "needle", "joker", "needle"],
  ["joker", "needle", "joker", "needle", "mirror", "spare"],
  ["joker", "needle", "joker", "needle", "reel", "lantern"],
  ["joker", "needle", "joker", "needle", "leap", "unpick"],
  ["joker", "needle", "joker", "needle"],
  ["joker", "needle", "joker", "needle", "mirror", "leap"],
  ["joker", "needle", "joker", "needle", "reel", "spare"],
  ["joker", "needle", "lantern", "unpick"],
  ["joker", "needle", "needle", "joker"],
  ["joker", "needle", "joker", "reel"]
][index]), ...index === 1 ? { helpfulVariant: Object.freeze({ index: 4, kind: "joker", probability: 0.25 }) } : {}, burnAt: index >= 2 ? [null, null, null, 20, 18, 17, 21, 17, 22, 9][index] : null, fogAt: index >= 2 ? Math.max(3, 15 - index) : null, targetP3: [0.615, 0.574, 0.533, 0.488, 0.448, 0.405, 0.366, 0.31, 0.26, 0.088][index] })));
function warpLevel(level) {
  if (!Number.isSafeInteger(level) || level < 1 || level > 10) throw new RangeError("Warp has exactly ten levels");
  return WARP_LEVELS[level - 1];
}
function warpSeed(root2, level) {
  warpLevel(level);
  if (typeof root2 === "number" && !Number.isSafeInteger(root2) || !/^-?\d{1,30}$/.test(String(root2))) throw new TypeError("Invalid Warp seed");
  let hash = 14695981039346656037n;
  for (const c of `weft-warp:${WARP_VERSION}:${BigInt(root2)}:${level}`) hash = BigInt.asUintN(64, (hash ^ BigInt(c.charCodeAt(0))) * 1099511628211n);
  return hash;
}
var CONFIG_ID = "warp-1-v6.15";
var WARP_PROOF_NODE_LIMIT = 1e5;
var WARP_MAX_CANDIDATES = 1e3;

// ChatGPT/B-055/v6.24.16/warp-core/hands.ts
var ROYAL2 = [0, 9, 10, 11, 12];
function warpPhysicalHand(cards, loop) {
  if (cards.length <= 7 || new Set(cards).size === cards.length) {
    const chosen = bestFiveCards(cards, 99, loop, false);
    return { kind: handType(chosen, 99, loop, false), cards: chosen };
  }
  const ranks = Array.from({ length: 13 }, () => []), suits = Array.from({ length: 4 }, () => []), suitRanks = Array.from({ length: 4 }, () => Array.from({ length: 13 }, () => []));
  cards.forEach((card, index) => {
    const rank2 = card % 13, suit2 = Math.floor(card / 13);
    ranks[rank2].push(index);
    suits[suit2].push(index);
    suitRanks[suit2][rank2].push(index);
  });
  let best;
  const consider = (indices) => {
    const candidate2 = [...indices].sort((a, b) => a - b);
    if (!best) {
      best = candidate2;
      return;
    }
    for (let i = 0; i < 5; i++) {
      if (candidate2[i] === best[i]) continue;
      if (candidate2[i] < best[i]) best = candidate2;
      return;
    }
  };
  const result = () => {
    const chosen = best.map((index) => cards[index]);
    return { kind: handType(chosen, 99, loop, false), cards: chosen };
  };
  const pattern = (indices, values) => {
    if (values.every((rank2) => indices[rank2].length)) consider(values.map((rank2) => indices[rank2][0]));
  };
  for (const indexed of suitRanks) pattern(indexed, ROYAL2);
  if (best) return result();
  const runs2 = loop ? Array.from({ length: 13 }, (_, start) => Array.from({ length: 5 }, (_2, offset) => (start + offset) % 13)) : [...Array.from({ length: 9 }, (_, start) => Array.from({ length: 5 }, (_2, offset) => start + offset)), ROYAL2];
  for (const indexed of suitRanks) for (const values of runs2) pattern(indexed, values);
  if (best) return result();
  for (let rank2 = 0; rank2 < 13; rank2++) if (ranks[rank2].length >= 4) {
    const outside = cards.findIndex((card) => card % 13 !== rank2);
    if (outside >= 0) consider([...ranks[rank2].slice(0, 4), outside]);
  }
  if (best) return result();
  for (let three = 0; three < 13; three++) if (ranks[three].length >= 3) {
    for (let two = 0; two < 13; two++) if (three !== two && ranks[two].length >= 2) consider([...ranks[three].slice(0, 3), ...ranks[two].slice(0, 2)]);
  }
  if (best) return result();
  for (const indices of suits) if (indices.length >= 5) consider(indices.slice(0, 5));
  if (best) return result();
  for (const values of runs2) pattern(ranks, values);
  if (best) return result();
  for (let rank2 = 0; rank2 < 13; rank2++) if (ranks[rank2].length >= 3) {
    const outside = cards.flatMap((card, index) => card % 13 !== rank2 ? [index] : []);
    if (outside.length >= 2) consider([...ranks[rank2].slice(0, 3), ...outside.slice(0, 2)]);
  }
  if (best) return result();
  for (let first = 0; first < 13; first++) if (ranks[first].length >= 2) {
    for (let second = first + 1; second < 13; second++) if (ranks[second].length >= 2) {
      const outside = cards.findIndex((card) => card % 13 !== first && card % 13 !== second);
      if (outside >= 0) consider([...ranks[first].slice(0, 2), ...ranks[second].slice(0, 2), outside]);
    }
  }
  if (best) return result();
  for (let rank2 = 0; rank2 < 13; rank2++) if (ranks[rank2].length >= 2) {
    const outside = cards.flatMap((card, index) => card % 13 !== rank2 ? [index] : []);
    if (outside.length >= 3) consider([...ranks[rank2].slice(0, 2), ...outside.slice(0, 3)]);
  }
  if (best) return result();
  consider([0, 1, 2, 3, 4]);
  return result();
}

// ChatGPT/B-055/v6.24.16/warp-core/rules.ts
var WARP_LAYOUT = layoutPeaks();
var BASE_RULES = getConfig("chainBest");
var ALL_PLAYED = 2 ** 30 - 1;
var copy2 = (value) => JSON.parse(JSON.stringify(value));
var bit = (position) => 1 << position;
var rank = (card) => card % 13;
var suit = (card) => Math.floor(card / 13);
var mod = (n) => (n % 13 + 13) % 13;
var hasCharm = (state, name) => state.deal.charms.includes(name);
var WARP_NEIGHBOURS = Object.freeze(Array.from({ length: 30 }, (_, position) => {
  const group = Math.floor(position / 10), local = position % 10, rows2 = [[0], [1, 2], [3, 4, 5], [6, 7, 8, 9]], row = rows2.findIndex((r2) => r2.includes(local)), r = rows2[row], i = r.indexOf(local), near = /* @__PURE__ */ new Set();
  for (const value of [r[i - 1], r[i + 1]]) if (value !== void 0) near.add(group * 10 + value);
  for (const p of [...WARP_LAYOUT.coveredBy[position], ...WARP_LAYOUT.children[position]]) near.add(p);
  return Object.freeze([...near].sort((a, b) => a - b));
}));
var freePositions = (state) => WARP_LAYOUT.coveredBy.flatMap((covers, p) => !(state.played & bit(p)) && covers.every((q) => state.played & bit(q)) ? [p] : []);
var remainingCount = (state) => {
  let n = 0;
  for (let mask = state.played; mask; mask &= mask - 1) n++;
  return 30 - n;
};
function markBlocked(state, mark) {
  if (state.played & bit(mark.position) || state.unlocked & bit(mark.position)) return false;
  return ["snuffed", "knot", "overgrowth", "frozen", "eclipse"].includes(mark.kind);
}
function effectiveRanks(state, position) {
  let value = rank(state.deal.weave[position]);
  const marks = state.deal.marks.filter((mark) => mark.position === position);
  for (const mark of marks) {
    if (mark.kind === "drift") value = mod(value + (mark.alternateRank === 12 ? -state.draws : state.draws));
    if (mark.kind === "flicker" && state.draws % 2) value = mark.alternateRank;
  }
  const split = marks.find((mark) => mark.kind === "split");
  return split ? [value, split.alternateRank] : [value];
}
function adjacent(state, next) {
  return isAdjacent({ ...BASE_RULES, loop: state.deal.snag !== "totality", twins: state.mirror, deltas: state.leap ? [1, 2] : [1] }, state.topRank, next);
}
function legalPlayRanks(state, position) {
  if (!Number.isInteger(position) || position < 0 || position >= 30 || state.played & bit(position) || WARP_LAYOUT.coveredBy[position].some((p) => !(state.played & bit(p))) || state.pending || state.deal.marks.some((mark) => mark.position === position && markBlocked(state, mark))) return [];
  if (state.deal.marks.some((mark) => mark.position === position && mark.kind === "gate") && suit(state.deal.weave[position]) !== state.topSuit) return [];
  return effectiveRanks(state, position).filter((value) => adjacent(state, value));
}
var legalWarpPlays = (state) => freePositions(state).filter((position) => legalPlayRanks(state, position).length > 0);
function canProgress(state) {
  return legalWarpPlays(state).length > 0 || state.spool.length > 0 || state.reel.length > 0 || state.spare.length > 0 || state.unpick > 0 && state.lastPlay !== null || state.pending !== null;
}
var handCards = (state) => state.anchorEligible ? [state.anchor, ...state.chain] : state.chain;
var physicalHandCache = /* @__PURE__ */ new WeakMap();
function physicalHand(state) {
  let value = physicalHandCache.get(state);
  if (!value) {
    value = warpPhysicalHand(state.anchorJoker && state.anchorEligible ? state.chain : handCards(state), state.deal.snag !== "totality");
    physicalHandCache.set(state, value);
  }
  return value;
}
function neutralRankKind(ranks, loop) {
  if (ranks.length <= 5) return evalRanks([...ranks].sort((a, b) => a - b), false, loop);
  const counts = Array(13).fill(0);
  for (const rank2 of ranks) counts[rank2]++;
  const groups = counts.filter(Boolean).sort((a, b) => b - a);
  if (groups[0] >= 4) return 7;
  if (groups[0] >= 3 && groups[1] >= 2) return 6;
  const mask = ranks.reduce((value, rank2) => value | 1 << rank2, 0), patterns = loop ? Array.from({ length: 13 }, (_, r) => Array.from({ length: 5 }, (_2, i) => (r + i) % 13)) : [...Array.from({ length: 9 }, (_, r) => Array.from({ length: 5 }, (_2, i) => r + i)), [0, 9, 10, 11, 12]];
  if (patterns.some((pattern) => pattern.every((rank2) => mask & 1 << rank2))) return 4;
  if (groups[0] >= 3) return 3;
  if (groups[0] >= 2 && groups[1] >= 2) return 2;
  return groups[0] >= 2 ? 1 : 0;
}
var handValueCache = /* @__PURE__ */ new WeakMap();
function warpHand(state) {
  const cached = handValueCache.get(state);
  if (cached) return cached;
  const loop = state.deal.snag !== "totality", kind = state.anchorJoker && state.anchorEligible ? Math.max(physicalHand(state).kind, neutralRankKind([state.anchor % 13, ...state.chain.map((card) => card % 13)], loop)) : physicalHand(state).kind, scoringLength = state.chain.length + state.links;
  const value = Object.freeze({ kind, name: NAMES[kind], multiplier: MULT[kind], scoringLength, bankValue: state.chain.length ? baseScore(scoringLength) * MULT[kind] : 0 });
  handValueCache.set(state, value);
  return value;
}
function bank2(state, scoring = true) {
  if (!state.chain.length) return { state, events: [] };
  const hand = scoring ? warpHand(state) : { scoringLength: state.chain.length + state.links, name: "high", bankValue: 0 }, event = { type: "banked", reason: "automatic", chainLength: state.chain.length, scoringLength: hand.scoringLength, handName: hand.name, points: hand.bankValue };
  return { state: { ...state, score: state.score + event.points, longestChain: Math.max(state.longestChain, state.chain.length), chain: [], links: 0 }, events: [event] };
}
function settle2(state, events = [], scoring = true) {
  let next = state, all = [...events];
  if (!remainingCount(state) || !legalWarpPlays(state).length && !state.pending) {
    const banked = bank2(state, scoring);
    next = banked.state;
    all.push(...banked.events);
  }
  return { state: { ...next, terminal: remainingCount(next) === 0 ? "cleared" : canProgress(next) ? "active" : "stuck" }, events: all };
}
function createWarpState(deal2) {
  if (deal2.version !== WARP_VERSION || deal2.weave.length !== 30 || deal2.spool.length !== 24 || deal2.spool[0]?.kind !== "card") throw new TypeError("Invalid Warp deal");
  if (deal2.weave.some((c) => !Number.isInteger(c) || c < 0 || c >= 52) || new Set(deal2.spool.map((t) => t.id)).size !== deal2.spool.length) throw new TypeError("Invalid Warp cards");
  const start = deal2.spool[0].card;
  let state = { version: WARP_VERSION, deal: copy2(deal2), played: 0, spool: copy2(deal2.spool.slice(1)), reel: [], spare: [], top: start, topRank: rank(start), topSuit: suit(start), topSpecial: null, anchor: start, anchorEligible: true, anchorJoker: false, chain: [], links: 0, score: 0, longestChain: 0, suitedPlays: 0, draws: 0, drawPending: false, mirror: deal2.charms.includes("mirror-light"), leap: deal2.charms.includes("long-stride"), unpick: deal2.charms.includes("unpick-thread") ? 1 : 0, needleReady: deal2.charms.includes("needle-thread"), unlocked: 0, vineCleared: 0, burn: false, fog: false, revealed: [], pending: null, lastPlay: null, terminal: "active" };
  if (deal2.charms.includes("lantern-eye")) state = { ...state, revealed: state.spool.slice(0, 3).map((t) => t.id) };
  return settle2(state).state;
}
function takeToken(state, token, events) {
  const event = (kind, description) => events.push({ type: "special", kind, description });
  if (token.kind === "card") return { ...state, top: token.card, topRank: rank(token.card), topSuit: suit(token.card), topSpecial: null, anchor: token.card, anchorEligible: true, anchorJoker: false, fog: false };
  switch (token.kind) {
    case "joker":
      event("joker", "Choose the rank for this Joker.");
      return { ...state, pending: { kind: "joker" } };
    case "needle":
      event("needle", "Choose one of the next three Spool cards.");
      return { ...state, pending: state.spool.length ? { kind: "needle", options: state.spool.slice(0, 3) } : null };
    case "reel":
      event("reel", "A second face-up stack holds three cards.");
      return { ...state, reel: [...state.reel, ...state.spool.slice(0, 3)], spool: state.spool.slice(3) };
    case "spare": {
      event("spare", "Keep a card aside; bring it into the Thread when you need it.");
      const capacity = hasCharm(state, "deep-pocket") ? 2 : 1, index = state.spool.findIndex((t) => t.kind === "card");
      if (state.spare.length >= capacity || index < 0) return state;
      return { ...state, spare: [...state.spare, state.spool[index]], spool: state.spool.filter((_, i) => i !== index) };
    }
    case "mirror":
      event("mirror", "The next play may also match the same rank.");
      return { ...state, mirror: true };
    case "leap":
      event("leap", "The next play may also leap two ranks.");
      return { ...state, leap: true };
    case "unpick":
      event("unpick", "Return the most recent played card to its place.");
      return { ...state, unpick: state.unpick + 1 };
    case "lantern":
      event("lantern", "The next three Spool cards stay in view.");
      return { ...state, revealed: [.../* @__PURE__ */ new Set([...state.revealed, ...state.spool.slice(0, 3).map((t) => t.id)])] };
    case "burn":
      event("burn", "After each draw, the next Spool card leaves the board.");
      return { ...state, burn: true };
    case "fog":
      event("fog", "The next Spool card stays veiled until it reaches the Thread.");
      return { ...state, fog: true };
  }
}
function afterDraw(state) {
  let next = { ...state, drawPending: false };
  if (next.burn && next.spool.length) next = { ...next, spool: next.spool.slice(1) };
  if (next.deal.snag === "tide" && next.draws % 5 === 0 && next.spool.length > 1) next = { ...next, spool: [...next.spool.slice(1), next.spool[0]] };
  if (next.pending?.kind === "needle") next = { ...next, pending: next.spool.length ? { kind: "needle", options: next.spool.slice(0, 3) } : null };
  return next;
}
function legalWarpActions(state) {
  if (state.terminal !== "active") return [];
  if (state.pending?.kind === "joker") return Array.from({ length: 13 }, (_, rank2) => ({ type: "choose-rank", rank: rank2 }));
  if (state.pending?.kind === "needle") return [...state.pending.options.map((token) => ({ type: "choose-needle", id: token.id })), { type: "skip-special" }];
  const actions = [];
  for (const position of legalWarpPlays(state)) for (const value of legalPlayRanks(state, position)) actions.push({ type: "play", position, rank: value });
  if (state.spool.length) actions.push({ type: "draw" });
  if (state.reel.length) actions.push({ type: "draw-reel" });
  state.spare.forEach((_, slot) => actions.push({ type: "swap-spare", slot }));
  if (state.unpick > 0 && state.lastPlay) actions.push({ type: "use-unpick" });
  return actions;
}
function applyWarpAction(source, action, options = {}) {
  const scoring = options.scoring !== false;
  if (source.terminal !== "active") throw new Error("Cannot play a finished Warp board");
  let state = source;
  const events = [];
  if (state.pending) {
    if (state.pending.kind === "joker") {
      if (action.type !== "choose-rank" || !Number.isInteger(action.rank) || action.rank < 0 || action.rank > 12) throw new Error("Choose a Joker rank");
      const card = action.rank;
      state = { ...state, pending: null, top: card, topRank: action.rank, topSuit: -1, topSpecial: "joker", anchor: card, anchorEligible: hasCharm(state, "joker-weave"), anchorJoker: true };
    } else if (action.type === "skip-special") state = { ...state, pending: null };
    else if (action.type === "choose-needle") {
      const token = state.pending.options.find((t) => t.id === action.id);
      if (!token) throw new Error("Needle choice is not one of the next three cards");
      state = { ...state, pending: null, spool: state.spool.filter((t) => t.id !== token.id) };
      state = takeToken(state, token, events);
    } else throw new Error("Choose a Needle card");
    if (!state.pending && state.drawPending) state = afterDraw(state);
    return settle2(state, events, scoring);
  }
  if (action.type === "play") {
    const allowed = legalPlayRanks(state, action.position), value = action.rank ?? allowed[0];
    if (value === void 0 || !allowed.includes(value)) throw new Error("Warp card is covered, bound or not adjacent");
    const position = action.position, physical = state.deal.weave[position], card = suit(physical) * 13 + value, matched = state.topSuit >= 0 && suit(physical) === state.topSuit;
    const lastPlay = { position, played: state.played, top: state.top, topRank: state.topRank, topSuit: state.topSuit, topSpecial: state.topSpecial, anchor: state.anchor, anchorEligible: state.anchorEligible, anchorJoker: state.anchorJoker, chain: [...state.chain], links: state.links, score: state.score, longestChain: state.longestChain, unlocked: state.unlocked, vineCleared: state.vineCleared, mirror: state.mirror, leap: state.leap, suitedPlays: state.suitedPlays };
    let unlocked = state.unlocked;
    const cleared = [];
    for (const mark of state.deal.marks) {
      if (!markBlocked(state, mark)) continue;
      let open = false;
      if (mark.kind === "knot" || mark.kind === "eclipse") open = mark.key === position;
      else open = WARP_NEIGHBOURS[mark.position].includes(position);
      if (open && mark.kind === "overgrowth") for (const sibling of state.deal.marks.filter((other) => other.kind === "overgrowth" && other.group === mark.group)) {
        unlocked |= bit(sibling.position);
        cleared.push(sibling.position);
      }
      else if (open) {
        unlocked |= bit(mark.position);
        cleared.push(mark.position);
      }
    }
    if (cleared.length) events.push({ type: "snag-cleared", positions: [...new Set(cleared)] });
    state = { ...state, lastPlay, played: state.played | bit(position), top: card, topRank: value, topSuit: suit(physical), topSpecial: null, unlocked, chain: [...state.chain, card], links: state.links + (matched ? hasCharm(state, "double-stitch") ? 2 : 1 : 0), suitedPlays: state.suitedPlays + (matched ? 1 : 0), mirror: false, leap: false };
  } else if (action.type === "draw" || action.type === "draw-reel") {
    const from = action.type === "draw" ? state.spool : state.reel;
    if (!from.length) throw new Error("That stack is empty");
    const banked = bank2(state, scoring);
    events.push(...banked.events);
    state = { ...banked.state, anchor: state.top, anchorJoker: state.topSpecial === "joker", anchorEligible: state.topSpecial !== "joker" || hasCharm(state, "joker-weave"), draws: state.draws + 1, drawPending: true };
    if (action.type === "draw" && state.needleReady) {
      state = { ...state, needleReady: false, pending: { kind: "needle", options: state.spool.slice(0, 3) } };
    } else {
      const token = from[0];
      state = action.type === "draw" ? { ...state, spool: state.spool.slice(1) } : { ...state, reel: state.reel.slice(1) };
      state = takeToken(state, token, events);
      if (!state.pending) state = afterDraw(state);
    }
  } else if (action.type === "swap-spare") {
    const token = state.spare[action.slot];
    if (!Number.isInteger(action.slot) || !token) throw new Error("No card in that Spare slot");
    const banked = bank2(state, scoring);
    events.push(...banked.events);
    state = { ...banked.state, spare: state.spare.filter((_, i) => i !== action.slot) };
    state = takeToken(state, token, events);
  } else if (action.type === "use-unpick") {
    if (state.unpick < 1 || !state.lastPlay) throw new Error("No Unpick is available");
    const before = state.lastPlay, { position: _position, ...restore } = before;
    state = { ...state, ...restore, unpick: state.unpick - 1, lastPlay: null, pending: null };
    events.push({ type: "undone", position: before.position, scoreDelta: state.score - source.score });
  } else throw new Error("Unsupported Warp action");
  return settle2(state, events, scoring);
}
function warpReachabilityKey(state) {
  const suitRelevant = state.deal.snag === "split-gate", phase = state.deal.snag === "drift" ? state.draws % 13 : state.deal.snag === "flicker" ? state.draws % 2 : state.deal.snag === "tide" ? state.draws % 5 : 0;
  const last = state.unpick && state.lastPlay ? [state.lastPlay.played, state.lastPlay.topRank, suitRelevant ? state.lastPlay.topSuit : 0, state.lastPlay.unlocked, state.lastPlay.mirror, state.lastPlay.leap] : null;
  return JSON.stringify([state.played, state.topRank, suitRelevant ? state.topSuit : 0, state.spool.map((t) => t.id), state.reel.map((t) => t.id), state.spare.map((t) => t.id), phase, state.drawPending, state.mirror, state.leap, state.unpick, state.needleReady, state.unlocked, state.burn, state.pending, last]);
}

// ChatGPT/B-055/v6.24.16/warp-core/solver.ts
function solveWarp(input, options = {}) {
  const started = performance.now(), budget = options.timeBudgetMs ?? Infinity, maxNodes = options.maxNodes ?? Infinity;
  if (budget !== Infinity && (!Number.isFinite(budget) || budget < 0) || maxNodes !== Infinity && (!Number.isSafeInteger(maxNodes) || maxNodes < 0)) throw new RangeError("Invalid solver budget");
  const deadline = budget === Infinity ? Infinity : started + budget, initial = "deal" in input ? input : createWarpState(input), failed = /* @__PURE__ */ new Set(), visiting = /* @__PURE__ */ new Set(), line = [];
  let nodes = 0, reason = "exhaustive";
  function priority(state, action) {
    if (action.type === "play") return 1e3 + WARP_LAYOUT.children[action.position].filter((p) => WARP_LAYOUT.coveredBy[p].filter((q) => !(state.played & 1 << q)).length === 1).length * 50 + state.deal.marks.filter((m) => m.key === action.position).length * 80;
    if (action.type === "choose-rank") return freePositions(state).filter((p) => {
      const r = state.deal.weave[p] % 13;
      return Math.abs(r - action.rank) === 1 || Math.abs(r - action.rank) === 12;
    }).length * 10;
    if (action.type === "choose-needle") {
      const token = state.spool.find((t) => t.id === action.id);
      if (token?.kind === "card") return freePositions(state).filter((p) => {
        const r = state.deal.weave[p] % 13, d = Math.abs(r - token.card % 13);
        return d === 1 || d === 12;
      }).length * 10;
      return 1;
    }
    return action.type === "draw-reel" ? 3 : action.type === "draw" ? 2 : action.type === "swap-spare" ? 1 : -1;
  }
  function search(state) {
    if (nodes >= maxNodes) {
      reason = "node-budget";
      return 0;
    }
    if (deadline !== Infinity && (nodes & 63) === 0 && performance.now() >= deadline) {
      reason = "time-budget";
      return 0;
    }
    nodes++;
    if (!remainingCount(state)) return 1;
    if (state.terminal === "stuck") return -1;
    const key = warpReachabilityKey(state);
    if (failed.has(key) || visiting.has(key)) return -1;
    visiting.add(key);
    const actions = legalWarpActions(state).map((action, index) => ({ action, index, priority: priority(state, action) })).sort((a, b) => b.priority - a.priority || a.index - b.index);
    for (const { action } of actions) {
      const next = applyWarpAction(state, action, { scoring: false }).state;
      line.push(action);
      const found = search(next);
      if (found === 1) {
        visiting.delete(key);
        return 1;
      }
      line.pop();
      if (found === 0) {
        visiting.delete(key);
        return 0;
      }
    }
    visiting.delete(key);
    failed.add(key);
    return -1;
  }
  const witness = (node) => {
    const actions = [];
    for (let n = node; n?.parent; n = n.parent) actions.push(n.action);
    return actions.reverse();
  };
  let fastLine;
  if (maxNodes >= 2048) {
    let frontier = [{ state: initial, parent: null, action: null, value: 0 }], seen = /* @__PURE__ */ new Set();
    for (let depth = 0; depth < 100 && frontier.length && !fastLine; depth++) {
      const next = [];
      for (const node of frontier) {
        if (nodes >= Math.min(maxNodes, 3e4) || deadline !== Infinity && performance.now() >= deadline) break;
        for (const action of legalWarpActions(node.state)) {
          if (nodes >= Math.min(maxNodes, 3e4)) break;
          nodes++;
          const state = applyWarpAction(node.state, action, { scoring: false }).state, candidate2 = { state, parent: node, action, value: 0 };
          if (state.terminal === "cleared") {
            fastLine = witness(candidate2);
            break;
          }
          if (state.terminal === "stuck") continue;
          const key = warpReachabilityKey(state);
          if (seen.has(key)) continue;
          seen.add(key);
          candidate2.value = (30 - remainingCount(state)) * 100 + state.spool.length * 2 + state.reel.length * 3 + state.spare.length * 3 + legalWarpPlays(state).length * 7 - state.deal.marks.filter((mark) => ["knot", "eclipse"].includes(mark.kind) && !(state.unlocked & 1 << mark.position)).length;
          next.push(candidate2);
        }
        if (fastLine) break;
      }
      next.sort((a, b) => b.value - a.value);
      frontier = next.slice(0, 96);
      if (nodes >= Math.min(maxNodes, 3e4)) break;
    }
  }
  const answer = fastLine ? 1 : search(initial);
  if (fastLine) line.push(...fastLine);
  const result = { clearable: answer === 0 ? "unknown" : answer === 1, reason, nodes, memoStates: failed.size, ms: performance.now() - started };
  if (answer === 1) {
    let check = initial;
    for (const action of line) check = applyWarpAction(check, action).state;
    if (check.terminal !== "cleared" || remainingCount(check) !== 0) throw new Error("Warp solver witness failed replay");
    return { ...result, line: [...line], witnessScore: check.score };
  }
  return result;
}

// ChatGPT/B-055/v6.24.16/warp-core/generator.ts
var WARP_GENERATOR_SALT = 0x9e3779b9n;
var one = (values, rng) => values[rng.randrange(values.length)];
function marksFor(level, weave, rng) {
  const config = warpLevel(level), positions = Array.from({ length: 30 }, (_, p) => p);
  rng.shuffle(positions);
  const chosen = positions.slice(0, config.strength), marks = [];
  switch (config.snag) {
    case "snuffed":
    case "frozen":
    case "shade":
      for (const position of chosen) marks.push({ position, kind: config.snag });
      break;
    case "knot": {
      const locks = chosen, keyCandidates = positions.filter((p) => !locks.includes(p));
      locks.forEach((position, index) => marks.push({ position, kind: "knot", key: keyCandidates[index % keyCandidates.length] }));
      break;
    }
    case "overgrowth": {
      let group = 0;
      for (const position of positions) {
        if (marks.some((m) => m.position === position)) continue;
        const neighbour = WARP_NEIGHBOURS[position].find((p) => !marks.some((m) => m.position === p));
        if (neighbour === void 0) continue;
        marks.push({ position, kind: "overgrowth", group }, { position: neighbour, kind: "overgrowth", group });
        if (++group >= config.strength) break;
      }
      break;
    }
    case "drift":
      marks.push({ position: positions[0], kind: "drift", alternateRank: rng.randrange(2) ? 1 : 12 });
      break;
    case "flicker": {
      const position = positions[0], alternateRank = (weave[position] % 13 + 2 + rng.randrange(9)) % 13;
      marks.push({ position, kind: "flicker", alternateRank });
      break;
    }
    case "split-gate": {
      for (const position of chosen) marks.push({ position, kind: "gate" });
      for (const position of positions.slice(config.strength, config.strength + 3)) marks.push({ position, kind: "split", alternateRank: (weave[position] % 13 + 2 + rng.randrange(9)) % 13 });
      break;
    }
    case "totality": {
      const group = rng.randrange(3), key = one(positions.filter((p) => Math.floor(p / 10) !== group && WARP_LAYOUT.coveredBy[p].length === 0), rng);
      for (let p = group * 10; p < (group + 1) * 10; p++) marks.push({ position: p, kind: "eclipse", key });
      break;
    }
    case "tide":
      break;
  }
  return marks;
}
function warpCandidate(level, seed3, options = {}) {
  const config = warpLevel(level), charms = options.charms ?? [], oneShots = options.oneShots ?? [];
  if (typeof seed3 === "number" && !Number.isSafeInteger(seed3) || !/^-?\d{1,40}$/.test(String(seed3))) throw new TypeError("Invalid Warp seed");
  if (charms.length > 3 || new Set(charms).size !== charms.length || charms.some((c) => !CHARM_IDS.includes(c)) || oneShots.some((c) => !HELPFUL_IDS.includes(c)) || oneShots.length > 9) throw new TypeError("Invalid Warp rewards");
  const original = BigInt(seed3), deal2 = deal({ ...getConfig("chainBest"), spool: 24 }, original), rng = new PythonRandom(original ^ 0x57415250n), spool = deal2.spoolOrder.map((card, id) => ({ id, kind: "card", card }));
  const slots = Array.from({ length: 23 }, (_, i) => i + 1).filter((i) => i !== config.burnAt && i !== config.fogAt);
  rng.shuffle(slots);
  let cursor = 0;
  const helpful = [...config.helpful], variant = config.helpfulVariant;
  if (variant && new PythonRandom(original ^ 0x574152504d4958n).random() < variant.probability) helpful[variant.index] = variant.kind;
  for (const kind of [...helpful, ...oneShots]) {
    const index = slots[cursor++];
    spool[index] = { id: index, kind };
  }
  if (config.burnAt !== null) {
    const index = config.burnAt;
    spool[index] = { id: index, kind: "burn" };
  }
  if (config.fogAt !== null) {
    const index = config.fogAt;
    if (spool[index]?.kind === "card") spool[index] = { id: index, kind: "fog" };
  }
  return { version: WARP_VERSION, level, world: config.world, seed: String(original), weave: [...deal2.weave], spool, burned: [...deal2.burned], marks: marksFor(level, deal2.weave, rng), snag: config.snag, boss: config.boss, charms: [...charms], oneShots: [...oneShots], configId: CONFIG_ID };
}

// ChatGPT/B-055/v6.24.16/warp-core/rewards.ts
function warpRewardChoices(root2, afterLevel, charms = []) {
  warpLevel(afterLevel);
  if (charms.length > 3 || new Set(charms).size !== charms.length || charms.some((c) => !CHARM_IDS.includes(c))) throw new TypeError("Invalid held Charms");
  if (afterLevel === 10) return [];
  const seed3 = warpSeed(root2, afterLevel) ^ 0x524557415244n, rng = new PythonRandom(seed3), charmPool = CHARM_IDS.filter((id) => !charms.includes(id)), cards = [...HELPFUL_IDS];
  rng.shuffle(charmPool);
  rng.shuffle(cards);
  const values = [{ id: `${afterLevel}:charm:${charmPool[0]}`, type: "charm", charm: charmPool[0] }, { id: `${afterLevel}:card:${cards[0]}`, type: "one-shot", card: cards[0] }];
  if (rng.randrange(2) && charmPool.length > 1) values.push({ id: `${afterLevel}:charm:${charmPool[1]}`, type: "charm", charm: charmPool[1] });
  else values.push({ id: `${afterLevel}:card:${cards[1]}`, type: "one-shot", card: cards[1] });
  rng.shuffle(values);
  return values;
}
function applyWarpPick(root2, charms, pick) {
  const reward = warpRewardChoices(root2, pick.afterLevel, charms).find((value) => value.id === pick.rewardId);
  if (!reward) throw new Error("Reward is not one of this clear\u2019s three choices");
  if (reward.type === "one-shot") {
    if (pick.replaceCharm !== void 0) throw new Error("A one-shot cannot replace a Charm");
    return { charms: [...charms], oneShots: [reward.card], reward };
  }
  if (charms.includes(reward.charm)) throw new Error("A Charm cannot be held twice");
  let next = [...charms];
  if (next.length >= 3) {
    if (!pick.replaceCharm || !next.includes(pick.replaceCharm)) throw new Error("Choose which of the three Charms to replace");
    next = next.filter((charm) => charm !== pick.replaceCharm);
  } else if (pick.replaceCharm !== void 0) throw new Error("There is an empty Charm slot");
  return { charms: [...next, reward.charm], oneShots: [], reward };
}
var CHARM_TEXT = Object.freeze({
  "needle-thread": { name: "Needle Thread", text: "Your first draw each board chooses one of the next three cards." },
  "joker-weave": { name: "Joker Weave", text: "A Joker\u2019s chosen rank also counts in the chain\u2019s best hand." },
  "double-stitch": { name: "Double Stitch", text: "Each suited link adds two to the chain\u2019s scoring length." },
  "deep-pocket": { name: "Deep Pocket", text: "You may keep two Spare cards instead of one." },
  "mirror-light": { name: "Mirror Light", text: "Your first play each board may also match the same rank." },
  "long-stride": { name: "Long Stride", text: "Your first play each board may also leap two ranks." },
  "lantern-eye": { name: "Lantern Eye", text: "The first three Spool cards begin face-up." },
  "unpick-thread": { name: "Unpick Thread", text: "One free Unpick is available each board." }
});
var HELPFUL_TEXT = Object.freeze({ joker: { name: "Joker", text: "Choose any rank for the Thread." }, needle: { name: "Needle", text: "Choose one of the next three Spool cards." }, reel: { name: "Reel", text: "Open a second face-up stack of three cards." }, spare: { name: "Spare", text: "Keep one card aside to bring into the Thread later." }, mirror: { name: "Mirror", text: "Your next play may also match the same rank." }, leap: { name: "Leap", text: "Your next play may also move two ranks." }, unpick: { name: "Unpick", text: "Return the last played card to its place." }, lantern: { name: "Lantern", text: "Keep the next three Spool cards face-up." } });

// ChatGPT/B-055/v6.24.16/warp-core/run.ts
var copy3 = (value) => JSON.parse(JSON.stringify(value));
var seed2 = (value) => {
  if (typeof value === "number" && !Number.isSafeInteger(value) || !/^-?\d{1,30}$/.test(String(value))) throw new TypeError("Invalid Warp root seed");
  return String(BigInt(value));
};
var date2 = (value) => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
var count3 = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
var warpClearBonusDetails = (state, version = CURRENT_SCORING_VERSION) => clearBonusDetails(state.terminal === "cleared", state.spool.length + state.reel.length + state.spare.length, state.score, state.deal.spool.length, version);
var warpClearBonus = (state, version = CURRENT_SCORING_VERSION) => warpClearBonusDetails(state, version).clearBonus;
function replayWarpBoard(proof, actions, version = CURRENT_SCORING_VERSION) {
  if (!Array.isArray(actions) || actions.length > 256) throw new TypeError("Invalid Warp action history");
  let state = createWarpState(proof.deal), bestHand = 0;
  for (const action of actions) {
    const transition = applyWarpAction(state, action);
    state = transition.state;
    for (const event of transition.events) if (event.type === "banked") bestHand = Math.max(bestHand, ["high", "pair", "two_pair", "trips", "straight", "flush", "full_house", "quads", "straight_flush", "royal"].indexOf(event.handName));
  }
  return { state, result: { level: proof.deal.level, seed: proof.seed, subSeed: proof.subSeed, attempts: proof.attempts, actions: copy3(actions), ...version === "legacy" ? {} : { clearBonusDetails: warpClearBonusDetails(state, version) }, score: state.score + warpClearBonus(state, version), cleared: state.terminal === "cleared", longestChain: state.longestChain, bestHand } };
}
function warpRecordId(input) {
  let hash = 14695981039346656037n;
  for (const c of JSON.stringify([WARP_VERSION, seed2(input.rootSeed), input.picks.map((pick) => [pick.afterLevel, pick.rewardId, pick.replaceCharm ?? null]), input.perLevel.map((board2) => board2.actions.map(actionTuple)), ...scoringVersionOf(input) === "legacy" ? [] : ["scoring", CURRENT_SCORING_VERSION]])) hash = BigInt.asUintN(64, (hash ^ BigInt(c.charCodeAt(0))) * 1099511628211n);
  return "weft-warp-" + hash.toString(16).padStart(16, "0");
}
function normalizeWarpRecord(value) {
  if (!value || typeof value !== "object") throw new TypeError("Invalid Warp record");
  const r = value;
  scoringVersionOf(r);
  if (r.mode !== "warp" || r.version !== WARP_VERSION || !date2(r.date) || !count3(r.levelsCleared) || r.totalLevels !== 10 || !count3(r.runScore) || !Array.isArray(r.perLevel) || r.perLevel.length < 1 || r.perLevel.length > 10 || !Array.isArray(r.picks) || r.picks.length !== r.perLevel.length - 1) throw new TypeError("Invalid Warp record structure");
  const completed = r.levelsCleared === 10 && r.perLevel.length === 10;
  if (!completed && r.levelsCleared !== r.perLevel.length - 1 || r.warpComplete !== void 0 && r.warpComplete !== completed) throw new TypeError("Invalid Warp completion");
  const root2 = seed2(r.rootSeed);
  for (let index = 0; index < r.perLevel.length; index++) {
    const b = r.perLevel[index];
    if (b.level !== index + 1 || b.seed !== String(warpSeed(root2, index + 1)) || typeof b.subSeed !== "string" || !/^-?\d{1,40}$/.test(b.subSeed) || !count3(b.attempts) || b.attempts < 1 || !Array.isArray(b.actions) || b.actions.length > 256 || !count3(b.score) || b.cleared !== index < r.levelsCleared || !count3(b.longestChain) || b.longestChain > 30 || !count3(b.bestHand) || b.bestHand > 9) throw new TypeError("Invalid Warp board record");
  }
  if (r.perLevel.reduce((sum, b) => sum + b.score, 0) !== r.runScore || r.id !== warpRecordId(r)) throw new TypeError("Warp record total or identity disagrees");
  return copy3({ ...r, rootSeed: root2, ...completed ? { warpComplete: true } : {} });
}
function actionTuple(action) {
  switch (action.type) {
    case "play":
      return ["play", action.position, action.rank ?? null];
    case "draw":
      return ["draw"];
    case "choose-rank":
      return ["rank", action.rank];
    case "choose-needle":
      return ["needle", action.id];
    case "draw-reel":
      return ["reel"];
    case "swap-spare":
      return ["spare", action.slot];
    case "use-unpick":
      return ["unpick"];
    case "skip-special":
      return ["skip"];
  }
}

// ChatGPT/B-055/v6.24.16/supabase/warp-replay.ts
var WARP_SERVER_VERIFICATION_MS = 5e3;
var WarpVerificationBudgetError = class extends Error {
  constructor() {
    super("Warp verification capacity exceeded; retained locally");
    this.code = "WARP_VERIFICATION_BUDGET";
  }
};
var canonical2 = (value) => Array.isArray(value) ? "[" + value.map(canonical2).join(",") + "]" : value && typeof value === "object" ? "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical2(value[key])).join(",") + "}" : JSON.stringify(value);
function admitted(level, seed3, charms, oneShots, attempts, remaining) {
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > WARP_MAX_CANDIDATES) throw new TypeError("Invalid Warp admission count");
  let rejectedUnknown = 0, rejectedFalse = 0;
  const solve2 = (deal2) => {
    const timeBudgetMs = remaining();
    if (timeBudgetMs <= 0) throw new WarpVerificationBudgetError();
    const proof = solveWarp(deal2, { maxNodes: WARP_PROOF_NODE_LIMIT, timeBudgetMs });
    if (proof.clearable === "unknown" && proof.reason === "time-budget") throw new WarpVerificationBudgetError();
    return proof;
  };
  for (let index = 0; index < attempts; index++) {
    const subSeed = BigInt(seed3) + BigInt(index) * WARP_GENERATOR_SALT, bare = warpCandidate(level, subSeed, { oneShots }), verification = solve2(bare);
    if (verification.clearable === "unknown") {
      rejectedUnknown++;
      continue;
    }
    if (verification.clearable === false) {
      rejectedFalse++;
      continue;
    }
    const deal2 = { ...bare, charms: [...charms] }, actual = charms.length ? solve2(deal2) : verification;
    if (actual.clearable === "unknown") {
      rejectedUnknown++;
      continue;
    }
    if (actual.clearable === false) {
      rejectedFalse++;
      continue;
    }
    if (!verification.line || !actual.line) throw new Error("Missing canonical Warp witness");
    return { version: "warp-1", seed: seed3, subSeed: String(subSeed), attempts: index + 1, deal: deal2, verification: actual, line: actual.line, withoutCharms: true, withoutCharmsVerification: verification, withoutCharmsLine: verification.line, rejectedUnknown, rejectedFalse };
  }
  throw new TypeError("Warp admission disagrees with its claimed attempt count");
}
function verifyWarpSubmission(wire, options = {}) {
  if (!wire || typeof wire !== "object" || wire.type !== "warp-run") throw new TypeError("Invalid Warp proof envelope");
  const record = normalizeWarpRecord(wire.record), now = options.now ?? (() => performance.now()), limit2 = options.maxVerificationMs ?? WARP_SERVER_VERIFICATION_MS;
  if (!Number.isFinite(limit2) || limit2 < 0) throw new RangeError("Invalid Warp verification budget");
  const deadline = now() + limit2, remaining = () => deadline - now();
  let charms = [], oneShots = [], total = 0;
  const boards = [];
  for (let index = 0; index < record.perLevel.length; index++) {
    const claimed = record.perLevel[index], level = index + 1, seed3 = String(warpSeed(record.rootSeed, level)), proof = admitted(level, seed3, charms, oneShots, claimed.attempts, remaining), replay2 = replayWarpBoard(proof, claimed.actions, scoringVersionOf(record));
    if (replay2.state.terminal === "active" || canonical2(replay2.result) !== canonical2(claimed)) throw new TypeError("Warp board result disagrees with canonical replay");
    boards.push(replay2.result);
    total += replay2.result.score;
    if (index < record.perLevel.length - 1) {
      const pick = record.picks[index];
      if (pick.afterLevel !== level) throw new TypeError("Warp reward belongs to another level");
      const next = applyWarpPick(record.rootSeed, charms, pick);
      charms = next.charms;
      oneShots = next.oneShots;
    }
  }
  const levelsCleared = boards.filter((board2) => board2.cleared).length, completed = levelsCleared === 10;
  const expected = { ...scoringMetadata(scoringVersionOf(record)), id: record.id, mode: "warp", version: "warp-1", rootSeed: record.rootSeed, date: record.date, levelsCleared, totalLevels: 10, ...completed ? { warpComplete: true } : {}, runScore: total, picks: record.picks, perLevel: boards };
  if (canonical2(expected) !== canonical2(record)) throw new TypeError("Warp completion disagrees with canonical replay");
  if (remaining() <= 0) throw new WarpVerificationBudgetError();
  const rows2 = boards.map((board2) => ({ proof_id: warpBoardProofId(record, board2.level), kind: "warp-board", score: board2.score, level_reached: board2.level, longest_chain: board2.longestChain, seed: board2.seed, moves: { mode: "warp", runProofId: record.id, rootSeed: record.rootSeed, level: board2.level, subSeed: board2.subSeed, attempts: board2.attempts, actions: board2.actions, ...scoringMetadata(scoringVersionOf(record)) }, version: isCurrentScoring(record) ? "6.23" : record.version, daily_date: null }));
  rows2.push({ proof_id: record.id, kind: "warp-run", score: total, level_reached: record.levelsCleared + 1, longest_chain: Math.max(0, ...boards.map((board2) => board2.longestChain)), seed: record.rootSeed, moves: { mode: "warp", record }, version: isCurrentScoring(record) ? "6.23" : record.version, daily_date: null });
  return rows2;
}
function warpBoardProofId(record, level) {
  return warpRecordId({ rootSeed: record.rootSeed, picks: record.picks.slice(0, level - 1), perLevel: record.perLevel.slice(0, level), ...scoringMetadata(scoringVersionOf(record)) }) + ":board:" + level;
}

// ChatGPT/B-055/v6.24.16/src/nickname.ts
var NICKNAME_BLOCKLIST = Object.freeze(["fuck", "shit", "cunt", "nigger", "nazi", "asshole", "bitch", "bastard", "motherfucker", "dickhead", "rapist", "faggot", "whore"]);
function validateNickname(input) {
  if (typeof input !== "string") return { valid: false, error: "Use 1\u201316 letters, numbers, spaces, - or _." };
  const value = input.trim();
  if (!/^[A-Za-z0-9 _-]{1,16}$/.test(value)) return { valid: false, error: "Use 1\u201316 letters, numbers, spaces, - or _." };
  const plain = value.toLowerCase().replace(/[ _-]/g, "");
  if (NICKNAME_BLOCKLIST.some((word) => plain.includes(word))) return { valid: false, error: "Please choose another name." };
  return { valid: true, value };
}

// ChatGPT/B-055/v6.24.16/supabase/replay-entry.ts
var verifier = createLeaderboardVerifier();
function runMoves(record) {
  const boards = record.perLevel.map((b) => ({ seed: b.seed, moves: compressMoves(b.moves) }));
  const moves2 = record.hugoVersion || record.windowVersion ? {
    boards,
    ...record.hugoVersion ? { hugoVersion: record.hugoVersion, ...record.hugoDisabled ? { hugoDisabled: true } : {}, ...hasGroveHugoFeature(record) ? { worldRoute: record.worldRoute, startWorld: record.startWorld, worldOrder: record.worldOrder } : {}, ...record.hugo ? { hugo: { ...record.hugo, ...record.hugo.result ? { result: { ...record.hugo.result, moves: compressMoves(record.hugo.result.moves) } } : {} } } : {} } : {},
    ...record.windowVersion ? { windowVersion: record.windowVersion, ...record.windowDisabled ? { windowDisabled: true } : {}, worldRoute: record.worldRoute, startWorld: record.startWorld, worldOrder: record.worldOrder, ...record.window ? { window: { ...record.window, ...record.window.result ? { result: { ...record.window.result, moves: compressMoves(record.window.result.moves) } } : {} } } : {} } : {}
  } : boards;
  if (hasEarnedJokers(record)) return { ...Array.isArray(moves2) ? { boards: moves2 } : moves2, ...jokerMetadata(record), scoringVersion: scoringVersionOf(record) };
  return isLevelScoring(scoringVersionOf(record)) ? Array.isArray(moves2) ? { boards: moves2, scoringVersion: scoringVersionOf(record) } : { ...moves2, scoringVersion: scoringVersionOf(record) } : moves2;
}
function verifySubmission(wire) {
  if (wire && typeof wire === "object" && wire.type === "warp-run") return verifyWarpSubmission(wire);
  const submission = decodeLeaderboardProof(wire), run = submission.type === "run" ? verifier.verifyRun(submission.record) : void 0, boards = submission.type === "board" ? [verifier.verifyBoard(submission)] : run.boards;
  const runVersion = submission.type === "board" ? submission.level === void 0 ? null : submission.runVersion ?? submission.record.version : run.record.version;
  const rows2 = boards.flatMap((board2) => ["board", "chain", ...board2.record.dailyDate ? ["daily"] : []].map((kind) => ({
    proof_id: board2.sourceId,
    kind,
    score: board2.record.score,
    level_reached: board2.level,
    longest_chain: board2.record.longestChain,
    seed: board2.record.seed,
    moves: { actions: compressMoves(board2.record.moves), spool: board2.spool, level: board2.level, scoreVersion: board2.record.version, runVersion, ...scoringMetadata(scoringVersionOf(board2.record)), ...jokerMetadata(board2.record), ...board2.record.secret ? { secret: board2.record.secret } : {}, ...board2.record.admission ? { admission: board2.record.admission } : {} },
    version: hasEarnedJokers(board2.record) ? "6.24.16" : scoringVersionOf(board2.record) === ENDLESS_SCORING_VERSION ? "6.24.14" : isCurrentScoring(board2.record) ? "6.23" : runVersion ?? board2.record.version,
    daily_date: board2.record.dailyDate ?? null
  })));
  if (run) {
    const record = run.record;
    rows2.push({ proof_id: record.id, kind: "run", score: record.runScore, level_reached: record.levelsCleared + 1, longest_chain: Math.max(0, ...boards.map((b) => b.record.longestChain)), seed: record.rootSeed ?? record.perLevel[0].seed, moves: runMoves(record), version: hasEarnedJokers(record) ? "6.24.16" : scoringVersionOf(record) === ENDLESS_SCORING_VERSION ? "6.24.14" : isCurrentScoring(record) ? "6.23" : record.version, daily_date: null });
  }
  return rows2;
}
function verifyCurrentSubmission(wire) {
  if (!wire || typeof wire !== "object" || !isCurrentScoring(wire.record)) throw new TypeError("This score belongs to an archived scoring season");
  const input = wire;
  if (input.type === "run" && (input.record.windowVersion === "window-2" || input.record.windowVersion === "window-3" || input.record.windowVersion === "window-4" || input.record.windowVersion === "window-5" || input.record.windowVersion === "window-6") && input.record.windowDisabled === true) throw new TypeError("Assisted Window runs stay on this device");
  const unchanged = input.type === "warp-run" || input.type === "board" && input.record.dailyDate !== void 0;
  if (unchanged ? input.record.scoringVersion !== CURRENT_SCORING_VERSION : !isLevelScoring(input.record.scoringVersion) || !hasEarnedJokers(input.record)) {
    const error = new TypeError("Please update Weft to post scores");
    Object.assign(error, { code: "UPDATE_GAME_REQUIRED" });
    throw error;
  }
  if (input.type === "run" && input.record.version !== (input.record.scoringVersion === ENDLESS_SCORING_VERSION ? "6.24.14" : "6.14") || input.type === "warp-run" && input.record.version !== "warp-1") throw new TypeError("Historical mechanics cannot enter the current scoring season");
  if (input.type === "board" && (hasEarnedJokers(input.record) || input.record.secret !== void 0 || input.record.admission !== void 0)) throw new TypeError("Secret boards require a complete run proof");
  if (input.type === "board" && (!["6.7", "6.14", "6.24.14"].includes(String(input.record.version)) || input.runVersion !== void 0 && input.runVersion !== (input.record.scoringVersion === ENDLESS_SCORING_VERSION ? "6.24.14" : "6.14") || input.level !== void 0 && (!Number.isSafeInteger(input.level) || Number(input.level) < 1 || input.record.scoringVersion !== ENDLESS_SCORING_VERSION && Number(input.level) > 10))) throw new TypeError("Historical board context cannot enter the current scoring season");
  const rows2 = verifySubmission(wire);
  if (rows2.some((row) => !Number.isSafeInteger(row.level_reached) || row.level_reached < 1 || row.level_reached > 2147483647)) throw new RangeError("Score proof exceeds database level range; retained locally");
  if (rows2.some((row) => row.version !== "6.23" && row.version !== "6.24.16")) throw new TypeError("Mixed scoring seasons");
  return rows2;
}
export {
  validateNickname,
  verifyCurrentSubmission,
  verifySubmission
};
