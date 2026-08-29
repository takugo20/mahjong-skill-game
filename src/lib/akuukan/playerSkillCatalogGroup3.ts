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

export const PLAYER_SKILL_CATALOG_GROUP_3 = [
  {
    catalogNumber: 36,
    id: "3-1",
    name: "罰符軽減",
    evaluation: "D",
    kind: "passive",
    description:
      "自分の通常のノーテン罰符支払総額へ指定割合を適用して100点単位に切り上げる。ほかのノーテン者の支払額と合算後、聴牌者へ100点単位で可能な限り均等に配分し、余る100点は自分からツモ順が近い聴牌者から配分する。",
    activationHooks: ["drawSettlement"],
    usageScope: null,
    unlockCondition: null,
    levels: createPassiveLevels(300, [
      { notenPenaltyPaymentPercent: 50 },
      { notenPenaltyPaymentPercent: 40 },
      { notenPenaltyPaymentPercent: 30 },
      { notenPenaltyPaymentPercent: 10 },
      { notenPenaltyPaymentPercent: 0 }
    ])
  },
  {
    catalogNumber: 37,
    id: "3-2",
    name: "親被軽減",
    evaluation: "C",
    maxLevel: 1,
    kind: "passive",
    description:
      "子のツモ和了時、自分が親として負担する通常ツモ支払額を、本場と固定点の加算後に半分にする。和了者の受取額も減る。責任払いとして負担する部分には適用しない。",
    activationHooks: ["paymentCalculation"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-1-first-place-count",
      description:
        "敵1との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createFixedPassiveLevels({
      parentTsumoPaymentMultiplier: 0.5
    })
  },
  {
    catalogNumber: 38,
    id: "3-3",
    name: "闇聴察知",
    evaluation: "C",
    kind: "passive",
    description:
      "他家が門前・非立直のままノーテンから聴牌へ移行した直後、指定確率で一度だけ察知する。配牌聴牌も対象とし、闇聴継続中の待ち変化・継続・解除は察知しない。",
    activationHooks: [
      "informationVisibility"
    ],
    usageScope: null,
    unlockCondition: null,
    levels: createPassiveLevels(1500, [
      { detectionChancePercent: 10 },
      { detectionChancePercent: 15 },
      { detectionChancePercent: 25 },
      { detectionChancePercent: 50 },
      { detectionChancePercent: 80 }
    ])
  },
  {
    catalogNumber: 39,
    id: "3-4",
    name: "透牌",
    evaluation: "S",
    kind: "passive",
    description:
      "他家ごとに、非公開の手牌から指定枚数の物理牌をランダムに公開する。公開牌が手牌を離れた場合は残る非公開牌から補充し、常に可能な範囲で指定枚数を公開する。副露面子は公開枚数に含めない。",
    activationHooks: [
      "informationVisibility"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-6-first-place-count",
      description:
        "敵6との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createPassiveLevels(5400, [
      { visibleTilesPerOpponent: 1 },
      { visibleTilesPerOpponent: 2 },
      { visibleTilesPerOpponent: 3 },
      { visibleTilesPerOpponent: 4 },
      { visibleTilesPerOpponent: 6 }
    ])
  },
  {
    catalogNumber: 40,
    id: "3-5",
    name: "防御結界【序】",
    evaluation: "C",
    kind: "passive",
    description:
      "自分の最初の指定回数の捨て牌について、他家のチー・ポン・大明槓を禁止する。ロンは通常どおり可能。",
    activationHooks: ["callLegality"],
    usageScope: null,
    unlockCondition: null,
    levels: createPassiveLevels(1800, [
      { protectedDiscardCount: 3 },
      { protectedDiscardCount: 5 },
      { protectedDiscardCount: 7 },
      { protectedDiscardCount: 9 },
      { protectedDiscardCount: 12 }
    ])
  },
  {
    catalogNumber: 41,
    id: "3-6",
    name: "防御結界【裸】",
    evaluation: "B+",
    maxLevel: 1,
    kind: "passive",
    description:
      "チー・ポン・明槓による副露面子を4組持ち、非副露部分1枚を雀頭とする裸単騎聴牌中、その状態で捨てた牌へのロンと副露を禁止する。暗槓を含む手は裸単騎として扱わない。",
    activationHooks: [
      "callLegality",
      "ronLegality"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-4-first-place-count",
      description:
        "敵4との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createFixedPassiveLevels({
      blockCalls: 1,
      blockRon: 1
    })
  },
  {
    catalogNumber: 42,
    id: "3-7",
    name: "防御結界【槓】",
    evaluation: "S",
    maxLevel: 1,
    kind: "passive",
    description:
      "合法な暗槓・加槓・大明槓を宣言した時点で、その局が終了するまで自分に対するロンを無効にする。加槓への槍槓と国士無双による暗槓への槍槓も、判定前に無効にする。",
    activationHooks: [
      "kanLegality",
      "ronLegality"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-4-first-place-count",
      description:
        "敵4との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createFixedPassiveLevels({
      ronImmunityUntilRoundEnd: 1,
      chankanImmunity: 1
    })
  },
  {
    catalogNumber: 43,
    id: "3-8",
    name: "山牌封印",
    evaluation: "S",
    kind: "active",
    description:
      "自分の手番に通常山の末尾から指定枚数を裏向きのまま局終了まで除外する。王牌は対象外で、通常山残数未満なら残っている枚数だけ除外する。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId: "round-draw-count",
      description:
        "通算25回流局する。",
      targetValue: 25
    },
    levels: createActiveLevels(
      14000,
      [120, 110, 100, 80, 60],
      [
        { removedWallTileCount: 1 },
        { removedWallTileCount: 1 },
        { removedWallTileCount: 2 },
        { removedWallTileCount: 2 },
        { removedWallTileCount: 3 }
      ]
    )
  },
  {
    catalogNumber: 44,
    id: "3-9",
    name: "防御結界【破】",
    evaluation: "S+",
    kind: "active",
    description:
      "自分の手番に発動し、指定巡数の間、自分に対する通常ロンと槍槓をすべて禁止する。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId: "round-draw-count",
      description:
        "通算50回流局する。",
      targetValue: 50
    },
    levels: createActiveLevels(
      13000,
      [360, 320, 280, 240, 200],
      [
        { durationTurns: 1 },
        { durationTurns: 2 },
        { durationTurns: 3 },
        { durationTurns: 4 },
        { durationTurns: 6 }
      ]
    )
  },
  {
    catalogNumber: 45,
    id: "3-10",
    name: "防御結界【急】",
    evaluation: "B+",
    kind: "active",
    description:
      "自分の手番に発動し、指定巡数の間、自分が放銃者となった満貫以上の和了について、自分の基本支払額を対応する満貫ロン額までに制限する。手牌価値・役・翻・符は変更しない。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "enemy-15-first-place-count",
      description:
        "敵15との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createActiveLevels(
      2500,
      [140, 130, 120, 110, 90],
      [
        {
          durationTurns: 1,
          maximumHandBasePoints: 2000
        },
        {
          durationTurns: 2,
          maximumHandBasePoints: 2000
        },
        {
          durationTurns: 3,
          maximumHandBasePoints: 2000
        },
        {
          durationTurns: 4,
          maximumHandBasePoints: 2000
        },
        {
          durationTurns: 6,
          maximumHandBasePoints: 2000
        }
      ]
    )
  },
  {
    catalogNumber: 46,
    id: "3-11",
    name: "防御結界【改】",
    evaluation: "S+",
    kind: "active",
    description:
      "自分の手番に発動し、指定巡数の間、自分の捨て牌を裏向きにして、その牌へのロン・チー・ポン・大明槓を禁止する。効果終了時、河に残る対象牌を表向きに戻す。加槓・暗槓への槍槓は防止しない。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "enemy-12-first-place-count",
      description:
        "敵12との対局で1回1位を取る。",
      targetValue: 1
    },
    levels: createActiveLevels(
      9900,
      [500, 450, 400, 350, 300],
      [
        { durationTurns: 1 },
        { durationTurns: 2 },
        { durationTurns: 3 },
        { durationTurns: 4 },
        { durationTurns: 6 }
      ]
    )
  },
  {
    catalogNumber: 47,
    id: "3-12",
    name: "透牌【全】",
    evaluation: "A",
    kind: "active",
    description:
      "自分の手番に指定した相手1人の、その時点の非公開手牌を一度だけすべて表示する。自分の手番終了時に解除し、その後の手牌変化には追従しない。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "enemy-6-first-place-count",
      description:
        "敵6との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createActiveLevels(
      10000,
      [300, 290, 280, 270, 250],
      [
        { snapshotOpponentCount: 1 },
        { snapshotOpponentCount: 1 },
        { snapshotOpponentCount: 1 },
        { snapshotOpponentCount: 1 },
        { snapshotOpponentCount: 1 }
      ]
    )
  },
  {
    catalogNumber: 48,
    id: "3-13",
    name: "河牌転送",
    evaluation: "A+",
    kind: "active",
    description:
      "自分の手番に相手1人を指定して発動する。指定巡数の間、ロン・ポン・大明槓・チーされなかった自分の捨て牌を河から除き、指定相手の次回以降の通常ツモへFIFOで予約する。予約牌がある間は通常山からツモらせない。",
    activationHooks: ["actionOpportunity"],
    usageScope: "turn",
    unlockCondition: {
      conditionId:
        "enemy-12-first-place-count",
      description:
        "敵12との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createActiveLevels(
      9300,
      [380, 360, 340, 320, 280],
      [
        { durationTurns: 1 },
        { durationTurns: 2 },
        { durationTurns: 3 },
        { durationTurns: 4 },
        { durationTurns: 6 }
      ]
    )
  },
  {
    catalogNumber: 49,
    id: "3-14",
    name: "色即是空",
    evaluation: "S+",
    kind: "active",
    description:
      "配牌完成後に390MPを獲得した時点で発動できる。指定巡数まで、他家のチー・ポン・大明槓・暗槓・加槓と手出しを禁止する。ツモ和了と、聴牌時のツモ切り立直は認める。",
    activationHooks: ["dealCompleted"],
    usageScope: "round",
    unlockCondition: {
      conditionId:
        "enemy-16-first-place-count",
      description:
        "敵16との対局で3回1位を取る。",
      targetValue: 3
    },
    levels: createActiveLevels(
      10000,
      [600, 550, 500, 450, 350],
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
