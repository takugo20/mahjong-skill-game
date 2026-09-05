import {
  describe,
  expect,
  it
} from "vitest";
import type {
  WaitType
} from "../mahjong/hand";
import {
  getAkuukanPlayerSkill1_8BonusHan
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
      ? [{
          id: "1-8",
          level
        }]
      : []
  });
}

function getBonusHan(
  level: SkillLevel,
  waitType: WaitType,
  options: {
    readonly winnerIsPlayer?: boolean;
    readonly hasValidYaku?: boolean;
  } = {}
): number {
  return getAkuukanPlayerSkill1_8BonusHan({
    akuukan: createAkuukan(level),
    winnerIsPlayer:
      options.winnerIsPlayer ?? true,
    waitType,
    hasValidYaku:
      options.hasValidYaku ?? true
  });
}

describe("プレイヤースキル1-8のボーナス翻", () => {
  it("単騎待ちならレベル別の翻数を加算する", () => {
    const cases: readonly {
      level: SkillLevel;
      expectedBonusHan: number;
    }[] = [
      { level: 1, expectedBonusHan: 1 },
      { level: 2, expectedBonusHan: 1 },
      { level: 3, expectedBonusHan: 1 },
      { level: 4, expectedBonusHan: 1 },
      { level: 5, expectedBonusHan: 2 }
    ];

    for (const currentCase of cases) {
      expect(
        getBonusHan(
          currentCase.level,
          "tanki"
        )
      ).toBe(currentCase.expectedBonusHan);
    }
  });

  it("単騎待ち以外には適用しない", () => {
    const waitTypes: readonly WaitType[] = [
      "ryanmen",
      "kanchan",
      "penchan",
      "shanpon",
      "kokushiSingle",
      "kokushiThirteenSided"
    ];

    for (const waitType of waitTypes) {
      expect(
        getBonusHan(5, waitType)
      ).toBe(0);
    }
  });

  it("有効な役がなければ単騎待ちでも加算しない", () => {
    expect(
      getBonusHan(
        5,
        "tanki",
        { hasValidYaku: false }
      )
    ).toBe(0);
  });

  it("CPUの和了には適用しない", () => {
    expect(
      getBonusHan(
        5,
        "tanki",
        { winnerIsPlayer: false }
      )
    ).toBe(0);
  });

  it("未装備またはE-18による無効化中は適用しない", () => {
    const notEquipped =
      getAkuukanPlayerSkill1_8BonusHan({
        akuukan: createAkuukan(1, false),
        winnerIsPlayer: true,
        waitType: "tanki",
        hasValidYaku: true
      });
    const disabled =
      getAkuukanPlayerSkill1_8BonusHan({
        akuukan: disableAkuukanSource(
          createAkuukan(),
          "player-skill:1-8"
        ),
        winnerIsPlayer: true,
        waitType: "tanki",
        hasValidYaku: true
      });

    expect(notEquipped).toBe(0);
    expect(disabled).toBe(0);
  });
});
