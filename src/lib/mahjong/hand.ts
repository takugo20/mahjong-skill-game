import type {
  Meld,
  NumberSuit,
  Tile,
  TileSuit
} from "./types";

export interface TileType {
  suit: TileSuit;
  rank: number;
}

export interface SequenceGroup {
  kind: "sequence";
  suit: NumberSuit;
  startRank: number;
}

export interface TripletGroup {
  kind: "triplet";
  tile: TileType;
}

export type ConcealedMeldGroup =
  | SequenceGroup
  | TripletGroup;

export interface StandardWinningDecomposition {
  kind: "standard";
  pair: TileType;
  concealedMelds: ConcealedMeldGroup[];
}

export interface SevenPairsWinningDecomposition {
  kind: "sevenPairs";
  pairs: TileType[];
}

export interface ThirteenOrphansWinningDecomposition {
  kind: "thirteenOrphans";
  pair: TileType;
}

export type WinningHandDecomposition =
  | StandardWinningDecomposition
  | SevenPairsWinningDecomposition
  | ThirteenOrphansWinningDecomposition;

export type WaitType =
  | "ryanmen"
  | "kanchan"
  | "penchan"
  | "shanpon"
  | "tanki"
  | "kokushiSingle"
  | "kokushiThirteenSided";

export interface ShantenResult {
  minimum: number;
  standard: number;
  sevenPairs: number | null;
  thirteenOrphans: number | null;
}

const SUIT_OFFSETS: Record<
  TileSuit,
  number
> = {
  man: 0,
  pin: 9,
  sou: 18,
  honor: 27
};

const YAOCHU_INDICES = [
  0,
  8,
  9,
  17,
  18,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33
];

const YAOCHU_INDEX_SET = new Set(
  YAOCHU_INDICES
);

export function getTileTypeIndex(
  tile: TileType
): number {
  const maximumRank =
    tile.suit === "honor" ? 7 : 9;

  if (
    !Number.isInteger(tile.rank) ||
    tile.rank < 1 ||
    tile.rank > maximumRank
  ) {
    throw new RangeError(
      `不正な牌種です: ${tile.suit}-${tile.rank}`
    );
  }

  return (
    SUIT_OFFSETS[tile.suit] +
    tile.rank -
    1
  );
}

export function getTileTypeFromIndex(
  index: number
): TileType {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 34
  ) {
    throw new RangeError(
      `不正な牌種インデックスです: ${index}`
    );
  }

  if (index < 9) {
    return {
      suit: "man",
      rank: index + 1
    };
  }

  if (index < 18) {
    return {
      suit: "pin",
      rank: index - 8
    };
  }

  if (index < 27) {
    return {
      suit: "sou",
      rank: index - 17
    };
  }

  return {
    suit: "honor",
    rank: index - 26
  };
}

export function createTileCounts(
  tiles: readonly Tile[]
): number[] {
  const counts = Array<number>(34).fill(0);

  for (const tile of tiles) {
    counts[getTileTypeIndex(tile)] += 1;
  }

  return counts;
}

function isSameTileType(
  left: TileType,
  right: TileType
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function getAllPhysicalTileCounts(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[]
): number[] {
  const meldTiles = melds.flatMap(
    (meld) => meld.tiles
  );

  return createTileCounts([
    ...concealedTiles,
    ...meldTiles
  ]);
}

function hasTooManyCopies(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[]
): boolean {
  return getAllPhysicalTileCounts(
    concealedTiles,
    melds
  ).some((count) => count > 4);
}

function findFirstTileIndex(
  counts: readonly number[]
): number {
  return counts.findIndex(
    (count) => count > 0
  );
}

function findConcealedMelds(
  counts: number[],
  requiredMeldCount: number,
  currentMelds: ConcealedMeldGroup[],
  results: ConcealedMeldGroup[][]
): void {
  const firstIndex =
    findFirstTileIndex(counts);

  if (firstIndex === -1) {
    if (
      currentMelds.length ===
      requiredMeldCount
    ) {
      results.push([...currentMelds]);
    }

    return;
  }

  if (
    currentMelds.length >=
    requiredMeldCount
  ) {
    return;
  }

  const firstType =
    getTileTypeFromIndex(firstIndex);

  if (counts[firstIndex] >= 3) {
    counts[firstIndex] -= 3;

    currentMelds.push({
      kind: "triplet",
      tile: firstType
    });

    findConcealedMelds(
      counts,
      requiredMeldCount,
      currentMelds,
      results
    );

    currentMelds.pop();
    counts[firstIndex] += 3;
  }

  if (
    firstType.suit !== "honor" &&
    firstType.rank <= 7 &&
    counts[firstIndex + 1] > 0 &&
    counts[firstIndex + 2] > 0
  ) {
    counts[firstIndex] -= 1;
    counts[firstIndex + 1] -= 1;
    counts[firstIndex + 2] -= 1;

    currentMelds.push({
      kind: "sequence",
      suit: firstType.suit,
      startRank: firstType.rank
    });

    findConcealedMelds(
      counts,
      requiredMeldCount,
      currentMelds,
      results
    );

    currentMelds.pop();
    counts[firstIndex] += 1;
    counts[firstIndex + 1] += 1;
    counts[firstIndex + 2] += 1;
  }
}

function getStandardDecompositions(
  counts: readonly number[],
  fixedMeldCount: number
): StandardWinningDecomposition[] {
  const requiredConcealedMeldCount =
    4 - fixedMeldCount;

  if (
    requiredConcealedMeldCount < 0 ||
    requiredConcealedMeldCount > 4
  ) {
    return [];
  }

  const results:
    StandardWinningDecomposition[] = [];

  for (
    let pairIndex = 0;
    pairIndex < 34;
    pairIndex += 1
  ) {
    if (counts[pairIndex] < 2) {
      continue;
    }

    const remainingCounts = [...counts];
    remainingCounts[pairIndex] -= 2;

    const meldResults:
      ConcealedMeldGroup[][] = [];

    findConcealedMelds(
      remainingCounts,
      requiredConcealedMeldCount,
      [],
      meldResults
    );

    for (const concealedMelds of meldResults) {
      results.push({
        kind: "standard",
        pair:
          getTileTypeFromIndex(pairIndex),
        concealedMelds
      });
    }
  }

  return results;
}

function getSevenPairsDecomposition(
  counts: readonly number[]
): SevenPairsWinningDecomposition | null {
  const tileCount = counts.reduce(
    (total, count) => total + count,
    0
  );

  if (tileCount !== 14) {
    return null;
  }

  const pairIndices = counts
    .map((count, index) => ({
      count,
      index
    }))
    .filter(({ count }) => count === 2)
    .map(({ index }) => index);

  if (pairIndices.length !== 7) {
    return null;
  }

  return {
    kind: "sevenPairs",
    pairs: pairIndices.map(
      getTileTypeFromIndex
    )
  };
}

function getThirteenOrphansDecomposition(
  counts: readonly number[]
): ThirteenOrphansWinningDecomposition | null {
  const tileCount = counts.reduce(
    (total, count) => total + count,
    0
  );

  if (tileCount !== 14) {
    return null;
  }

  for (
    let index = 0;
    index < 34;
    index += 1
  ) {
    if (
      !YAOCHU_INDEX_SET.has(index) &&
      counts[index] > 0
    ) {
      return null;
    }
  }

  if (
    YAOCHU_INDICES.some(
      (index) => counts[index] < 1
    )
  ) {
    return null;
  }

  const pairIndex = YAOCHU_INDICES.find(
    (index) => counts[index] === 2
  );

  if (pairIndex === undefined) {
    return null;
  }

  return {
    kind: "thirteenOrphans",
    pair:
      getTileTypeFromIndex(pairIndex)
  };
}

function getGroupKey(
  group: ConcealedMeldGroup
): string {
  if (group.kind === "sequence") {
    return (
      `sequence-${group.suit}-` +
      group.startRank
    );
  }

  return (
    `triplet-${group.tile.suit}-` +
    group.tile.rank
  );
}

function getDecompositionKey(
  decomposition: WinningHandDecomposition
): string {
  if (decomposition.kind === "standard") {
    const meldKey =
      decomposition.concealedMelds
        .map(getGroupKey)
        .sort()
        .join("/");

    return (
      `standard-${decomposition.pair.suit}-` +
      `${decomposition.pair.rank}-${meldKey}`
    );
  }

  if (
    decomposition.kind === "sevenPairs"
  ) {
    const pairKey = decomposition.pairs
      .map(
        (pair) =>
          `${pair.suit}-${pair.rank}`
      )
      .sort()
      .join("/");

    return `sevenPairs-${pairKey}`;
  }

  return (
    `thirteenOrphans-` +
    `${decomposition.pair.suit}-` +
    decomposition.pair.rank
  );
}

function removeDuplicateDecompositions(
  decompositions:
    WinningHandDecomposition[]
): WinningHandDecomposition[] {
  const keys = new Set<string>();

  return decompositions.filter(
    (decomposition) => {
      const key =
        getDecompositionKey(decomposition);

      if (keys.has(key)) {
        return false;
      }

      keys.add(key);
      return true;
    }
  );
}

export function getWinningHandDecompositions(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[] = []
): WinningHandDecomposition[] {
  if (
    melds.length > 4 ||
    hasTooManyCopies(
      concealedTiles,
      melds
    )
  ) {
    return [];
  }

  const counts =
    createTileCounts(concealedTiles);

  const decompositions:
    WinningHandDecomposition[] = [];

  const expectedConcealedTileCount =
    (4 - melds.length) * 3 + 2;

  if (
    concealedTiles.length ===
    expectedConcealedTileCount
  ) {
    decompositions.push(
      ...getStandardDecompositions(
        counts,
        melds.length
      )
    );
  }

  if (
    melds.length === 0 &&
    concealedTiles.length === 14
  ) {
    const sevenPairs =
      getSevenPairsDecomposition(counts);

    if (sevenPairs) {
      decompositions.push(sevenPairs);
    }

    const thirteenOrphans =
      getThirteenOrphansDecomposition(
        counts
      );

    if (thirteenOrphans) {
      decompositions.push(
        thirteenOrphans
      );
    }
  }

  return removeDuplicateDecompositions(
    decompositions
  );
}

export function isWinningHand(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[] = []
): boolean {
  return (
    getWinningHandDecompositions(
      concealedTiles,
      melds
    ).length > 0
  );
}

function calculateStandardShantenFromCounts(
  originalCounts: readonly number[],
  fixedMeldCount: number
): number {
  if (
    fixedMeldCount < 0 ||
    fixedMeldCount > 4
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const counts = [...originalCounts];
  const visited = new Set<string>();
  let best = 8;

  function search(
    concealedMeldCount: number,
    taatsuCount: number,
    pairUsed: boolean
  ): void {
    const totalMeldCount =
      fixedMeldCount +
      concealedMeldCount;

    if (totalMeldCount > 4) {
      return;
    }

    const stateKey = [
      counts.join(""),
      concealedMeldCount,
      taatsuCount,
      pairUsed ? 1 : 0
    ].join("|");

    if (visited.has(stateKey)) {
      return;
    }

    visited.add(stateKey);

    const firstIndex =
      findFirstTileIndex(counts);

    if (firstIndex === -1) {
      const usableTaatsuCount = Math.min(
        taatsuCount,
        Math.max(0, 4 - totalMeldCount)
      );

      const shanten =
        8 -
        totalMeldCount * 2 -
        usableTaatsuCount -
        (pairUsed ? 1 : 0);

      best = Math.min(best, shanten);
      return;
    }

    const firstType =
      getTileTypeFromIndex(firstIndex);

    if (
      totalMeldCount < 4 &&
      counts[firstIndex] >= 3
    ) {
      counts[firstIndex] -= 3;

      search(
        concealedMeldCount + 1,
        taatsuCount,
        pairUsed
      );

      counts[firstIndex] += 3;
    }

    if (
      totalMeldCount < 4 &&
      firstType.suit !== "honor" &&
      firstType.rank <= 7 &&
      counts[firstIndex + 1] > 0 &&
      counts[firstIndex + 2] > 0
    ) {
      counts[firstIndex] -= 1;
      counts[firstIndex + 1] -= 1;
      counts[firstIndex + 2] -= 1;

      search(
        concealedMeldCount + 1,
        taatsuCount,
        pairUsed
      );

      counts[firstIndex] += 1;
      counts[firstIndex + 1] += 1;
      counts[firstIndex + 2] += 1;
    }

    if (
      !pairUsed &&
      counts[firstIndex] >= 2
    ) {
      counts[firstIndex] -= 2;

      search(
        concealedMeldCount,
        taatsuCount,
        true
      );

      counts[firstIndex] += 2;
    }

    const canAddTaatsu =
      totalMeldCount + taatsuCount < 4;

    if (
      canAddTaatsu &&
      counts[firstIndex] >= 2
    ) {
      counts[firstIndex] -= 2;

      search(
        concealedMeldCount,
        taatsuCount + 1,
        pairUsed
      );

      counts[firstIndex] += 2;
    }

    if (
      canAddTaatsu &&
      firstType.suit !== "honor" &&
      firstType.rank <= 8 &&
      counts[firstIndex + 1] > 0
    ) {
      counts[firstIndex] -= 1;
      counts[firstIndex + 1] -= 1;

      search(
        concealedMeldCount,
        taatsuCount + 1,
        pairUsed
      );

      counts[firstIndex] += 1;
      counts[firstIndex + 1] += 1;
    }

    if (
      canAddTaatsu &&
      firstType.suit !== "honor" &&
      firstType.rank <= 7 &&
      counts[firstIndex + 2] > 0
    ) {
      counts[firstIndex] -= 1;
      counts[firstIndex + 2] -= 1;

      search(
        concealedMeldCount,
        taatsuCount + 1,
        pairUsed
      );

      counts[firstIndex] += 1;
      counts[firstIndex + 2] += 1;
    }

    counts[firstIndex] -= 1;

    search(
      concealedMeldCount,
      taatsuCount,
      pairUsed
    );

    counts[firstIndex] += 1;
  }

  search(0, 0, false);

  return best;
}

function calculateSevenPairsShanten(
  counts: readonly number[]
): number {
  const pairCount = counts.filter(
    (count) => count >= 2
  ).length;

  const distinctTileTypeCount =
    counts.filter(
      (count) => count > 0
    ).length;

  return (
    6 -
    pairCount +
    Math.max(
      0,
      7 - distinctTileTypeCount
    )
  );
}

function calculateThirteenOrphansShanten(
  counts: readonly number[]
): number {
  const distinctYaochuCount =
    YAOCHU_INDICES.filter(
      (index) => counts[index] > 0
    ).length;

  const hasYaochuPair =
    YAOCHU_INDICES.some(
      (index) => counts[index] >= 2
    );

  return (
    13 -
    distinctYaochuCount -
    (hasYaochuPair ? 1 : 0)
  );
}

export function calculateShanten(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[] = []
): ShantenResult {
  if (
    melds.length > 4 ||
    hasTooManyCopies(
      concealedTiles,
      melds
    )
  ) {
    return {
      minimum: Number.POSITIVE_INFINITY,
      standard:
        Number.POSITIVE_INFINITY,
      sevenPairs: null,
      thirteenOrphans: null
    };
  }

  const counts =
    createTileCounts(concealedTiles);

  const standard =
    calculateStandardShantenFromCounts(
      counts,
      melds.length
    );

  const sevenPairs =
    melds.length === 0
      ? calculateSevenPairsShanten(
          counts
        )
      : null;

  const thirteenOrphans =
    melds.length === 0
      ? calculateThirteenOrphansShanten(
          counts
        )
      : null;

  const candidates = [
    standard,
    sevenPairs,
    thirteenOrphans
  ].filter(
    (value): value is number =>
      value !== null
  );

  return {
    minimum: Math.min(...candidates),
    standard,
    sevenPairs,
    thirteenOrphans
  };
}

export function getWinningTileTypes(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[] = []
): TileType[] {
  const physicalCounts =
    getAllPhysicalTileCounts(
      concealedTiles,
      melds
    );

  const winningTileTypes: TileType[] = [];

  for (
    let index = 0;
    index < 34;
    index += 1
  ) {
    if (physicalCounts[index] >= 4) {
      continue;
    }

    const tileType =
      getTileTypeFromIndex(index);

    const candidateTile: Tile = {
      id:
        `winning-candidate-` +
        `${tileType.suit}-` +
        tileType.rank,
      suit: tileType.suit,
      rank: tileType.rank,
      red: false
    };

    if (
      isWinningHand(
        [
          ...concealedTiles,
          candidateTile
        ],
        melds
      )
    ) {
      winningTileTypes.push(tileType);
    }
  }

  return winningTileTypes;
}

export function isTenpai(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[] = []
): boolean {
  return (
    getWinningTileTypes(
      concealedTiles,
      melds
    ).length > 0
  );
}

function addWaitType(
  waitTypes: WaitType[],
  waitType: WaitType
): void {
  if (!waitTypes.includes(waitType)) {
    waitTypes.push(waitType);
  }
}

export function getWaitTypes(
  decomposition:
    WinningHandDecomposition,
  winningTile: TileType
): WaitType[] {
  if (
    decomposition.kind === "sevenPairs"
  ) {
    return ["tanki"];
  }

  if (
    decomposition.kind ===
    "thirteenOrphans"
  ) {
    return [
      isSameTileType(
        decomposition.pair,
        winningTile
      )
        ? "kokushiThirteenSided"
        : "kokushiSingle"
    ];
  }

  const waitTypes: WaitType[] = [];

  if (
    isSameTileType(
      decomposition.pair,
      winningTile
    )
  ) {
    addWaitType(waitTypes, "tanki");
  }

  for (
    const group of
    decomposition.concealedMelds
  ) {
    if (group.kind === "triplet") {
      if (
        isSameTileType(
          group.tile,
          winningTile
        )
      ) {
        addWaitType(
          waitTypes,
          "shanpon"
        );
      }

      continue;
    }

    if (
      group.suit !==
        winningTile.suit ||
      winningTile.rank <
        group.startRank ||
      winningTile.rank >
        group.startRank + 2
    ) {
      continue;
    }

    if (
      winningTile.rank ===
      group.startRank + 1
    ) {
      addWaitType(waitTypes, "kanchan");
      continue;
    }

    if (
      group.startRank === 1 &&
      winningTile.rank === 3
    ) {
      addWaitType(waitTypes, "penchan");
      continue;
    }

    if (
      group.startRank === 7 &&
      winningTile.rank === 7
    ) {
      addWaitType(waitTypes, "penchan");
      continue;
    }

    addWaitType(waitTypes, "ryanmen");
  }

  return waitTypes;
}
