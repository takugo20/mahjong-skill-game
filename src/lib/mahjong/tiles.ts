import type {
  NumberSuit,
  Tile,
  TileSuit
} from "./types";

const NUMBER_SUITS: NumberSuit[] = [
  "man",
  "pin",
  "sou"
];

const JAPANESE_NUMBERS = [
  "",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九"
];

const HONOR_NAMES = [
  "",
  "東",
  "南",
  "西",
  "北",
  "白",
  "發",
  "中"
];

const SUIT_NAMES: Record<NumberSuit, string> = {
  man: "萬",
  pin: "筒",
  sou: "索"
};

const SUIT_ORDER: Record<TileSuit, number> = {
  man: 0,
  pin: 1,
  sou: 2,
  honor: 3
};

export function createFullTileSet(): Tile[] {
  const tiles: Tile[] = [];

  for (const suit of NUMBER_SUITS) {
    for (let rank = 1; rank <= 9; rank += 1) {
      for (let copy = 0; copy < 4; copy += 1) {
        tiles.push({
          id: `${suit}-${rank}-${copy}`,
          suit,
          rank,
          red: rank === 5 && copy === 0
        });
      }
    }
  }

  for (let rank = 1; rank <= 7; rank += 1) {
    for (let copy = 0; copy < 4; copy += 1) {
      tiles.push({
        id: `honor-${rank}-${copy}`,
        suit: "honor",
        rank,
        red: false
      });
    }
  }

  return tiles;
}

export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((left, right) => {
    const suitDifference =
      SUIT_ORDER[left.suit] - SUIT_ORDER[right.suit];

    if (suitDifference !== 0) {
      return suitDifference;
    }

    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    if (left.red !== right.red) {
      return left.red ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });
}

export function getTileLabel(tile: Tile): string {
  if (tile.suit === "honor") {
    return HONOR_NAMES[tile.rank] ?? "?";
  }

  const number = JAPANESE_NUMBERS[tile.rank] ?? "?";
  const suit = SUIT_NAMES[tile.suit];

  return `${tile.red ? "赤" : ""}${number}${suit}`;
}

export function getTileFace(tile: Tile): string {
  if (tile.suit === "honor") {
    return HONOR_NAMES[tile.rank] ?? "?";
  }

  return String(tile.rank);
}

export function getTileSuitLabel(tile: Tile): string {
  if (tile.suit === "honor") {
    return "";
  }

  return SUIT_NAMES[tile.suit];
}

export function getTileTypeKey(tile: Tile): string {
  return `${tile.suit}-${tile.rank}`;
}

export function isSameTileType(
  left: Tile,
  right: Tile
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

export function isHonor(tile: Tile): boolean {
  return tile.suit === "honor";
}

export function isTerminal(tile: Tile): boolean {
  return (
    tile.suit !== "honor" &&
    (tile.rank === 1 || tile.rank === 9)
  );
}

export function isYaochu(tile: Tile): boolean {
  return isHonor(tile) || isTerminal(tile);
}

export function getDoraType(
  indicator: Tile
): Pick<Tile, "suit" | "rank"> {
  if (indicator.suit !== "honor") {
    return {
      suit: indicator.suit,
      rank: indicator.rank === 9
        ? 1
        : indicator.rank + 1
    };
  }

  if (indicator.rank <= 4) {
    return {
      suit: "honor",
      rank: indicator.rank === 4
        ? 1
        : indicator.rank + 1
    };
  }

  return {
    suit: "honor",
    rank: indicator.rank === 7
      ? 5
      : indicator.rank + 1
  };
}

export function isDora(
  tile: Tile,
  indicator: Tile
): boolean {
  const dora = getDoraType(indicator);

  return (
    tile.suit === dora.suit &&
    tile.rank === dora.rank
  );
}
