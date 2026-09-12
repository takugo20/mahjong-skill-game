import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import { createInitialAkuukanGameState } from "./state";
import {
  exchangeAkuukanPlayerSkill5_2UraDoraIndicators as exchange
} from "./uraDoraIndicatorExchange";

function tile(id: string, rank = 1): Tile {
  return {
    id,
    suit: "man",
    rank,
    red: false
  };
}

function input() {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-2", level: 5 }]
    }),
    winnerIsPlayer: true,
    riichiEstablished: true,
    hand: [tile("hand", 6)],
    melds: [],
    liveWall: [
      {
        ...tile("matching", 5),
        red: true
      }
    ],
    deadWall: Array.from(
      { length: 14 },
      (_, i) => tile(`dead-${i}`)
    ),
    doraIndicatorCount: 1,
    rinshanDrawCount: 0,
    random: () => 0.1
  };
}

describe("5-2 裏ドラ表示牌の交換", () => {
  it("通常山と交換し、元の状態・枚数・牌の属性を保つ", () => {
    const value = input();
    const before = JSON.stringify(value);
    const result = exchange(value);

    expect(result.deadWall[5]).toBe(value.liveWall[0]);
    expect(result.liveWall[0]).toBe(value.deadWall[5]);

    expect(result.deadWall).toHaveLength(14);
    expect(result.liveWall).toHaveLength(1);
    expect(JSON.stringify(value)).toBe(before);

    expect(
      [...result.liveWall, ...result.deadWall]
        .map((t) => t.id)
        .sort()
    ).toEqual(
      [...value.liveWall, ...value.deadWall]
        .map((t) => t.id)
        .sort()
    );
  });

  it("確定済み表ドラと取得済み嶺上位置を交換しない", () => {
    const value = input();
    value.rinshanDrawCount = 1;
    value.deadWall[0] = tile("used", 5);
    value.deadWall[4] = tile("confirmed", 5);

    const result = exchange(value);

    expect(result.deadWall[0]).toBe(value.deadWall[0]);
    expect(result.deadWall[4]).toBe(value.deadWall[4]);
  });

  it("王牌内でも交換できる", () => {
    const value = input();
    value.liveWall = [];
    value.deadWall[0] = tile("matching", 5);

    const result = exchange(value);

    expect(result.deadWall[5]).toBe(value.deadWall[0]);
    expect(result.deadWall[0]).toBe(value.deadWall[5]);
  });

  it("先に決定した裏ドラ表示牌を後の抽選で動かさない", () => {
    const value = input();
    value.doraIndicatorCount = 2;

    const result = exchange(value);

    expect(result.deadWall[5]).toBe(value.liveWall[0]);
    expect(result.deadWall[7]).toBe(value.deadWall[7]);
  });

  it("立直していない場合は交換しない", () => {
    const value = input();

    const result = exchange({
      ...value,
      riichiEstablished: false
    });

    expect(result.liveWall).toEqual(value.liveWall);
    expect(result.deadWall).toEqual(value.deadWall);
  });
});
