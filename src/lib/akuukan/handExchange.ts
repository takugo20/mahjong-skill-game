import type {
  Tile
} from "../mahjong/types";

const DORA_INDICATOR_INDEXES = [
  4,
  6,
  8,
  10,
  12
] as const;

export type AkuukanHandExchangeWallSource =
  | "liveWall"
  | "deadWall";

export interface AkuukanHandExchangeWallCandidate {
  readonly source:
    AkuukanHandExchangeWallSource;
  readonly index: number;
  readonly tile: Tile;
}

export interface AkuukanHandExchangeWallCandidateInput {
  readonly liveWall: readonly Tile[];
  readonly deadWall: readonly Tile[];
  readonly doraIndicatorCount: number;
  readonly rinshanDrawCount: number;
  readonly acceptsTile?: (
    tile: Tile
  ) => boolean;
}

function getConfirmedDoraIndicatorIndexes(
  doraIndicatorCount: number
): ReadonlySet<number> {
  if (
    !Number.isSafeInteger(
      doraIndicatorCount
    ) ||
    doraIndicatorCount < 0 ||
    doraIndicatorCount >
      DORA_INDICATOR_INDEXES.length
  ) {
    throw new Error(
      "ドラ表示牌数が不正です。"
    );
  }

  return new Set(
    DORA_INDICATOR_INDEXES.slice(
      0,
      doraIndicatorCount
    )
  );
}

function validateRinshanDrawCount(
  rinshanDrawCount: number
): void {
  if (
    !Number.isSafeInteger(
      rinshanDrawCount
    ) ||
    rinshanDrawCount < 0 ||
    rinshanDrawCount > 4
  ) {
    throw new Error(
      "嶺上牌取得回数が不正です。"
    );
  }
}

export function getAkuukanHandExchangeWallCandidates(
  input: AkuukanHandExchangeWallCandidateInput
): AkuukanHandExchangeWallCandidate[] {
  const confirmedDoraIndicatorIndexes =
    getConfirmedDoraIndicatorIndexes(
      input.doraIndicatorCount
    );
  validateRinshanDrawCount(
    input.rinshanDrawCount
  );

  const acceptsTile =
    input.acceptsTile ?? (() => true);
  const liveWallCandidates =
    input.liveWall
      .map((tile, index) => ({
        source: "liveWall" as const,
        index,
        tile
      }))
      .filter((candidate) =>
        acceptsTile(candidate.tile)
      );
  const deadWallCandidates =
    input.deadWall
      .map((tile, index) => ({
        source: "deadWall" as const,
        index,
        tile
      }))
      .filter(
        (candidate) =>
          candidate.index >=
            input.rinshanDrawCount &&
          !confirmedDoraIndicatorIndexes.has(
            candidate.index
          ) &&
          acceptsTile(candidate.tile)
      );

  return [
    ...liveWallCandidates,
    ...deadWallCandidates
  ];
}

export interface AkuukanHandExchangeInput
  extends AkuukanHandExchangeWallCandidateInput {
  readonly hand: readonly Tile[];
  readonly selectedTileIds:
    readonly string[];
  readonly maximumExchangeTileCount: number;
  readonly random: () => number;
}

export interface AkuukanHandExchangeRecord {
  readonly outgoingTile: Tile;
  readonly incomingTile: Tile;
  readonly source:
    AkuukanHandExchangeWallSource;
}

export interface AkuukanHandExchangeResult {
  readonly hand: Tile[];
  readonly liveWall: Tile[];
  readonly deadWall: Tile[];
  readonly exchanges:
    AkuukanHandExchangeRecord[];
}

function validateSelectedHandTiles(
  input: AkuukanHandExchangeInput
): Tile[] {
  if (
    !Number.isSafeInteger(
      input.maximumExchangeTileCount
    ) ||
    input.maximumExchangeTileCount < 1
  ) {
    throw new Error(
      "交換可能枚数が不正です。"
    );
  }

  if (
    input.selectedTileIds.length < 1 ||
    input.selectedTileIds.length >
      input.maximumExchangeTileCount
  ) {
    throw new Error(
      "選択した交換牌の枚数が不正です。"
    );
  }

  if (
    new Set(input.selectedTileIds).size !==
    input.selectedTileIds.length
  ) {
    throw new Error(
      "同じ手牌を重複して選択しています。"
    );
  }

  return input.selectedTileIds.map(
    (tileId) => {
      const tile = input.hand.find(
        (candidate) =>
          candidate.id === tileId
      );

      if (!tile) {
        throw new Error(
          "選択した交換牌が手牌にありません。"
        );
      }

      return tile;
    }
  );
}

function getRandomIndex(
  length: number,
  random: () => number
): number {
  const value = random();

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value >= 1
  ) {
    throw new Error(
      "乱数値が不正です。"
    );
  }

  return Math.floor(value * length);
}

function shuffleTilesAtIndexes(
  tiles: readonly Tile[],
  indexes: readonly number[],
  random: () => number
): Tile[] {
  const result = [...tiles];

  for (
    let position = indexes.length - 1;
    position > 0;
    position -= 1
  ) {
    const targetPosition = getRandomIndex(
      position + 1,
      random
    );
    const currentIndex = indexes[position];
    const targetIndex = indexes[targetPosition];
    const currentTile = result[currentIndex];
    result[currentIndex] = result[targetIndex];
    result[targetIndex] = currentTile;
  }

  return result;
}export function exchangeAkuukanHandTilesWithWall(
  input: AkuukanHandExchangeInput
): AkuukanHandExchangeResult {
  const selectedTiles =
    validateSelectedHandTiles(input);
  const availableCandidates =
    getAkuukanHandExchangeWallCandidates(
      input
    );
  const exchangeCount = Math.min(
    selectedTiles.length,
    availableCandidates.length
  );
  const remainingCandidates = [
    ...availableCandidates
  ];
  const selectedCandidates:
    AkuukanHandExchangeWallCandidate[] = [];

  for (
    let index = 0;
    index < exchangeCount;
    index += 1
  ) {
    const candidateIndex = getRandomIndex(
      remainingCandidates.length,
      input.random
    );
    const [candidate] =
      remainingCandidates.splice(
        candidateIndex,
        1
      );
    selectedCandidates.push(candidate);
  }

  let liveWall = [...input.liveWall];
  let deadWall = [...input.deadWall];
  const incomingByOutgoingId =
    new Map<string, Tile>();
  const exchanges:
    AkuukanHandExchangeRecord[] = [];

  for (
    let index = 0;
    index < exchangeCount;
    index += 1
  ) {
    const outgoingTile =
      selectedTiles[index];
    const candidate =
      selectedCandidates[index];

    incomingByOutgoingId.set(
      outgoingTile.id,
      candidate.tile
    );
    exchanges.push({
      outgoingTile,
      incomingTile: candidate.tile,
      source: candidate.source
    });

    if (candidate.source === "liveWall") {
      liveWall[candidate.index] =
        outgoingTile;
    } else {
      deadWall[candidate.index] =
        outgoingTile;
    }
  }

  if (
    exchanges.some(
      (exchange) =>
        exchange.source === "liveWall"
    )
  ) {
    liveWall = shuffleTilesAtIndexes(
      liveWall,
      liveWall.map((_, index) => index),
      input.random
    );
  }

  if (
    exchanges.some(
      (exchange) =>
        exchange.source === "deadWall"
    )
  ) {
    const deadWallShuffleIndexes =
      getAkuukanHandExchangeWallCandidates({
        liveWall: [],
        deadWall,
        doraIndicatorCount:
          input.doraIndicatorCount,
        rinshanDrawCount:
          input.rinshanDrawCount
      }).map(
        (candidate) => candidate.index
      );
    deadWall = shuffleTilesAtIndexes(
      deadWall,
      deadWallShuffleIndexes,
      input.random
    );
  }

  return {
    hand: input.hand.map(
      (tile) =>
        incomingByOutgoingId.get(
          tile.id
        ) ?? tile
    ),
    liveWall,
    deadWall,
    exchanges
  };
}
