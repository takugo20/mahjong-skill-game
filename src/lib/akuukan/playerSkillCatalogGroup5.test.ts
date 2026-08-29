import {
  describe,
  expect,
  it
} from "vitest";
import {
  PLAYER_SKILL_CATALOG_GROUP_5
} from "./playerSkillCatalogGroup5";
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
    PLAYER_SKILL_CATALOG_GROUP_5.find(
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

describe("プレイヤースキル第5グループ", () => {
  it("図鑑No.73から80をID順に定義する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5
    ).toHaveLength(8);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.map(
        (skill) => skill.catalogNumber
      )
    ).toEqual([
      73, 74, 75, 76,
      77, 78, 79, 80
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.map(
        (skill) => skill.id
      )
    ).toEqual([
      "5-1", "5-2", "5-3", "5-4",
      "5-5", "5-6", "5-7", "5-8"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.map(
        (skill) => skill.name
      )
    ).toEqual([
      "紫電一閃",
      "賞牌引寄【裏】",
      "賞牌引寄【槓】",
      "紫電一閃【改】",
      "単騎強化【速】",
      "愚形強化【速】",
      "虎視眈々【嶺上】",
      "虎視眈々【海底】"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.map(
        (skill) => skill.evaluation
      )
    ).toEqual([
      "B", "B+", "A+", "A+",
      "B", "B", "D", "D"
    ]);
  });

  it("全8件の最大Lv.5と必要EXPを保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.map(
        getPlayerSkillMaxLevel
      )
    ).toEqual(
      Array.from({ length: 8 }, () => 5)
    );

    const baseRequiredExp = [
      4000, 4700, 6500, 6800,
      1500, 1800, 700, 700
    ];

    PLAYER_SKILL_CATALOG_GROUP_5.forEach(
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

  it("ツモ牌と表示牌の抽選倍率を保持する", () => {
    const strongWeightSeries = [
      1.1, 1.4, 1.8, 2.3, 3
    ];

    expect(
      getEffectSeries(
        "5-1",
        "winningTileDrawWeightMultiplier"
      )
    ).toEqual(strongWeightSeries);
    expect(
      getEffectSeries(
        "5-2",
        "uraDoraIndicatorWeightMultiplier"
      )
    ).toEqual(strongWeightSeries);
    expect(
      getEffectSeries(
        "5-3",
        "kanDoraIndicatorWeightMultiplier"
      )
    ).toEqual(strongWeightSeries);

    for (
      const skillId of
        ["5-5", "5-6"] as const
    ) {
      expect(
        getEffectSeries(
          skillId,
          "winningTileDrawWeightMultiplier"
        )
      ).toEqual([
        1.1, 1.25, 1.5, 1.75, 2
      ]);
    }

    expect(
      getEffectSeries(
        "5-7",
        "rinshanWinningTileWeightMultiplier"
      )
    ).toEqual([3, 3.2, 3.5, 4, 5]);
    expect(
      getEffectSeries(
        "5-8",
        "haiteiWinningTileWeightMultiplier"
      )
    ).toEqual([3, 3.2, 3.5, 4, 5]);
  });

  it("紫電一閃【改】の一発期間を保持する", () => {
    expect(
      getEffectSeries(
        "5-4",
        "ippatsuDurationTurns"
      )
    ).toEqual([2, 3, 4, 5, 6]);
  });

  it("発動段階・種別・使用範囲を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.map(
        (skill) => skill.activationHooks
      )
    ).toEqual([
      ["drawTileSelection"],
      ["doraIndicatorSelection"],
      ["doraIndicatorSelection"],
      ["afterDiscard", "yakuEvaluation"],
      ["drawTileSelection"],
      ["drawTileSelection"],
      ["drawTileSelection"],
      ["drawTileSelection"]
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.every(
        (skill) =>
          skill.kind === "passive" &&
          skill.usageScope === null &&
          PLAYER_SKILL_LEVELS.every(
            (level) =>
              skill.levels[level]
                .mpCost === null
          )
      )
    ).toBe(true);
  });

  it("READMEの解放条件を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_5.map(
        (skill) => [
          skill.unlockCondition
            ?.conditionId,
          skill.unlockCondition
            ?.targetValue
        ]
      )
    ).toEqual([
      ["ippatsu-win-count", 10],
      ["win-with-at-least-4-ura-dora", 1],
      ["enemy-3-first-place-count", 5],
      ["enemy-2-first-place-count", 5],
      ["tanki-win-count", 30],
      ["penchan-or-kanchan-win-count", 30],
      ["rinshan-kaihou-win-count", 1],
      ["haitei-win-count", 1]
    ]);
  });
});
