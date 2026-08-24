import type {
  Meld,
  Tile,
  TileSuit
} from "./types";
import type { TileType } from "./hand";
import {
  isClosedHand
} from "./yaku";
import type {
  NormalYakuContext
} from "./yaku";

export type YakumanId =
  | "tenhou"
  | "chiihou"
  | "thirteenOrphans"
  | "thirteenOrphansThirteenSided"
  | "fourConcealedTriplets"
  | "fourConcealedTripletsSingleWait"
  | "bigThreeDragons"
  | "littleFourWinds"
  | "bigFourWinds"
  | "allHonors"
  | "allGreen"
  | "allTerminals"
  | "nineGates"
  | "pureNineGates"
  | "fourKans";

export interface YakumanResult {
  id: YakumanId;
  name: string;
  multiplier: 1 | 2;
}

export interface YakumanContext
  extends NormalYakuContext {
  tenhou?: boolean;
  chiihou?: boolean;
}

interface EvaluatedTriplet {
  tile: TileType;
  concealed: boolean;
  fromConcealedTiles: boolean;
}

const GREEN_TILE_KEYS = new Set([
  "sou-2",
  "sou-3",
  "sou-4",
  "sou-6",
  "sou-8",
  "honor-6"
]);

const NINE_GATES_BASE_COUNTS = [
  0,
  3,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  3
] as const;

function addYakuman(
  results: YakumanResult[],
  id: YakumanId,
  name: string,
  multiplier: 1 | 2
): void {
  if (
    results.some(
      (result) => result.id === id
    )
  ) {
    return;
  }

  results.push({
    id,
    name,
    multiplier
  });
}

function getAllPhysicalTiles(
  context: YakumanContext
): Tile[] {
  return [
    ...context.concealedTiles,
    ...context.melds.flatMap(
      (meld) => meld.tiles
    )
  ];
}

function getEvaluatedTriplets(
  context: YakumanContext
): EvaluatedTriplet[] {
  const triplets: EvaluatedTriplet[] = [];

  if (
    context.decomposition.kind ===
    "standard"
  ) {
    for (
      const group of
      context.decomposition
        .concealedMelds
    ) {
      if (group.kind !== "triplet") {
        continue;
      }

      triplets.push({
        tile: group.tile,
        concealed: true,
        fromConcealedTiles: true
      });
    }
  }

  for (const meld of context.melds) {
    if (meld.kind === "chi") {
      continue;
    }

    const firstTile = meld.tiles[0];

    if (!firstTile) {
      continue;
    }

    triplets.push({
      tile: {
        suit: firstTile.suit,
        rank: firstTile.rank
      },
      concealed:
        meld.kind === "closedKan",
      fromConcealedTiles: false
    });
  }

  return triplets;
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

function hasTriplet(
  triplets: readonly EvaluatedTriplet[],
  suit: TileSuit,
  rank: number
): boolean {
  return triplets.some(
    (triplet) =>
      triplet.tile.suit === suit &&
      triplet.tile.rank === rank
  );
}

function countConcealedTriplets(
  triplets: readonly EvaluatedTriplet[],
  context: YakumanContext
): number {
  return triplets.filter((triplet) => {
    if (!triplet.concealed) {
      return false;
    }

    const completedByRon =
      triplet.fromConcealedTiles &&
      context.winMethod === "ron" &&
      context.waitType === "shanpon" &&
      isSameTileType(
        triplet.tile,
        context.winningTile
      );

    return !completedByRon;
  }).length;
}

function isKan(meld: Meld): boolean {
  return (
    meld.kind === "openKan" ||
    meld.kind === "closedKan" ||
    meld.kind === "addedKan"
  );
}

function isGreenTile(tile: Tile): boolean {
  return GREEN_TILE_KEYS.has(
    `${tile.suit}-${tile.rank}`
  );
}

function isTerminal(tile: Tile): boolean {
  return (
    tile.suit !== "honor" &&
    (tile.rank === 1 || tile.rank === 9)
  );
}

function getNineGatesInfo(
  context: YakumanContext,
  allTiles: readonly Tile[]
): { pure: boolean } | null {
  const closed =
    isClosedHand(context.melds) ||
    context.treatAsClosed === true;

  if (
    !closed ||
    context.decomposition.kind !==
      "standard" ||
    allTiles.length !== 14
  ) {
    return null;
  }

  const firstTile = allTiles[0];

  if (
    !firstTile ||
    firstTile.suit === "honor" ||
    allTiles.some(
      (tile) =>
        tile.suit !== firstTile.suit
    )
  ) {
    return null;
  }

  const counts =
    Array<number>(10).fill(0);

  for (const tile of allTiles) {
    if (
      tile.rank < 1 ||
      tile.rank > 9
    ) {
      return null;
    }

    counts[tile.rank] += 1;
  }

  for (
    let rank = 1;
    rank <= 9;
    rank += 1
  ) {
    if (
      counts[rank] <
      NINE_GATES_BASE_COUNTS[rank]
    ) {
      return null;
    }
  }

  let pure = false;

  if (
    context.winningTile.suit ===
      firstTile.suit &&
    context.winningTile.rank >= 1 &&
    context.winningTile.rank <= 9 &&
    counts[
      context.winningTile.rank
    ] > 0
  ) {
    const countsBeforeWin = [
      ...counts
    ];

    countsBeforeWin[
      context.winningTile.rank
    ] -= 1;

    pure = Array.from(
      { length: 9 },
      (_, index) => index + 1
    ).every(
      (rank) =>
        countsBeforeWin[rank] ===
        NINE_GATES_BASE_COUNTS[rank]
    );
  }

  return { pure };
}

export function evaluateYakuman(
  context: YakumanContext
): YakumanResult[] {
  const results: YakumanResult[] = [];

  const allTiles =
    getAllPhysicalTiles(context);

  const triplets =
    getEvaluatedTriplets(context);

  if (
    context.tenhou &&
    context.winMethod === "tsumo" &&
    context.seatWind === "east"
  ) {
    addYakuman(
      results,
      "tenhou",
      "天和",
      1
    );
  } else if (
    context.chiihou &&
    context.winMethod === "tsumo" &&
    context.seatWind !== "east"
  ) {
    addYakuman(
      results,
      "chiihou",
      "地和",
      1
    );
  }

  if (
    context.decomposition.kind ===
    "thirteenOrphans"
  ) {
    if (
      context.waitType ===
      "kokushiThirteenSided"
    ) {
      addYakuman(
        results,
        "thirteenOrphansThirteenSided",
        "国士無双十三面待ち",
        2
      );
    } else {
      addYakuman(
        results,
        "thirteenOrphans",
        "国士無双",
        1
      );
    }
  }

  if (
    context.decomposition.kind ===
      "standard" &&
    countConcealedTriplets(
      triplets,
      context
    ) === 4
  ) {
    if (context.waitType === "tanki") {
      addYakuman(
        results,
        "fourConcealedTripletsSingleWait",
        "四暗刻単騎",
        2
      );
    } else {
      addYakuman(
        results,
        "fourConcealedTriplets",
        "四暗刻",
        1
      );
    }
  }

  if (
    [5, 6, 7].every((rank) =>
      hasTriplet(
        triplets,
        "honor",
        rank
      )
    )
  ) {
    addYakuman(
      results,
      "bigThreeDragons",
      "大三元",
      1
    );
  }

  const windTripletCount = [
    1,
    2,
    3,
    4
  ].filter((rank) =>
    hasTriplet(
      triplets,
      "honor",
      rank
    )
  ).length;

  const pair =
    context.decomposition.kind ===
    "standard"
      ? context.decomposition.pair
      : null;

  if (windTripletCount === 4) {
    addYakuman(
      results,
      "bigFourWinds",
      "大四喜",
      2
    );
  } else if (
    windTripletCount === 3 &&
    pair?.suit === "honor" &&
    pair.rank >= 1 &&
    pair.rank <= 4
  ) {
    addYakuman(
      results,
      "littleFourWinds",
      "小四喜",
      1
    );
  }

  if (
    allTiles.length > 0 &&
    allTiles.every(
      (tile) =>
        tile.suit === "honor"
    )
  ) {
    addYakuman(
      results,
      "allHonors",
      "字一色",
      1
    );
  }

  if (
    allTiles.length > 0 &&
    allTiles.every(isGreenTile)
  ) {
    addYakuman(
      results,
      "allGreen",
      "緑一色",
      1
    );
  }

  if (
    allTiles.length > 0 &&
    allTiles.every(isTerminal)
  ) {
    addYakuman(
      results,
      "allTerminals",
      "清老頭",
      1
    );
  }

  const nineGates =
    getNineGatesInfo(
      context,
      allTiles
    );

  if (nineGates?.pure) {
    addYakuman(
      results,
      "pureNineGates",
      "純正九蓮宝燈",
      2
    );
  } else if (nineGates) {
    addYakuman(
      results,
      "nineGates",
      "九蓮宝燈",
      1
    );
  }

  if (
    context.melds.filter(isKan)
      .length === 4
  ) {
    addYakuman(
      results,
      "fourKans",
      "四槓子",
      1
    );
  }

  return results;
}

export function getYakumanMultiplier(
  results: readonly YakumanResult[]
): number {
  return results.reduce(
    (total, result) =>
      total + result.multiplier,
    0
  );
}
