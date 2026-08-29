import {
  describe,
  expect,
  it
} from "vitest";
import {
  PLAYER_SKILL_CATALOG_GROUP_3
} from "./playerSkillCatalogGroup3";
import {
  getPlayerSkillMaxLevel,
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
    PLAYER_SKILL_CATALOG_GROUP_3.find(
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

describe("プレイヤースキル第3グループ", () => {
  it("図鑑No.36から49をID順に定義する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3
    ).toHaveLength(14);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        (skill) => skill.catalogNumber
      )
    ).toEqual([
      36, 37, 38, 39, 40, 41, 42,
      43, 44, 45, 46, 47, 48, 49
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        (skill) => skill.id
      )
    ).toEqual([
      "3-1", "3-2", "3-3", "3-4",
      "3-5", "3-6", "3-7", "3-8",
      "3-9", "3-10", "3-11",
      "3-12", "3-13", "3-14"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        (skill) => skill.name
      )
    ).toEqual([
      "罰符軽減",
      "親被軽減",
      "闇聴察知",
      "透牌",
      "防御結界【序】",
      "防御結界【裸】",
      "防御結界【槓】",
      "山牌封印",
      "防御結界【破】",
      "防御結界【急】",
      "防御結界【改】",
      "透牌【全】",
      "河牌転送",
      "色即是空"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        (skill) => skill.evaluation
      )
    ).toEqual([
      "D", "C", "C", "S", "C", "B+",
      "S", "S", "S+", "B+", "S+",
      "A", "A+", "S+"
    ]);
  });

  it("最大レベルと必要EXPを保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        getPlayerSkillMaxLevel
      )
    ).toEqual([
      5, 1, 5, 5, 5, 1, 1,
      5, 5, 5, 5, 5, 5, 5
    ]);

    const fixedSkillIds = [
      "3-2",
      "3-6",
      "3-7"
    ] as const;

    for (const skillId of fixedSkillIds) {
      expect(
        PLAYER_SKILL_LEVELS.map(
          (level) =>
            getSkill(skillId).levels[level]
              .requiredExp
        )
      ).toEqual([0, 0, 0, 0, 0]);
    }

    const growingSkills = [
      ["3-1", 300],
      ["3-3", 1500],
      ["3-4", 5400],
      ["3-5", 1800],
      ["3-8", 14000],
      ["3-9", 13000],
      ["3-10", 2500],
      ["3-11", 9900],
      ["3-12", 10000],
      ["3-13", 9300],
      ["3-14", 10000]
    ] as const;

    for (const [skillId, base] of growingSkills) {
      expect(
        PLAYER_SKILL_LEVELS.map(
          (level) =>
            getSkill(skillId).levels[level]
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
  });

  it("パッシブ7件の効果値を保持する", () => {
    expect(
      getEffectSeries(
        "3-1",
        "notenPenaltyPaymentPercent"
      )
    ).toEqual([50, 40, 30, 10, 0]);
    expect(
      getSkill("3-2").levels[1]
        .effectValues
    ).toEqual({
      parentTsumoPaymentMultiplier: 0.5
    });
    expect(
      getEffectSeries(
        "3-3",
        "detectionChancePercent"
      )
    ).toEqual([10, 15, 25, 50, 80]);
    expect(
      getEffectSeries(
        "3-4",
        "visibleTilesPerOpponent"
      )
    ).toEqual([1, 2, 3, 4, 6]);
    expect(
      getEffectSeries(
        "3-5",
        "protectedDiscardCount"
      )
    ).toEqual([3, 5, 7, 9, 12]);
    expect(
      getSkill("3-6").levels[1]
        .effectValues
    ).toEqual({
      blockCalls: 1,
      blockRon: 1
    });
    expect(
      getSkill("3-7").levels[1]
        .effectValues
    ).toEqual({
      ronImmunityUntilRoundEnd: 1,
      chankanImmunity: 1
    });
  });

  it("アクティブ7件のMPを保持する", () => {
    const expectedMpCosts = [
      ["3-8", [120, 110, 100, 80, 60]],
      ["3-9", [360, 320, 280, 240, 200]],
      ["3-10", [140, 130, 120, 110, 90]],
      ["3-11", [500, 450, 400, 350, 300]],
      ["3-12", [300, 290, 280, 270, 250]],
      ["3-13", [380, 360, 340, 320, 280]],
      ["3-14", [600, 550, 500, 450, 350]]
    ] as const;

    for (
      const [skillId, mpCosts] of
        expectedMpCosts
    ) {
      const skill = getSkill(skillId);

      expect(skill.kind).toBe("active");

      if (skill.kind !== "active") {
        throw new Error(
          "アクティブスキルとして定義されていません。"
        );
      }

      expect(
        PLAYER_SKILL_LEVELS.map(
          (level) =>
            skill.levels[level].mpCost
        )
      ).toEqual(mpCosts);
    }
  });

  it("アクティブの除外枚数・継続巡数・支払上限を保持する", () => {
    expect(
      getEffectSeries(
        "3-8",
        "removedWallTileCount"
      )
    ).toEqual([1, 1, 2, 2, 3]);

    const durationSkillIds = [
      "3-9",
      "3-10",
      "3-11",
      "3-13",
      "3-14"
    ] as const;

    for (const skillId of durationSkillIds) {
      expect(
        getEffectSeries(
          skillId,
          "durationTurns"
        )
      ).toEqual([1, 2, 3, 4, 6]);
    }

    expect(
      getEffectSeries(
        "3-10",
        "maximumHandBasePoints"
      )
    ).toEqual([
      2000,
      2000,
      2000,
      2000,
      2000
    ]);
    expect(
      getEffectSeries(
        "3-12",
        "snapshotOpponentCount"
      )
    ).toEqual([1, 1, 1, 1, 1]);
  });

  it("発動段階・種別・使用範囲を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        (skill) => skill.activationHooks
      )
    ).toEqual([
      ["drawSettlement"],
      ["paymentCalculation"],
      ["informationVisibility"],
      ["informationVisibility"],
      ["callLegality"],
      ["callLegality", "ronLegality"],
      ["kanLegality", "ronLegality"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["dealCompleted"]
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        (skill) => skill.kind
      )
    ).toEqual([
      "passive", "passive", "passive",
      "passive", "passive", "passive",
      "passive", "active", "active",
      "active", "active", "active",
      "active", "active"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
        (skill) => skill.usageScope
      )
    ).toEqual([
      null, null, null, null, null,
      null, null, "turn", "turn",
      "turn", "turn", "turn", "turn",
      "round"
    ]);
  });

  it("READMEの解放条件を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_3.map(
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
      ["enemy-1-first-place-count", 5],
      null,
      ["enemy-6-first-place-count", 1],
      null,
      ["enemy-4-first-place-count", 1],
      ["enemy-4-first-place-count", 5],
      ["round-draw-count", 25],
      ["round-draw-count", 50],
      ["enemy-15-first-place-count", 1],
      ["enemy-12-first-place-count", 1],
      ["enemy-6-first-place-count", 5],
      ["enemy-12-first-place-count", 5],
      ["enemy-16-first-place-count", 3]
    ]);
  });
});
