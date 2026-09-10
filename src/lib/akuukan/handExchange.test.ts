import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  getAkuukanHandExchangeWallCandidates
} from "./handExchange";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `hand-exchange-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  count: number
): Tile[] {
  return Array.from(
    { length: count },
    (_, index) =>
      createTile(
        index % 2 === 0
          ? "man"
          : "sou",
        (index % 9) + 1
      )
  );
}

describe("亜空間手牌交換の山牌候補", () => {
  it("通常山の全牌を交換候補にする", () => {
    const liveWall = createTiles(3);
    const candidates =
      getAkuukanHandExchangeWallCandidates({
        liveWall,
        deadWall: [],
        doraIndicatorCount: 0,
        rinshanDrawCount: 0
      });

    expect(candidates).toEqual([
      {
        source: "liveWall",
        index: 0,
        tile: liveWall[0]
      },
      {
        source: "liveWall",
        index: 1,
        tile: liveWall[1]
      },
      {
        source: "liveWall",
        index: 2,
        tile: liveWall[2]
      }
    ]);
  });

  it("確定済みドラ表示牌を王牌候補から除外する", () => {
    const deadWall = createTiles(14);
    const candidates =
      getAkuukanHandExchangeWallCandidates({
        liveWall: [],
        deadWall,
        doraIndicatorCount: 3,
        rinshanDrawCount: 0
      });
    const indexes = candidates.map(
      (candidate) => candidate.index
    );

    expect(indexes).not.toContain(4);
    expect(indexes).not.toContain(6);
    expect(indexes).not.toContain(8);
    expect(indexes).toContain(10);
    expect(indexes).toContain(12);
  });

  it("取得済みの嶺上牌位置を王牌候補から除外する", () => {
    const deadWall = createTiles(14);
    const candidates =
      getAkuukanHandExchangeWallCandidates({
        liveWall: [],
        deadWall,
        doraIndicatorCount: 1,
        rinshanDrawCount: 2
      });
    const indexes = candidates.map(
      (candidate) => candidate.index
    );

    expect(indexes).not.toContain(0);
    expect(indexes).not.toContain(1);
    expect(indexes).toContain(2);
    expect(indexes).toContain(3);
  });

  it("未確定の槓ドラ表示牌候補を交換候補に残す", () => {
    const deadWall = createTiles(14);
    const candidates =
      getAkuukanHandExchangeWallCandidates({
        liveWall: [],
        deadWall,
        doraIndicatorCount: 1,
        rinshanDrawCount: 0
      });
    const indexes = candidates.map(
      (candidate) => candidate.index
    );

    expect(indexes).not.toContain(4);
    expect(indexes).toContain(6);
    expect(indexes).toContain(8);
    expect(indexes).toContain(10);
    expect(indexes).toContain(12);
  });

  it("牌種条件を満たす候補だけを返す", () => {
    const manTile = createTile("man", 1);
    const souTile = createTile("sou", 2);
    const pinTile = createTile("pin", 3);
    const candidates =
      getAkuukanHandExchangeWallCandidates({
        liveWall: [manTile, souTile],
        deadWall: [pinTile],
        doraIndicatorCount: 0,
        rinshanDrawCount: 0,
        acceptsTile: (tile) =>
          tile.suit === "sou"
      });

    expect(
      candidates.map(
        (candidate) => candidate.tile
      )
    ).toEqual([souTile]);
  });

  it("不正なドラ・嶺上牌数を拒否する", () => {
    expect(() =>
      getAkuukanHandExchangeWallCandidates({
        liveWall: [],
        deadWall: [],
        doraIndicatorCount: 6,
        rinshanDrawCount: 0
      })
    ).toThrow("ドラ表示牌数が不正です。");
    expect(() =>
      getAkuukanHandExchangeWallCandidates({
        liveWall: [],
        deadWall: [],
        doraIndicatorCount: 1,
        rinshanDrawCount: 5
      })
    ).toThrow("嶺上牌取得回数が不正です。");
  });
});
