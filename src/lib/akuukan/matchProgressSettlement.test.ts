import { describe, expect, it } from "vitest";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  createInitialEnemyProgressState
} from "./enemyProgress";
import {
  settleAkuukanMatchProgress as settle,
  type AkuukanMatchProgressSettlementInput
} from "./matchProgressSettlement";

function input(): AkuukanMatchProgressSettlementInput {
  return {
    matchIsFinalized: true,
    finalRank: 1,
    setup: {
      enemyId: "enemy-1",
      equippedSkills: [{ id: "1-1", level: 1 }]
    },
    growth: createInitialPlayerSkillGrowthState(),
    enemyProgress: createInitialEnemyProgressState()
  };
}

describe("対局終了時の成長と解放", () => {
  it("開始時の装備に経験値を付与し、新規解放はLv.1・経験値0にする", () => {
    const value = input();
    const before = JSON.stringify(value);
    const result = settle(value)!;

    expect(result.experiencePerSkill).toBe(500);
    expect(
      result.growth.skills["1-1"].currentExp
    ).toBe(500);
    expect(result.unlockedSkillIds).toContain("1-5");
    expect(result.growth.skills["1-5"]).toEqual({
      isUnlocked: true,
      level: 1,
      currentExp: 0
    });
    expect(
      result.awards.map(award => award.skillId)
    ).toEqual(["1-1"]);
    expect(
      result.enemyProgress.enemies["enemy-1"].firstPlaceCount
    ).toBe(1);
    expect(JSON.stringify(value)).toBe(before);
  });

  it.each([
    [2, 100],
    [3, 50],
    [4, 10]
  ] as const)(
    "%s位では各装備へ%sEXPを付与する",
    (finalRank, expected) => {
      const result = settle({
        ...input(),
        finalRank
      })!;

      expect(result.experiencePerSkill).toBe(expected);
      expect(
        result.growth.skills["1-1"].currentExp
      ).toBe(expected);
      expect(
        result.enemyProgress.enemies["enemy-1"]
          .firstPlaceCount
      ).toBe(0);
      expect(
        result.growth.unlockProgress["fourth-place-count"]
      ).toBe(finalRank === 4 ? 1 : 0);
    }
  );

  it("敵1で3回目の1位を取ると敵2だけを解放する", () => {
    const value = input();

    const enemyProgress = {
      enemies: {
        ...value.enemyProgress.enemies,
        "enemy-1": {
          isUnlocked: true,
          firstPlaceCount: 2
        }
      }
    };

    const result = settle({
      ...value,
      enemyProgress
    })!;

    expect(result.unlockedEnemyId).toBe("enemy-2");
    expect(
      result.enemyProgress.enemies["enemy-2"].isUnlocked
    ).toBe(true);
    expect(
      result.enemyProgress.enemies["enemy-3"].isUnlocked
    ).toBe(false);
    expect(
      result.growth.skills["1-5"].isUnlocked
    ).toBe(true);
  });

  it("最大レベルの装備があっても解放処理を続ける", () => {
    const value = input();

    const result = settle({
      ...value,
      setup: {
        ...value.setup,
        equippedSkills: [{ id: "1-1", level: 5 }]
      },
      growth: {
        ...value.growth,
        skills: {
          ...value.growth.skills,
          "1-1": {
            isUnlocked: true,
            level: 5,
            currentExp: 0
          }
        }
      }
    })!;

    expect(
      result.awards[0].failureReason
    ).toBe("maximumLevel");
    expect(
      result.growth.skills["1-1"].currentExp
    ).toBe(0);
    expect(result.unlockedSkillIds).toContain("1-5");
  });

  it("未確定の対局は処理しない", () => {
    expect(
      settle({
        ...input(),
        matchIsFinalized: false
      })
    ).toBeNull();
  });
});
