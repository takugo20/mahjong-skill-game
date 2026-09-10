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
  exchangeAkuukanHandTilesWithWall
} from "./handExchange";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `hand-exchange-execution-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

describe("亜空間手牌交換の実行", () => {
  it("交換牌を先に通常山から取り出して選択牌を戻す", () => {
    const outgoingTile = createTile("man", 1);
    const incomingTile = createTile("pin", 5);
    const result =
      exchangeAkuukanHandTilesWithWall({
        hand: [outgoingTile],
        selectedTileIds: [outgoingTile.id],
        maximumExchangeTileCount: 1,
        liveWall: [incomingTile],
        deadWall: [],
        doraIndicatorCount: 0,
        rinshanDrawCount: 0,
        random: () => 0
      });

    expect(result.hand).toEqual([
      incomingTile
    ]);
    expect(result.liveWall).toEqual([
      outgoingTile
    ]);
    expect(result.exchanges).toEqual([
      {
        outgoingTile,
        incomingTile,
        source: "liveWall"
      }
    ]);
  });

  it("候補不足時は可能な枚数だけ交換する", () => {
    const firstOutgoing = createTile("man", 1);
    const secondOutgoing = createTile("pin", 2);
    const incomingTile = createTile("sou", 3);
    const result =
      exchangeAkuukanHandTilesWithWall({
        hand: [firstOutgoing, secondOutgoing],
        selectedTileIds: [
          firstOutgoing.id,
          secondOutgoing.id
        ],
        maximumExchangeTileCount: 2,
        liveWall: [incomingTile],
        deadWall: [],
        doraIndicatorCount: 0,
        rinshanDrawCount: 0,
        random: () => 0
      });

    expect(result.hand).toEqual([
      incomingTile,
      secondOutgoing
    ]);
    expect(result.exchanges).toHaveLength(1);
  });

  it("牌種条件を満たす山牌だけを取得する", () => {
    const outgoingTile = createTile("man", 1);
    const pinTile = createTile("pin", 2);
    const souTile = createTile("sou", 3);
    const result =
      exchangeAkuukanHandTilesWithWall({
        hand: [outgoingTile],
        selectedTileIds: [outgoingTile.id],
        maximumExchangeTileCount: 1,
        liveWall: [pinTile, souTile],
        deadWall: [],
        doraIndicatorCount: 0,
        rinshanDrawCount: 0,
        acceptsTile: (tile) =>
          tile.suit === "sou",
        random: () => 0
      });

    expect(result.hand).toEqual([souTile]);
    expect(result.exchanges[0].incomingTile)
      .toBe(souTile);
  });

  it("王牌交換後も確定済みドラ表示牌を固定する", () => {
    const outgoingTile = createTile("man", 1);
    const deadWall = Array.from(
      { length: 14 },
      (_, index) =>
        createTile("honor", (index % 7) + 1)
    );
    const confirmedDoraIndicator =
      deadWall[4];
    const incomingTile = deadWall[5];
    const result =
      exchangeAkuukanHandTilesWithWall({
        hand: [outgoingTile],
        selectedTileIds: [outgoingTile.id],
        maximumExchangeTileCount: 1,
        liveWall: [],
        deadWall,
        doraIndicatorCount: 1,
        rinshanDrawCount: 0,
        acceptsTile: (tile) =>
          tile.id === incomingTile.id,
        random: () => 0.5
      });

    expect(result.hand).toEqual([
      incomingTile
    ]);
    expect(result.deadWall[4]).toBe(
      confirmedDoraIndicator
    );
    expect(result.deadWall).toContain(
      outgoingTile
    );
  });

  it("入力の手牌と山を直接変更しない", () => {
    const outgoingTile = createTile("man", 1);
    const incomingTile = createTile("pin", 2);
    const hand = [outgoingTile];
    const liveWall = [incomingTile];
    const deadWall: Tile[] = [];

    exchangeAkuukanHandTilesWithWall({
      hand,
      selectedTileIds: [outgoingTile.id],
      maximumExchangeTileCount: 1,
      liveWall,
      deadWall,
      doraIndicatorCount: 0,
      rinshanDrawCount: 0,
      random: () => 0
    });

    expect(hand).toEqual([outgoingTile]);
    expect(liveWall).toEqual([incomingTile]);
    expect(deadWall).toEqual([]);
  });

  it("不正な選択枚数・重複・手牌外の牌を拒否する", () => {
    const handTile = createTile("man", 1);
    const wallTile = createTile("pin", 2);
    const baseInput = {
      hand: [handTile],
      maximumExchangeTileCount: 1,
      liveWall: [wallTile],
      deadWall: [] as Tile[],
      doraIndicatorCount: 0,
      rinshanDrawCount: 0,
      random: () => 0
    };

    expect(() =>
      exchangeAkuukanHandTilesWithWall({
        ...baseInput,
        selectedTileIds: []
      })
    ).toThrow(
      "選択した交換牌の枚数が不正です。"
    );
    expect(() =>
      exchangeAkuukanHandTilesWithWall({
        ...baseInput,
        maximumExchangeTileCount: 2,
        selectedTileIds: [
          handTile.id,
          handTile.id
        ]
      })
    ).toThrow(
      "同じ手牌を重複して選択しています。"
    );
    expect(() =>
      exchangeAkuukanHandTilesWithWall({
        ...baseInput,
        selectedTileIds: [wallTile.id]
      })
    ).toThrow(
      "選択した交換牌が手牌にありません。"
    );
  });
});
