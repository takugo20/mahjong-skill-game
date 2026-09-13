import type {
  GameState, PlayerState, Tile
} from "../mahjong/types";
import { chooseCpuRiichi } from "../mahjong/cpuRiichi";
import type {
  CpuRiichiDecision,
  CpuRiichiDecisionInput
} from "../mahjong/cpuRiichi";
import { createCpuDiscardInput } from "../mahjong/cpuDiscard";
import { resolveWinningSettlement } from "../mahjong/settlement";
import { resolveMatchSettlement } from "../mahjong/matchSettlement";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

function enabled(
  state: GameState,
  player: PlayerState
): boolean {
  return !!state.akuukan
    && player.seat === 2
    && state.akuukan.setup.enemyId === "enemy-16"
    && isEnemyAbilityEnabled(state.akuukan, "E-29")
    && state.round.prevailingWind === "south"
    && state.round.handNumber === 4
    && player.seatWind !== "east";
}

function rank(
  state: GameState,
  player: PlayerState,
  scores: readonly number[]
): number {
  return resolveMatchSettlement({
    players: state.round.players.map((p, i) => ({
      id: p.id,
      seat: p.seat,
      points: scores[i]
    })),
    riichiPool: 0,
    initialDealerSeat: state.initialDealerSeat
  }).rankings.find(p => p.playerId === player.id)!.rank;
}

// 本場・供託込みの通常点数による試算。
// 裏ドラ・一発には期待しない。
export function evaluateEnemySixteenLastRound(
  state: GameState,
  player: PlayerState,
  decision: CpuRiichiDecision,
  indicators: readonly Tile[],
  riichi: boolean
): { rank: number; chances: number } {
  const currentRank = rank(
    state,
    player,
    state.round.players.map(p => p.score)
  );

  let bestRank = currentRank;
  let chances = 0;

  const visible = createCpuDiscardInput(
    state,
    player,
    indicators
  ).visibleTiles;

  const known = [
    ...new Map(
      [...visible, ...indicators].map(t => [t.id, t])
    ).values()
  ];

  const same = (
    a: Pick<Tile, "suit" | "rank">,
    b: Pick<Tile, "suit" | "rank">
  ) => a.suit === b.suit && a.rank === b.rank;

  const discarded = player.hand.find(
    t => t.id === decision.discardTileId
  );

  const ownRiver = player.discards.map(d => d.tile);
  if (discarded) ownRiver.push(discarded);

  const furiten =
    player.temporaryFuriten
    || player.riichiFuriten
    || decision.waitTileTypes.some(
      w => ownRiver.some(t => same(t, w))
    );

  const players = state.round.players.map(p => ({
    id: p.id,
    wind: p.seatWind,
    points:
      p.score
      - (riichi && p.id === player.id ? 1000 : 0)
  }));

  for (
    const [index, wait]
    of decision.waitTileTypes.entries()
  ) {
    const remaining = Math.max(
      0,
      4 - known.filter(t => same(t, wait)).length
    );

    if (!remaining) continue;

    const tile: Tile = {
      ...wait,
      id: `enemy-16-last-round-${index}`,
      red: false
    };

    // null はツモ。それ以外は各相手からのロン。
    const sources = [
      null,
      ...state.round.players.filter(
        p => p.id !== player.id
      )
    ];

    for (const source of sources) {
      if (source && furiten) continue;

      const result = resolveWinningSettlement({
        players,
        winnerId: player.id,
        loserId: source?.id,
        winMethod: source ? "ron" : "tsumo",
        hand: {
          concealedTiles: [
            ...player.hand.filter(
              t => t.id !== decision.discardTileId
            ),
            tile
          ],
          melds: player.melds,
          winningTile: tile,
          prevailingWind: state.round.prevailingWind,
          doraIndicators: indicators,
          riichi,
          doubleRiichi:
            riichi
            && player.discards.length === 0
            && state.round.kanCount === 0
            && state.round.players.every(
              p => p.melds.length === 0
            ),
          honba: state.round.honba,
          riichiSticks:
            state.round.riichiPool / 1000
            + (riichi ? 1 : 0)
        }
      });

      if (!result.valid) continue;

      const afterRank = rank(
        state,
        player,
        result.playersAfter.map(p => p.points)
      );

      if (afterRank > bestRank) continue;

      if (afterRank < bestRank) {
        bestRank = afterRank;
        chances = 0;
      }

      if (afterRank < currentRank || currentRank === 1) {
        chances += remaining;
      }
    }
  }

  return { rank: bestRank, chances };
}

export function chooseEnemySixteenLastRoundRiichi(
  state: GameState,
  input: CpuRiichiDecisionInput,
  standard: CpuRiichiDecision
): CpuRiichiDecision {
  if (
    !enabled(state, input.player)
    || standard.shanten !== 0
  ) {
    return standard;
  }

  const value = (d: CpuRiichiDecision) => {
    const dama = evaluateEnemySixteenLastRound(
      state, input.player, d, input.doraIndicators, false
    );

    const riichi = evaluateEnemySixteenLastRound(
      state, input.player, d, input.doraIndicators, true
    );

    return dama.rank < riichi.rank
      || (
        dama.rank === riichi.rank
        && dama.chances >= riichi.chances
      )
      ? dama
      : riichi;
  };

  let best = standard;
  let bestValue = value(best);

  for (const id of input.riichiDiscardTileIds) {
    if (id === standard.discardTileId) continue;

    const candidate = chooseCpuRiichi({
      ...input,
      riichiDiscardTileIds: [id],
      allowNotenRiichi: false
    });

    if (!candidate || candidate.shanten !== 0) continue;

    const next = value(candidate);

    if (
      next.rank < bestValue.rank
      || (
        next.rank === bestValue.rank
        && next.chances > bestValue.chances
      )
    ) {
      best = candidate;
      bestValue = next;
    }
  }

  return best;
}

export function preferEnemySixteenLastRoundDamaten(
  state: GameState,
  player: PlayerState,
  decision: CpuRiichiDecision,
  indicators: readonly Tile[]
): boolean | null {
  if (!enabled(state, player) || decision.shanten !== 0) {
    return null;
  }

  const dama = evaluateEnemySixteenLastRound(
    state, player, decision, indicators, false
  );

  const riichi = evaluateEnemySixteenLastRound(
    state, player, decision, indicators, true
  );

  // 同じ順位を狙えるなら、有効な和了経路が多い方。
  // 同等なら手替わりを残す。
  return dama.rank < riichi.rank
    || (
      dama.rank === riichi.rank
      && dama.chances >= riichi.chances
    );
}
