import type {
  EnemyDefinition
} from "./enemyCatalogTypes";

export const ENEMY_CATALOG_GROUP_1 = [
  {
    catalogNumber: 1,
    id: "enemy-1",
    displayName: "敵1",
    unlockCondition: null,
    baseExperience: 100,
    abilities: [
      {
        id: "E-1",
        description:
          "他家にはドラ表示牌が裏返しに見え、ドラが判別できなくなる。",
        activationHooks: [
          "informationVisibility"
        ]
      },
      {
        id: "E-2",
        description:
          "自分が追っかけ立直を正式に成立させると、その時点より前に立直を正式に成立させていた他家は、通常山からの通常ツモで現在の和了牌を取得できなくなる。嶺上牌および通常山以外から取得する牌は対象外とする。",
        activationHooks: [
          "drawTileSelection"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 5,
      calls: 1,
      riichi: 5,
      defense: 3,
      handValue: 3
    },
    strategy: {
      archetype: "追っかけ立直型",
      description:
        "門前志向が強く、基本的に鳴かない。聴牌時は黙聴より立直を優先する。ただし、先制聴牌した時の待ちが悪い場合は、あえて黙聴に構えて他家の立直を待つことがある。他家が立直した時点で聴牌していれば、悪形待ちでも追っかけ立直する傾向が強い。ドラを通常より高く評価して残す傾向がある。",
      priorities: [
        "他家の立直に対する追っかけ立直",
        "良形での先制立直",
        "悪形聴牌での黙聴待機",
        "ドラを活用した手作り",
        "明確な高打点への放銃回避"
      ]
    }
  },
  {
    catalogNumber: 2,
    id: "enemy-2",
    displayName: "敵2",
    unlockCondition: {
      requiredEnemyId: "enemy-1",
      requiredFirstPlaceCount: 3,
      description:
        "敵1との対局で3回1位を取る。"
    },
    baseExperience: 200,
    abilities: [
      {
        id: "E-3",
        description:
          "他家はチー・ポン・大明槓が成立するたびに1,000点を供託する。持ち点が1,000点未満の場合、チー・ポン・大明槓を宣言できない。暗槓・加槓は対象外とする。",
        activationHooks: [
          "callLegality",
          "afterCall"
        ]
      },
      {
        id: "E-4",
        description:
          "自分のみ、聴牌していなくても立直することができる。立直後は副露することができなくなるが、手替わりは可能。手替わりした場合でも、他家にはツモ切りに見える。ノーテン状態で立直しても立直役・一発・裏ドラの権利を獲得し、後から聴牌して和了すればそれらが適用される。",
        activationHooks: [
          "riichiLegality"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 5,
      calls: 1,
      riichi: 5,
      defense: 2,
      handValue: 3
    },
    strategy: {
      archetype: "先制・偽装立直型",
      description:
        "序盤からノーテン立直を積極的に使う。ただし、完全に形が悪い手では使わず、主に一向聴・二向聴で発動する。立直後は他家からツモ切りにしか見えないため、通常の立直AIとは異なり、手牌交換を続けて聴牌を目指す。立直後に鳴けないため、門前専用AIに近い動きをする。",
      priorities: [
        "一向聴なら非常に高確率で立直する",
        "二向聴でも序盤なら立直を検討する",
        "三向聴以上では通常どおり手を進める",
        "立直後は向聴数と受け入れ枚数を最優先する",
        "一発期間中は特に和了牌を優先する",
        "他家の副露には1000点供託を要求できるため、鳴かれやすい牌を過度には警戒しない"
      ]
    }
  },
  {
    catalogNumber: 3,
    id: "enemy-3",
    displayName: "敵3",
    unlockCondition: {
      requiredEnemyId: "enemy-2",
      requiredFirstPlaceCount: 3,
      description:
        "敵2との対局で3回1位を取る。"
    },
    baseExperience: 220,
    abilities: [
      {
        id: "E-9",
        description:
          "他家は立直できなくなる。",
        activationHooks: [
          "riichiLegality"
        ]
      },
      {
        id: "E-6",
        description:
          "自分が和了した時、前回自分が和了した際と同じ役が含まれていたら、その役の翻数が2倍になる。毎回、通常翻数の2倍となり、3回以上連続しても倍率は累積しない。該当役が複数ならそれぞれ翻数を2倍にする。",
        activationHooks: [
          "yakuEvaluation",
          "afterWin"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 3,
      calls: 3,
      riichi: 4,
      defense: 2,
      handValue: 4
    },
    strategy: {
      archetype: "同一役連続型",
      description:
        "最初の和了では、次局以降にも再現しやすい役を優先する。一度和了した後は、前回成立した役を記録し、その役を再び成立させる牌の評価を上げる。すべてを再現するのが難しい場合は、最も再現しやすい役だけを残す。他家が立直できないため、通常より守備を軽視し、自分の連続和了を優先する。",
      priorities: [
        "立直",
        "タンヤオ",
        "平和",
        "役牌",
        "一盃口",
        "混一色などの手牌依存度が高い役"
      ]
    }
  },
  {
    catalogNumber: 4,
    id: "enemy-4",
    displayName: "敵4",
    unlockCondition: {
      requiredEnemyId: "enemy-3",
      requiredFirstPlaceCount: 3,
      description:
        "敵3との対局で3回1位を取る。"
    },
    baseExperience: 280,
    abilities: [
      {
        id: "E-8",
        description:
          "他家はチー・ポン・大明槓・暗槓を宣言できない。加槓は可能とする。",
        activationHooks: [
          "callLegality",
          "kanLegality"
        ]
      },
      {
        id: "E-12",
        description:
          "自分がポン・大明槓するたびに他家からそれぞれ1,000点ずつ奪う。他家の持ち点が1,000点未満の場合はその持ち点をすべて奪い、この能力によって持ち点が0未満になることはない。",
        activationHooks: ["afterCall"]
      }
    ],
    aiTendencies: {
      closedHand: 1,
      calls: 5,
      riichi: 1,
      defense: 2,
      handValue: 2
    },
    strategy: {
      archetype: "ポン・大明槓型",
      description:
        "ポンと大明槓を最優先する副露型。チーでは点数を奪えないため、チーの優先度は低め。1回のポンで他家から合計3,000点を奪えるため、通常AIよりかなり無理なポンも選択する。",
      priorities: [
        "対子を通常より多く残す",
        "役牌の対子を最優先する",
        "対々和・三色同刻・混一色を狙う",
        "ポンで向聴数が変わらなくても、手牌を大きく損なわなければ鳴く",
        "大明槓できる場合は、流局間際や明確な危険時を除き積極的に槓する",
        "チーは聴牌または一向聴になる場合を中心に行う"
      ]
    }
  }
] as const satisfies readonly EnemyDefinition[];
