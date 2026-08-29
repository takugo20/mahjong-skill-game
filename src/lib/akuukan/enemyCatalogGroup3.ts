import type {
  EnemyDefinition
} from "./enemyCatalogTypes";

export const ENEMY_CATALOG_GROUP_3 = [
  {
    catalogNumber: 9,
    id: "enemy-9",
    displayName: "敵9",
    unlockCondition: {
      requiredEnemyId: "enemy-8",
      requiredFirstPlaceCount: 3,
      description:
        "敵8との対局で3回1位を取る。"
    },
    baseExperience: 700,
    abilities: [
      {
        id: "E-16",
        description:
          "自分の配牌時、配牌保証の優先順位内で可能な範囲においてドラ暗刻が含まれる。",
        activationHooks: [
          "dealComposition"
        ]
      },
      {
        id: "E-17",
        description:
          "他家は立直以外のすべての1翻の役が成立しなくなる。対象となる役を役一覧から除外し、ほかに有効な役があれば和了可能。",
        activationHooks: [
          "yakuEvaluation"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 5,
      calls: 2,
      riichi: 5,
      defense: 3,
      handValue: 3
    },
    strategy: {
      archetype: "ドラ暗刻速攻型",
      description:
        "配牌時にドラ暗刻が成立した場合、固定面子として評価し、原則として崩さない。残る10枚で最短の和了形を作る。他家は1翻役の多くを失っているため、通常よりも押し気味に進める。ただし他家の立直には警戒する。",
      priorities: [
        "ドラ暗刻を固定面子として評価する",
        "門前を維持して立直を最優先する",
        "役牌など、鳴いても確実に役が付く場合は副露する",
        "タンヤオ・混一色などが確定する場合も副露を検討する",
        "役のない副露は避ける",
        "聴牌すれば悪形でも立直する",
        "打点はすでに十分なので、追加の高い役より速度を重視する"
      ]
    }
  },
  {
    catalogNumber: 10,
    id: "enemy-10",
    displayName: "敵10",
    unlockCondition: {
      requiredEnemyId: "enemy-9",
      requiredFirstPlaceCount: 3,
      description:
        "敵9との対局で3回1位を取る。"
    },
    baseExperience: 750,
    abilities: [
      {
        id: "E-19",
        description:
          "他家は配牌時、手牌の中からランダムに選ばれた3枚の牌を捨てられなくなる。副露・暗槓・加槓、和了には使用可能で、手牌交換スキルの対象に取ることも可能。",
        activationHooks: [
          "dealCompleted",
          "discardLegality"
        ]
      },
      {
        id: "E-20",
        description:
          "自分の和了点が2倍になる。",
        activationHooks: [
          "paymentCalculation"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 2,
      calls: 4,
      riichi: 3,
      defense: 1,
      handValue: 2
    },
    strategy: {
      archetype: "倍率速攻型",
      description:
        "和了点が2倍になるため、役の高さより和了速度を優先する。",
      priorities: [
        "役牌・タンヤオで早く和了する",
        "鳴いて一向聴以下になるなら積極的に副露する",
        "高い手への手替わりを待たない",
        "良形聴牌なら即立直する",
        "すでに役がある場合は黙聴も利用する",
        "他家が配牌の固定牌で遅れることを前提に強く押す",
        "守備よりも先制和了を優先する"
      ]
    }
  },
  {
    catalogNumber: 11,
    id: "enemy-11",
    displayName: "敵11",
    unlockCondition: {
      requiredEnemyId: "enemy-10",
      requiredFirstPlaceCount: 3,
      description:
        "敵10との対局で3回1位を取る。"
    },
    baseExperience: 800,
    abilities: [
      {
        id: "E-22",
        description:
          "他家が通常山から通常ツモを行う際、その者の非副露部分の手牌に現在存在する牌と同じ牌種を通常ツモ候補から除外する。手牌に存在しない牌種が通常山に残っていない場合は通常抽選へ戻る。嶺上牌および通常山以外からの取得は対象外とする。",
        activationHooks: [
          "drawTileSelection"
        ]
      },
      {
        id: "E-21",
        description:
          "自分のみ、満貫未満の和了を満貫として処理する。",
        activationHooks: [
          "handValueEvaluation"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 2,
      calls: 5,
      riichi: 2,
      defense: 1,
      handValue: 1
    },
    strategy: {
      archetype: "最低満貫速攻型",
      description:
        "どれほど安い手でも満貫になるため、速度を重視する。満貫以上を作るために手を伸ばす必要がなく、1000点の手と満貫の手を同じ打点として評価する。",
      priorities: [
        "役牌を即ポンする",
        "喰いタンが可能なら積極的にチーする",
        "1翻役を確保した時点で最短聴牌を目指す",
        "待ちの広さを役の高さより優先する",
        "役あり聴牌なら立直せず黙聴する",
        "役なし門前聴牌の場合のみ立直する",
        "悪形でも和了可能なら待ちを変えない",
        "他家の進行が遅れているため、ほぼ全押しする"
      ]
    }
  },
  {
    catalogNumber: 12,
    id: "enemy-12",
    displayName: "敵12",
    unlockCondition: {
      requiredEnemyId: "enemy-11",
      requiredFirstPlaceCount: 3,
      description:
        "敵11との対局で3回1位を取る。"
    },
    baseExperience: 1000,
    abilities: [
      {
        id: "E-23",
        description:
          "他家が通常山から通常ツモを行うとき、直前にその者が捨てた牌と同じ牌種が通常山に残っている場合、50％の確率でその牌種から1枚を取得する。残り50％では、その牌種を候補から除外したうえで通常の重量抽選を行う。ただし、除外後に候補牌が1枚も残らない場合は、その牌種から取得する。該当する牌種が通常山に残っていない場合は、通常の重量抽選を行う。河の牌そのものは移動しない。",
        activationHooks: [
          "drawTileSelection"
        ]
      },
      {
        id: "E-24",
        description:
          "自分の捨て牌が裏返しになり、他家はその捨て牌に対してロンや副露を宣言できなくなる。実際の牌種は内部の捨て牌履歴へ記録する。",
        activationHooks: [
          "informationVisibility",
          "callLegality",
          "ronLegality",
          "discardVisibility"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 5,
      calls: 1,
      riichi: 5,
      defense: 1,
      handValue: 4
    },
    strategy: {
      archetype: "隠密強襲型",
      description:
        "自分の河が他家から見えず、捨て牌ではロンされないため、守備をほとんど行わず門前で高打点を狙う。他家に一度捨てた牌を再び引かせ、その牌を待ち構える再捨て誘導を重視する。",
      priorities: [
        "門前を維持し、聴牌すると立直を強く優先する",
        "危険牌でも向聴数が進むなら捨てる",
        "他家の立直に対しても基本的に降りない",
        "能力により、他家の直前の捨て牌を待ちに含む形を高く評価する",
        "すでに満貫以上あり、再び捨てられる可能性が高い場合は黙聴も選択する",
        "鳴きは即聴牌・高打点確定・オーラスで速度が必要な場合に限定する",
        "他家の進行が遅れるため、立直・平和・タンヤオ・一盃口・ドラなどの複合を狙う"
      ]
    }
  }
] as const satisfies readonly EnemyDefinition[];
