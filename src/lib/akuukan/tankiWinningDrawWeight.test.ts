import { describe, expect, it } from "vitest";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type { SkillLevel } from "./types";
import {
  getAkuukanPlayerSkill5_5DrawWeightMultiplier as multiplier
} from "./tankiWinningDrawWeight";

function input(level: SkillLevel = 5) {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-5", level }]
    }),
    drawerIsPlayer: true,
    isNormalDraw: true,
    candidateHasLegalTankiWin: true
  };
}

describe("5-5 単騎和了牌の抽選重量", () => {
  it.each([
    [1, 1.1],
    [2, 1.25],
    [3, 1.5],
    [4, 1.75],
    [5, 2]
  ] as const)(
    "Lv.%sで%s倍になる",
    (level, expected) => {
      expect(multiplier(input(level))).toBe(expected);
    }
  );

  it.each([
    "drawerIsPlayer",
    "isNormalDraw",
    "candidateHasLegalTankiWin"
  ] as const)("%sが偽なら補正しない", key => {
    expect(
      multiplier({
        ...input(),
        [key]: false
      })
    ).toBe(1);
  });

  it("未装備と無効化中は補正しない", () => {
    const value = input();

    expect(
      multiplier({
        ...value,
        akuukan: createInitialAkuukanGameState({
          enemyId: "enemy-1",
          equippedSkills: []
        })
      })
    ).toBe(1);

    expect(
      multiplier({
        ...value,
        akuukan: disableAkuukanSource(
          value.akuukan,
          "player-skill:5-5"
        )
      })
    ).toBe(1);
  });
});
