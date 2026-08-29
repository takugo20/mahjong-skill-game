import type {
  ActivePlayerSkillLevelDefinition,
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

type FiveLevelMpCosts = readonly [
  number,
  number,
  number,
  number,
  number
];

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

function createActiveLevels(
  baseRequiredExp: number,
  mpCosts: FiveLevelMpCosts,
  effectValues: FiveLevelEffectValues
): PlayerSkillLevelTable<
  ActivePlayerSkillLevelDefinition
> {
  return {
    1: {
      requiredExp: baseRequiredExp,
      mpCost: mpCosts[0],
      effectValues: effectValues[0]
    },
    2: {
      requiredExp: baseRequiredExp * 2,
      mpCost: mpCosts[1],
      effectValues: effectValues[1]
    },
    3: {
      requiredExp: baseRequiredExp * 5,
      mpCost: mpCosts[2],
      effectValues: effectValues[2]
    },
    4: {
      requiredExp: baseRequiredExp * 15,
      mpCost: mpCosts[3],
      effectValues: effectValues[3]
    },
    5: {
      requiredExp: 0,
      mpCost: mpCosts[4],
      effectValues: effectValues[4]
    }
  };
}

export const PLAYER_SKILL_CATALOG_GROUP_1 = [
  {
    catalogNumber: 1,
    id: "1-1",
    name: "紅牌錬成【序】",
    evaluation: "A",
    kind: "passive",
    description:
      "配牌時に自動的に発動。自分の手牌のうちランダムに1枚が指定確率で牌種はそのままで赤ドラになる。",
    activationHooks: ["dealCompleted"],
    usageScope: null,
    unlockCondition: null,
    levels: createPassiveLevels(6000, [
      { chancePercent: 5 },
      { chancePercent: 10 },
      { chancePercent: 20 },
      { chancePercent: 30 },
      { chancePercent: 50 }
    ])
  },
  {
    catalogNumber: 2,
    id: "1-2",
    name: "紅牌錬成【破】",
    evaluation: "A+",
    kind: "passive",
    description:
      "他家がチー・ポン・大明槓を正式に成立させると自動的に発動。自分の手牌のうちランダムに1枚が指定確率で牌種はそのままで赤ドラになる。",
    activationHooks: ["afterCall"],
    usageScope: null,
    unlockCondition: {
      conditionId: "enemy-8-first-place-count",
      description:
        "敵8との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createPassiveLevels(6700, [
      { chancePercent: 3 },
      { chancePercent: 5 },
      { chancePercent: 8 },
      { chancePercent: 10 },
      { chancePercent: 20 }
    ])
  },
  {
    catalogNumber: 3,
    id: "1-3",
    name: "紅牌錬成【急】",
    evaluation: "A+",
    kind: "passive",
    description:
      "自分が和了した際に自動的に発動。自分の手牌のうちランダムに1枚が指定確率で牌種はそのままで赤ドラになり、その赤ドラも含めて点数計算する。",
    activationHooks: ["handValueEvaluation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "win-with-at-least-5-red-dora",
      description:
        "和了時の手牌および副露面子に赤ドラが5枚以上ある。",
      targetValue: 1
    },
    levels: createPassiveLevels(5900, [
      { chancePercent: 5 },
      { chancePercent: 10 },
      { chancePercent: 20 },
      { chancePercent: 30 },
      { chancePercent: 50 }
    ])
  },
  {
    catalogNumber: 4,
    id: "1-4",
    name: "賞牌引寄【表】",
    evaluation: "B+",
    kind: "passive",
    description:
      "自分がドラをツモる確率に指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId: "enemy-9-first-place-count",
      description:
        "敵9との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createPassiveLevels(3600, [
      { doraDrawWeightMultiplier: 1.1 },
      { doraDrawWeightMultiplier: 1.2 },
      { doraDrawWeightMultiplier: 1.3 },
      { doraDrawWeightMultiplier: 1.5 },
      { doraDrawWeightMultiplier: 2 }
    ])
  },
  {
    catalogNumber: 5,
    id: "1-5",
    name: "賞牌開帳",
    evaluation: "D",
    kind: "passive",
    description:
      "配牌時に自動的に発動。指定確率でドラ表示牌を増やす。新ドラは全員に適用され、裏ドラ表示牌も増える。ドラ表示牌は能力による追加分と槓ドラを合わせて最大5枚とし、超過分は不発となる。",
    activationHooks: [
      "doraIndicatorSelection"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId: "enemy-1-first-place-count",
      description:
        "敵1との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createPassiveLevels(400, [
      {
        chancePercent: 20,
        additionalDoraIndicators: 1
      },
      {
        chancePercent: 25,
        additionalDoraIndicators: 1
      },
      {
        chancePercent: 30,
        additionalDoraIndicators: 1
      },
      {
        chancePercent: 35,
        additionalDoraIndicators: 2
      },
      {
        chancePercent: 50,
        additionalDoraIndicators: 2
      }
    ])
  },
  {
    catalogNumber: 6,
    id: "1-6",
    name: "紅牌錬成【次】",
    evaluation: "B",
    kind: "passive",
    description:
      "自分が和了した次の局の配牌時に自動的に発動。自分の手牌のうちランダムに1枚が指定確率で牌種はそのままで赤ドラになる。流し満貫でも次局効果を予約する。",
    activationHooks: ["dealCompleted"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "win-with-at-least-3-red-dora",
      description:
        "和了時の手牌および副露面子に赤ドラが3枚以上ある。",
      targetValue: 1
    },
    levels: createPassiveLevels(5800, [
      { chancePercent: 10 },
      { chancePercent: 20 },
      { chancePercent: 35 },
      { chancePercent: 55 },
      { chancePercent: 80 }
    ])
  },
  {
    catalogNumber: 7,
    id: "1-7",
    name: "字牌供養",
    evaluation: "A",
    kind: "passive",
    description:
      "自分の河に指定枚数以上の字牌がある状態で和了した場合、ボーナス翻を1翻加算する。この翻加算自体は役にならず、有効な役がない手は条件を満たしていても和了できない。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "enemy-7-first-place-count",
      description:
        "敵7との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createPassiveLevels(5100, [
      {
        minimumHonorDiscards: 9,
        bonusHan: 1
      },
      {
        minimumHonorDiscards: 8,
        bonusHan: 1
      },
      {
        minimumHonorDiscards: 7,
        bonusHan: 1
      },
      {
        minimumHonorDiscards: 5,
        bonusHan: 1
      },
      {
        minimumHonorDiscards: 3,
        bonusHan: 1
      }
    ])
  },
  {
    catalogNumber: 8,
    id: "1-8",
    name: "単騎強化【攻】",
    evaluation: "B",
    kind: "passive",
    description:
      "自分のみ、単騎待ちで和了した場合、指定数のボーナス翻を加算する。この翻加算自体は役にならず、有効な役がない手は条件を満たしていても和了できない。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId: "tanki-win-count",
      description:
        "単騎待ちで通算10回和了する。",
      targetValue: 10
    },
    levels: createPassiveLevels(2500, [
      { bonusHan: 1 },
      { bonusHan: 1 },
      { bonusHan: 1 },
      { bonusHan: 1 },
      { bonusHan: 2 }
    ])
  },
  {
    catalogNumber: 9,
    id: "1-9",
    name: "愚形強化【攻】",
    evaluation: "B",
    kind: "passive",
    description:
      "自分のみ、辺張待ちまたは嵌張待ちで和了した場合、指定数のボーナス翻を加算する。この翻加算自体は役にならず、有効な役がない手は条件を満たしていても和了できない。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "penchan-or-kanchan-win-count",
      description:
        "辺張待ちまたは嵌張待ちで通算10回和了する。",
      targetValue: 10
    },
    levels: createPassiveLevels(2900, [
      { bonusHan: 1 },
      { bonusHan: 1 },
      { bonusHan: 1 },
      { bonusHan: 1 },
      { bonusHan: 2 }
    ])
  },
  {
    catalogNumber: 10,
    id: "1-10",
    name: "肉斬骨断",
    evaluation: "A",
    kind: "passive",
    description:
      "自分が他家の和了に伴って支払う点数と、他家が自分の和了に伴って支払う点数へ指定倍率を適用する。端数は切り上げ、スキルと本場による点数加算にも適用する。",
    activationHooks: ["paymentCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-10-first-place-count",
      description:
        "敵10との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createPassiveLevels(9500, [
      { paymentMultiplier: 1.1 },
      { paymentMultiplier: 1.2 },
      { paymentMultiplier: 1.3 },
      { paymentMultiplier: 1.4 },
      { paymentMultiplier: 1.5 }
    ])
  },
  {
    catalogNumber: 11,
    id: "1-11",
    name: "和了強化【点】",
    evaluation: "A+",
    kind: "passive",
    description:
      "自分が和了した際、他家が実際に支払う点数へ指定点を加算する。スキルと本場による点数加算にも重複して適用する。",
    activationHooks: ["paymentCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-10-first-place-count",
      description:
        "敵10との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createPassiveLevels(7700, [
      { additionalPaymentPoints: 300 },
      { additionalPaymentPoints: 500 },
      { additionalPaymentPoints: 800 },
      { additionalPaymentPoints: 1000 },
      { additionalPaymentPoints: 1500 }
    ])
  },
  {
    catalogNumber: 12,
    id: "1-12",
    name: "逆境強化",
    evaluation: "B+",
    kind: "passive",
    description:
      "自分が4位で和了した場合、指定数のボーナス翻を加算する。この翻加算自体は役にならず、有効な役がない手は条件を満たしていても和了できない。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: null,
    levels: createPassiveLevels(1000, [
      { bonusHan: 1 },
      { bonusHan: 1 },
      { bonusHan: 2 },
      { bonusHan: 2 },
      { bonusHan: 3 }
    ])
  },
  {
    catalogNumber: 13,
    id: "1-13",
    name: "和了強化【符】",
    evaluation: "S",
    kind: "passive",
    description:
      "点数計算時に20符を30符、25符を40符、30符を40符へ変更する。変更前に40符以上の場合は指定数のボーナス翻を加算する。この翻加算自体は役にならず、有効な役がない手は条件を満たしていても和了できない。",
    activationHooks: ["hanFuCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-11-first-place-count",
      description:
        "敵11との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createPassiveLevels(5100, [
      {
        fuFrom20: 30,
        fuFrom25: 40,
        fuFrom30: 40,
        bonusHanAt40OrMore: 1
      },
      {
        fuFrom20: 30,
        fuFrom25: 40,
        fuFrom30: 40,
        bonusHanAt40OrMore: 1
      },
      {
        fuFrom20: 30,
        fuFrom25: 40,
        fuFrom30: 40,
        bonusHanAt40OrMore: 1
      },
      {
        fuFrom20: 30,
        fuFrom25: 40,
        fuFrom30: 40,
        bonusHanAt40OrMore: 1
      },
      {
        fuFrom20: 30,
        fuFrom25: 40,
        fuFrom30: 40,
        bonusHanAt40OrMore: 2
      }
    ])
  },
  {
    catalogNumber: 14,
    id: "1-14",
    name: "心頭滅却",
    evaluation: "S+",
    kind: "active",
    description:
      "自分の手番に発動でき、本場を直ちに1つ増やす。増加分は通常の本場へ合算し、局終了時の連荘・親流れに従って増加または0へリセットする。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "enemy-13-first-place-count",
      description:
        "敵13との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createActiveLevels(
      2300,
      [80, 70, 60, 50, 30],
      [
        { honbaIncrease: 1 },
        { honbaIncrease: 1 },
        { honbaIncrease: 1 },
        { honbaIncrease: 1 },
        { honbaIncrease: 1 }
      ]
    )
  },
  {
    catalogNumber: 15,
    id: "1-15",
    name: "門前回帰",
    evaluation: "S",
    kind: "active",
    description:
      "自分の手番に発動でき、指定巡数以内に和了した場合、副露済みでも門前限定役、喰い下がり無効、門前清自摸和、門前ロン10符を適用する。ただし副露面子は明面子として符計算する。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId: "enemy-5-first-place-count",
      description:
        "敵5との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createActiveLevels(
      4800,
      [250, 230, 210, 180, 150],
      [
        { durationTurns: 1 },
        { durationTurns: 2 },
        { durationTurns: 3 },
        { durationTurns: 4 },
        { durationTurns: 6 }
      ]
    )
  }
] as const satisfies readonly PlayerSkillDefinition[];
