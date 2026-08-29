import type {
  EnemyDefinition
} from "./enemyCatalogTypes";

export const ENEMY_CATALOG_GROUP_2 = [
  {
    catalogNumber: 5,
    id: "enemy-5",
    displayName: "敵5",
    unlockCondition: {
      requiredEnemyId: "enemy-4",
      requiredFirstPlaceCount: 3,
      description:
        "敵4との対局で3回1位を取る。"
    },
    baseExperience: 300,
    abilities: [
      {
        id: "E-5",
        description:
          "局開始時に索子・筒子・萬子からランダムに1色を選ぶ。自分が通常山から通常ツモを行う場合は、その色の牌だけを取得する。対象色の牌が通常山から尽きた後は通常抽選へ戻る。字牌は対象色が残っている間はツモらない。嶺上牌は対象外とする。",
        activationHooks: [
          "roundSetup",
          "drawTileSelection"
        ]
      },
      {
        id: "E-14",
        description:
          "自分のみ副露しても門前扱いになる。",
        activationHooks: [
          "riichiLegality",
          "yakuEvaluation"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 1,
      calls: 5,
      riichi: 4,
      defense: 2,
      handValue: 5
    },
    strategy: {
      archetype: "染め手型",
      description:
        "局開始時に選ばれた対象色へ、手牌を強く寄せる。対象色の副露は、多少受け入れが狭くなっても積極的に行う。",
      priorities: [
        "対象色の牌を最優先で残す",
        "対象外の数牌から捨てる",
        "対象色のチー・ポンを積極的に行う",
        "副露しても門前扱いなので、鳴きによるデメリットをほとんど考慮しない",
        "副露後も立直を狙う",
        "清一色を最優先し、初期手牌の字牌が有用なら混一色も狙う",
        "対象色が通常山から尽きた後は、通常の向聴数重視へ切り替える"
      ]
    }
  },
  {
    catalogNumber: 6,
    id: "enemy-6",
    displayName: "敵6",
    unlockCondition: {
      requiredEnemyId: "enemy-5",
      requiredFirstPlaceCount: 3,
      description:
        "敵5との対局で3回1位を取る。"
    },
    baseExperience: 500,
    abilities: [
      {
        id: "E-18",
        description:
          "自分以外の他家の全能力を、配牌処理より前に無効化する。",
        activationHooks: ["matchSetup"]
      },
      {
        id: "E-10",
        description:
          "自分のみ、常に他家の手牌が見える。",
        activationHooks: [
          "informationVisibility"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 3,
      calls: 2,
      riichi: 3,
      defense: 5,
      handValue: 3
    },
    strategy: {
      archetype: "完全情報型",
      description:
        "他家の手牌をすべて見て、正確な情報を使って判断する。プレイヤースキルは無効になっているため、能力による逆転を警戒せず、純粋な手牌情報だけで判断する。",
      priorities: [
        "他家の当たり牌を正確に回避する",
        "他家の有効牌を可能な限り絞る",
        "鳴かせると危険な牌を止める",
        "他家がノーテンなら速度を優先する",
        "他家が聴牌したら安全牌を選択する",
        "複数人が聴牌している場合、全員に安全な牌を優先する",
        "安全牌がなければ、予想支払額が最も小さい相手への放銃を選ぶ",
        "自分が高打点聴牌なら、危険牌でも押す場合がある"
      ]
    }
  },
  {
    catalogNumber: 7,
    id: "enemy-7",
    displayName: "敵7",
    unlockCondition: {
      requiredEnemyId: "enemy-6",
      requiredFirstPlaceCount: 3,
      description:
        "敵6との対局で3回1位を取る。"
    },
    baseExperience: 530,
    abilities: [
      {
        id: "E-7",
        description:
          "他家は役満を含むすべての2翻以上の役が成立しなくなる。",
        activationHooks: [
          "yakuEvaluation"
        ]
      },
      {
        id: "E-11",
        description:
          "他家は、配牌および通常山からの通常ツモでは風牌を取得できない。他家へ渡る風牌を通常山の非風牌と交換し、風牌は通常山へ残す。交換可能な非風牌が通常山に残っていない場合は、風牌をそのまま取得する。嶺上牌および通常山以外からの取得は対象外とする。",
        activationHooks: [
          "dealComposition",
          "drawTileSelection"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 3,
      calls: 2,
      riichi: 2,
      defense: 2,
      handValue: 5
    },
    strategy: {
      archetype: "風牌・大役型",
      description:
        "配牌に含まれる風牌を原則として捨てず、小四喜・大四喜・字一色・対々和などを狙う。他家は2翻以上の役を使えないため、多少遅い大物手でも押しやすいと判断する。",
      priorities: [
        "風牌は孤立していても残す",
        "風牌の対子・暗刻を最優先する",
        "風牌が3種類以上揃えば小四喜・大四喜へ移行する",
        "風牌が少なければ役牌や混一色へ移行する",
        "数牌は順子より対子・刻子を重視する",
        "他家が風牌を引けないため、風牌のポンは期待せず自力ツモを前提にする",
        "風牌が集まらない局では、固執しすぎず通常役へ切り替える"
      ]
    }
  },
  {
    catalogNumber: 8,
    id: "enemy-8",
    displayName: "敵8",
    unlockCondition: {
      requiredEnemyId: "enemy-7",
      requiredFirstPlaceCount: 3,
      description:
        "敵7との対局で3回1位を取る。"
    },
    baseExperience: 570,
    abilities: [
      {
        id: "E-13",
        description:
          "プレイヤーは自分の河しか見ることができず、他家の河は裏返しに見える。副露やロンもできなくなる。加槓および国士無双による暗槓への槍槓もできない。",
        activationHooks: [
          "informationVisibility",
          "callLegality",
          "ronLegality"
        ]
      },
      {
        id: "E-15",
        description:
          "自分が副露して晒した牌が牌種はそのまま赤ドラになる。加槓した場合は、新たに加えた1枚も赤ドラ化する。暗槓は対象外とする。",
        activationHooks: ["afterCall"]
      }
    ],
    aiTendencies: {
      closedHand: 1,
      calls: 5,
      riichi: 1,
      defense: 2,
      handValue: 4
    },
    strategy: {
      archetype: "赤副露型",
      description:
        "副露による赤ドラ化を最優先する。プレイヤーの捨て牌も積極的に副露し、短い巡目で満貫以上を狙う。",
      priorities: [
        "チー・ポンを非常に積極的に行う",
        "まず和了可能な役を1つ確保する",
        "役牌・タンヤオ・混一色・対々和を優先する",
        "役がない状態で赤ドラだけを増やさないよう注意する",
        "1副露で3枚、槓なら4枚の赤ドラを得る前提で打点計算する",
        "プレイヤーにはロンされないため、プレイヤーに対しては危険牌を押す",
        "残りのCPU2人に対しては通常どおり守備する"
      ]
    }
  }
] as const satisfies readonly EnemyDefinition[];
