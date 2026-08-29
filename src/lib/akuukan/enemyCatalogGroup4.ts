import type {
  EnemyDefinition
} from "./enemyCatalogTypes";

export const ENEMY_CATALOG_GROUP_4 = [
  {
    catalogNumber: 13,
    id: "enemy-13",
    displayName: "敵13",
    unlockCondition: {
      requiredEnemyId: "enemy-12",
      requiredFirstPlaceCount: 3,
      description:
        "敵12との対局で3回1位を取る。"
    },
    baseExperience: 1200,
    abilities: [
      {
        id: "E-25",
        description:
          "自分の手番では、通常1回行うツモ・打牌の一連の動作を2回行うことができる。1回目のツモ・打牌後、ロンされた場合は局終了、副露された場合は2回目の行動を失う。いずれも発生しなければ、続けて2回目のツモ・打牌を行う。1回目の打牌で立直した場合、2回目のツモが立直後最初のツモになる。その2回目で和了すれば一発が成立する。立直後の2回目の打牌は通常どおりツモ切り。1回目の行動中に槓した場合、嶺上牌と打牌までを1回目として扱う。その打牌が鳴かれなければ2回目へ進む。",
        activationHooks: [
          "turnCountChange"
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
      archetype: "2回行動型",
      description:
        "2回目の行動を確保することを最優先する。1回目と2回目を別々に評価するのではなく、2回の行動後に最もよい状態になる打牌を先読みして選択する。",
      priorities: [
        "1回目の捨て牌は鳴かれにくい牌を選ぶ",
        "下家以外にチーされないことも考慮して座席ごとに危険度を変える",
        "他家が対子を持っていそうな牌は1回目に避ける",
        "1回目で聴牌したら即立直する",
        "2回目のツモで一発和了を狙う",
        "1回目の槓は、嶺上牌に加えて2回目の通常ツモも得られるため積極的に行う",
        "自分からの副露は、自然な2回行動の機会を減らすため控えめにする",
        "門前で向聴数と受け入れ枚数を重視する"
      ]
    }
  },
  {
    catalogNumber: 14,
    id: "enemy-14",
    displayName: "敵14",
    unlockCondition: {
      requiredEnemyId: "enemy-13",
      requiredFirstPlaceCount: 3,
      description:
        "敵13との対局で3回1位を取る。"
    },
    baseExperience: 2000,
    abilities: [
      {
        id: "E-26",
        description:
          "自分は配牌で、配牌保証の優先順位内で可能な範囲において聴牌する。",
        activationHooks: [
          "dealComposition"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 5,
      calls: 1,
      riichi: 5,
      defense: 1,
      handValue: 2
    },
    strategy: {
      archetype: "配牌聴牌型",
      description:
        "配牌時点で聴牌している場合、第一打でのダブル立直を基本行動にする。例外として、役満聴牌などで立直による利点がほとんどない場合だけ黙聴を選ぶ。",
      priorities: [
        "良形・悪形にかかわらずダブル立直する",
        "複数の聴牌形がある場合は待ち枚数を最優先する",
        "同じ待ち枚数なら打点を優先する",
        "すでに高打点でもダブル立直を優先する",
        "原則として副露しない",
        "立直後は通常のツモ切りを行う",
        "一発・裏ドラ込みの期待値で判断する",
        "防御はほぼ行わず、先制和了に全振りする"
      ]
    }
  },
  {
    catalogNumber: 15,
    id: "enemy-15",
    displayName: "敵15",
    unlockCondition: {
      requiredEnemyId: "enemy-14",
      requiredFirstPlaceCount: 1,
      description:
        "敵14との対局で1回1位を取る。"
    },
    baseExperience: 2200,
    abilities: [
      {
        id: "E-27",
        description:
          "他家が和了を宣言し、役・ドラ・赤ドラ・裏ドラ・スキルによる翻数および符の変更をすべて反映して満貫未満と判定された場合、その和了を無効として途中流局にする。本場、固定点加算、支払倍率は満貫判定に含めない。点数移動・ノーテン罰符は発生せず、本場を1増やし、立直棒を持ち越して親は連荘する。",
        activationHooks: [
          "handValueEvaluation"
        ]
      },
      {
        id: "E-28",
        description:
          "自分のみ、通常山からのツモの代わりに、自分を含む全員の河から好きな牌を1枚選んでツモることができる。通常どおり山からツモることもできる。河から取得した牌は河と対応する捨て牌履歴から削除し、通常山の残数は減らない。その牌はツモとして扱い、和了すればツモ和了になる。",
        activationHooks: [
          "drawTileSelection",
          "afterDraw",
          "discardHistory"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 3,
      calls: 2,
      riichi: 3,
      defense: 4,
      handValue: 4
    },
    strategy: {
      archetype: "河支配型",
      description:
        "通常山と河の全牌を比較し、最も価値の高い牌を選ぶ。他家の河から牌を取ることでその家の振聴を解除してしまう場合は、自分の手牌改善効果が小さければ取得を避ける。他家の満貫未満の和了は無効になるため、安手の気配にはほとんど降りない。",
      priorities: [
        "その場でツモ和了できる牌を最優先する",
        "聴牌できる牌を優先する",
        "向聴数が進む牌を優先する",
        "受け入れ枚数を大きく増やす牌を優先する",
        "ドラ・赤ドラ・役の構成牌を優先する",
        "自分の河から回収して振聴を解除できる牌を優先する",
        "河に有効牌がなければ通常山からツモる",
        "立直していてドラを多く持っていそうな相手を警戒する",
        "副露だけで満貫が見える相手を警戒する",
        "混一色・清一色・対々和などの高打点者を警戒する",
        "スキルによって翻数を増やせるプレイヤーを警戒する"
      ]
    }
  },
  {
    catalogNumber: 16,
    id: "enemy-16",
    displayName: "敵16",
    unlockCondition: {
      requiredEnemyId: "enemy-15",
      requiredFirstPlaceCount: 1,
      description:
        "敵15との対局で1回1位を取る。"
    },
    baseExperience: 2500,
    abilities: [
      {
        id: "E-29",
        description:
          "配牌保証の優先順位内で可能な範囲において、自分のみ配牌が一向聴以下になり、他家は四向聴以上になる。通常形・七対子・国士無双の向聴数をすべて計算し、その最小値を採用する。",
        activationHooks: [
          "dealComposition"
        ]
      }
    ],
    aiTendencies: {
      closedHand: 4,
      calls: 2,
      riichi: 4,
      defense: 4,
      handValue: 3
    },
    strategy: {
      archetype: "正統派最終型",
      description:
        "能力による配牌差を利用しつつ、特定の役へ偏らない総合型AIとする。",
      priorities: [
        "配牌時の向聴数だけでなく、受け入れ枚数と最終打点を比較する",
        "他家が四向聴以上になる可能性が高いため、序盤は悪形聴牌を急がず待ちを改善する",
        "良形または十分な打点になった段階で立直する",
        "鳴きは聴牌・良形化・確定役につながる場合のみ行う",
        "他家がまだ遠い間は一盃口・三色同順・ドラ活用なども狙う",
        "他家が急速に進んだ場合は速度重視へ切り替える",
        "1位なら守備と局消化を重視する",
        "4位なら副露・立直を増やして攻撃を重視する",
        "オーラスでは必要順位点から逆算して和了点を選ぶ"
      ]
    }
  }
] as const satisfies readonly EnemyDefinition[];
