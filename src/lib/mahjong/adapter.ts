import type {
  TileType
} from "./hand";
import type {
  Meld,
  MeldKind,
  Tile,
  TileSuit,
  Wind
} from "./types";

export type BoardNumberSuit =
  | "m"
  | "p"
  | "s";

export type BoardTileSuit =
  | BoardNumberSuit
  | "z";

export type BoardWind =
  | "東"
  | "南"
  | "西"
  | "北";

export interface BoardTile {
  id: string;
  suit: BoardTileSuit;
  rank: number;
  copy: number;
  isRed: boolean;
}

export interface BoardMeld {
  kind: MeldKind;
  tiles: readonly BoardTile[];
}

const RULE_SUIT_BY_BOARD_SUIT:
  Record<BoardTileSuit, TileSuit> = {
    m: "man",
    p: "pin",
    s: "sou",
    z: "honor"
  };

const BOARD_SUIT_BY_RULE_SUIT:
  Record<TileSuit, BoardTileSuit> = {
    man: "m",
    pin: "p",
    sou: "s",
    honor: "z"
  };

const RULE_WIND_BY_BOARD_WIND:
  Record<BoardWind, Wind> = {
    東: "east",
    南: "south",
    西: "west",
    北: "north"
  };

const BOARD_WIND_BY_RULE_WIND:
  Record<Wind, BoardWind> = {
    east: "東",
    south: "南",
    west: "西",
    north: "北"
  };

function validateRank(
  suit: TileSuit,
  rank: number
): void {
  const maximum =
    suit === "honor" ? 7 : 9;

  if (
    !Number.isInteger(rank) ||
    rank < 1 ||
    rank > maximum
  ) {
    throw new Error(
      `${suit}-${rank}は有効な牌種ではありません`
    );
  }
}

export function toRuleTileSuit(
  suit: BoardTileSuit
): TileSuit {
  return RULE_SUIT_BY_BOARD_SUIT[suit];
}

export function toBoardTileSuit(
  suit: TileSuit
): BoardTileSuit {
  return BOARD_SUIT_BY_RULE_SUIT[suit];
}

export function toRuleWind(
  wind: BoardWind
): Wind {
  return RULE_WIND_BY_BOARD_WIND[wind];
}

export function toBoardWind(
  wind: Wind
): BoardWind {
  return BOARD_WIND_BY_RULE_WIND[wind];
}

export function toRuleTile(
  tile: BoardTile
): Tile {
  const suit = toRuleTileSuit(
    tile.suit
  );

  validateRank(suit, tile.rank);

  return {
    id: tile.id,
    suit,
    rank: tile.rank,
    red: tile.isRed
  };
}

export function toRuleTiles(
  tiles: readonly BoardTile[]
): Tile[] {
  return tiles.map(toRuleTile);
}

export function toRuleTileType(
  tile: Pick<
    BoardTile,
    "suit" | "rank"
  >
): TileType {
  const suit = toRuleTileSuit(
    tile.suit
  );

  validateRank(suit, tile.rank);

  return {
    suit,
    rank: tile.rank
  };
}

export function toRuleMeld(
  meld: BoardMeld
): Meld {
  return {
    kind: meld.kind,
    tiles: toRuleTiles(meld.tiles)
  };
}

export function toRuleMelds(
  melds: readonly BoardMeld[]
): Meld[] {
  return melds.map(toRuleMeld);
}

export function toBoardTile(
  tile: Tile,
  copy = 0
): BoardTile {
  validateRank(tile.suit, tile.rank);

  if (
    !Number.isInteger(copy) ||
    copy < 0 ||
    copy > 3
  ) {
    throw new Error(
      "物理牌の複製番号は0から3で指定してください"
    );
  }

  return {
    id: tile.id,
    suit: toBoardTileSuit(tile.suit),
    rank: tile.rank,
    copy,
    isRed: tile.red
  };
}
