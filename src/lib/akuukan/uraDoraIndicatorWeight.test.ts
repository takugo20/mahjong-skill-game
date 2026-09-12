import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type { SkillLevel } from "./types";
import {
  getAkuukanPlayerSkill5_2IndicatorWeightMultiplier as multiplier,
  type AkuukanPlayerSkill5_2IndicatorWeightInput
} from "./uraDoraIndicatorWeight";

function tile(rank: number): Tile {
  return {
    id: `man-${rank}`,
    suit: "man",
    rank,
    red: false
  };
}

function input(
  level: SkillLevel = 5
): AkuukanPlayerSkill5_2IndicatorWeightInput {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-2", level }]
    }),
    winnerIsPlayer: true,
    riichiEstablished: true,
    hand: [tile(5)],
    melds: [],
    candidate: tile(4)
  };
}

describe("5-2 裏ドラ表示牌の抽選重量", () => {
  it.each([
    [1, 1.1],
    [2, 1.4],
    [3, 1.8],
    [4, 2.3],
    [5, 3]
  ] as const)(
    "Lv.%sで%s倍になる",
    (level, expected) => {
      expect(multiplier(input(level))).toBe(expected);
    }
  );

  it("表示牌そのものを持っていても補正しない", () => {
    expect(
      multiplier({
        ...input(),
        hand: [tile(4)]
      })
    ).toBe(1);
  });

  it("同じドラを複数持っていても倍率は1回だけ適用する", () => {
    expect(
      multiplier({
        ...input(),
        hand: [
          tile(5),
          {
            ...tile(5),
            id: "second",
            red: true
          }
        ]
      })
    ).toBe(3);
  });

  it("暗槓の牌も対象にする", () => {
    expect(
      multiplier({
        ...input(),
        hand: [],
        melds: [
          {
            kind: "closedKan",
            tiles: Array.from(
              { length: 4 },
              (_, i) => ({
                ...tile(5),
                id: `kan-${i}`
              })
            )
          }
        ]
      })
    ).toBe(3);
  });

  it.each([
    "winnerIsPlayer",
    "riichiEstablished"
  ] as const)("%sが偽なら補正しない", (key) => {
    expect(
      multiplier({
        ...input(),
        [key]: false
      })
    ).toBe(1);
  });

  it("未装備と無効化中は補正しない", () => {
    const original = input();

    expect(
      multiplier({
        ...original,
        akuukan: createInitialAkuukanGameState({
          enemyId: "enemy-1",
          equippedSkills: []
        })
      })
    ).toBe(1);

    expect(
      multiplier({
        ...original,
        akuukan: disableAkuukanSource(
          original.akuukan,
          "player-skill:5-2"
        )
      })
    ).toBe(1);
  });
});
