import { describe, expect, it, vi } from "vitest";
import type { Meld, Tile } from "../mahjong/types";
import { createInitialAkuukanGameState } from "./state";
import {
  exchangeAkuukanPlayerSkill5_3KanDoraIndicator as exchange
} from "./kanDoraIndicatorExchange";

function tile(id: string, rank = 1): Tile {
  return {
    id,
    suit: "man",
    rank,
    red: false
  };
}

function input() {
  const kanMeld: Meld = {
    kind: "closedKan",
    tiles: Array.from(
      { length: 4 },
      (_, i) => tile(`kan-${i}`, 6)
    )
  };

  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-3", level: 5 }]
    }),
    kanOwnerIsPlayer: true,
    kanEstablished: true,
    addsNewIndicator: true,
    kanMeld,
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
    random: vi.fn(() => 0.1)
  };
}

describe("5-3 槓ドラ表示牌の交換", () => {
  it("新しい表示牌だけを通常山と交換し、牌と元の状態を保つ", () => {
    const value = input();
    const before = JSON.stringify(value);
    const result = exchange(value);

    expect(result.deadWall[6]).toBe(value.liveWall[0]);
    expect(result.liveWall[0]).toBe(value.deadWall[6]);

    expect(result.deadWall).toHaveLength(14);
    expect(result.liveWall).toHaveLength(1);

    expect(
      [...result.liveWall, ...result.deadWall]
        .map(t => t.id)
        .sort()
    ).toEqual(
      [...value.liveWall, ...value.deadWall]
        .map(t => t.id)
        .sort()
    );

    expect(JSON.stringify(value)).toBe(before);
  });

  it("確定済み表示牌と取得済み嶺上位置を動かさない", () => {
    const value = input();
    value.rinshanDrawCount = 1;
    value.deadWall[0] = tile("used", 5);
    value.deadWall[4] = tile("confirmed", 5);

    const result = exchange(value);

    expect(result.deadWall[0]).toBe(value.deadWall[0]);
    expect(result.deadWall[4]).toBe(value.deadWall[4]);
  });

  it("王牌内で交換できる", () => {
    const value = input();
    value.liveWall = [];
    value.deadWall[0] = tile("matching", 5);

    const result = exchange(value);

    expect(result.deadWall[6]).toBe(value.deadWall[0]);
    expect(result.deadWall[0]).toBe(value.deadWall[6]);
  });

  it("表示牌が5枚なら抽選しない", () => {
    const value = input();

    const result = exchange({
      ...value,
      doraIndicatorCount: 5
    });

    expect(result.deadWall).toEqual(value.deadWall);
    expect(result.liveWall).toEqual(value.liveWall);
    expect(value.random).not.toHaveBeenCalled();
  });

  it.each([
    "kanOwnerIsPlayer",
    "kanEstablished",
    "addsNewIndicator"
  ] as const)("%sが偽なら交換しない", key => {
    const value = input();

    const result = exchange({
      ...value,
      [key]: false
    });

    expect(result.deadWall).toEqual(value.deadWall);
    expect(result.liveWall).toEqual(value.liveWall);
    expect(value.random).not.toHaveBeenCalled();
  });
});
