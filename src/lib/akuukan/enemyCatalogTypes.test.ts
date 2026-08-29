import {
  describe,
  expect,
  it
} from "vitest";
import {
  ENEMY_AI_TENDENCY_LEVELS,
  getEnemyAbilityDefinition
} from "./enemyCatalogTypes";
import type {
  EnemyDefinition
} from "./enemyCatalogTypes";

const ENEMY_1 = {
  catalogNumber: 1,
  id: "enemy-1",
  displayName: "敵1",
  unlockCondition: null,
  baseExperience: 100,
  abilities: [
    {
      id: "E-1",
      description:
        "他家からドラ表示牌を見えなくする。",
      activationHooks: [
        "informationVisibility"
      ]
    },
    {
      id: "E-2",
      description:
        "追っかけ立直後に先行立直者の和了牌ツモを制限する。",
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
      "門前で聴牌し、他家の立直へ追っかけ立直する。",
    priorities: [
      "他家の立直に対する追っかけ立直",
      "良形での先制立直"
    ]
  }
} as const satisfies EnemyDefinition;

const ENEMY_2 = {
  ...ENEMY_1,
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
        "他家の副露時に1000点を供託させる。",
      activationHooks: ["callLegality"]
    },
    {
      id: "E-4",
      description:
        "ノーテン状態でも立直できる。",
      activationHooks: [
        "riichiLegality"
      ]
    }
  ],
  strategy: {
    archetype: "先制・偽装立直型",
    description:
      "一向聴や二向聴からノーテン立直を使う。",
    priorities: [
      "一向聴からの先制立直"
    ]
  }
} as const satisfies EnemyDefinition;

describe("敵カタログの共通型", () => {
  it("AI傾向を1から5までで定義する", () => {
    expect(
      ENEMY_AI_TENDENCY_LEVELS
    ).toEqual([1, 2, 3, 4, 5]);
    expect(ENEMY_1.aiTendencies).toEqual({
      closedHand: 5,
      calls: 1,
      riichi: 5,
      defense: 3,
      handValue: 3
    });
  });

  it("基本EXPと初期解放状態を保持する", () => {
    expect(ENEMY_1.baseExperience).toBe(
      100
    );
    expect(
      ENEMY_1.unlockCondition
    ).toBeNull();
  });

  it("前の敵と必要1位回数を解放条件にする", () => {
    expect(
      ENEMY_2.unlockCondition
    ).toEqual({
      requiredEnemyId: "enemy-1",
      requiredFirstPlaceCount: 3,
      description:
        "敵1との対局で3回1位を取る。"
    });
  });

  it("能力ID・説明・発動段階を保持する", () => {
    expect(ENEMY_1.abilities).toHaveLength(
      2
    );
    expect(ENEMY_1.abilities[0]).toEqual({
      id: "E-1",
      description:
        "他家からドラ表示牌を見えなくする。",
      activationHooks: [
        "informationVisibility"
      ]
    });
  });

  it("指定した能力を取得し、未所持能力を拒否する", () => {
    expect(
      getEnemyAbilityDefinition(
        ENEMY_1,
        "E-2"
      )
    ).toBe(ENEMY_1.abilities[1]);
    expect(() =>
      getEnemyAbilityDefinition(
        ENEMY_1,
        "E-29"
      )
    ).toThrow(
      "敵1の能力が見つかりません: E-29"
    );
  });
});
