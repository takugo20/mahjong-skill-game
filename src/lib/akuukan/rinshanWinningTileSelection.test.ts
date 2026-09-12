import { describe, expect, it, vi } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import {
  selectAkuukanPlayerSkill5_7RinshanTile as select
} from "./rinshanWinningTileSelection";

function input() {
  const candidates: Tile[] = [
    {
      id: "original",
      suit: "man",
      rank: 1,
      red: false
    },
    {
      id: "winning",
      suit: "man",
      rank: 5,
      red: true
    }
  ];

  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-7", level: 5 }]
    }),
    drawerIsPlayer: true,
    isRinshanDraw: true,
    tenpaiBeforeDraw: true,
    candidates,
    winningTileIds: ["winning"],
    random: vi.fn(() => 0.9)
  };
}

describe("5-7 嶺上牌の選択", () => {
  it("重量比1対5の境界で選択が変わる", () => {
    const value = input();

    expect(
      select({
        ...value,
        random: () => 1 / 6 - 0.000001
      })
    ).toBe(value.candidates[0]);

    expect(
      select({
        ...value,
        random: () => 1 / 6
      })
    ).toBe(value.candidates[1]);
  });

  it("空の候補では乱数を使わずnullを返す", () => {
    const value = input();

    expect(
      select({
        ...value,
        candidates: []
      })
    ).toBeNull();

    expect(value.random).not.toHaveBeenCalled();
  });

  it.each([
    "drawerIsPlayer",
    "isRinshanDraw",
    "tenpaiBeforeDraw"
  ] as const)(
    "%sが偽なら本来の嶺上牌を維持する",
    key => {
      const value = input();

      expect(
        select({
          ...value,
          [key]: false
        })
      ).toBe(value.candidates[0]);

      expect(value.random).not.toHaveBeenCalled();
    }
  );

  it.each([
    [],
    ["original", "winning"],
    ["outside"]
  ])(
    "全候補が同じ重量なら本来の嶺上牌を維持する: %j",
    (...winningTileIds) => {
      const value = input();

      expect(
        select({
          ...value,
          winningTileIds
        })
      ).toBe(value.candidates[0]);

      expect(value.random).not.toHaveBeenCalled();
    }
  );

  it("未装備と無効化中は本来の嶺上牌を維持する", () => {
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
        select({
          ...value,
          akuukan
        })
      ).toBe(value.candidates[0]);
    }

    expect(value.random).not.toHaveBeenCalled();
  });

  it("候補を変更せず選ばれた物理牌と赤牌属性を維持する", () => {
    const value = input();
    const before = JSON.stringify(value);

    expect(select(value)).toBe(value.candidates[1]);
    expect(JSON.stringify(value)).toBe(before);
  });
});
