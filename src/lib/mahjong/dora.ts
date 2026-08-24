import type {
  Meld,
  Tile
} from "./types";
import type {
  TileType
} from "./hand";

export type BonusHanId =
  | "dora"
  | "uraDora"
  | "redDora";

export interface BonusHanResult {
  id: BonusHanId;
  name: string;
  han: number;
}

export interface DoraCalculationInput {
  concealedTiles: readonly Tile[];
  melds?: readonly Meld[];
  doraIndicators?: readonly TileType[];
  uraDoraIndicators?: readonly TileType[];
  riichi?: boolean;
  doubleRiichi?: boolean;
}

export interface DoraCalculationResult {
  dora: number;
  uraDora: number;
  redDora: number;
  totalHan: number;
  bonuses: BonusHanResult[];
}

function validateIndicator(
  indicator: TileType
): void {
  const valid =
    indicator.suit === "honor"
      ? indicator.rank >= 1 &&
        indicator.rank <= 7
      : indicator.rank >= 1 &&
        indicator.rank <= 9;

  if (!valid) {
    throw new Error(
      `不正なドラ表示牌です: ${indicator.suit}-${indicator.rank}`
    );
  }
}

export function getDoraTileType(
  indicator: TileType
): TileType {
  validateIndicator(indicator);

  if (indicator.suit !== "honor") {
    return {
      suit: indicator.suit,
      rank:
        indicator.rank === 9
          ? 1
          : indicator.rank + 1
    };
  }

  if (indicator.rank <= 4) {
    return {
      suit: "honor",
      rank:
        indicator.rank === 4
          ? 1
          : indicator.rank + 1
    };
  }

  return {
    suit: "honor",
    rank:
      indicator.rank === 7
        ? 5
        : indicator.rank + 1
  };
}

function isSameTileType(
  tile: Tile,
  tileType: TileType
): boolean {
  return (
    tile.suit === tileType.suit &&
    tile.rank === tileType.rank
  );
}

function getAllPhysicalTiles(
  input: DoraCalculationInput
): Tile[] {
  return [
    ...input.concealedTiles,
    ...(input.melds ?? []).flatMap(
      (meld) => meld.tiles
    )
  ];
}

function countIndicatorDora(
  tiles: readonly Tile[],
  indicators: readonly TileType[]
): number {
  return indicators.reduce(
    (total, indicator) => {
      const dora =
        getDoraTileType(indicator);

      return total + tiles.filter(
        (tile) =>
          isSameTileType(tile, dora)
      ).length;
    },
    0
  );
}

function addBonus(
  bonuses: BonusHanResult[],
  id: BonusHanId,
  name: string,
  han: number
): void {
  if (han <= 0) {
    return;
  }

  bonuses.push({
    id,
    name,
    han
  });
}

export function calculateDora(
  input: DoraCalculationInput
): DoraCalculationResult {
  const allTiles =
    getAllPhysicalTiles(input);

  const dora = countIndicatorDora(
    allTiles,
    input.doraIndicators ?? []
  );

  const uraDoraEnabled =
    input.riichi === true ||
    input.doubleRiichi === true;

  const uraDora = uraDoraEnabled
    ? countIndicatorDora(
        allTiles,
        input.uraDoraIndicators ?? []
      )
    : 0;

  const redDora = allTiles.filter(
    (tile) => tile.red
  ).length;

  const bonuses: BonusHanResult[] = [];

  addBonus(
    bonuses,
    "dora",
    "ドラ",
    dora
  );

  addBonus(
    bonuses,
    "uraDora",
    "裏ドラ",
    uraDora
  );

  addBonus(
    bonuses,
    "redDora",
    "赤ドラ",
    redDora
  );

  return {
    dora,
    uraDora,
    redDora,
    totalHan:
      dora + uraDora + redDora,
    bonuses
  };
}
