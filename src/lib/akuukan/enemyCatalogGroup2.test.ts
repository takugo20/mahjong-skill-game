import {
  describe,
  expect,
  it
} from "vitest";
import {
  ENEMY_CATALOG_GROUP_2
} from "./enemyCatalogGroup2";

describe("敵カタログ5～8", () => {
  it("敵5から敵8を番号順に定義する", () => {
    expect(
      ENEMY_CATALOG_GROUP_2.map(
        (enemy) => ({
          catalogNumber:
            enemy.catalogNumber,
          id: enemy.id,
          displayName: enemy.displayName
        })
      )
    ).toEqual([
      {
        catalogNumber: 5,
        id: "enemy-5",
        displayName: "敵5"
      },
      {
        catalogNumber: 6,
        id: "enemy-6",
        displayName: "敵6"
      },
      {
        catalogNumber: 7,
        id: "enemy-7",
        displayName: "敵7"
      },
      {
        catalogNumber: 8,
        id: "enemy-8",
        displayName: "敵8"
      }
    ]);
  });

  it("直前の敵に3勝すると順番に解放する", () => {
    expect(
      ENEMY_CATALOG_GROUP_2.map(
        (enemy) => enemy.unlockCondition
      )
    ).toEqual([
      {
        requiredEnemyId: "enemy-4",
        requiredFirstPlaceCount: 3,
        description:
          "敵4との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-5",
        requiredFirstPlaceCount: 3,
        description:
          "敵5との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-6",
        requiredFirstPlaceCount: 3,
        description:
          "敵6との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-7",
        requiredFirstPlaceCount: 3,
        description:
          "敵7との対局で3回1位を取る。"
      }
    ]);
  });

  it("仕様書どおりの基本EXPを保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_2.map(
        (enemy) => enemy.baseExperience
      )
    ).toEqual([300, 500, 530, 570]);
  });

  it("敵5から敵8の能力IDを重複なく保持する", () => {
    const abilityIds =
      ENEMY_CATALOG_GROUP_2.flatMap(
        (enemy) =>
          enemy.abilities.map(
            (ability) => ability.id
          )
      );

    expect(abilityIds).toEqual([
      "E-5",
      "E-14",
      "E-18",
      "E-10",
      "E-7",
      "E-11",
      "E-13",
      "E-15"
    ]);
    expect(new Set(abilityIds).size).toBe(
      abilityIds.length
    );
  });

  it("能力を仕様書の処理段階へ登録する", () => {
    const hooks = Object.fromEntries(
      ENEMY_CATALOG_GROUP_2.flatMap(
        (enemy) =>
          enemy.abilities.map(
            (ability) => [
              ability.id,
              ability.activationHooks
            ]
          )
      )
    );

    expect(hooks).toEqual({
      "E-5": [
        "roundSetup",
        "drawTileSelection"
      ],
      "E-14": [
        "riichiLegality",
        "yakuEvaluation"
      ],
      "E-18": ["matchSetup"],
      "E-10": [
        "informationVisibility"
      ],
      "E-7": ["yakuEvaluation"],
      "E-11": [
        "dealComposition",
        "drawTileSelection"
      ],
      "E-13": [
        "informationVisibility",
        "callLegality",
        "ronLegality"
      ],
      "E-15": ["afterCall"]
    });
  });

  it("AI傾向と戦術型を仕様書どおり保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_2.map(
        (enemy) => ({
          aiTendencies:
            enemy.aiTendencies,
          archetype:
            enemy.strategy.archetype
        })
      )
    ).toEqual([
      {
        aiTendencies: {
          closedHand: 1,
          calls: 5,
          riichi: 4,
          defense: 2,
          handValue: 5
        },
        archetype: "染め手型"
      },
      {
        aiTendencies: {
          closedHand: 3,
          calls: 2,
          riichi: 3,
          defense: 5,
          handValue: 3
        },
        archetype: "完全情報型"
      },
      {
        aiTendencies: {
          closedHand: 3,
          calls: 2,
          riichi: 2,
          defense: 2,
          handValue: 5
        },
        archetype: "風牌・大役型"
      },
      {
        aiTendencies: {
          closedHand: 1,
          calls: 5,
          riichi: 1,
          defense: 2,
          handValue: 4
        },
        archetype: "赤副露型"
      }
    ]);
  });
});
