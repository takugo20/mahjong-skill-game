import {
  describe,
  expect,
  it
} from "vitest";
import {
  PLAYER_SKILL_CATALOG_GROUP_1
} from "./playerSkillCatalogGroup1";
import {
  PLAYER_SKILL_LEVELS
} from "./playerSkillCatalogTypes";
import type {
  PlayerSkillDefinition
} from "./playerSkillCatalogTypes";
import type {
  PlayerSkillId
} from "./types";

function getSkill(
  skillId: PlayerSkillId
): PlayerSkillDefinition {
  const skill =
    PLAYER_SKILL_CATALOG_GROUP_1.find(
      (candidate) =>
        candidate.id === skillId
    );

  if (!skill) {
    throw new Error(
      `スキルが見つかりません: ${skillId}`
    );
  }

  return skill;
}

function getEffectSeries(
  skillId: PlayerSkillId,
  effectName: string
): number[] {
  const skill = getSkill(skillId);

  return PLAYER_SKILL_LEVELS.map(
    (level) =>
      skill.levels[level]
        .effectValues[effectName]
  );
}

describe("プレイヤースキル第1グループ", () => {
  it("図鑑No.01から15をID順に定義する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_1
    ).toHaveLength(15);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_1.map(
        (skill) => skill.catalogNumber
      )
    ).toEqual([
      1, 2, 3, 4, 5,
      6, 7, 8, 9, 10,
      11, 12, 13, 14, 15
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_1.map(
        (skill) => skill.id
      )
    ).toEqual([
      "1-1", "1-2", "1-3", "1-4",
      "1-5", "1-6", "1-7", "1-8",
      "1-9", "1-10", "1-11",
      "1-12", "1-13", "1-14",
      "1-15"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_1.map(
        (skill) => skill.name
      )
    ).toEqual([
      "紅牌錬成【序】",
      "紅牌錬成【破】",
      "紅牌錬成【急】",
      "賞牌引寄【表】",
      "賞牌開帳",
      "紅牌錬成【次】",
      "字牌供養",
      "単騎強化【攻】",
      "愚形強化【攻】",
      "肉斬骨断",
      "和了強化【点】",
      "逆境強化",
      "和了強化【符】",
      "心頭滅却",
      "門前回帰"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_1.map(
        (skill) => skill.evaluation
      )
    ).toEqual([
      "A", "A+", "A+", "B+", "D",
      "B", "A", "B", "B", "A",
      "A+", "B+", "S", "S+", "S"
    ]);
  });

  it("READMEの基準EXPをレベル別必要量へ展開する", () => {
    const baseRequiredExp = [
      6000, 6700, 5900, 3600, 400,
      5800, 5100, 2500, 2900, 9500,
      7700, 1000, 5100, 2300, 4800
    ];

    PLAYER_SKILL_CATALOG_GROUP_1.forEach(
      (skill, index) => {
        const base = baseRequiredExp[index];

        expect(
          PLAYER_SKILL_LEVELS.map(
            (level) =>
              skill.levels[level]
                .requiredExp
          )
        ).toEqual([
          base,
          base * 2,
          base * 5,
          base * 15,
          0
        ]);
      }
    );
  });

  it("赤ドラ・ドラ関係のレベル値を保持する", () => {
    expect(
      getEffectSeries("1-1", "chancePercent")
    ).toEqual([5, 10, 20, 30, 50]);
    expect(
      getEffectSeries("1-2", "chancePercent")
    ).toEqual([3, 5, 8, 10, 20]);
    expect(
      getEffectSeries("1-3", "chancePercent")
    ).toEqual([5, 10, 20, 30, 50]);
    expect(
      getEffectSeries(
        "1-4",
        "doraDrawWeightMultiplier"
      )
    ).toEqual([1.1, 1.2, 1.3, 1.5, 2]);
    expect(
      getEffectSeries("1-5", "chancePercent")
    ).toEqual([20, 25, 30, 35, 50]);
    expect(
      getEffectSeries(
        "1-5",
        "additionalDoraIndicators"
      )
    ).toEqual([1, 1, 1, 2, 2]);
    expect(
      getEffectSeries("1-6", "chancePercent")
    ).toEqual([10, 20, 35, 55, 80]);
  });

  it("翻・符・点数関係のレベル値を保持する", () => {
    expect(
      getEffectSeries(
        "1-7",
        "minimumHonorDiscards"
      )
    ).toEqual([9, 8, 7, 5, 3]);
    expect(
      getEffectSeries("1-8", "bonusHan")
    ).toEqual([1, 1, 1, 1, 2]);
    expect(
      getEffectSeries("1-9", "bonusHan")
    ).toEqual([1, 1, 1, 1, 2]);
    expect(
      getEffectSeries(
        "1-10",
        "paymentMultiplier"
      )
    ).toEqual([1.1, 1.2, 1.3, 1.4, 1.5]);
    expect(
      getEffectSeries(
        "1-11",
        "additionalPaymentPoints"
      )
    ).toEqual([300, 500, 800, 1000, 1500]);
    expect(
      getEffectSeries("1-12", "bonusHan")
    ).toEqual([1, 1, 2, 2, 3]);
    expect(
      getEffectSeries(
        "1-13",
        "bonusHanAt40OrMore"
      )
    ).toEqual([1, 1, 1, 1, 2]);
    expect(
      getSkill("1-13").levels[1]
        .effectValues
    ).toEqual({
      fuFrom20: 30,
      fuFrom25: 40,
      fuFrom30: 40,
      bonusHanAt40OrMore: 1
    });
  });

  it("解放条件と発動段階を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_1.map(
        (skill) => skill.activationHooks
      )
    ).toEqual([
      ["dealCompleted"],
      ["afterCall"],
      ["handValueEvaluation"],
      ["drawTileSelection"],
      ["doraIndicatorSelection"],
      ["dealCompleted"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["paymentCalculation"],
      ["paymentCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["actionOpportunity"],
      ["actionOpportunity"]
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_1.map(
        (skill) =>
          skill.unlockCondition === null
            ? null
            : [
                skill.unlockCondition
                  .conditionId,
                skill.unlockCondition
                  .targetValue
              ]
      )
    ).toEqual([
      null,
      ["enemy-8-first-place-count", 1],
      ["win-with-at-least-5-red-dora", 1],
      ["enemy-9-first-place-count", 1],
      ["enemy-1-first-place-count", 1],
      ["win-with-at-least-3-red-dora", 1],
      ["enemy-7-first-place-count", 1],
      ["tanki-win-count", 10],
      ["penchan-or-kanchan-win-count", 10],
      ["enemy-10-first-place-count", 1],
      ["enemy-10-first-place-count", 5],
      null,
      ["enemy-11-first-place-count", 5],
      ["enemy-13-first-place-count", 5],
      ["enemy-5-first-place-count", 1]
    ]);
  });

  it("アクティブ2件のMPと継続値を保持する", () => {
    const skill14 = getSkill("1-14");
    const skill15 = getSkill("1-15");

    expect(skill14.kind).toBe("active");
    expect(skill15.kind).toBe("active");
    expect(skill14.usageScope).toBe("turn");
    expect(skill15.usageScope).toBe("turn");

    if (
      skill14.kind !== "active" ||
      skill15.kind !== "active"
    ) {
      throw new Error(
        "アクティブスキルとして定義されていません。"
      );
    }

    expect(
      PLAYER_SKILL_LEVELS.map(
        (level) =>
          skill14.levels[level].mpCost
      )
    ).toEqual([80, 70, 60, 50, 30]);
    expect(
      getEffectSeries("1-14", "honbaIncrease")
    ).toEqual([1, 1, 1, 1, 1]);
    expect(
      PLAYER_SKILL_LEVELS.map(
        (level) =>
          skill15.levels[level].mpCost
      )
    ).toEqual([250, 230, 210, 180, 150]);
    expect(
      getEffectSeries("1-15", "durationTurns")
    ).toEqual([1, 2, 3, 4, 6]);
  });
});
