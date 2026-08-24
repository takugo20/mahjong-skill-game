import {
  describe,
  expect,
  it
} from "vitest";
import {
  createFullTileSet,
  getDoraType,
  getTileTypeKey
} from "./tiles";
import type { Tile } from "./types";

describe("麻雀牌の生成", () => {
  it("34種類・合計136枚を生成する", () => {
    const tiles = createFullTileSet();
    const typeCounts = new Map<string, number>();

    for (const tile of tiles) {
      const key = getTileTypeKey(tile);

      typeCounts.set(
        key,
        (typeCounts.get(key) ?? 0) + 1
      );
    }

    expect(tiles).toHaveLength(136);
    expect(typeCounts.size).toBe(34);

    for (const count of typeCounts.values()) {
      expect(count).toBe(4);
    }
  });

  it("赤五萬・赤五筒・赤五索を各1枚生成する", () => {
    const redTiles = createFullTileSet()
      .filter((tile) => tile.red);

    expect(redTiles).toHaveLength(3);

    expect(
      redTiles
        .map((tile) => tile.suit)
        .sort()
    ).toEqual([
      "man",
      "pin",
      "sou"
    ]);

    for (const tile of redTiles) {
      expect(tile.rank).toBe(5);
    }
  });
});

describe("ドラの循環", () => {
  function createIndicator(
    suit: Tile["suit"],
    rank: number
  ): Tile {
    return {
      id: `indicator-${suit}-${rank}`,
      suit,
      rank,
      red: false
    };
  }

  it("数牌は9の次を1とする", () => {
    expect(
      getDoraType(createIndicator("man", 9))
    ).toEqual({
      suit: "man",
      rank: 1
    });
  });

  it("風牌は北の次を東とする", () => {
    expect(
      getDoraType(createIndicator("honor", 4))
    ).toEqual({
      suit: "honor",
      rank: 1
    });
  });

  it("三元牌は中の次を白とする", () => {
    expect(
      getDoraType(createIndicator("honor", 7))
    ).toEqual({
      suit: "honor",
      rank: 5
    });
  });
});
