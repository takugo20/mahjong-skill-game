import {
  describe,
  expect,
  it
} from "vitest";
import {
  getRiichiClosedKanAllowedTileTypes
} from "./riichiKan";
import type {
  Meld,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `riichi-kan-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createClosedKan(
  suit: TileSuit,
  rank: number
): Meld {
  return {
    kind: "closedKan",
    tiles: createTiles(
      suit,
      [rank, rank, rank, rank]
    )
  };
}

function getAllowedTileTypes(
  concealedTiles: Tile[],
  drawnTile: Tile,
  melds: Meld[] = []
) {
  return getRiichiClosedKanAllowedTileTypes({
    concealedTiles,
    melds,
    drawnTileId: drawnTile.id,
    seatWind: "south",
    prevailingWind: "east"
  });
}

describe("立直後の暗槓条件", () => {
  it("ツモ牌で完成し待ち・面子構成・役が変わらない暗槓を認める", () => {
    const drawnTile =
      createTile("man", 1);
    const concealedTiles = [
      ...createTiles(
        "man",
        [1, 1, 1, 2, 3, 4]
      ),
      ...createTiles(
        "pin",
        [4, 5, 6]
      ),
      ...createTiles(
        "sou",
        [7, 8]
      ),
      ...createTiles(
        "honor",
        [5, 5]
      ),
      drawnTile
    ];

    expect(
      getAllowedTileTypes(
        concealedTiles,
        drawnTile
      )
    ).toEqual([{
      suit: "man",
      rank: 1
    }]);
  });

  it("ツモ牌以外の4枚による送り槓を認めない", () => {
    const drawnTile =
      createTile("honor", 7);
    const concealedTiles = [
      ...createTiles(
        "sou",
        [1, 1, 1, 1, 2, 3]
      ),
      ...createTiles(
        "pin",
        [4, 5, 6]
      ),
      ...createTiles(
        "man",
        [7, 8, 9]
      ),
      createTile("honor", 5),
      drawnTile
    ];

    expect(
      getAllowedTileTypes(
        concealedTiles,
        drawnTile
      )
    ).toEqual([]);
  });

  it("暗槓前後で和了牌が変わる場合は認めない", () => {
    const drawnTile =
      createTile("man", 5);
    const concealedTiles = [
      ...createTiles(
        "man",
        [4, 5, 5, 5]
      ),
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles(
        "sou",
        [7, 8, 9]
      ),
      drawnTile
    ];

    expect(
      getAllowedTileTypes(
        concealedTiles,
        drawnTile
      )
    ).toEqual([]);
  });

  it("和了牌が同じでも面子構成が変わる場合は認めない", () => {
    const drawnTile =
      createTile("sou", 7);
    const concealedTiles = [
      ...createTiles(
        "sou",
        [4, 4, 4, 5, 6, 7, 7, 7]
      ),
      ...createTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTiles(
        "man",
        [2, 3]
      ),
      drawnTile
    ];

    expect(
      getAllowedTileTypes(
        concealedTiles,
        drawnTile
      )
    ).toEqual([]);
  });

  it("三槓子が新たに成立可能となる暗槓を認めない", () => {
    const drawnTile =
      createTile("man", 1);
    const concealedTiles = [
      ...createTiles(
        "man",
        [1, 1, 1]
      ),
      ...createTiles(
        "sou",
        [7, 8]
      ),
      ...createTiles(
        "honor",
        [5, 5]
      ),
      drawnTile
    ];
    const melds = [
      createClosedKan("pin", 2),
      createClosedKan("pin", 3)
    ];

    expect(
      getAllowedTileTypes(
        concealedTiles,
        drawnTile,
        melds
      )
    ).toEqual([]);
  });
});
