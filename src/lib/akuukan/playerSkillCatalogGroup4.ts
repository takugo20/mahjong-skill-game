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

type FiveLevelNumbers = readonly [
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

function createDrawWeightLevels(
  baseRequiredExp: number,
  multipliers: FiveLevelNumbers
): PlayerSkillLevelTable<
  PassivePlayerSkillLevelDefinition
> {
  return createPassiveLevels(
    baseRequiredExp,
    [
      {
        drawWeightMultiplier:
          multipliers[0]
      },
      {
        drawWeightMultiplier:
          multipliers[1]
      },
      {
        drawWeightMultiplier:
          multipliers[2]
      },
      {
        drawWeightMultiplier:
          multipliers[3]
      },
      {
        drawWeightMultiplier:
          multipliers[4]
      }
    ]
  );
}

function createActiveLevels(
  baseRequiredExp: number,
  mpCosts: FiveLevelNumbers,
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

export const PLAYER_SKILL_CATALOG_GROUP_4 = [
  {
    catalogNumber: 50,
    id: "4-1",
    name: "加速装置【横】",
    evaluation: "A",
    kind: "passive",
    description:
      "通常ツモ時、手牌中の数牌と同色で数字が±1の候補牌へ指定倍率を適用する。1と9は循環させず、同じ候補牌が複数の手牌に隣接しても倍率は1回だけ適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-15-first-place-count",
      description:
        "敵15との対局で3回1位を取る。",
      targetValue: 3
    },
    levels: createDrawWeightLevels(
      7400,
      [1.1, 1.2, 1.3, 1.4, 1.5]
    )
  },
  {
    catalogNumber: 51,
    id: "4-2",
    name: "加速装置【縦】",
    evaluation: "B+",
    kind: "passive",
    description:
      "通常ツモ時、副露面子と槓子を除く手牌に同じ牌種が1枚以上ある候補牌へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-11-first-place-count",
      description:
        "敵11との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createDrawWeightLevels(
      6800,
      [1.1, 1.2, 1.3, 1.4, 1.5]
    )
  },
  {
    catalogNumber: 52,
    id: "4-3",
    name: "加速装置【汎用】",
    evaluation: "S",
    kind: "passive",
    description:
      "通常形・七対子形・国士無双形のうち合法に完成可能な形の最小向聴数を進める通常ツモ候補へ指定倍率を適用する。副露または槓がある場合、七対子形と国士無双形は除外する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: null,
    levels: createDrawWeightLevels(
      15000,
      [1.05, 1.1, 1.15, 1.2, 1.25]
    )
  },
  {
    catalogNumber: 53,
    id: "4-4",
    name: "加速装置【黙】",
    evaluation: "A+",
    kind: "passive",
    description:
      "門前時に限り、最小向聴数を進める通常ツモ候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-3-first-place-count",
      description:
        "敵3との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createDrawWeightLevels(
      11000,
      [1.1, 1.2, 1.3, 1.4, 1.5]
    )
  },
  {
    catalogNumber: 54,
    id: "4-5",
    name: "加速装置【鳴】",
    evaluation: "A+",
    kind: "passive",
    description:
      "非門前時に限り、最小向聴数を進める通常ツモ候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-2-first-place-count",
      description:
        "敵2との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createDrawWeightLevels(
      9600,
      [1.1, 1.2, 1.3, 1.4, 1.5]
    )
  },
  {
    catalogNumber: 55,
    id: "4-6",
    name: "加速装置【紅】",
    evaluation: "A+",
    kind: "passive",
    description:
      "副露面子と槓子を除く手牌に赤ドラがある場合、最小向聴数を進める通常ツモ候補へ指定倍率を適用する。副露面子または槓子だけに赤ドラがある場合は発動しない。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-8-first-place-count",
      description:
        "敵8との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createDrawWeightLevels(
      6900,
      [1.1, 1.2, 1.3, 1.4, 1.5]
    )
  },
  {
    catalogNumber: 56,
    id: "4-7",
    name: "加速装置【槓】",
    evaluation: "C",
    kind: "passive",
    description:
      "自分が暗槓を成立させた局に限り、副露面子と槓子を除く手牌と同じ牌種の通常ツモ候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-7-first-place-count",
      description:
        "敵7との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createDrawWeightLevels(
      2200,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 57,
    id: "4-8",
    name: "起死回生",
    evaluation: "A",
    kind: "passive",
    description:
      "通常ツモ牌を決定する直前の順位が4位の場合、最小向聴数を進める候補牌へ指定倍率を適用する。同点順位は持ち点と起家順で決定する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId: "fourth-place-count",
      description: "4着を50回取る。",
      targetValue: 50
    },
    levels: createDrawWeightLevels(
      4400,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 58,
    id: "4-9",
    name: "字牌引寄【全】",
    evaluation: "C",
    kind: "passive",
    description:
      "通常ツモ時、風牌と三元牌の候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "kokushi-or-thirteen-sided-win-count",
      description:
        "国士無双または国士無双十三面待ちを和了する。",
      targetValue: 1
    },
    levels: createDrawWeightLevels(
      4500,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 59,
    id: "4-10",
    name: "数牌引寄【索】",
    evaluation: "A",
    kind: "passive",
    description:
      "通常ツモ時、索子の候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: null,
    levels: createDrawWeightLevels(
      10000,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 60,
    id: "4-11",
    name: "数牌引寄【筒】",
    evaluation: "A",
    kind: "passive",
    description:
      "通常ツモ時、筒子の候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: null,
    levels: createDrawWeightLevels(
      10000,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 61,
    id: "4-12",
    name: "数牌引寄【萬】",
    evaluation: "A",
    kind: "passive",
    description:
      "通常ツモ時、萬子の候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: null,
    levels: createDrawWeightLevels(
      10000,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 62,
    id: "4-13",
    name: "数牌引寄【外】",
    evaluation: "B",
    kind: "passive",
    description:
      "通常ツモ時、1・2・3・7・8・9の数牌候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "chinroutou-or-honroutou-win-count",
      description:
        "清老頭または混老頭を和了する。",
      targetValue: 1
    },
    levels: createDrawWeightLevels(
      3600,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 63,
    id: "4-14",
    name: "数牌引寄【中】",
    evaluation: "A",
    kind: "passive",
    description:
      "通常ツモ時、3・4・5・6・7の数牌候補へ指定倍率を適用する。4-13と併用した場合、重複する3と7には両方の倍率を乗算する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId: "tanyao-win-count",
      description:
        "タンヤオを通算50回和了する。",
      targetValue: 50
    },
    levels: createDrawWeightLevels(
      4600,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 64,
    id: "4-15",
    name: "字牌引寄【龍】",
    evaluation: "B",
    kind: "passive",
    description:
      "通常ツモ時、白・發・中の候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId: "daisangen-win-count",
      description: "大三元を和了する。",
      targetValue: 1
    },
    levels: createDrawWeightLevels(
      3300,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 65,
    id: "4-16",
    name: "字牌引寄【門】",
    evaluation: "C",
    kind: "passive",
    description:
      "通常ツモ時、現在の自風牌の候補へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "shousuushii-or-daisuushii-win-count",
      description:
        "小四喜または大四喜を和了する。",
      targetValue: 1
    },
    levels: createDrawWeightLevels(
      2300,
      [1.1, 1.2, 1.3, 1.5, 2]
    )
  },
  {
    catalogNumber: 66,
    id: "4-17",
    name: "手牌整理【序】",
    evaluation: "S",
    kind: "active",
    description:
      "配牌完成後に390MPを獲得した時点で発動でき、手牌から指定枚数まで選び、通常山または未確定の王牌から取得したランダム牌と交換する。交換牌を先に取得し、選択牌を取得元へ戻して山をシャッフルする。確定済みドラ表示牌は交換候補外とする。",
    activationHooks: ["dealCompleted"],
    usageScope: "round",
    unlockCondition: {
      conditionId:
        "enemy-13-first-place-count",
      description:
        "敵13との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createActiveLevels(
      3600,
      [120, 110, 100, 90, 80],
      [
        { maximumExchangeTileCount: 1 },
        { maximumExchangeTileCount: 2 },
        { maximumExchangeTileCount: 3 },
        { maximumExchangeTileCount: 4 },
        { maximumExchangeTileCount: 6 }
      ]
    )
  },
  {
    catalogNumber: 67,
    id: "4-18",
    name: "手牌整理【索】",
    evaluation: "S",
    kind: "active",
    description:
      "立直中でない自分の手番に、索子以外の数牌を指定枚数まで選び、通常山または未確定の王牌にある索子と交換する。対象牌不足時は可能な枚数だけ交換し、交換後に和了形ならツモ和了できる。第1打前なら条件に応じて天和・地和・ダブル立直も認める。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId: "ryuuiisou-win-count",
      description: "緑一色を和了する。",
      targetValue: 1
    },
    levels: createActiveLevels(
      9900,
      [110, 100, 90, 80, 60],
      [
        { maximumExchangeTileCount: 1 },
        { maximumExchangeTileCount: 2 },
        { maximumExchangeTileCount: 2 },
        { maximumExchangeTileCount: 3 },
        { maximumExchangeTileCount: 3 }
      ]
    )
  },
  {
    catalogNumber: 68,
    id: "4-19",
    name: "手牌整理【筒】",
    evaluation: "S",
    kind: "active",
    description:
      "立直中でない自分の手番に、筒子以外の数牌を指定枚数まで選び、通常山または未確定の王牌にある筒子と交換する。対象牌不足時は可能な枚数だけ交換し、交換後に和了形ならツモ和了できる。第1打前なら条件に応じて天和・地和・ダブル立直も認める。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId: "tsuuiisou-win-count",
      description: "字一色を和了する。",
      targetValue: 1
    },
    levels: createActiveLevels(
      9900,
      [110, 100, 90, 80, 60],
      [
        { maximumExchangeTileCount: 1 },
        { maximumExchangeTileCount: 2 },
        { maximumExchangeTileCount: 2 },
        { maximumExchangeTileCount: 3 },
        { maximumExchangeTileCount: 3 }
      ]
    )
  },
  {
    catalogNumber: 69,
    id: "4-20",
    name: "手牌整理【萬】",
    evaluation: "S",
    kind: "active",
    description:
      "立直中でない自分の手番に、萬子以外の数牌を指定枚数まで選び、通常山または未確定の王牌にある萬子と交換する。対象牌不足時は可能な枚数だけ交換し、交換後に和了形ならツモ和了できる。第1打前なら条件に応じて天和・地和・ダブル立直も認める。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "chuuren-or-pure-nine-gates-win-count",
      description:
        "九蓮宝燈または純正九蓮宝燈を和了する。",
      targetValue: 1
    },
    levels: createActiveLevels(
      9900,
      [110, 100, 90, 80, 60],
      [
        { maximumExchangeTileCount: 1 },
        { maximumExchangeTileCount: 2 },
        { maximumExchangeTileCount: 2 },
        { maximumExchangeTileCount: 3 },
        { maximumExchangeTileCount: 3 }
      ]
    )
  },
  {
    catalogNumber: 70,
    id: "4-21",
    name: "雲外蒼天【対】",
    evaluation: "A+",
    kind: "active",
    description:
      "自分の手番に、次回の配牌へ実現可能なランダム対子1組を組み込む予約を1件追加する。予約中でも後の自分の手番で再使用でき、予約を累積できる。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId: "chiitoitsu-win-count",
      description:
        "七対子を通算30回和了する。",
      targetValue: 30
    },
    levels: createActiveLevels(
      8500,
      [330, 320, 300, 280, 250],
      [
        { reservedPairCount: 1 },
        { reservedPairCount: 1 },
        { reservedPairCount: 1 },
        { reservedPairCount: 1 },
        { reservedPairCount: 1 }
      ]
    )
  },
  {
    catalogNumber: 71,
    id: "4-22",
    name: "雲外蒼天【順】",
    evaluation: "S",
    kind: "active",
    description:
      "自分の手番に、次回の配牌へ実現可能なランダム順子1組を組み込む予約を1件追加する。予約中でも後の自分の手番で再使用でき、予約を累積できる。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "enemy-14-first-place-count",
      description:
        "敵14との対局で3回1位を取る。",
      targetValue: 3
    },
    levels: createActiveLevels(
      8400,
      [400, 390, 370, 350, 320],
      [
        { reservedSequenceCount: 1 },
        { reservedSequenceCount: 1 },
        { reservedSequenceCount: 1 },
        { reservedSequenceCount: 1 },
        { reservedSequenceCount: 1 }
      ]
    )
  },
  {
    catalogNumber: 72,
    id: "4-23",
    name: "雲外蒼天【刻】",
    evaluation: "S",
    kind: "active",
    description:
      "自分の手番に、次回の配牌へ実現可能なランダム暗刻1組を組み込む予約を1件追加する。予約中でも後の自分の手番で再使用でき、予約を累積できる。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "enemy-9-first-place-count",
      description:
        "敵9との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createActiveLevels(
      12000,
      [430, 420, 400, 380, 350],
      [
        { reservedConcealedTripletCount: 1 },
        { reservedConcealedTripletCount: 1 },
        { reservedConcealedTripletCount: 1 },
        { reservedConcealedTripletCount: 1 },
        { reservedConcealedTripletCount: 1 }
      ]
    )
  }
] as const satisfies readonly PlayerSkillDefinition[];
