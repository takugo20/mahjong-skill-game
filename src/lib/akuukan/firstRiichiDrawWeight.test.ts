import { describe, expect, it } from "vitest";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type { SkillLevel } from "./types";
import {
  getAkuukanPlayerSkill5_1DrawWeightMultiplier
} from "./firstRiichiDrawWeight";

function createInput(level: SkillLevel = 5) {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-1", level }]
    }),
    drawerIsPlayer: true,
    riichiEstablished: true,
    isFirstNormalDrawAfterRiichi: true,
    normalIppatsuAvailable: true,
    candidateIsWinningTile: true
  };
}

describe("5-1 紫電一閃の抽選重量", () => {
  it.each([
    [1, 1.1],
    [2, 1.4],
    [3, 1.8],
    [4, 2.3],
    [5, 3]
  ] as const)(
    "Lv.%sの和了牌へ%s倍を適用する",
    (level, multiplier) => {
      expect(
        getAkuukanPlayerSkill5_1DrawWeightMultiplier(
          createInput(level)
        )
      ).toBe(multiplier);
    }
  );

  it.each([
    "drawerIsPlayer",
    "riichiEstablished",
    "isFirstNormalDrawAfterRiichi",
    "normalIppatsuAvailable",
    "candidateIsWinningTile"
  ] as const)("%sが偽なら補正しない", (key) => {
    expect(
      getAkuukanPlayerSkill5_1DrawWeightMultiplier({
        ...createInput(),
        [key]: false
      })
    ).toBe(1);
  });

  it("未装備や無効化中は補正しない", () => {
    const input = createInput();

    expect(
      getAkuukanPlayerSkill5_1DrawWeightMultiplier({
        ...input,
        akuukan: createInitialAkuukanGameState({
          enemyId: "enemy-1",
          equippedSkills: []
        })
      })
    ).toBe(1);

    expect(
      getAkuukanPlayerSkill5_1DrawWeightMultiplier({
        ...input,
        akuukan: disableAkuukanSource(
          input.akuukan,
          "player-skill:5-1"
        )
      })
    ).toBe(1);
  });
});
