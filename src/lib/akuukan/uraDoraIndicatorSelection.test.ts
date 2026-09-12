import { describe, expect, it, vi } from "vitest";
import type { Tile } from "../mahjong/types";
import { createInitialAkuukanGameState } from "./state";
import {
  selectAkuukanPlayerSkill5_2UraDoraIndicator as select
} from "./uraDoraIndicatorSelection";

function tile(id: string, rank: number): Tile {
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
    hand: [tile("hand", 5)],
    melds: [],
    candidates: [
      tile("original", 1),
      tile("matching", 4)
    ],
    random: vi.fn(() => 0.9)
  };
}

describe("5-2 裏ドラ表示牌の選択", () => {
  it("重量比1対3の境界で選択が変わる", () => {
    const value = input();

    expect(
      select({
        ...value,
        random: () => 0.249999
      })
    ).toBe(value.candidates[0]);

    expect(
      select({
        ...value,
        random: () => 0.25
      })
    ).toBe(value.candidates[1]);
  });

  it("空の候補なら乱数を使わずnullを返す", () => {
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
    "winnerIsPlayer",
    "riichiEstablished"
  ] as const)(
    "%sが偽なら元の表示牌を維持する",
    (key) => {
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

  it("全候補が同じ重量なら元の表示牌を維持する", () => {
    const value = input();
    const candidates = [
      tile("first", 4),
      tile("second", 4)
    ];

    expect(
      select({
        ...value,
        candidates
      })
    ).toBe(candidates[0]);

    expect(value.random).not.toHaveBeenCalled();
  });

  it("候補や手牌を変更せず、赤属性を含む物理牌を返す", () => {
    const value = input();
    value.candidates[1].red = true;

    const before = JSON.stringify(value);

    expect(select(value)).toBe(value.candidates[1]);
    expect(JSON.stringify(value)).toBe(before);
  });
});
