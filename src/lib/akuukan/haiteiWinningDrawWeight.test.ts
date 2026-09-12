import { describe, expect, it } from "vitest";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type { SkillLevel } from "./types";
import {
  getAkuukanPlayerSkill5_8DrawWeightMultiplier as multiplier
} from "./haiteiWinningDrawWeight";

function input(level: SkillLevel = 5) {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-8", level }]
    }),
    drawerIsPlayer: true,
    isNormalLiveWallDraw: true,
    isLastLiveWallTile: true,
    tenpaiBeforeDraw: true,
    candidateHasLegalTsumoWin: true
  };
}

describe("5-8 海底和了牌の抽選重量", () => {
  it.each([
    [1, 3],
    [2, 3.2],
    [3, 3.5],
    [4, 4],
    [5, 5]
  ] as const)("Lv.%sで%s倍になる", (level, expected) => {
    expect(multiplier(input(level))).toBe(expected);
  });

  it.each([
    "drawerIsPlayer",
    "isNormalLiveWallDraw",
    "isLastLiveWallTile",
    "tenpaiBeforeDraw",
    "candidateHasLegalTsumoWin"
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
          "player-skill:5-8"
        )
      })
    ).toBe(1);
  });
});
