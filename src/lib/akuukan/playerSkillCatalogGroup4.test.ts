import {
  describe,
  expect,
  it
} from "vitest";
import {
  PLAYER_SKILL_CATALOG_GROUP_4
} from "./playerSkillCatalogGroup4";
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
    PLAYER_SKILL_CATALOG_GROUP_4.find(
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

describe("プレイヤースキル第4グループ", () => {
  it("図鑑No.50から72をID順に定義する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4
    ).toHaveLength(23);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4.map(
        (skill) => skill.catalogNumber
      )
    ).toEqual([
      50, 51, 52, 53, 54, 55, 56,
      57, 58, 59, 60, 61, 62, 63,
      64, 65, 66, 67, 68, 69, 70,
      71, 72
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4.map(
        (skill) => skill.id
      )
    ).toEqual([
      "4-1", "4-2", "4-3", "4-4",
      "4-5", "4-6", "4-7", "4-8",
      "4-9", "4-10", "4-11",
      "4-12", "4-13", "4-14",
      "4-15", "4-16", "4-17",
      "4-18", "4-19", "4-20",
      "4-21", "4-22", "4-23"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4.map(
        (skill) => skill.name
      )
    ).toEqual([
      "加速装置【横】",
      "加速装置【縦】",
      "加速装置【汎用】",
      "加速装置【黙】",
      "加速装置【鳴】",
      "加速装置【紅】",
      "加速装置【槓】",
      "起死回生",
      "字牌引寄【全】",
      "数牌引寄【索】",
      "数牌引寄【筒】",
      "数牌引寄【萬】",
      "数牌引寄【外】",
      "数牌引寄【中】",
      "字牌引寄【龍】",
      "字牌引寄【門】",
      "手牌整理【序】",
      "手牌整理【索】",
      "手牌整理【筒】",
      "手牌整理【萬】",
      "雲外蒼天【対】",
      "雲外蒼天【順】",
      "雲外蒼天【刻】"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4.map(
        (skill) => skill.evaluation
      )
    ).toEqual([
      "A", "B+", "S", "A+", "A+",
      "A+", "C", "A", "C", "A",
      "A", "A", "B", "A", "B", "C",
      "S", "S", "S", "S", "A+", "S",
      "S"
    ]);
  });

  it("全23件の最大Lv.5と必要EXPを保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4.map(
        getPlayerSkillMaxLevel
      )
    ).toEqual(
      Array.from({ length: 23 }, () => 5)
    );

    const baseRequiredExp = [
      7400, 6800, 15000, 11000, 9600,
      6900, 2200, 4400, 4500, 10000,
      10000, 10000, 3600, 4600, 3300,
      2300, 3600, 9900, 9900, 9900,
      8500, 8400, 12000
    ];

    PLAYER_SKILL_CATALOG_GROUP_4.forEach(
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

  it("通常ツモ補正16件の倍率を保持する", () => {
    const standardSkillIds = [
      "4-1",
      "4-2",
      "4-4",
      "4-5",
      "4-6"
    ] as const;

    for (const skillId of standardSkillIds) {
      expect(
        getEffectSeries(
          skillId,
          "drawWeightMultiplier"
        )
      ).toEqual([1.1, 1.2, 1.3, 1.4, 1.5]);
    }

    expect(
      getEffectSeries(
        "4-3",
        "drawWeightMultiplier"
      )
    ).toEqual([1.05, 1.1, 1.15, 1.2, 1.25]);

    const strongSkillIds = [
      "4-7", "4-8", "4-9", "4-10",
      "4-11", "4-12", "4-13",
      "4-14", "4-15", "4-16"
    ] as const;

    for (const skillId of strongSkillIds) {
      expect(
        getEffectSeries(
          skillId,
          "drawWeightMultiplier"
        )
      ).toEqual([1.1, 1.2, 1.3, 1.5, 2]);
    }
  });

  it("アクティブ7件のMPを保持する", () => {
    const expectedMpCosts = [
      ["4-17", [120, 110, 100, 90, 80]],
      ["4-18", [110, 100, 90, 80, 60]],
      ["4-19", [110, 100, 90, 80, 60]],
      ["4-20", [110, 100, 90, 80, 60]],
      ["4-21", [330, 320, 300, 280, 250]],
      ["4-22", [400, 390, 370, 350, 320]],
      ["4-23", [430, 420, 400, 380, 350]]
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

  it("交換枚数と次局配牌予約数を保持する", () => {
    expect(
      getEffectSeries(
        "4-17",
        "maximumExchangeTileCount"
      )
    ).toEqual([1, 2, 3, 4, 6]);

    for (
      const skillId of
        ["4-18", "4-19", "4-20"] as const
    ) {
      expect(
        getEffectSeries(
          skillId,
          "maximumExchangeTileCount"
        )
      ).toEqual([1, 2, 2, 3, 3]);
    }

    expect(
      getEffectSeries(
        "4-21",
        "reservedPairCount"
      )
    ).toEqual([1, 1, 1, 1, 1]);
    expect(
      getEffectSeries(
        "4-22",
        "reservedSequenceCount"
      )
    ).toEqual([1, 1, 1, 1, 1]);
    expect(
      getEffectSeries(
        "4-23",
        "reservedConcealedTripletCount"
      )
    ).toEqual([1, 1, 1, 1, 1]);
  });

  it("発動段階・種別・使用範囲を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4
        .slice(0, 16)
        .every(
          (skill) =>
            skill.kind === "passive" &&
            skill.usageScope === null &&
            skill.activationHooks[0] ===
              "drawTileSelection"
        )
    ).toBe(true);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4
        .slice(16)
        .map(
          (skill) => skill.activationHooks
        )
    ).toEqual([
      ["dealCompleted"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"],
      ["actionOpportunity"]
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4
        .slice(16)
        .map((skill) => skill.usageScope)
    ).toEqual([
      "round",
      "turn",
      "turn",
      "turn",
      "turn",
      "turn",
      "turn"
    ]);
  });

  it("READMEの解放条件を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_4.map(
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
      ["enemy-15-first-place-count", 3],
      ["enemy-11-first-place-count", 1],
      null,
      ["enemy-3-first-place-count", 1],
      ["enemy-2-first-place-count", 1],
      ["enemy-8-first-place-count", 5],
      ["enemy-7-first-place-count", 5],
      ["fourth-place-count", 50],
      ["kokushi-or-thirteen-sided-win-count", 1],
      null,
      null,
      null,
      ["chinroutou-or-honroutou-win-count", 1],
      ["tanyao-win-count", 50],
      ["daisangen-win-count", 1],
      ["shousuushii-or-daisuushii-win-count", 1],
      ["enemy-13-first-place-count", 1],
      ["ryuuiisou-win-count", 1],
      ["tsuuiisou-win-count", 1],
      ["chuuren-or-pure-nine-gates-win-count", 1],
      ["chiitoitsu-win-count", 30],
      ["enemy-14-first-place-count", 3],
      ["enemy-9-first-place-count", 5]
    ]);
  });
});
