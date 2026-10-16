// src/score-codec.ts
var MAX_SCORE_MOVES = 256;
function compressMoves(moves2) {
  if (!Array.isArray(moves2) || moves2.length > MAX_SCORE_MOVES) throw new TypeError("Invalid move count");
  return Array.from(moves2).map((move) => {
    if (move?.type === "play" && Number.isInteger(move.position) && move.position >= 0 && move.position < 30) return move.position;
    if (move?.type === "draw") return 30;
    if (move?.type === "bank") return 31;
    throw new TypeError("Invalid score action");
  });
}
function decompressMoves(bytes) {
  if (!Array.isArray(bytes) || bytes.length > MAX_SCORE_MOVES) throw new TypeError("Invalid compressed move count");
  return Array.from(bytes).map((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 31) throw new TypeError("Invalid compressed score action");
    return value < 30 ? { type: "play", position: value } : value === 30 ? { type: "draw" } : { type: "bank" };
  });
}

// src/leaderboard-wire.ts
function decodeLeaderboardProof(value) {
  if (!value || typeof value !== "object") throw new TypeError("Invalid leaderboard proof");
  const input = value;
  if (input.type === "board" && input.record) return { ...input, record: { ...input.record, moves: decompressMoves(input.record.moves) } };
  if (input.type === "run" && input.record && Array.isArray(input.record.perLevel) && input.record.perLevel.length <= 1e4) return { ...input, record: { ...input.record, perLevel: input.record.perLevel.map((board) => ({ ...board, moves: decompressMoves(board.moves) })) } };
  throw new TypeError("Invalid leaderboard proof");
}

// ../B-002/engine/layout.ts
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

// ../B-002/engine/scoring.ts
function baseScore(n) {
  return 5 * n * (n + 1);
}

// ../B-002/engine/hands.ts
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
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1);
  const repeated = [...counts.values()].sort((a, b) => b - a);
  const royal = ranks.length === 5 && ranks.every((rank, i) => rank === ROYAL_SET[i]);
  let straight = false;
  if (ranks.length === 5 && counts.size === 5) {
    if (ranks[4] - ranks[0] === 4 || royal) {
      straight = true;
    } else if (loop) {
      const gaps = ranks.slice(1).map((rank, i) => rank - ranks[i]);
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
      const suit2 = Math.floor(card / 13);
      suits[suit2] = suits[suit2] + 1;
    }
    const mostSuited = Math.max(...suits);
    const type = evalRanks(ranks, mostSuited === 5, loop);
    return mostSuited >= 4 && type < FLUSH ? FLUSH : type;
  }
  const suit = Math.floor(cards[0] / 13);
  const flush = cards.length === 5 && cards.every((card) => Math.floor(card / 13) === suit);
  return evalRanks(ranks, flush, loop);
}
var runs = (loop) => loop ? Array.from({ length: 13 }, (_, start) => Array.from({ length: 5 }, (_2, i) => (start + i) % 13)) : [...Array.from({ length: 9 }, (_, start) => Array.from({ length: 5 }, (_2, i) => start + i)), ROYAL_SET];
var STRAIGHTS = [runs(false), runs(true)];
var maskOf = (ranks) => ranks.reduce((mask, rank) => mask | 1 << rank, 0);
var STRAIGHT_MASKS = STRAIGHTS.map((patterns) => patterns.map(maskOf));
var fastCards = (cards) => cards.length > 7 && cards.every((card) => Number.isInteger(card) && card >= 0 && card < 52) && new Set(cards).size === cards.length;
function bestFromMany(cards, loop, flush4) {
  const ranks = Array.from({ length: 13 }, () => []);
  const suits = Array.from({ length: 4 }, () => []);
  const suitRank = Array.from({ length: 4 }, () => Array(13).fill(-1));
  const suitMasks = [0, 0, 0, 0];
  let allRanks = 0;
  cards.forEach((card, index) => {
    const rank = card % 13, suit = Math.floor(card / 13);
    ranks[rank].push(index);
    suits[suit].push(index);
    suitRank[suit][rank] = index;
    allRanks |= 1 << rank;
    suitMasks[suit] = suitMasks[suit] | 1 << rank;
  });
  let best;
  const consider = (indices) => {
    const candidate = [...indices].sort((a, b) => a - b);
    if (!best) {
      best = candidate;
      return;
    }
    for (let i = 0; i < 5; i++) {
      if (candidate[i] === best[i]) continue;
      if (candidate[i] < best[i]) best = candidate;
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
  for (let suit = 0; suit < 4; suit++) if ((suitMasks[suit] & royalMask) === royalMask)
    consider(ROYAL_SET.map((rank) => suitRank[suit][rank]));
  if (best) return result();
  const patterns = STRAIGHTS[Number(loop)], masks = STRAIGHT_MASKS[Number(loop)];
  for (let suit = 0; suit < 4; suit++) for (let i = 0; i < patterns.length; i++)
    if ((suitMasks[suit] & masks[i]) === masks[i]) consider(patterns[i].map((rank) => suitRank[suit][rank]));
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
    consider(patterns[i].map((rank) => ranks[rank][0]));
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
function handType(chain, window, loop, flush4 = false) {
  if (chain.length === 0) return HIGH;
  if (window === 5 || chain.length <= 5) return evalCards(chain.slice(-5), loop, flush4);
  const cards = chain.slice(-window);
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

// ../B-002/engine/rules.ts
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

// ../B-002/engine/configs.ts
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

// ../B-002/engine/deck.ts
var PythonRandom = class {
  constructor(seed2) {
    this.mt = new Uint32Array(624);
    this.index = 624;
    if (typeof seed2 === "number" && !Number.isSafeInteger(seed2)) {
      throw new RangeError("Seed must be a safe integer or bigint");
    }
    let value = BigInt(seed2);
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
    for (let count2 = Math.max(624, words.length); count2 > 0; count2--) {
      const previous = this.mt[i - 1];
      this.mt[i] = (this.mt[i] ^ Math.imul(previous ^ previous >>> 30, 1664525)) + words[j] + j >>> 0;
      if (++i >= 624) {
        this.mt[0] = this.mt[623];
        i = 1;
      }
      if (++j >= words.length) j = 0;
    }
    for (let count2 = 623; count2 > 0; count2--) {
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
function deal(rules, seed2) {
  const rng = new PythonRandom(seed2);
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

// ../B-004/engine/solver.ts
function population(mask) {
  mask -= mask >>> 1 & 1431655765;
  mask = (mask & 858993459) + (mask >>> 2 & 858993459);
  return (mask + (mask >>> 4) & 252645135) * 16843009 >>> 24;
}
function limit(value, name, integer = false) {
  if (value !== Infinity && (!Number.isFinite(value) || value < 0 || integer && !Number.isInteger(value)))
    throw new RangeError(`${name} must be nonnegative${integer ? " integer" : ""} or Infinity`);
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
  const predecessors = Array.from({ length: 13 }, (_, rank) => Array.from({ length: 13 }, (_2, top) => top).filter((top) => isAdjacent(initial.rules, top, rank)));
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
    if (code !== peaksStateCount - 1) for (let rank = 0; rank < 13; rank++) {
      const sp = nextStock[minimum * 13 + rank], key = base + rank;
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
      let replay = initial;
      for (const move of line) replay = applyMove(replay, move).state;
      if (replay.terminal !== "cleared" || replay.remaining !== 0) throw new Error("Internal solver witness failed engine replay");
      if (performance.now() >= deadline) return result("unknown", "time-budget");
      return result(true, "exhaustive", { line, witnessScore: replay.score });
    }
    let free = peaksFree[code];
    while (free) {
      const bit = free & -free, p = 31 - Math.clz32(bit), rank = ranks[p];
      free ^= bit;
      let bestIndex = Infinity, parent = -1;
      for (const top of predecessors[rank]) {
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
      const key = nextCode * 13 + rank;
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
  const initial = createState(input, deal2), count2 = initial.weave.length;
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
  if (count2 === 0) return result(true, "exhaustive", { line: [], witnessScore: initial.score });
  if (maxNodes === 0) return result("unknown", "node-budget");
  const allPlayed = 2 ** count2 - 1;
  if (!Number.isSafeInteger(allPlayed * 13 + 12)) throw new RangeError("Memo key exceeds safe integer range");
  const ranks = initial.weave.map((card) => card % 13);
  const stockRanks = initial.spool.map((card) => card % 13);
  const covers = initial.layout.coveredBy.map((positions) => positions.reduce((mask, p) => mask | 1 << p, 0));
  if (count2 === 30 && initial.spool.length <= 255 && covers.every((mask, p) => mask === peaksCovers[p]))
    return solvePeaks(initial, started, deadline, maxNodes);
  const children = initial.layout.children;
  const byRank = new Int32Array(13), remainingCounts = new Uint8Array(13);
  let initialRanks = 0;
  ranks.forEach((rank, p) => {
    byRank[rank] |= 1 << p;
    remainingCounts[rank]++;
    initialRanks |= 1 << rank;
  });
  const adjacentRanks = new Uint16Array(13), adjacentPositions = new Int32Array(13);
  const adjacentLists = Array.from({ length: 13 }, () => []);
  for (let top = 0; top < 13; top++) for (let rank = 0; rank < 13; rank++) {
    if (isAdjacent(initial.rules, top, rank)) {
      adjacentRanks[top] |= 1 << rank;
      adjacentPositions[top] |= byRank[rank];
      adjacentLists[top].push(rank);
    }
  }
  const adjacentUnion = new Uint16Array(1 << 13);
  const positionsUnion = new Int32Array(1 << 13);
  for (let mask = 1; mask < adjacentUnion.length; mask++) {
    const bit = mask & -mask, rank = 31 - Math.clz32(bit);
    adjacentUnion[mask] = adjacentUnion[mask ^ bit] | adjacentRanks[rank];
    positionsUnion[mask] = positionsUnion[mask ^ bit] | byRank[rank];
  }
  const suffixRanks = new Uint16Array(stockRanks.length + 1);
  const suffixCapacity = Array.from({ length: stockRanks.length + 1 }, () => new Uint32Array(13));
  const suffixCounts = Array.from({ length: stockRanks.length + 1 }, () => new Uint32Array(13));
  for (let sp = stockRanks.length - 1; sp >= 0; sp--) {
    const rank = stockRanks[sp];
    suffixRanks[sp] = suffixRanks[sp + 1] | 1 << rank;
    suffixCounts[sp].set(suffixCounts[sp + 1]);
    suffixCounts[sp][rank]++;
    for (let target = 0; target < 13; target++) suffixCapacity[sp][target] = suffixCapacity[sp + 1][target] + (adjacentRanks[rank] & 1 << target ? 1 : 0);
  }
  const hallFamilies = Array.from({ length: 13 }, (_, start) => {
    let predecessors = 0;
    return Array.from({ length: 6 }, (_2, step) => {
      const target = (start + step * 2) % 13, added = adjacentRanks[target] & ~predecessors;
      predecessors |= added;
      return {
        target,
        added,
        ranks: Array.from({ length: 13 }, (_3, rank) => rank).filter((rank) => added & 1 << rank)
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
      const bit = rankBits & -rankBits, rank = 31 - Math.clz32(bit);
      rankBits ^= bit;
      let capacity = suffixCapacity[sp][rank] + (adjacentRanks[top] & bit ? 1 : 0);
      for (const neighbour of adjacentLists[rank]) capacity += remainingCounts[neighbour];
      if (remainingCounts[rank] > capacity) {
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
        for (const rank of part.ranks) capacity += remainingCounts[rank] + suffixCounts[sp][rank];
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
          const bit = possible & -possible, p = 31 - Math.clz32(bit);
          possible ^= bit;
          roots |= 1 << ranks[p];
          for (const child of children[p]) if ((covers[child] & ~virtualPlayed) === 0) virtualFree |= 1 << child;
        }
      }
    }
    let candidates = free2 & adjacentPositions[top];
    while (candidates) {
      let scan = candidates, chosen = 0, chosenP = 0, chosenFree = 0, priority = -1;
      while (scan) {
        const bit = scan & -scan, p = 31 - Math.clz32(bit);
        scan ^= bit;
        const nextPlayed = played | bit;
        let nextFree = free2 & ~bit, reveals = 0;
        for (const child of children[p]) if ((covers[child] & ~nextPlayed) === 0) {
          nextFree |= 1 << child;
          reveals++;
        }
        const score = reveals * 64 + population(nextFree & adjacentPositions[ranks[p]]) * 4;
        if (score > priority) {
          priority = score;
          chosen = bit;
          chosenP = p;
          chosenFree = nextFree;
        }
      }
      candidates ^= chosen;
      const rank = ranks[chosenP];
      remainingCounts[rank]--;
      const nextRanks = remainingCounts[rank] === 0 ? remainingRanks & ~(1 << rank) : remainingRanks;
      line.push({ type: "play", position: chosenP });
      const found = search(played | chosen, chosenFree, rank, sp, nextRanks);
      remainingCounts[rank]++;
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
  let replay = initial;
  for (const move of line) replay = applyMove(replay, move).state;
  if (replay.terminal !== "cleared" || replay.remaining !== 0) throw new Error("Internal solver witness failed engine replay");
  if (performance.now() >= deadline) return result("unknown", "time-budget");
  return result(true, "exhaustive", { line: [...line], witnessScore: replay.score });
}

// ../B-004/engine/generator.ts
var GENERATOR_SALT = 0x9e3779b9n;
var GenerationBudgetError = class extends Error {
  constructor(seed2, subSeed, attempts, verification) {
    super(`Generation stopped at candidate ${attempts}: ${verification.reason}`);
    this.seed = seed2;
    this.subSeed = subSeed;
    this.attempts = attempts;
    this.verification = verification;
    this.code = "GENERATION_BUDGET_EXHAUSTED";
    this.name = "GenerationBudgetError";
  }
};
var GenerationAttemptsError = class extends Error {
  constructor(seed2, attempts) {
    super(`No verified deal after ${attempts} exhaustive candidates`);
    this.seed = seed2;
    this.attempts = attempts;
    this.code = "GENERATION_ATTEMPTS_EXHAUSTED";
    this.name = "GenerationAttemptsError";
  }
};
function generateDeal(input, seed2, options = {}) {
  if (typeof seed2 === "number" && !Number.isSafeInteger(seed2))
    throw new RangeError("Seed must be a safe integer or bigint");
  const original = BigInt(seed2), rules = resolveRules(input);
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
    const candidate = deal(rules, subSeed), started = performance.now();
    const verification = solve(rules, candidate, solverOptions);
    checks.push({ subSeed, verification, wallMs: performance.now() - started });
    if (verification.clearable === "unknown")
      throw new GenerationBudgetError(original, subSeed, index + 1, verification);
    if (verification.clearable === true) {
      if (!verification.line) throw new Error("A verified deal must include a clearing witness");
      return {
        deal: candidate,
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

// src/records.ts
function recordId(record) {
  const actions = record.moves.map((move) => move.type === "play" ? ["play", move.position] : [move.type]);
  const text = JSON.stringify([record.version, record.seed, actions, record.dailyDate ?? null]);
  let hash = 14695981039346656037n;
  for (let index = 0; index < text.length; index++) hash = BigInt.asUintN(64, (hash ^ BigInt(text.charCodeAt(index))) * 1099511628211n);
  return "weft-" + hash.toString(16).padStart(16, "0");
}

// src/score-config.ts
var SCORE_CONFIG = Object.freeze({
  version: "6.7",
  clearBonusPerSpoolCard: 50,
  starThresholds: Object.freeze([2500, 4e3, 7400])
});
function starCount(score) {
  if (!Number.isFinite(score) || score < 0) return 0;
  return SCORE_CONFIG.starThresholds.filter((threshold) => score >= threshold).length;
}
function clearBonus(cleared, spoolRemaining) {
  if (!cleared || !Number.isSafeInteger(spoolRemaining) || spoolRemaining < 0) return 0;
  const bonus = spoolRemaining * SCORE_CONFIG.clearBonusPerSpoolCard;
  return Number.isSafeInteger(bonus) ? bonus : 0;
}

// src/world-config.ts
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
].map(([world2, spool], index) => Object.freeze({ level: index + 1, world: world2, spool })));
function runLevelCount(version = CLASSIC_RULES_VERSION) {
  return version === CLASSIC_RULES_VERSION ? CLASSIC_LEVEL_COUNT : null;
}
function levelConfig(level, version = CLASSIC_RULES_VERSION) {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError("Level must be a positive safe integer");
  if (version === CLASSIC_RULES_VERSION) {
    const config = LEVEL_CONFIG[level - 1];
    if (!config) throw new RangeError("Classic has exactly10 levels");
    return config;
  }
  const legacy = version === "6.7", table = legacy ? LEGACY_LEVEL_CONFIG : SIX_WORLD_LEVEL_CONFIG;
  return table[level - 1] ?? Object.freeze({ level, world: (level - 1) % (legacy ? 4 : 6) + 1, spool: legacy ? 20 : 23 });
}

// src/run.ts
var RUN_VERSION = CLASSIC_RULES_VERSION;
var isRunVersion = (value) => value === "6.7" || value === "6.9" || value === CLASSIC_RULES_VERSION;
var copy = (value) => JSON.parse(JSON.stringify(value));
var count = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
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
  return Array.isArray(value) && value.length <= 256 && value.every((move) => move && (move.type === "draw" || move.type === "play" && Number.isInteger(move.position) && move.position >= 0 && move.position < 30));
}
function runLevelSeed(rootSeed, level, version = RUN_VERSION) {
  const root = seed(rootSeed);
  levelConfig(level, version);
  if (level === 1) return BigInt(root);
  let hash = 14695981039346656037n;
  for (const char of `weft-run:${version}:${root}:${level}`)
    hash = BigInt.asUintN(64, (hash ^ BigInt(char.charCodeAt(0))) * 1099511628211n);
  return hash;
}
function rulesForLevel(level, version = RUN_VERSION) {
  return resolveRules({ ...getConfig("chainBest"), spool: levelConfig(level, version).spool });
}
function replayBoard(input, level, version = RUN_VERSION) {
  if (!input || !moves(input.moves) || !count(input.score)) throw new TypeError("Invalid run board result");
  const config = levelConfig(level, version), original = seed(input.seed);
  for (const field of ["level", "world", "spool"])
    if (input[field] !== void 0 && input[field] !== config[field]) throw new Error(`Run board ${field} disagrees with its level`);
  if (input.cleared !== void 0 && typeof input.cleared !== "boolean") throw new TypeError("Invalid Clear marker");
  const rules = rulesForLevel(level, version), generated = generateDeal(rules, BigInt(original));
  if (input.subSeed !== void 0 && proofSeed(input.subSeed) !== String(generated.subSeed)) throw new Error("Run board sub-seed disagrees with exact generation");
  let state = createState(rules, generated.deal);
  for (const move of input.moves) state = applyMove(state, move).state;
  if (state.terminal === "active") throw new Error("Run board is not finished");
  const cleared = state.terminal === "cleared", bonus = clearBonus(cleared, state.spool.length - state.spoolIndex);
  if (input.cleared !== void 0 && input.cleared !== cleared) throw new Error("Run board Clear marker disagrees with replay");
  if (input.score !== state.score + bonus) throw new Error("Run board score disagrees with replay");
  return {
    ...config,
    seed: original,
    moves: copy(input.moves),
    score: input.score,
    cleared,
    subSeed: String(generated.subSeed),
    chainScore: state.score,
    clearBonus: bonus
  };
}
var completion = ({ chainScore: _chain, clearBonus: _bonus, ...result }) => result;
function runRecordId(record) {
  if (!record.perLevel.every((result) => moves(result.moves))) throw new TypeError("Invalid run moves");
  const text = JSON.stringify([record.version, record.perLevel.map((result) => [seed(result.seed), result.moves.map((move) => move.type === "play" ? ["play", move.position] : ["draw"])])]);
  let hash = 14695981039346656037n;
  for (const char of text) hash = BigInt.asUintN(64, (hash ^ BigInt(char.charCodeAt(0))) * 1099511628211n);
  return "weft-run-" + hash.toString(16).padStart(16, "0");
}
function normalizeRunRecord(value) {
  if (!value || typeof value !== "object") throw new TypeError("Invalid run record");
  const input = value;
  if (!date(input.date) || !isRunVersion(input.version) || !count(input.levelsCleared) || !count(input.runScore) || !Array.isArray(input.perLevel) || !input.perLevel.length || input.perLevel.length > 1e4)
    throw new TypeError("Invalid completed run record");
  const limit2 = runLevelCount(input.version), complete = limit2 !== null && input.levelsCleared === limit2 && input.perLevel.length === limit2;
  if (input.levelsCleared !== input.perLevel.length - 1 && !complete || limit2 !== null && input.perLevel.length > limit2) throw new TypeError("Invalid completed run progression");
  if (input.classicComplete !== void 0 && input.classicComplete !== complete || input.totalLevels !== void 0 && input.totalLevels !== limit2) throw new TypeError("Invalid Classic completion marker");
  const perLevel = input.perLevel.map((result, index) => {
    if (!result || !moves(result.moves) || !count(result.score)) throw new TypeError("Invalid run board record");
    const config = levelConfig(index + 1, input.version);
    for (const field of ["level", "world", "spool"])
      if (result[field] !== void 0 && result[field] !== config[field]) throw new Error("Run record level metadata is inconsistent");
    const cleared = index < input.levelsCleared;
    if (result.cleared !== void 0 && result.cleared !== cleared) throw new Error("A lost board must end the run");
    return {
      ...config,
      seed: seed(result.seed),
      moves: copy(result.moves),
      score: result.score,
      cleared,
      ...result.subSeed === void 0 ? {} : { subSeed: proofSeed(result.subSeed) }
    };
  });
  if (perLevel.reduce((sum, result) => sum + result.score, 0) !== input.runScore) throw new Error("Run total does not equal its board scores");
  const id = runRecordId({ version: input.version, perLevel });
  if (input.id !== void 0 && input.id !== id) throw new Error("Run completion id disagrees with its proof");
  const rootSeed = input.rootSeed === void 0 ? void 0 : seed(input.rootSeed);
  if (rootSeed !== void 0 && perLevel.some((result, index) => result.seed !== String(runLevelSeed(rootSeed, index + 1, input.version)))) throw new Error("Run record seed sequence disagrees with root");
  return {
    id,
    date: input.date,
    version: input.version,
    levelsCleared: input.levelsCleared,
    runScore: input.runScore,
    perLevel,
    ...rootSeed === void 0 ? {} : { rootSeed },
    ...limit2 === null ? {} : { totalLevels: limit2 },
    ...complete ? { classicComplete: true } : {}
  };
}
function validateRunRecord(value) {
  try {
    const record = normalizeRunRecord(value), boards = record.perLevel.map((result, index) => replayBoard(result, index + 1, record.version));
    if (boards.some((result, index) => result.cleared !== index < record.levelsCleared)) throw new Error("Run terminal sequence disagrees with replay");
    return { valid: true, record: { ...record, perLevel: boards.map(completion) }, boards };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// src/leaderboard-validation.ts
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
    if (!record || !["6.6", "6.7", "6.9", "6.14"].includes(record.version)) throw new TypeError("Unsupported board version");
    checkDate(record.date);
    if (typeof record.seed !== "string" || !/^-?\d{1,30}$/.test(record.seed)) throw new TypeError("Invalid board seed");
    const moves2 = decompressMoves(compressMoves(record.moves)), level = input.level ?? 1;
    if (moves2.some((move) => move.type === "bank")) throw new TypeError("Manual Bank is not legal in these score versions");
    if (!Number.isSafeInteger(level) || level < 1) throw new TypeError("Invalid board level");
    const rules = input.level !== void 0 ? ruleResolver(input.runVersion ?? record.version, level) : getConfig("chainBest");
    if (!rules) throw new TypeError("No canonical rules for this run version");
    if (record.dailyDate !== void 0) {
      if (!day(record.dailyDate) || BigInt(record.seed) !== BigInt(record.dailyDate.replace(/-/g, "")) || rules.spool !== 22) throw new TypeError("Daily date and seed disagree");
    }
    const generated = generateDeal(rules, BigInt(record.seed));
    let state = createState(rules, generated.deal), bestHand = 0;
    for (const move of moves2) {
      bestHand = Math.max(bestHand, snapshot(state).handType);
      const result = applyMove(state, move);
      state = result.state;
      bestHand = Math.max(bestHand, snapshot(state).handType, ...result.events.map((event) => handNames.indexOf(event.handName)));
    }
    if (state.terminal === "active") throw new TypeError("Board is unfinished");
    const cleared = state.terminal === "cleared", score = state.score + clearBonus(cleared, state.spool.length - state.spoolIndex), stars = starCount(score);
    if (record.score !== score || record.longestChain !== state.longestChain || record.cleared !== cleared || record.stars !== stars || record.bestHand !== bestHand) throw new TypeError("Board result disagrees with canonical replay");
    const normalized = { ...clone(record), seed: String(BigInt(record.seed)), moves: moves2 };
    const sourceId = recordId(normalized);
    return { record: normalized, level, spool: rules.spool, sourceId };
  }
  function verifyRun(value) {
    const validated = (options.validateRun ?? validateRunRecord)(value);
    if (!validated.valid) throw new TypeError(validated.error);
    const record = validated.record;
    if (!isRunVersion(record.version)) throw new TypeError("Unsupported run version");
    const root = record.rootSeed ?? record.perLevel[0].seed;
    if (record.perLevel.some((board, index) => BigInt(board.seed) !== runLevelSeed(root, index + 1, record.version))) throw new TypeError("Run boards do not follow one root seed");
    const boards = validated.boards.map((board, index) => {
      const rules = ruleResolver(record.version, index + 1);
      if (!rules) throw new TypeError("No canonical rules for this run version");
      const generated = generateDeal(rules, BigInt(board.seed));
      let state = createState(rules, generated.deal), bestHand = 0;
      if (board.moves.some((move) => move.type === "bank")) throw new TypeError("Manual Bank is not legal in these run versions");
      for (const move of board.moves) {
        bestHand = Math.max(bestHand, snapshot(state).handType);
        const result2 = applyMove(state, move);
        state = result2.state;
        bestHand = Math.max(bestHand, snapshot(state).handType, ...result2.events.map((event) => handNames.indexOf(event.handName)));
      }
      const result = { id: record.id + ":" + (index + 1), date: record.date, seed: board.seed, version: record.version, moves: clone([...board.moves]), score: board.score, stars: starCount(board.score), cleared: board.cleared, longestChain: state.longestChain, bestHand };
      return { record: result, level: index + 1, spool: rules.spool, sourceId: recordId(result) };
    });
    return { record: clone(record), boards };
  }
  return { verifyBoard, verifyRun };
}

// src/nickname.ts
var NICKNAME_BLOCKLIST = Object.freeze(["fuck", "shit", "cunt", "nigger", "nazi", "asshole", "bitch", "bastard", "motherfucker", "dickhead", "rapist", "faggot", "whore"]);
function validateNickname(input) {
  if (typeof input !== "string") return { valid: false, error: "Use 1\u201316 letters, numbers, spaces, - or _." };
  const value = input.trim();
  if (!/^[A-Za-z0-9 _-]{1,16}$/.test(value)) return { valid: false, error: "Use 1\u201316 letters, numbers, spaces, - or _." };
  const plain = value.toLowerCase().replace(/[ _-]/g, "");
  if (NICKNAME_BLOCKLIST.some((word) => plain.includes(word))) return { valid: false, error: "Please choose another name." };
  return { valid: true, value };
}

// supabase/replay-entry.ts
var verifier = createLeaderboardVerifier();
function verifySubmission(wire) {
  const submission = decodeLeaderboardProof(wire), run = submission.type === "run" ? verifier.verifyRun(submission.record) : void 0, boards = submission.type === "board" ? [verifier.verifyBoard(submission)] : run.boards;
  const runVersion = submission.type === "board" ? submission.level === void 0 ? null : submission.runVersion ?? submission.record.version : run.record.version;
  const rows2 = boards.flatMap((board) => ["board", "chain", ...board.record.dailyDate ? ["daily"] : []].map((kind) => ({
    proof_id: board.sourceId,
    kind,
    score: board.record.score,
    level_reached: board.level,
    longest_chain: board.record.longestChain,
    seed: board.record.seed,
    moves: { actions: compressMoves(board.record.moves), spool: board.spool, level: board.level, scoreVersion: board.record.version, runVersion },
    version: runVersion ?? board.record.version,
    daily_date: board.record.dailyDate ?? null
  })));
  if (run) {
    const record = run.record;
    rows2.push({ proof_id: record.id, kind: "run", score: record.runScore, level_reached: record.levelsCleared + 1, longest_chain: Math.max(0, ...boards.map((b) => b.record.longestChain)), seed: record.rootSeed ?? record.perLevel[0].seed, moves: record.perLevel.map((b) => ({ seed: b.seed, moves: compressMoves(b.moves) })), version: record.version, daily_date: null });
  }
  return rows2;
}
export {
  validateNickname,
  verifySubmission
};
