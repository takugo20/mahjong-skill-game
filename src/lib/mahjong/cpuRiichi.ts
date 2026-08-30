import {
  calculateShanten,
  getTileTypeFromIndex,
  getWinningTileTypes
} from "./hand";
import type {
  TileType
} from "./hand";
import {
  isDora
} from "./tiles";
import type {
  Meld,
  PlayerState,
  Tile
} from "./types";

const ONE_SHANTEN_RIICHI_PROBABILITY =
  0.9;
const TWO_SHANTEN_RIICHI_PROBABILITY =
  0.5;
const TWO_SHANTEN_EARLY_DISCARD_LIMIT =
  5;

export interface CpuRiichiDecisionInput {
  player: PlayerState;
  riichiDiscardTileIds:
    readonly string[];
  doraIndicators: readonly Tile[];
  visibleTiles?: readonly Tile[];
  allowNotenRiichi?: boolean;
  random?: () => number;
}

export interface CpuPostRiichiDiscardInput {
  player: PlayerState;
  doraIndicators: readonly Tile[];
  visibleTiles?: readonly Tile[];
}

export interface CpuRiichiDecision {
  discardTileId: string;
  shanten: number;
  waitTileTypes: TileType[];
  remainingWinningTileCount: number;
  improvingTileTypes: TileType[];
  remainingImprovingTileCount: number;
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

function countKnownTileType(
  tileType: TileType,
  knownTiles: readonly Tile[]
): number {
  return knownTiles.filter(
    (tile) =>
      isSameTileType(tile, tileType)
  ).length;
}

function countRemainingTiles(
  tileTypes: readonly TileType[],
  knownTiles: readonly Tile[]
): number {
  return tileTypes.reduce(
    (total, tileType) =>
      total +
      Math.max(
        0,
        4 -
          countKnownTileType(
            tileType,
            knownTiles
          )
      ),
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

function getImprovingTileTypes(
  handAfterDiscard: readonly Tile[],
  melds: readonly Meld[],
  shanten: number,
  knownTiles: readonly Tile[]
): TileType[] {
  if (shanten === 0) {
    return getWinningTileTypes(
      handAfterDiscard,
      melds
    );
  }

  const improvingTileTypes: TileType[] =
    [];

  for (
    let index = 0;
    index < 34;
    index += 1
  ) {
    const tileType =
      getTileTypeFromIndex(index);

    if (
      countKnownTileType(
        tileType,
        knownTiles
      ) >= 4
    ) {
      continue;
    }

    const candidateTile: Tile = {
      id:
        `cpu-riichi-improving-` +
        index,
      suit: tileType.suit,
      rank: tileType.rank,
      red: false
    };
    const nextShanten =
      calculateShanten(
        [
          ...handAfterDiscard,
          candidateTile
        ],
        melds
      ).minimum;

    if (nextShanten < shanten) {
      improvingTileTypes.push(tileType);
    }
  }

  return improvingTileTypes;
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
  const shanten = calculateShanten(
    handAfterDiscard,
    input.player.melds
  ).minimum;

  if (!Number.isFinite(shanten)) {
    return null;
  }

  const waitTileTypes =
    shanten === 0
      ? getWinningTileTypes(
          handAfterDiscard,
          input.player.melds
        )
      : [];
  const improvingTileTypes =
    getImprovingTileTypes(
      handAfterDiscard,
      input.player.melds,
      shanten,
      knownTiles
    );
  const remainingImprovingTileCount =
    countRemainingTiles(
      improvingTileTypes,
      knownTiles
    );

  return {
    decision: {
      discardTileId: tile.id,
      shanten,
      waitTileTypes,
      remainingWinningTileCount:
        shanten === 0
          ? remainingImprovingTileCount
          : 0,
      improvingTileTypes,
      remainingImprovingTileCount,
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

function isRiichiCandidateAllowed(
  input: CpuRiichiDecisionInput,
  candidate: EvaluatedRiichiDiscard
): boolean {
  if (candidate.decision.shanten === 0) {
    return true;
  }

  return (
    input.allowNotenRiichi === true &&
    candidate.decision.shanten >= 1 &&
    candidate.decision.shanten <= 2
  );
}

function compareRiichiCandidates(
  left: EvaluatedRiichiDiscard,
  right: EvaluatedRiichiDiscard
): number {
  const shantenDifference =
    left.decision.shanten -
    right.decision.shanten;

  if (shantenDifference !== 0) {
    return shantenDifference;
  }

  const remainingDifference =
    right.decision
      .remainingImprovingTileCount -
    left.decision
      .remainingImprovingTileCount;

  if (remainingDifference !== 0) {
    return remainingDifference;
  }

  const improvingTypeDifference =
    right.decision.improvingTileTypes
      .length -
    left.decision.improvingTileTypes
      .length;

  if (improvingTypeDifference !== 0) {
    return improvingTypeDifference;
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
}

function shouldDeclareRiichi(
  input: CpuRiichiDecisionInput,
  decision: CpuRiichiDecision
): boolean {
  if (decision.shanten === 0) {
    return true;
  }

  const random = input.random ?? Math.random;

  if (decision.shanten === 1) {
    return (
      random() <
      ONE_SHANTEN_RIICHI_PROBABILITY
    );
  }

  if (
    decision.shanten === 2 &&
    input.player.discards.length <=
      TWO_SHANTEN_EARLY_DISCARD_LIMIT
  ) {
    return (
      random() <
      TWO_SHANTEN_RIICHI_PROBABILITY
    );
  }

  return false;
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
    .filter((candidate) =>
      isRiichiCandidateAllowed(
        input,
        candidate
      )
    )
    .sort(compareRiichiCandidates);
  const decision =
    candidates[0]?.decision ?? null;

  if (
    decision === null ||
    !shouldDeclareRiichi(
      input,
      decision
    )
  ) {
    return null;
  }

  return decision;
}

export function chooseCpuPostRiichiDiscard(
  input: CpuPostRiichiDiscardInput
): CpuRiichiDecision | null {
  if (
    input.player.seat === 0 ||
    !input.player.riichi ||
    input.player.drawnTileId === null
  ) {
    return null;
  }

  const evaluationInput:
    CpuRiichiDecisionInput = {
      player: input.player,
      riichiDiscardTileIds:
        input.player.hand.map(
          (tile) => tile.id
        ),
      doraIndicators:
        input.doraIndicators,
      visibleTiles: input.visibleTiles
    };
  const knownTiles = createKnownTiles(
    evaluationInput
  );
  const candidates = input.player.hand
    .map((tile) =>
      evaluateDiscard(
        evaluationInput,
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
    .sort(compareRiichiCandidates);

  return candidates[0]?.decision ?? null;
}
