import { describe, expect, it, vi } from "vitest";
import type { Meld, Tile } from "../mahjong/types";
import { createInitialAkuukanGameState } from "./state";
import {
  selectAkuukanPlayerSkill5_3KanDoraIndicator as select
} from "./kanDoraIndicatorSelection";

function tile(id: string, rank: number): Tile {
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
    candidates: [
      tile("original", 1),
      tile("matching", 5)
    ],
    random: vi.fn(() => 0.9)
  };
}

describe("5-3 槓ドラ表示牌の選択", () => {
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

  it("候補がなければ乱数を使わずnullを返す", () => {
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
    "kanOwnerIsPlayer",
    "kanEstablished",
    "addsNewIndicator"
  ] as const)(
    "%sが偽なら元の表示牌を維持する",
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

  it("全候補が同じ重量なら元の表示牌を維持する", () => {
    const value = input();
    const candidates = [
      tile("first", 5),
      tile("second", 5)
    ];

    expect(
      select({
        ...value,
        candidates
      })
    ).toBe(candidates[0]);

    expect(value.random).not.toHaveBeenCalled();
  });

  it("元の候補と槓子を変更せず赤牌の属性も維持する", () => {
    const value = input();
    value.candidates[1].red = true;

    const before = JSON.stringify(value);

    expect(select(value)).toBe(value.candidates[1]);
    expect(JSON.stringify(value)).toBe(before);
  });
});
