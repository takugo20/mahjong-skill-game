import type {
  PassivePlayerSkillLevelDefinition,
  PlayerSkillDefinition,
  PlayerSkillEffectValues,
  PlayerSkillLevelTable
} from "./playerSkillCatalogTypes";

type FiveLevelEffectValues = readonly [
  PlayerSkillEffectValues,
  PlayerSkillEffectValues,
  PlayerSkillEffectValues,
  PlayerSkillEffectValues,
  PlayerSkillEffectValues
];

function createFixedPassiveLevels(
  effectValues: PlayerSkillEffectValues
): PlayerSkillLevelTable<
  PassivePlayerSkillLevelDefinition
> {
  const levelDefinition:
    PassivePlayerSkillLevelDefinition = {
      requiredExp: 0,
      mpCost: null,
      effectValues
    };

  return {
    1: levelDefinition,
    2: levelDefinition,
    3: levelDefinition,
    4: levelDefinition,
    5: levelDefinition
  };
}

function createPassiveLevels(
  baseRequiredExp: number,
  effectValues: FiveLevelEffectValues
): PlayerSkillLevelTable<
  PassivePlayerSkillLevelDefinition
> {
  return {
    1: {
      requiredExp: baseRequiredExp,
      mpCost: null,
      effectValues: effectValues[0]
    },
    2: {
      requiredExp: baseRequiredExp * 2,
      mpCost: null,
      effectValues: effectValues[1]
    },
    3: {
      requiredExp: baseRequiredExp * 5,
      mpCost: null,
      effectValues: effectValues[2]
    },
    4: {
      requiredExp: baseRequiredExp * 15,
      mpCost: null,
      effectValues: effectValues[3]
    },
    5: {
      requiredExp: 0,
      mpCost: null,
      effectValues: effectValues[4]
    }
  };
}

function createAdditionalHanLevels(
  baseRequiredExp: number
): PlayerSkillLevelTable<
  PassivePlayerSkillLevelDefinition
> {
  return createPassiveLevels(
    baseRequiredExp,
    [
      { additionalYakuHan: 1 },
      { additionalYakuHan: 1 },
      { additionalYakuHan: 1 },
      { additionalYakuHan: 1 },
      { additionalYakuHan: 2 }
    ]
  );
}

export const PLAYER_SKILL_CATALOG_GROUP_2 = [
  {
    catalogNumber: 16,
    id: "2-1",
    name: "三色名人",
    evaluation: "B",
    maxLevel: 1,
    kind: "passive",
    description:
      "自分のみ、三色同順が喰い下がりしなくなる。敵能力による役無効化後に有効な場合、門前時の2翻へ戻す。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "sanshoku-doujun-win-count",
      description:
        "三色同順を通算20回和了する。",
      targetValue: 20
    },
    levels: createFixedPassiveLevels({
      sanshokuDoujunOpenHan: 2
    })
  },
  {
    catalogNumber: 17,
    id: "2-2",
    name: "一通名人",
    evaluation: "B",
    maxLevel: 1,
    kind: "passive",
    description:
      "自分のみ、一気通貫が喰い下がりしなくなる。敵能力による役無効化後に有効な場合、門前時の2翻へ戻す。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "ikkitsuukan-win-count",
      description:
        "一気通貫を通算20回和了する。",
      targetValue: 20
    },
    levels: createFixedPassiveLevels({
      ikkitsuukanOpenHan: 2
    })
  },
  {
    catalogNumber: 18,
    id: "2-3",
    name: "全帯名人",
    evaluation: "B",
    maxLevel: 1,
    kind: "passive",
    description:
      "自分のみ、チャンタと純チャンが喰い下がりしなくなる。敵能力による役無効化後に有効な場合、門前時の翻数へ戻す。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "chanta-or-junchan-win-count",
      description:
        "チャンタまたは純チャンを通算20回和了する。",
      targetValue: 20
    },
    levels: createFixedPassiveLevels({
      chantaOpenHan: 2,
      junchanOpenHan: 3
    })
  },
  {
    catalogNumber: 19,
    id: "2-4",
    name: "染手名人",
    evaluation: "B+",
    maxLevel: 1,
    kind: "passive",
    description:
      "自分のみ、ホンイツとチンイツが喰い下がりしなくなる。敵能力による役無効化後に有効な場合、門前時の翻数へ戻す。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "honitsu-or-chinitsu-win-count",
      description:
        "混一色または清一色を通算20回和了する。",
      targetValue: 20
    },
    levels: createFixedPassiveLevels({
      honitsuOpenHan: 3,
      chinitsuOpenHan: 6
    })
  },
  {
    catalogNumber: 20,
    id: "2-5",
    name: "盃口名人",
    evaluation: "A",
    maxLevel: 1,
    kind: "passive",
    description:
      "自分のみ、一盃口と二盃口が副露していても成立する。成立時は門前時と同じ標準翻数を使用する。",
    activationHooks: ["yakuEvaluation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "iipeikou-or-ryanpeikou-win-count",
      description:
        "一盃口または二盃口を通算20回和了する。",
      targetValue: 20
    },
    levels: createFixedPassiveLevels({
      iipeikouOpenHan: 1,
      ryanpeikouOpenHan: 3
    })
  },
  {
    catalogNumber: 21,
    id: "2-6",
    name: "平和名人",
    evaluation: "A+",
    maxLevel: 1,
    kind: "passive",
    description:
      "自分のみ、平和が副露していても成立する。成立時は門前時と同じ標準1翻を使用する。",
    activationHooks: ["yakuEvaluation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "pinfu-win-count",
      description:
        "平和を通算50回和了する。",
      targetValue: 50
    },
    levels: createFixedPassiveLevels({
      pinfuOpenHan: 1
    })
  },
  {
    catalogNumber: 22,
    id: "2-7",
    name: "立直名人",
    evaluation: "S+",
    maxLevel: 1,
    kind: "passive",
    description:
      "自分のみ、副露していても通常の立直宣言機会に立直でき、立直・一発・門前清自摸和・裏ドラを認める。他の門前限定役と門前ロン10符は、このスキル単独では認めない。",
    activationHooks: [
      "riichiLegality",
      "yakuEvaluation"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-14-first-place-count",
      description:
        "敵14との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createFixedPassiveLevels({
      openRiichiAllowed: 1,
      openIppatsuAllowed: 1,
      openMenzenTsumoAllowed: 1,
      openUraDoraAllowed: 1,
      openRonFu: 0
    })
  },
  {
    catalogNumber: 23,
    id: "2-8",
    name: "三色強化",
    evaluation: "A",
    kind: "passive",
    description:
      "自分が和了した際、三色同順が敵能力による無効化後も有効に成立している場合、その役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "sanshoku-doujun-win-count",
      description:
        "三色同順を通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(8200)
  },
  {
    catalogNumber: 24,
    id: "2-9",
    name: "一通強化",
    evaluation: "A",
    kind: "passive",
    description:
      "自分が和了した際、一気通貫が敵能力による無効化後も有効に成立している場合、その役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "ikkitsuukan-win-count",
      description:
        "一気通貫を通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(8200)
  },
  {
    catalogNumber: 25,
    id: "2-10",
    name: "混全帯強化",
    evaluation: "B+",
    kind: "passive",
    description:
      "自分が和了した際、チャンタが敵能力による無効化後も有効に成立している場合、その役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "chanta-win-count",
      description:
        "チャンタを通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(7400)
  },
  {
    catalogNumber: 26,
    id: "2-11",
    name: "純全帯強化",
    evaluation: "B",
    kind: "passive",
    description:
      "自分が和了した際、純チャンが敵能力による無効化後も有効に成立している場合、その役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "junchan-win-count",
      description:
        "純チャンを通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(4100)
  },
  {
    catalogNumber: 27,
    id: "2-12",
    name: "混一色強化",
    evaluation: "A",
    kind: "passive",
    description:
      "自分が和了した際、ホンイツが敵能力による無効化後も有効に成立している場合、その役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "honitsu-win-count",
      description:
        "混一色を通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(7100)
  },
  {
    catalogNumber: 28,
    id: "2-13",
    name: "清一色強化",
    evaluation: "B",
    kind: "passive",
    description:
      "自分が和了した際、チンイツが敵能力による無効化後も有効に成立している場合、その役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "chinitsu-win-count",
      description:
        "清一色を通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(4300)
  },
  {
    catalogNumber: 29,
    id: "2-14",
    name: "七対子強化",
    evaluation: "A",
    kind: "passive",
    description:
      "自分が和了した際、チートイツが敵能力による無効化後も有効に成立している場合、その役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "chiitoitsu-win-count",
      description:
        "七対子を通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(7700)
  },
  {
    catalogNumber: 30,
    id: "2-15",
    name: "盃口強化",
    evaluation: "B+",
    kind: "passive",
    description:
      "自分が和了した際、一盃口または二盃口のうち、敵能力による無効化後も有効に成立している各役の翻数に指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "iipeikou-or-ryanpeikou-win-count",
      description:
        "一盃口または二盃口を通算10回和了する。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(5300)
  },
  {
    catalogNumber: 31,
    id: "2-16",
    name: "対刻槓強化",
    evaluation: "A+",
    kind: "passive",
    description:
      "自分が和了した際、対々和・三色同刻・三暗刻・三槓子のうち、敵能力による無効化後も有効に成立している各役の翻数にそれぞれ指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "toitoi-sanshoku-doukou-sanankou-or-sankantsu-win-count",
      description:
        "対々和、三色同刻、三暗刻、三槓子のいずれかを含む和了を通算10回成立させる。",
      targetValue: 10
    },
    levels: createAdditionalHanLevels(8500)
  },
  {
    catalogNumber: 32,
    id: "2-17",
    name: "花天月地",
    evaluation: "D",
    kind: "passive",
    description:
      "自分が和了した際、嶺上開花・海底摸月・河底撈魚のうち、敵能力による無効化後も有効に成立している各役の翻数にそれぞれ指定数を加算する。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "rinshan-haitei-or-houtei-win-count",
      description:
        "嶺上開花、海底摸月、河底撈魚のいずれかを含む和了を通算3回成立させる。",
      targetValue: 3
    },
    levels: createAdditionalHanLevels(800)
  },
  {
    catalogNumber: 33,
    id: "2-18",
    name: "恩恵享受【横】",
    evaluation: "A+",
    kind: "passive",
    description:
      "自分が対象役で和了すると、通常の和了MP獲得後、採用構成で有効に成立した対象役の種類数に指定値を掛けたMPを回復する。最大MPは超えない。",
    activationHooks: ["afterWin"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-16-first-place-count",
      description:
        "敵16との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createPassiveLevels(7300, [
      { mpRecoveryPerYaku: 10 },
      { mpRecoveryPerYaku: 20 },
      { mpRecoveryPerYaku: 40 },
      { mpRecoveryPerYaku: 60 },
      { mpRecoveryPerYaku: 90 }
    ])
  },
  {
    catalogNumber: 34,
    id: "2-19",
    name: "恩恵享受【縦】",
    evaluation: "S",
    kind: "passive",
    description:
      "自分が七対子・対々和・三色同刻・三暗刻・三槓子のいずれかで有効に和了すると、次局配牌の対子最低組数保証を1件予約する。同一牌が2枚以上なら1組と数える。",
    activationHooks: [
      "afterWin",
      "dealComposition"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "suuankou-or-suuankou-tanki-win-count",
      description:
        "四暗刻または四暗刻単騎を和了する。",
      targetValue: 1
    },
    levels: createPassiveLevels(8700, [
      { minimumPairCount: 2 },
      { minimumPairCount: 2 },
      { minimumPairCount: 3 },
      { minimumPairCount: 3 },
      { minimumPairCount: 4 }
    ])
  },
  {
    catalogNumber: 35,
    id: "2-20",
    name: "恩恵享受【色】",
    evaluation: "S",
    kind: "passive",
    description:
      "自分が混一色または清一色で有効に和了すると、その和了で使用した色を記録し、次局配牌における同色牌の最低枚数保証を予約する。",
    activationHooks: [
      "afterWin",
      "dealComposition"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-5-first-place-count",
      description:
        "敵5との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createPassiveLevels(14000, [
      { minimumSuitTileCount: 4 },
      { minimumSuitTileCount: 5 },
      { minimumSuitTileCount: 6 },
      { minimumSuitTileCount: 7 },
      { minimumSuitTileCount: 9 }
    ])
  }
] as const satisfies readonly PlayerSkillDefinition[];
