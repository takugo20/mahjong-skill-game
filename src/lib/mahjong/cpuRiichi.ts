import {
  getWinningTileTypes
} from "./hand";
import type {
  TileType
} from "./hand";
import {
  isDora
} from "./tiles";
import type {
  PlayerState,
  Tile
} from "./types";

export interface CpuRiichiDecisionInput {
  player: PlayerState;
  riichiDiscardTileIds:
    readonly string[];
  doraIndicators: readonly Tile[];
  visibleTiles?: readonly Tile[];
}

export interface CpuRiichiDecision {
  discardTileId: string;
  waitTileTypes: TileType[];
  remainingWinningTileCount: number;
  discardedDoraCount: number;
}

interface EvaluatedRiichiDiscard {
  decision: CpuRiichiDecision;
  discardsDrawnTile: boolean;
}

function isSameTileType(
  left: Pick<Tile, "suit" | "rank">,
  right: Pick<Tile, "suit" | "rank">
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function createKnownTiles(
  input: CpuRiichiDecisionInput
): Tile[] {
  const tiles = [
    ...input.player.hand,
    ...input.player.melds.flatMap(
      (meld) => meld.tiles
    ),
    ...input.player.discards.map(
      (discard) => discard.tile
    ),
    ...input.doraIndicators,
    ...(input.visibleTiles ?? [])
  ];
  const tileById = new Map(
    tiles.map((tile) => [tile.id, tile])
  );

  return [...tileById.values()];
}

function countRemainingWinningTiles(
  waitTileTypes: readonly TileType[],
  knownTiles: readonly Tile[]
): number {
  return waitTileTypes.reduce(
    (total, waitTileType) => {
      const knownCount = knownTiles.filter(
        (tile) =>
          isSameTileType(
            tile,
            waitTileType
          )
      ).length;

      return (
        total +
        Math.max(0, 4 - knownCount)
      );
    },
    0
  );
}

function countDiscardedDora(
  tile: Tile,
  doraIndicators: readonly Tile[]
): number {
  const indicatorDoraCount =
    doraIndicators.filter(
      (indicator) =>
        isDora(tile, indicator)
    ).length;

  return (
    indicatorDoraCount +
    (tile.red ? 1 : 0)
  );
}

function evaluateDiscard(
  input: CpuRiichiDecisionInput,
  tile: Tile,
  knownTiles: readonly Tile[]
): EvaluatedRiichiDiscard | null {
  const handAfterDiscard =
    input.player.hand.filter(
      (candidate) =>
        candidate.id !== tile.id
    );
  const waitTileTypes =
    getWinningTileTypes(
      handAfterDiscard,
      input.player.melds
    );

  if (waitTileTypes.length === 0) {
    return null;
  }

  return {
    decision: {
      discardTileId: tile.id,
      waitTileTypes,
      remainingWinningTileCount:
        countRemainingWinningTiles(
          waitTileTypes,
          knownTiles
        ),
      discardedDoraCount:
        countDiscardedDora(
          tile,
          input.doraIndicators
        )
    },
    discardsDrawnTile:
      tile.id ===
      input.player.drawnTileId
  };
}

export function chooseCpuRiichi(
  input: CpuRiichiDecisionInput
): CpuRiichiDecision | null {
  if (
    input.player.seat === 0 ||
    input.player.riichi ||
    input.player.drawnTileId === null ||
    input.riichiDiscardTileIds.length === 0
  ) {
    return null;
  }

  const candidateIdSet = new Set(
    input.riichiDiscardTileIds
  );
  const knownTiles = createKnownTiles(
    input
  );
  const candidates = input.player.hand
    .filter((tile) =>
      candidateIdSet.has(tile.id)
    )
    .map((tile) =>
      evaluateDiscard(
        input,
        tile,
        knownTiles
      )
    )
    .filter(
      (
        candidate
      ): candidate is EvaluatedRiichiDiscard =>
        candidate !== null
    )
    .sort((left, right) => {
      const remainingDifference =
        right.decision
          .remainingWinningTileCount -
        left.decision
          .remainingWinningTileCount;

      if (remainingDifference !== 0) {
        return remainingDifference;
      }

      const waitTypeDifference =
        right.decision.waitTileTypes.length -
        left.decision.waitTileTypes.length;

      if (waitTypeDifference !== 0) {
        return waitTypeDifference;
      }

      const doraDifference =
        left.decision.discardedDoraCount -
        right.decision.discardedDoraCount;

      if (doraDifference !== 0) {
        return doraDifference;
      }

      if (
        left.discardsDrawnTile !==
        right.discardsDrawnTile
      ) {
        return left.discardsDrawnTile
          ? -1
          : 1;
      }

      return left.decision.discardTileId
        .localeCompare(
          right.decision.discardTileId
        );
    });

  return candidates[0]?.decision ?? null;
}
