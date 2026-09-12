import { describe, expect, it, vi } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import {
  exchangeAkuukanPlayerSkill5_7RinshanTile as exchange
} from "./rinshanWinningTileExchange";

function tile(id: string): Tile {
  return {
    id,
    suit: "man",
    rank: 5,
    red: false
  };
}

function input() {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-7", level: 5 }]
    }),
    drawerIsPlayer: true,
    isRinshanDraw: true,
    tenpaiBeforeDraw: true,
    liveWall: [{ ...tile("winning"), red: true }],
    deadWall: Array.from(
      { length: 14 },
      (_, i) => tile(`dead-${i}`)
    ),
    doraIndicatorCount: 2,
    rinshanDrawCount: 0,
    winningTileIds: ["winning"],
    random: vi.fn(() => 0.1)
  };
}

describe("5-7 嶺上牌の交換", () => {
  it("通常山と交換し、物理牌・赤牌属性・山の枚数・入力を維持する", () => {
    const value = input();
    const before = JSON.stringify(value);
    const result = exchange(value);

    expect(result.deadWall[0]).toBe(value.liveWall[0]);
    expect(result.liveWall[0]).toBe(value.deadWall[0]);
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

  it("未取得の王牌と交換する", () => {
    const value = input();
    value.winningTileIds = ["dead-1"];
    value.random.mockReturnValue(0.2);

    const result = exchange(value);

    expect(result.deadWall[0]).toBe(value.deadWall[1]);
    expect(result.deadWall[1]).toBe(value.deadWall[0]);
    expect(result.liveWall).toEqual(value.liveWall);
  });

  it("今回の槓ドラを含む確定表示牌と取得済み嶺上位置を除外する", () => {
    const value = input();
    value.rinshanDrawCount = 1;
    value.winningTileIds = [
      "dead-0",
      "dead-4",
      "dead-6"
    ];

    expect(exchange(value)).toEqual({
      liveWall: value.liveWall,
      deadWall: value.deadWall
    });

    expect(value.random).not.toHaveBeenCalled();
  });

  it.each([
    "drawerIsPlayer",
    "isRinshanDraw",
    "tenpaiBeforeDraw"
  ] as const)("%sが偽なら交換しない", key => {
    const value = input();

    expect(
      exchange({
        ...value,
        [key]: false
      })
    ).toEqual({
      liveWall: value.liveWall,
      deadWall: value.deadWall
    });

    expect(value.random).not.toHaveBeenCalled();
  });

  it("嶺上牌を4枚取得済みなら交換しない", () => {
    const value = input();

    expect(
      exchange({
        ...value,
        rinshanDrawCount: 4
      })
    ).toEqual({
      liveWall: value.liveWall,
      deadWall: value.deadWall
    });

    expect(value.random).not.toHaveBeenCalled();
  });

  it("未装備と無効化中は交換しない", () => {
    const value = input();

    const states = [
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      }),
      disableAkuukanSource(
        value.akuukan,
        "player-skill:5-7"
      )
    ];

    for (const akuukan of states) {
      expect(
        exchange({
          ...value,
          akuukan
        })
      ).toEqual({
        liveWall: value.liveWall,
        deadWall: value.deadWall
      });
    }

    expect(value.random).not.toHaveBeenCalled();
  });
});
