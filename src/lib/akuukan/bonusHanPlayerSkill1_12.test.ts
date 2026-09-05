import {
  describe,
  expect,
  it
} from "vitest";
import {
  getAkuukanPlayerSkill1_12BonusHan
} from "./bonusHan";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

function createAkuukan(
  level: SkillLevel = 1,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{ id: "1-12", level }]
      : []
  });
}

function getBonusHan(
  level: SkillLevel,
  options: {
    readonly winnerIsPlayer?: boolean;
    readonly playerIsFourth?: boolean;
    readonly hasValidYaku?: boolean;
  } = {}
): number {
  return getAkuukanPlayerSkill1_12BonusHan({
    akuukan: createAkuukan(level),
    winnerIsPlayer:
      options.winnerIsPlayer ?? true,
    playerIsFourth:
      options.playerIsFourth ?? true,
    hasValidYaku:
      options.hasValidYaku ?? true
  });
}

describe("プレイヤースキル1-12のボーナス翻", () => {
  it("各レベルのボーナス翻を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      expectedBonusHan: number;
    }[] = [
      { level: 1, expectedBonusHan: 1 },
      { level: 2, expectedBonusHan: 1 },
      { level: 3, expectedBonusHan: 2 },
      { level: 4, expectedBonusHan: 2 },
      { level: 5, expectedBonusHan: 3 }
    ];

    for (const currentCase of cases) {
      expect(
        getBonusHan(currentCase.level)
      ).toBe(
        currentCase.expectedBonusHan
      );
    }
  });

  it("プレイヤーが4位でなければ適用しない", () => {
    expect(
      getBonusHan(5, {
        playerIsFourth: false
      })
    ).toBe(0);
  });

  it("CPUの和了には適用しない", () => {
    expect(
      getBonusHan(5, {
        winnerIsPlayer: false
      })
    ).toBe(0);
  });

  it("有効な役がなければ適用しない", () => {
    expect(
      getBonusHan(5, {
        hasValidYaku: false
      })
    ).toBe(0);
  });

  it("未装備なら適用しない", () => {
    expect(
      getAkuukanPlayerSkill1_12BonusHan({
        akuukan: createAkuukan(5, false),
        winnerIsPlayer: true,
        playerIsFourth: true,
        hasValidYaku: true
      })
    ).toBe(0);
  });

  it("E-18による無効化中は適用しない", () => {
    expect(
      getAkuukanPlayerSkill1_12BonusHan({
        akuukan: disableAkuukanSource(
          createAkuukan(5),
          "player-skill:1-12"
        ),
        winnerIsPlayer: true,
        playerIsFourth: true,
        hasValidYaku: true
      })
    ).toBe(0);
  });
});
