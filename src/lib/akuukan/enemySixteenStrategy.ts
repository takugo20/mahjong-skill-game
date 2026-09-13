import { preferEnemySixteenLastRoundDamaten } from "./enemySixteenLastRound";
import type {
  GameState, PlayerState, Tile
} from "../mahjong/types";
import type {
  CpuRiichiDecision
} from "../mahjong/cpuRiichi";
import {
  createCpuDiscardInput,
  chooseStrategicCpuDiscard
} from "../mahjong/cpuDiscard";
import { evaluateWinningHand } from "../mahjong/winning";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

export function isEnemySixteenStrategyEnabled(
  state: GameState,
  player: PlayerState
): boolean {
  return !!state.akuukan
    && player.seat === 2
    && state.akuukan.setup.enemyId === "enemy-16"
    && isEnemyAbilityEnabled(state.akuukan, "E-29");
}

export function getEnemySixteenRank(
  state: GameState,
  player: PlayerState
): number {
  const order = (seat: number) =>
    (seat - state.initialDealerSeat + 4) % 4;

  return [...state.round.players]
    .sort(
      (a, b) =>
        b.score - a.score
        || order(a.seat) - order(b.seat)
    )
    .findIndex(p => p.seat === player.seat) + 1;
}

function opponentsAreAdvancing(
  state: GameState,
  player: PlayerState
): boolean {
  return state.round.players.some(
    p =>
      p.seat !== player.seat
      && (p.riichi || p.melds.length >= 2)
  );
}

export function getEnemySixteenForbiddenTileIds(
  state: GameState,
  player: PlayerState,
  forbidden: readonly string[] = []
): readonly string[] {
  if (
    !isEnemySixteenStrategyEnabled(state, player)
    || getEnemySixteenRank(state, player) !== 1
  ) {
    return forbidden;
  }

  const threats = state.round.players.filter(
    p => p.seat !== player.seat && p.riichi
  );

  if (!threats.length) return forbidden;

  const blocked = new Set(forbidden);
  const legal = player.hand.filter(
    t => !blocked.has(t.id)
  );

  const safe = legal.filter(
    t => threats.every(
      p => p.discards.some(
        d =>
          !d.faceDown
          && !d.removedFromRiver
          && d.tile.suit === t.suit
          && d.tile.rank === t.rank
      )
    )
  );

  if (!safe.length) return forbidden;

  const allowed = new Set(safe.map(t => t.id));

  return [
    ...new Set([
      ...forbidden,
      ...legal
        .filter(t => !allowed.has(t.id))
        .map(t => t.id)
    ])
  ];
}

export function chooseEnemySixteenDiscard(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[],
  forbidden: readonly string[] = [],
  random: () => number = Math.random
): Tile | null {
  if (!isEnemySixteenStrategyEnabled(state, player)) {
    return null;
  }

  const input = createCpuDiscardInput(
    state,
    player,
    indicators,
    getEnemySixteenForbiddenTileIds(
      state,
      player,
      forbidden
    )
  );

  input.speedFirst =
    getEnemySixteenRank(state, player) === 4
    || opponentsAreAdvancing(state, player);

  return chooseStrategicCpuDiscard(input, random);
}

export function preferEnemySixteenDamaten(
  state: GameState,
  player: PlayerState,
  decision: CpuRiichiDecision,
  indicators: readonly Tile[]
): boolean {
  const lastRound = preferEnemySixteenLastRoundDamaten(
    state,
    player,
    decision,
    indicators
  );

  if (lastRound !== null) return lastRound;
  if (
    !isEnemySixteenStrategyEnabled(state, player)
    || decision.shanten !== 0
    || !decision.waitTileTypes.length
    || getEnemySixteenRank(state, player) === 4
    || opponentsAreAdvancing(state, player)
    || player.discards.length >= 6
    || state.round.liveWall.length <= 16
  ) {
    return false;
  }

  if (
    decision.waitTileTypes.length >= 2
    && decision.remainingWinningTileCount >= 4
  ) {
    return false;
  }

  const sufficientValue = decision.waitTileTypes.some(
    (wait, index) => {
      const tile: Tile = {
        ...wait,
        id: `enemy-16-value-${index}`,
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
        winMethod: "ron",
        seatWind: player.seatWind,
        prevailingWind: state.round.prevailingWind,
        doraIndicators: indicators,
        riichi: false
      });

      return result.valid
        && result.best.score.basePoints >= 2000;
    }
  );

  return !sufficientValue;
}
