import type {
  GameState, Tile
} from "../mahjong/types";
import { chooseCpuRiichi } from "../mahjong/cpuRiichi";
import type {
  CpuRiichiDecision,
  CpuRiichiDecisionInput
} from "../mahjong/cpuRiichi";
import { evaluateWinningHand } from "../mahjong/winning";
import { getEnemySpeedId } from "./enemySpeedStrategy";

// 同じ待ち枚数の候補を、残り枚数で重み付けした
// ツモ打点で比較する。
// 裏ドラ・一発・未確認の赤牌には期待しない。
export function getEnemyFourteenRiichiValue(
  state: GameState,
  input: CpuRiichiDecisionInput,
  decision: CpuRiichiDecision
): number {
  const player = input.player;

  const known = [
    ...new Map(
      [
        ...player.hand,
        ...player.melds.flatMap(m => m.tiles),
        ...player.discards.map(d => d.tile),
        ...input.doraIndicators,
        ...(input.visibleTiles ?? [])
      ].map(t => [t.id, t])
    ).values()
  ];

  const doubleRiichi =
    player.discards.length === 0
    && state.round.kanCount === 0
    && state.round.players.every(
      p => p.melds.length === 0
    );

  let points = 0;
  let count = 0;

  for (
    const [index, wait]
    of decision.waitTileTypes.entries()
  ) {
    const remaining = Math.max(
      0,
      4 - known.filter(
        t =>
          t.suit === wait.suit
          && t.rank === wait.rank
      ).length
    );

    if (!remaining) continue;

    const tile: Tile = {
      ...wait,
      id: `enemy-14-value-${index}`,
      red: false
    };

    const result = evaluateWinningHand({
      concealedTiles: [
        ...player.hand.filter(
          t => t.id !== decision.discardTileId
        ),
        tile
      ],
      melds: player.melds,
      winningTile: tile,
      winMethod: "tsumo",
      seatWind: player.seatWind,
      prevailingWind: state.round.prevailingWind,
      doraIndicators: input.doraIndicators,
      riichi: true,
      doubleRiichi
    });

    if (!result.valid) continue;

    points += remaining * result.best.score.totalPoints;
    count += remaining;
  }

  return count ? points / count : 0;
}

export function chooseEnemyFourteenRiichi(
  state: GameState,
  input: CpuRiichiDecisionInput,
  standard: CpuRiichiDecision | null
): CpuRiichiDecision | null {
  if (
    !standard
    || standard.shanten !== 0
    || getEnemySpeedId(state, input.player) !== 14
  ) {
    return null;
  }

  let best = standard;

  let bestValue = getEnemyFourteenRiichiValue(
    state, input, best
  );

  for (const id of input.riichiDiscardTileIds) {
    if (id === standard.discardTileId) continue;

    const candidate = chooseCpuRiichi({
      ...input,
      riichiDiscardTileIds: [id],
      allowNotenRiichi: false
    });

    if (
      !candidate
      || candidate.shanten !== 0
      || candidate.remainingWinningTileCount
        !== standard.remainingWinningTileCount
    ) {
      continue;
    }

    const value = getEnemyFourteenRiichiValue(
      state, input, candidate
    );

    if (value > bestValue) {
      best = candidate;
      bestValue = value;
    }
  }

  return best;
}
