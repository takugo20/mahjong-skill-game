import {
  describe,
  expect,
  it
} from "vitest";
import {
  getFuritenStatus,
  isDiscardFuriten
} from "./furiten";
import type {
  Discard,
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
    id: `furiten-${serialNumber}`,
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

function createDiscard(
  tile: Tile,
  called = false
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called
  };
}

function createRyanmenTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("sou", [7, 8]),
    ...createTiles("honor", [1, 1])
  ];
}

describe("捨て牌による振聴", () => {
  it("両面待ちの1種類でも河にあれば振聴とする", () => {
    const hand = createRyanmenTenpaiHand();

    const status = getFuritenStatus({
      concealedTiles: hand,
      discards: [
        createDiscard(
          createTile("sou", 6)
        )
      ]
    });

    expect(
      status.winningTileTypes.map(
        (tile) => `${tile.suit}-${tile.rank}`
      )
    ).toEqual(["sou-6", "sou-9"]);
    expect(status.discardFuriten).toBe(
      true
    );
    expect(status.isFuriten).toBe(true);
  });

  it("和了牌でない捨て牌では振聴にならない", () => {
    expect(
      isDiscardFuriten({
        concealedTiles:
          createRyanmenTenpaiHand(),
        discards: [
          createDiscard(
            createTile("man", 9)
          )
        ]
      })
    ).toBe(false);
  });

  it("副露された捨て牌も捨て牌履歴として扱う", () => {
    expect(
      isDiscardFuriten({
        concealedTiles:
          createRyanmenTenpaiHand(),
        discards: [
          createDiscard(
            createTile("sou", 9),
            true
          )
        ]
      })
    ).toBe(true);
  });
});

describe("見逃しによる振聴", () => {
  it("同巡内振聴フラグがあればロン不可とする", () => {
    const status = getFuritenStatus({
      concealedTiles:
        createRyanmenTenpaiHand(),
      discards: [],
      temporaryFuriten: true
    });

    expect(status.discardFuriten).toBe(
      false
    );
    expect(status.temporaryFuriten).toBe(
      true
    );
    expect(status.riichiFuriten).toBe(
      false
    );
    expect(status.isFuriten).toBe(true);
  });

  it("立直後振聴フラグがあれば局終了までロン不可とする", () => {
    const status = getFuritenStatus({
      concealedTiles:
        createRyanmenTenpaiHand(),
      discards: [],
      riichiFuriten: true
    });

    expect(status.discardFuriten).toBe(
      false
    );
    expect(status.temporaryFuriten).toBe(
      false
    );
    expect(status.riichiFuriten).toBe(
      true
    );
    expect(status.isFuriten).toBe(true);
  });
});
