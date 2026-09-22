import { getTileTypeFromIndex, getTileTypeIndex, getWinningTileTypes } from "../mahjong/hand";
import { createCpuDiscardInput } from "../mahjong/cpuDiscard";
import { evaluateWinningHand } from "../mahjong/winning";
import { isDora } from "../mahjong/tiles";
import type { GameState, PlayerState, Tile, MeldCallOption } from "../mahjong/types";
import type { OpenKanCallOption } from "../mahjong/kan";
import type { CpuRiichiDecision, CpuRiichiDecisionInput } from "../mahjong/cpuRiichi";
import { getAkuukanE28RiverDrawCandidates } from "./riverDraw";
import type { AkuukanE28RiverDrawCandidate } from "./riverDraw";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";
import { getEnemyFifteenThreatSeats } from "./enemyPushDefense";

// A bounded, public-information expected-value search, not an omniscient solver.
// Rivers are a finite inventory: acquiring each physical tile costs a separate turn.
const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
const GROUPS = Array.from({ length: 34 }, (_, i) => [i, i, i]).concat(
  [0, 9, 18].flatMap(s => Array.from({ length: 7 }, (_, i) => [s + i, s + i + 1, s + i + 2]))
);
const counts = (tiles: readonly Tile[]) => {
  const result = Array<number>(34).fill(0);
  for (const tile of tiles) result[getTileTypeIndex(tile)]++;
  return result;
};
const tileAt = (i: number, id: string): Tile => ({ ...getTileTypeFromIndex(i), id, red: false });
const closed = (p: PlayerState) => p.melds.every(m => m.kind === "closedKan");

export function isEnemyFifteenPlannerEnabled(state: GameState, player: PlayerState): boolean {
  return player.seat === 2 && state.akuukan?.setup.enemyId === "enemy-15"
    && isEnemyAbilityEnabled(state.akuukan, "E-28");
}

interface Goal { target: number[]; redTarget: number[]; points: number; kind: "standard" | "pairs" | "orphans" }
interface Context {
  state: GameState; player: PlayerState; indicators: readonly Tile[];
  rivers: AkuukanE28RiverDrawCandidate[]; pool: number[]; unseen: number[];
  unknownTotal: number; turns: number; goals: Goal[];
}

function scoreWin(ctx: Context, hand: Tile[], winning: Tile, riichi = ctx.player.riichi, ippatsu = ctx.player.ippatsu) {
  const result = evaluateWinningHand({
    concealedTiles: hand, melds: ctx.player.melds, winningTile: winning,
    winMethod: "tsumo", seatWind: ctx.player.seatWind,
    prevailingWind: ctx.state.round.prevailingWind, doraIndicators: ctx.indicators,
    riichi, doubleRiichi: ctx.player.doubleRiichi, ippatsu
  });
  return result.valid ? result.best.score.totalPoints : 0;
}

function context(state: GameState, player: PlayerState, indicators: readonly Tile[]): Context {
  const rivers = state.akuukan ? getAkuukanE28RiverDrawCandidates({
    akuukan: state.akuukan, drawerIsSelectedEnemy: player.seat === 2, players: state.round.players
  }).filter(c => !c.faceDown && !player.hand.some(t => t.id === c.tile.id)) : [];
  const known = new Map([...createCpuDiscardInput(state, player, indicators).visibleTiles,
    ...player.hand, ...player.melds.flatMap(m => m.tiles), ...indicators, ...rivers.map(c => c.tile)
  ].map(t => [t.id, t]));
  const unseen = counts([...known.values()]).map(n => Math.max(0, 4 - n));
  return {
    state, player, indicators, rivers, pool: counts([...player.hand, ...rivers.map(c => c.tile)]),
    unseen, unknownTotal: Math.max(1, unseen.reduce((a, b) => a + b, 0)),
    // A river pickup does not consume the wall; the other three turns usually do.
    turns: state.round.phase === "discarding" && state.round.currentSeat === player.seat
      ? Math.max(0, Math.floor((state.round.liveWall.length - 1) / 3))
      : Math.ceil(state.round.liveWall.length / 3), goals: []
  };
}

function makeGoals(ctx: Context): Goal[] {
  const held = counts(ctx.player.hand);
  const exposed = counts(ctx.player.melds.flatMap(m => m.tiles));
  const valid = (a: number[]) => a.every((n, i) => n + exposed[i] <= 4
    && n <= ctx.pool[i] + ctx.unseen[i]);
  const bonuses = Array.from({ length: 34 }, (_, i) => ctx.indicators.filter(d => isDora(tileAt(i, "estimate"), d)).length);
  const cost = (a: number[]) => a.reduce((sum, n, i) => sum
    + Math.max(0, n - held[i])
    + 3 * Math.max(0, n - ctx.pool[i])
    - 0.16 * Math.min(n, ctx.pool[i]) * bonuses[i], 0);
  const prune = (arrays: number[][], width = 48) => [...new Map(
    arrays.filter(valid).map(a => [a.join(","), a])
  ).values()].sort((a, b) => cost(a) - cost(b)).slice(0, width);
  let standard = prune(Array.from({ length: 34 }, (_, i) => {
    const a = Array<number>(34).fill(0); a[i] = 2; return a;
  }));
  for (let group = ctx.player.melds.length; group < 4; group++) {
    standard = prune(standard.flatMap(a => GROUPS.map(g => {
      const b = [...a]; for (const i of g) b[i]++; return b;
    })));
  }
  const templates: { target: number[]; kind: Goal["kind"] }[] = standard.slice(0, 20)
    .map(target => ({ target, kind: "standard" }));
  if (!ctx.player.melds.length) {
    // Enumerate seven DISTINCT pairs. Four identical tiles are never two pairs.
    let pairs: { a: number[]; last: number }[] = [{ a: Array<number>(34).fill(0), last: -1 }];
    for (let step = 0; step < 7; step++) {
      pairs = pairs.flatMap(({ a, last }) => Array.from({ length: 33 - last }, (_, k) => {
        const i = last + k + 1; const b = [...a]; b[i] = 2; return { a: b, last: i };
      })).filter(p => valid(p.a) && 33 - p.last >= 6 - step)
        .sort((a, b) => cost(a.a) - cost(b.a)).slice(0, 64);
    }
    templates.push(...pairs.slice(0, 12).map(p => ({ target: p.a, kind: "pairs" as const })));
    for (const pair of ORPHANS) {
      const a = Array<number>(34).fill(0);
      for (const i of ORPHANS) a[i] = 1;
      a[pair]++;
      if (valid(a)) templates.push({ target: a, kind: "orphans" });
    }
  }
  const inventory = [...ctx.player.hand, ...ctx.rivers.map(c => c.tile)];
  return templates.flatMap(({ target, kind }) => {
    const hand = target.flatMap((n, i) => {
      const available = inventory.filter(t => getTileTypeIndex(t) === i).sort((a, b) => Number(b.red) - Number(a.red));
      return Array.from({ length: n }, (_, j) => available[j] ?? tileAt(i, `e28-goal-${i}-${j}`));
    });
    const winning = hand.find(t => target[getTileTypeIndex(t)] > held[getTileTypeIndex(t)]) ?? hand[hand.length - 1];
    const canRiichi = closed(ctx.player) && ctx.player.score >= 1000 && ctx.state.round.liveWall.length >= 4;
    const points = scoreWin(ctx, hand, winning, ctx.player.riichi || canRiichi, false);
    return points > 0 ? [{ target, redTarget: counts(hand.filter(t => t.red)), kind, points }] : [];
  });
}

function goalValue(ctx: Context, hand: readonly Tile[], goal: Goal, turns = ctx.turns): number {
  const held = counts(hand);
  const reds = counts(hand.filter(t => t.red));
  let acquisitions = 0, unknown = 0;
  for (let i = 0; i < 34; i++) {
    acquisitions += Math.max(0, goal.target[i] - held[i]);
    // Swapping an already-held plain tile for a red river tile also costs a turn.
    acquisitions += Math.max(0, goal.redTarget[i] - reds[i] - Math.max(0, goal.target[i] - held[i]));
    unknown += Math.max(0, goal.target[i] - ctx.pool[i]);
  }
  if (acquisitions > turns || !acquisitions) return 0;
  const randomTurns = Math.max(0, turns - (acquisitions - unknown));
  let probability = 1;
  for (let i = 0; i < 34; i++) {
    const missing = Math.max(0, goal.target[i] - ctx.pool[i]);
    // Unknown tiles may appear on a normal draw or a later public discard.
    // This estimates exposure; it never reads other hands or the live wall.
    for (let j = 0; j < missing; j++) {
      probability *= 1 - Math.exp(-Math.max(0, ctx.unseen[i] - j) * randomTurns * 2.2 / ctx.unknownTotal);
    }
  }
  // Each extra turn risks an opponent ending the hand or taking a river tile.
  return goal.points * probability * Math.pow(0.86, acquisitions) / (1 + 0.3 * acquisitions);
}

function handValue(ctx: Context, hand: readonly Tile[], turns = ctx.turns): number {
  return Math.max(0, ...ctx.goals.map(goal => goalValue(ctx, hand, goal, turns)));
}

function risk(ctx: Context, discard: Tile): number {
  const threats = getEnemyFifteenThreatSeats(ctx.state, ctx.player, ctx.indicators);
  return threats.reduce((sum, seat) => {
    const opponent = ctx.state.round.players.find(p => p.seat === seat)!;
    if (opponent.discards.some(d => !d.faceDown && !d.removedFromRiver && !d.called
      && getTileTypeIndex(d.tile) === getTileTypeIndex(discard))) return sum;
    // E-27 blocks cheap opposing wins, but a mangan threat still matters.
    const honor = discard.suit === "honor";
    const visible = 4 - ctx.unseen[getTileTypeIndex(discard)];
    return sum + (honor ? 170 / Math.max(1, visible) : 420);
  }, 0);
}

function prepare(state: GameState, player: PlayerState, indicators: readonly Tile[]) {
  const ctx = context(state, player, indicators); ctx.goals = makeGoals(ctx); return ctx;
}

export function chooseEnemyFifteenDiscard(state: GameState, player: PlayerState,
  indicators: readonly Tile[], forbidden: readonly string[] = []): Tile | null {
  if (!isEnemyFifteenPlannerEnabled(state, player) || player.riichi) return null;
  const ctx = prepare(state, player, indicators);
  if (!ctx.goals.length || !player.hand.some(tile => handValue(ctx, player.hand.filter(t => t.id !== tile.id)) > 0)) return null;
  return player.hand.filter(t => !forbidden.includes(t.id)).map(tile => ({ tile,
    value: handValue(ctx, player.hand.filter(t => t.id !== tile.id)) - risk(ctx, tile)
      - (Number(tile.red) + indicators.filter(d => isDora(tile, d)).length) * 0.01
  })).sort((a, b) => b.value - a.value)[0]?.tile ?? null;
}

export function chooseEnemyFifteenRiverDraw(state: GameState, player: PlayerState,
  indicators: readonly Tile[]): AkuukanE28RiverDrawCandidate | null {
  const ctx = context(state, player, indicators);
  // Always take a legal immediate win, including a riichi/ippatsu river win.
  const wins = ctx.rivers.map(candidate => ({ candidate,
    points: scoreWin(ctx, [...player.hand, candidate.tile], candidate.tile)
  })).filter(x => x.points > 0).sort((a, b) => b.points - a.points);
  if (wins.length) return wins[0].candidate;
  if (player.riichi) return null;
  ctx.goals = makeGoals(ctx);
  const penalties = new Map(player.hand.map(t => [t.id, risk(ctx, t)]));
  // Compare with a normal draw's expected outcome, not just standing still.
  // Unseen counts are public-information estimates, not the actual wall contents.
  const baseline = ctx.unseen.reduce((sum, amount, i) => {
    if (!amount) return sum;
    const tile = tileAt(i, `e28-normal-${i}`);
    const full = [...player.hand, tile];
    const win = scoreWin(ctx, full, tile);
    const next = { ...ctx, pool: [...ctx.pool], unseen: [...ctx.unseen], unknownTotal: Math.max(1, ctx.unknownTotal - 1) };
    next.pool[i]++; next.unseen[i]--;
    const value = win || Math.max(0, ...full.map(drop => handValue(next,
      full.filter(t => t.id !== drop.id), ctx.turns - 1) - (penalties.get(drop.id) ?? risk(ctx, drop))));
    return sum + amount * value / ctx.unknownTotal;
  }, 0);
  const choices = ctx.rivers.map(candidate => {
    const full = [...player.hand, candidate.tile];
    const owner = state.round.players.find(p => p.seat === candidate.riverOwnerSeat);
    const removesSafety = owner && owner.seat !== player.seat
      && (owner.riichi || owner.melds.length >= 2)
      && !owner.discards.some((d, i) => i !== candidate.discardIndex && !d.faceDown
        && !d.called && !d.removedFromRiver && getTileTypeIndex(d.tile) === getTileTypeIndex(candidate.tile));
    const value = Math.max(...player.hand.map(discard => handValue(ctx,
      full.filter(t => t.id !== discard.id), ctx.turns - 1) - penalties.get(discard.id)!))
      - (removesSafety ? 500 : 0);
    return { candidate, value };
  }).filter(c => c.value > baseline + 1).sort((a, b) => b.value - a.value
    || Number(b.candidate.tile.red) - Number(a.candidate.tile.red));
  // No productive guaranteed pickup: leave the hand flexible and draw normally.
  return choices[0]?.candidate ?? null;
}

export function chooseEnemyFifteenRiichi(state: GameState, input: CpuRiichiDecisionInput): CpuRiichiDecision | null {
  if (!input.riichiDiscardTileIds.length) return null;
  const { player, doraIndicators } = input;
  const ctx = prepare(state, player, doraIndicators);
  const plannedValue = Math.max(0, ...player.hand.map(tile =>
    handValue(ctx, player.hand.filter(t => t.id !== tile.id)) - risk(ctx, tile)));
  const options = input.riichiDiscardTileIds.flatMap(id => {
    const hand = player.hand.filter(t => t.id !== id);
    const waits = getWinningTileTypes(hand, player.melds);
    const riverWaits = ctx.rivers.filter(c => waits.some(w => getTileTypeIndex(w) === getTileTypeIndex(c.tile)));
    const unseen = waits.reduce((sum, w) => sum + ctx.unseen[getTileTypeIndex(w)], 0);
    if (!riverWaits.length && !unseen) return [];
    const value = handValue(ctx, hand) - risk(ctx, player.hand.find(t => t.id === id)!);
    // Do not lock a cheap tenpai when a much stronger river-backed plan is viable.
    if (value < plannedValue * 0.85) return [];
    return [{ value, decision: {
      discardTileId: id, shanten: 0, waitTileTypes: waits,
      remainingWinningTileCount: unseen + riverWaits.length,
      improvingTileTypes: waits, remainingImprovingTileCount: unseen + riverWaits.length,
      discardedDoraCount: player.hand.filter(t => t.id === id).reduce((sum, t) => sum
        + Number(t.red) + doraIndicators.filter(d => isDora(t, d)).length, 0)
    } }];
  }).sort((a, b) => b.value - a.value);
  return options[0]?.decision ?? null;
}

export function prefersEnemyFifteenSpecialHand(state: GameState, player: PlayerState,
  indicators: readonly Tile[], onlyOrphans = false): boolean {
  if (!isEnemyFifteenPlannerEnabled(state, player) || player.melds.length) return false;
  const ctx = prepare(state, player, indicators);
  const hands = player.hand.length === 14
    ? player.hand.map(drop => player.hand.filter(t => t.id !== drop.id)) : [player.hand];
  const value = (special: boolean) => Math.max(0, ...ctx.goals
    .filter(g => (onlyOrphans ? g.kind === "orphans" : g.kind !== "standard") === special)
    .flatMap(g => hands.map(hand => goalValue(ctx, hand, g))));
  return value(true) > value(false) * 1.05;
}

export function preferEnemyFifteenDamaten(state: GameState, player: PlayerState,
  decision: CpuRiichiDecision, indicators: readonly Tile[]): boolean {
  const ctx = context(state, player, indicators);
  const hand = player.hand.filter(t => t.id !== decision.discardTileId);
  // Riichi adds no value to yakuman and unnecessarily locks the hand.
  return decision.waitTileTypes.every((w, i) => {
    const tile = tileAt(getTileTypeIndex(w), `e28-damaten-${i}`);
    const win = evaluateWinningHand({ concealedTiles: [...hand, tile], melds: player.melds,
      winningTile: tile, winMethod: "tsumo", seatWind: player.seatWind,
      prevailingWind: ctx.state.round.prevailingWind, doraIndicators: indicators });
    return win.valid && win.best.score.yakumanMultiplier > 0;
  });
}

export function shouldEnemyFifteenCall(state: GameState, player: PlayerState, indicators: readonly Tile[],
  option: MeldCallOption | OpenKanCallOption, discardId?: string): boolean {
  if (!isEnemyFifteenPlannerEnabled(state, player)) return true;
  const called = state.round.lastDiscard?.discard.tile;
  if (!called) return false;
  const before = prepare(state, player, indicators);
  const used = new Set<string>([...option.handTileIds, called.id]);
  const afterPlayer: PlayerState = { ...player,
    hand: player.hand.filter(t => !used.has(t.id) && t.id !== discardId),
    melds: [...player.melds, { kind: option.kind,
      tiles: [...player.hand.filter(t => used.has(t.id)), called],
      calledFrom: option.discarderSeat, calledTileId: called.id }]
  };
  const afterState: GameState = { ...state, round: { ...state.round, phase: "discarding", currentSeat: player.seat,
    players: state.round.players.map(p => ({ ...(p.seat === player.seat ? afterPlayer : p),
      discards: p.discards.map(d => used.has(d.tile.id) ? { ...d, called: true } : d)
    }))
  } };
  const after = prepare(afterState, afterPlayer, indicators);
  // Compare scoring potential with the option of collecting the called tile
  // next turn while retaining menzen. Calls must offer a meaningful advantage.
  return handValue(after, afterPlayer.hand) > handValue(before, player.hand) * 1.15 + 100;
}
