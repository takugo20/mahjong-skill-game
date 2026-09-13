import type {
  GameState,
  PlayerState,
  Tile
} from "../mahjong/types";
import type { CpuRiichiDecision } from "../mahjong/cpuRiichi";
import { isDora } from "../mahjong/tiles";
import { evaluateWinningHand } from "../mahjong/winning";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export function getEnemySpeedId(
  state: GameState,
  player: PlayerState
): 9 | 10 | 11 | 14 | undefined {
  const a = state.akuukan;
  if (!a || player.seat !== 2) return undefined;

  if (
    a.setup.enemyId === "enemy-9"
    && isEnemyAbilityEnabled(a, "E-16")
  ) return 9;

  if (
    a.setup.enemyId === "enemy-10"
    && isEnemyAbilityEnabled(a, "E-20")
  ) return 10;

  if (
    a.setup.enemyId === "enemy-11"
    && isEnemyAbilityEnabled(a, "E-21")
  ) return 11;

  if (
    a.setup.enemyId === "enemy-14"
    && isEnemyAbilityEnabled(a, "E-26")
  ) return 14;

  return undefined;
}

export function breaksDoraTriplet(
  hand: readonly Tile[],
  tile: Tile,
  indicators: readonly Tile[]
): boolean {
  return (
    indicators.some(indicator => isDora(tile, indicator))
    && hand.filter(
      other => other.suit === tile.suit && other.rank === tile.rank
    ).length === 3
  );
}

export function preserveEnemyDoraTriplet(
  state: GameState,
  player: PlayerState,
  ids: readonly string[],
  indicators: readonly Tile[]
): readonly string[] {
  if (getEnemySpeedId(state, player) !== 9) return ids;

  const preserved = ids.filter(id => {
    const tile = player.hand.find(other => other.id === id);
    return tile && !breaksDoraTriplet(player.hand, tile, indicators);
  });

  return preserved.length > 0 ? preserved : ids;
}

export function preferEnemyDamaten(
  state: GameState,
  player: PlayerState,
  decision: CpuRiichiDecision
): boolean {
  const enemy = getEnemySpeedId(state, player);

  if (
    !enemy
    || enemy === 9
    || decision.shanten !== 0
    || decision.waitTileTypes.length === 0
  ) {
    return false;
  }

  // 敵10は複数種類・残り4枚以上の待ちなら立直を優先する。
  if (
    enemy === 10
    && decision.waitTileTypes.length >= 2
    && decision.remainingWinningTileCount >= 4
  ) {
    return false;
  }

  const hand = player.hand.filter(
    tile => tile.id !== decision.discardTileId
  );

  // ツモ役を含めず、立直しなくても成立する役があるかを調べる。
  return decision.waitTileTypes.every((wait, index) => {
    const winning: Tile = {
      ...wait,
      id: `enemy-ai-win-${index}`,
      red: false
    };

    const evaluation = evaluateWinningHand({
      concealedTiles: [...hand, winning],
      melds: player.melds,
      winningTile: winning,
      winMethod: "ron",
      seatWind: player.seatWind,
      prevailingWind: state.round.prevailingWind,
      riichi: false,
      doubleRiichi: false,
      ippatsu: false
    });

    return evaluation.valid
      && (enemy !== 14 || evaluation.best.isYakuman);
  });
}
