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

export const PLAYER_SKILL_CATALOG_GROUP_5 = [
  {
    catalogNumber: 73,
    id: "5-1",
    name: "紫電一閃",
    evaluation: "B",
    kind: "passive",
    description:
      "自分の立直が正式に成立した後、通常の一発が存続している最初の自分の通常ツモに限り、現在の和了牌候補へ指定倍率を適用する。そのツモより前に副露または槓で一発が消滅した場合、この補正も失う。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId: "ippatsu-win-count",
      description:
        "一発を通算10回和了する。",
      targetValue: 10
    },
    levels: createPassiveLevels(4000, [
      { winningTileDrawWeightMultiplier: 1.1 },
      { winningTileDrawWeightMultiplier: 1.4 },
      { winningTileDrawWeightMultiplier: 1.8 },
      { winningTileDrawWeightMultiplier: 2.3 },
      { winningTileDrawWeightMultiplier: 3 }
    ])
  },
  {
    catalogNumber: 74,
    id: "5-2",
    name: "賞牌引寄【裏】",
    evaluation: "B+",
    kind: "passive",
    description:
      "自分が立直して和了した場合、各裏ドラ表示牌について、その表示牌から決まるドラが和了時の手牌または副露面子に1枚以上存在する候補へ指定倍率を適用する。同じドラを複数枚持っていても倍率は1回だけ適用する。",
    activationHooks: [
      "doraIndicatorSelection"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "win-with-at-least-4-ura-dora",
      description:
        "1回の和了で裏ドラを4つ以上乗せる。",
      targetValue: 1
    },
    levels: createPassiveLevels(4700, [
      { uraDoraIndicatorWeightMultiplier: 1.1 },
      { uraDoraIndicatorWeightMultiplier: 1.4 },
      { uraDoraIndicatorWeightMultiplier: 1.8 },
      { uraDoraIndicatorWeightMultiplier: 2.3 },
      { uraDoraIndicatorWeightMultiplier: 3 }
    ])
  },
  {
    catalogNumber: 75,
    id: "5-3",
    name: "賞牌引寄【槓】",
    evaluation: "A+",
    kind: "passive",
    description:
      "自分が暗槓を含む槓を成立させた場合、その槓で新しく追加される1枚の槓ドラ表示牌について、槓子と同じ牌種をドラにする候補へ指定倍率を適用する。すでに確定した表示牌は変更しない。",
    activationHooks: [
      "doraIndicatorSelection"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-3-first-place-count",
      description:
        "敵3との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createPassiveLevels(6500, [
      { kanDoraIndicatorWeightMultiplier: 1.1 },
      { kanDoraIndicatorWeightMultiplier: 1.4 },
      { kanDoraIndicatorWeightMultiplier: 1.8 },
      { kanDoraIndicatorWeightMultiplier: 2.3 },
      { kanDoraIndicatorWeightMultiplier: 3 }
    ])
  },
  {
    catalogNumber: 76,
    id: "5-4",
    name: "紫電一閃【改】",
    evaluation: "A+",
    kind: "passive",
    description:
      "自分の立直が正式に成立した後、指定巡数以内の和了を一発扱いにする。立直成立後の次の自分のツモから直後の打牌までを1巡目とし、指定巡目の打牌への反応完了まで有効とする。副露または槓が成立した時点で残り期間をすべて失う。",
    activationHooks: [
      "afterDiscard",
      "yakuEvaluation"
    ],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "enemy-2-first-place-count",
      description:
        "敵2との対局で5回1位を取る。",
      targetValue: 5
    },
    levels: createPassiveLevels(6800, [
      { ippatsuDurationTurns: 2 },
      { ippatsuDurationTurns: 3 },
      { ippatsuDurationTurns: 4 },
      { ippatsuDurationTurns: 5 },
      { ippatsuDurationTurns: 6 }
    ])
  },
  {
    catalogNumber: 77,
    id: "5-5",
    name: "単騎強化【速】",
    evaluation: "B",
    kind: "passive",
    description:
      "自分が単騎待ちで聴牌している通常ツモ時、候補牌によって完成する合法な和了構成に単騎待ちが含まれる場合、その候補牌へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId: "tanki-win-count",
      description:
        "単騎待ちで通算30回和了する。",
      targetValue: 30
    },
    levels: createPassiveLevels(1500, [
      { winningTileDrawWeightMultiplier: 1.1 },
      { winningTileDrawWeightMultiplier: 1.25 },
      { winningTileDrawWeightMultiplier: 1.5 },
      { winningTileDrawWeightMultiplier: 1.75 },
      { winningTileDrawWeightMultiplier: 2 }
    ])
  },
  {
    catalogNumber: 78,
    id: "5-6",
    name: "愚形強化【速】",
    evaluation: "B",
    kind: "passive",
    description:
      "自分が辺張待ちまたは嵌張待ちで聴牌している通常ツモ時、候補牌によって完成する合法な和了構成に対象の待ちが含まれる場合、その候補牌へ指定倍率を適用する。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "penchan-or-kanchan-win-count",
      description:
        "辺張待ちまたは嵌張待ちで通算30回和了する。",
      targetValue: 30
    },
    levels: createPassiveLevels(1800, [
      { winningTileDrawWeightMultiplier: 1.1 },
      { winningTileDrawWeightMultiplier: 1.25 },
      { winningTileDrawWeightMultiplier: 1.5 },
      { winningTileDrawWeightMultiplier: 1.75 },
      { winningTileDrawWeightMultiplier: 2 }
    ])
  },
  {
    catalogNumber: 79,
    id: "5-7",
    name: "虎視眈々【嶺上】",
    evaluation: "D",
    kind: "passive",
    description:
      "嶺上牌を取得する直前に自分が聴牌している場合に限り、ツモ和了できる候補牌へ指定倍率を適用する。槓材の集まりやすさは変更せず、通常ツモ補正は嶺上牌へ適用しない。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId:
        "rinshan-kaihou-win-count",
      description:
        "嶺上開花を和了する。",
      targetValue: 1
    },
    levels: createPassiveLevels(700, [
      { rinshanWinningTileWeightMultiplier: 3 },
      { rinshanWinningTileWeightMultiplier: 3.2 },
      { rinshanWinningTileWeightMultiplier: 3.5 },
      { rinshanWinningTileWeightMultiplier: 4 },
      { rinshanWinningTileWeightMultiplier: 5 }
    ])
  },
  {
    catalogNumber: 80,
    id: "5-8",
    name: "虎視眈々【海底】",
    evaluation: "D",
    kind: "passive",
    description:
      "通常山から海底牌を取得する直前に自分が聴牌している場合、通常山の最後の牌と未取得かつ表示牌として未確定の王牌を一時候補とし、通常のツモ補正後にツモ和了候補へ指定倍率を適用する。王牌が選ばれた場合は通常山の最後の物理牌と交換する。予約牌またはツモ元変更時は発動しない。",
    activationHooks: ["drawTileSelection"],
    usageScope: null,
    unlockCondition: {
      conditionId: "haitei-win-count",
      description:
        "海底摸月を和了する。",
      targetValue: 1
    },
    levels: createPassiveLevels(700, [
      { haiteiWinningTileWeightMultiplier: 3 },
      { haiteiWinningTileWeightMultiplier: 3.2 },
      { haiteiWinningTileWeightMultiplier: 3.5 },
      { haiteiWinningTileWeightMultiplier: 4 },
      { haiteiWinningTileWeightMultiplier: 5 }
    ])
  }
] as const satisfies readonly PlayerSkillDefinition[];
