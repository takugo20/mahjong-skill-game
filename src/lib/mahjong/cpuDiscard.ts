import {
  getEnemyHandPlan,
  selectEnemyHandCandidates,
  scoreEnemyHand
} from "../akuukan/enemyHandStrategy";
import type { EnemyHandPlan } from "../akuukan/enemyHandStrategy";
import {
  breaksDoraTriplet,
  getEnemySpeedId
} from "../akuukan/enemySpeedStrategy";
import {
  calculateShanten,
  getTileTypeFromIndex,
  getTileTypeIndex
} from "./hand";
import { isDora } from "./tiles";
import type { GameState, PlayerState, Tile } from "./types";
import { getEnemyDefinition } from "../akuukan/enemyCatalog";
import type { EnemyAiTendencies } from "../akuukan/enemyCatalogTypes";
import {
  areAkuukanHandTilesVisible,
  areAkuukanRiverTilesVisible
} from "../akuukan/informationVisibility";

const NORMAL_TENDENCIES: EnemyAiTendencies = {
  closedHand: 3,
  calls: 3,
  riichi: 3,
  defense: 3,
  handValue: 3
};

export interface CpuDiscardInput {
  player: PlayerState;
  doraIndicators: readonly Tile[];
  visibleTiles: readonly Tile[];
  tendencies: EnemyAiTendencies;
  forbiddenTileIds: readonly string[];
  preserveDoraTriplets?: boolean;
  speedFirst?: boolean;
  handPlan?: EnemyHandPlan;
}

function owner(seat: number) {
  return seat === 0 ? "player" as const
    : seat === 2 ? "selectedEnemy" as const
    : "normalOpponent" as const;
}

export function createCpuDiscardInput(
  state: GameState,
  player: PlayerState,
  doraIndicators: readonly Tile[],
  forbiddenTileIds: readonly string[] = []
): CpuDiscardInput {
  const akuukan = state.akuukan;
  const viewer = owner(player.seat);
  const visibleTiles: Tile[] = [];

  for (const other of state.round.players) {
    const own = other.seat === player.seat;
    const riverVisible =
      own || !akuukan || areAkuukanRiverTilesVisible({
        akuukan,
        viewer,
        riverOwner: owner(other.seat)
      });

    if (riverVisible) {
      visibleTiles.push(
        ...other.discards
          .filter(discard => own || !discard.faceDown)
          .map(discard => discard.tile)
      );
    }

    visibleTiles.push(
      ...other.melds.flatMap(meld => meld.tiles)
    );

    if (
      own || (akuukan && areAkuukanHandTilesVisible({
        akuukan,
        viewer,
        viewerIsHandOwner: own
      }))
    ) {
      visibleTiles.push(...other.hand);
    }
  }

  return {
    player,
    doraIndicators,
    visibleTiles,
    forbiddenTileIds,
    handPlan: getEnemyHandPlan(state, player),
    preserveDoraTriplets:
      getEnemySpeedId(state, player) === 9,
    speedFirst:
      [10, 11].includes(getEnemySpeedId(state, player) ?? 0),
    tendencies: akuukan && player.seat === 2
      ? getEnemyDefinition(akuukan.setup.enemyId).aiTendencies
      : NORMAL_TENDENCIES
  };
}

export interface CpuDiscardEvaluation {
  tile: Tile;
  shanten: number;
  acceptance: number;
  discardedBonus: number;
  score: number;
}

export function evaluateCpuDiscards(
  input: CpuDiscardInput
): CpuDiscardEvaluation[] {
  const { player } = input;
  const forbidden = new Set(input.forbiddenTileIds);
  const known = new Map<string, Tile>();

  for (const tile of [
    ...player.hand,
    ...player.melds.flatMap(meld => meld.tiles),
    ...input.visibleTiles,
    ...input.doraIndicators
  ]) {
    known.set(tile.id, tile);
  }

  const counts = Array<number>(34).fill(0);
  for (const tile of known.values()) {
    counts[getTileTypeIndex(tile)] += 1;
  }

  const shapes = new Map<
    number,
    {
      hand: Tile[];
      shanten: number;
      acceptance?: number;
    }
  >();

  const candidates = player.hand
    .filter(tile => !forbidden.has(tile.id))
    .map(tile => {
      const type = getTileTypeIndex(tile);
      let shape = shapes.get(type);

      if (!shape) {
        const hand = player.hand.filter(
          item => item.id !== tile.id
        );

        shape = {
          hand,
          shanten: calculateShanten(
            hand,
            player.melds
          ).minimum
        };

        shapes.set(type, shape);
      }

      return { tile, shape };
    });

  const nearest = selectEnemyHandCandidates(
    input.handPlan,
    player,
    candidates,
    [...input.visibleTiles, ...input.doraIndicators]
  );

  const preserved = input.preserveDoraTriplets
    ? nearest.filter(candidate =>
      !breaksDoraTriplet(
        player.hand,
        candidate.tile,
        input.doraIndicators
      )
    )
    : nearest;

  const selected = preserved.length > 0
    ? preserved
    : nearest;

  return selected.map(({ tile, shape }) => {
    if (shape.acceptance === undefined) {
      shape.acceptance = 0;

      for (let index = 0; index < 34; index += 1) {
        const remaining = Math.max(0, 4 - counts[index]);
        if (remaining === 0) continue;

        const drawn: Tile = {
          ...getTileTypeFromIndex(index),
          id: `cpu-hypothetical-${index}`,
          red: false
        };

        if (
          calculateShanten(
            [...shape.hand, drawn],
            player.melds
          ).minimum < shape.shanten
        ) {
          shape.acceptance += remaining;
        }
      }
    }

    const discardedBonus = Number(tile.red)
      + input.doraIndicators.filter(
        indicator => isDora(tile, indicator)
      ).length;

    return {
      tile,
      shanten: shape.shanten,
      acceptance: shape.acceptance,
      discardedBonus,
      score: input.speedFirst
        ? shape.acceptance * 100 - discardedBonus
        : shape.acceptance
          - discardedBonus * input.tendencies.handValue
          + scoreEnemyHand(input.handPlan, player, tile)
    };
  });
}

export function chooseStrategicCpuDiscard(
  input: CpuDiscardInput,
  random: () => number = Math.random
): Tile {
  const candidates = evaluateCpuDiscards(input);

  if (candidates.length === 0) {
    throw new Error("CPUに捨てられる牌がありません。");
  }

  const bestScore = Math.max(
    ...candidates.map(candidate => candidate.score)
  );
  const best = candidates.filter(
    candidate => candidate.score === bestScore
  );

  const index = Math.min(
    best.length - 1,
    Math.max(0, Math.floor(random() * best.length))
  );

  return best[index].tile;
}
