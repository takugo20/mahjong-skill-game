import {
  describe,
  expect,
  it
} from "vitest";
import {
  PLAYER_SKILL_CATALOG_GROUP_2
} from "./playerSkillCatalogGroup2";
import {
  getPlayerSkillLevelDefinition,
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
    PLAYER_SKILL_CATALOG_GROUP_2.find(
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

describe("プレイヤースキル第2グループ", () => {
  it("図鑑No.16から35をID順に定義する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2
    ).toHaveLength(20);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2.map(
        (skill) => skill.catalogNumber
      )
    ).toEqual([
      16, 17, 18, 19, 20,
      21, 22, 23, 24, 25,
      26, 27, 28, 29, 30,
      31, 32, 33, 34, 35
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2.map(
        (skill) => skill.id
      )
    ).toEqual([
      "2-1", "2-2", "2-3", "2-4",
      "2-5", "2-6", "2-7", "2-8",
      "2-9", "2-10", "2-11",
      "2-12", "2-13", "2-14",
      "2-15", "2-16", "2-17",
      "2-18", "2-19", "2-20"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2.map(
        (skill) => skill.name
      )
    ).toEqual([
      "三色名人",
      "一通名人",
      "全帯名人",
      "染手名人",
      "盃口名人",
      "平和名人",
      "立直名人",
      "三色強化",
      "一通強化",
      "混全帯強化",
      "純全帯強化",
      "混一色強化",
      "清一色強化",
      "七対子強化",
      "盃口強化",
      "対刻槓強化",
      "花天月地",
      "恩恵享受【横】",
      "恩恵享受【縦】",
      "恩恵享受【色】"
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2.map(
        (skill) => skill.evaluation
      )
    ).toEqual([
      "B", "B", "B", "B+", "A",
      "A+", "S+", "A", "A", "B+",
      "B", "A", "B", "A", "B+",
      "A+", "D", "A+", "S", "S"
    ]);
  });

  it("最大Lv.1と通常の最大Lv.5を区別する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2.map(
        getPlayerSkillMaxLevel
      )
    ).toEqual([
      1, 1, 1, 1, 1, 1, 1,
      5, 5, 5, 5, 5, 5, 5,
      5, 5, 5, 5, 5, 5
    ]);

    expect(() =>
      getPlayerSkillLevelDefinition(
        getSkill("2-1"),
        2
      )
    ).toThrow("最大レベル1");
    expect(
      getPlayerSkillLevelDefinition(
        getSkill("2-8"),
        5
      )
    ).toBe(getSkill("2-8").levels[5]);
  });

  it("READMEの基準EXPをレベル別必要量へ展開する", () => {
    PLAYER_SKILL_CATALOG_GROUP_2
      .slice(0, 7)
      .forEach((skill) => {
        expect(
          PLAYER_SKILL_LEVELS.map(
            (level) =>
              skill.levels[level]
                .requiredExp
          )
        ).toEqual([0, 0, 0, 0, 0]);
      });

    const baseRequiredExp = [
      8200, 8200, 7400, 4100, 7100,
      4300, 7700, 5300, 8500, 800,
      7300, 8700, 14000
    ];

    PLAYER_SKILL_CATALOG_GROUP_2
      .slice(7)
      .forEach((skill, index) => {
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
      });
  });

  it("最大Lv.1の役成立・喰い下がり効果を保持する", () => {
    expect(
      getSkill("2-1").levels[1]
        .effectValues
    ).toEqual({
      sanshokuDoujunOpenHan: 2
    });
    expect(
      getSkill("2-2").levels[1]
        .effectValues
    ).toEqual({
      ikkitsuukanOpenHan: 2
    });
    expect(
      getSkill("2-3").levels[1]
        .effectValues
    ).toEqual({
      chantaOpenHan: 2,
      junchanOpenHan: 3
    });
    expect(
      getSkill("2-4").levels[1]
        .effectValues
    ).toEqual({
      honitsuOpenHan: 3,
      chinitsuOpenHan: 6
    });
    expect(
      getSkill("2-5").levels[1]
        .effectValues
    ).toEqual({
      iipeikouOpenHan: 1,
      ryanpeikouOpenHan: 3
    });
    expect(
      getSkill("2-6").levels[1]
        .effectValues
    ).toEqual({ pinfuOpenHan: 1 });
    expect(
      getSkill("2-7").levels[1]
        .effectValues
    ).toEqual({
      openRiichiAllowed: 1,
      openIppatsuAllowed: 1,
      openMenzenTsumoAllowed: 1,
      openUraDoraAllowed: 1,
      openRonFu: 0
    });
  });

  it("役強化・MP・次局配牌のレベル値を保持する", () => {
    const yakuBoostSkillIds = [
      "2-8", "2-9", "2-10", "2-11",
      "2-12", "2-13", "2-14",
      "2-15", "2-16", "2-17"
    ] as const;

    for (const skillId of yakuBoostSkillIds) {
      expect(
        getEffectSeries(
          skillId,
          "additionalYakuHan"
        )
      ).toEqual([1, 1, 1, 1, 2]);
    }

    expect(
      getEffectSeries(
        "2-18",
        "mpRecoveryPerYaku"
      )
    ).toEqual([10, 20, 40, 60, 90]);
    expect(
      getEffectSeries(
        "2-19",
        "minimumPairCount"
      )
    ).toEqual([2, 2, 3, 3, 4]);
    expect(
      getEffectSeries(
        "2-20",
        "minimumSuitTileCount"
      )
    ).toEqual([4, 5, 6, 7, 9]);
  });

  it("解放条件と発動段階を保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2.map(
        (skill) => skill.activationHooks
      )
    ).toEqual([
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["yakuEvaluation"],
      ["yakuEvaluation"],
      ["riichiLegality", "yakuEvaluation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["hanFuCalculation"],
      ["afterWin"],
      ["afterWin", "dealComposition"],
      ["afterWin", "dealComposition"]
    ]);
    expect(
      PLAYER_SKILL_CATALOG_GROUP_2.map(
        (skill) => [
          skill.unlockCondition
            ?.conditionId,
          skill.unlockCondition
            ?.targetValue
        ]
      )
    ).toEqual([
      ["sanshoku-doujun-win-count", 20],
      ["ikkitsuukan-win-count", 20],
      ["chanta-or-junchan-win-count", 20],
      ["honitsu-or-chinitsu-win-count", 20],
      ["iipeikou-or-ryanpeikou-win-count", 20],
      ["pinfu-win-count", 50],
      ["enemy-14-first-place-count", 1],
      ["sanshoku-doujun-win-count", 10],
      ["ikkitsuukan-win-count", 10],
      ["chanta-win-count", 10],
      ["junchan-win-count", 10],
      ["honitsu-win-count", 10],
      ["chinitsu-win-count", 10],
      ["chiitoitsu-win-count", 10],
      ["iipeikou-or-ryanpeikou-win-count", 10],
      [
        "toitoi-sanshoku-doukou-sanankou-or-sankantsu-win-count",
        10
      ],
      ["rinshan-haitei-or-houtei-win-count", 3],
      ["enemy-16-first-place-count", 1],
      ["suuankou-or-suuankou-tanki-win-count", 1],
      ["enemy-5-first-place-count", 5]
    ]);
  });

  it("20件すべてをMP消費なしのパッシブとして定義する", () => {
    for (
      const skill of
        PLAYER_SKILL_CATALOG_GROUP_2
    ) {
      expect(skill.kind).toBe("passive");
      expect(skill.usageScope).toBeNull();
      expect(
        PLAYER_SKILL_LEVELS.map(
          (level) =>
            skill.levels[level].mpCost
        )
      ).toEqual([
        null,
        null,
        null,
        null,
        null
      ]);
    }
  });
});
