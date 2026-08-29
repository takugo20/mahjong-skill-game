import {
  describe,
  expect,
  it
} from "vitest";
import {
  ENEMY_CATALOG_GROUP_3
} from "./enemyCatalogGroup3";

describe("敵カタログ9～12", () => {
  it("敵9から敵12を番号順に定義する", () => {
    expect(
      ENEMY_CATALOG_GROUP_3.map(
        (enemy) => ({
          catalogNumber:
            enemy.catalogNumber,
          id: enemy.id,
          displayName: enemy.displayName
        })
      )
    ).toEqual([
      {
        catalogNumber: 9,
        id: "enemy-9",
        displayName: "敵9"
      },
      {
        catalogNumber: 10,
        id: "enemy-10",
        displayName: "敵10"
      },
      {
        catalogNumber: 11,
        id: "enemy-11",
        displayName: "敵11"
      },
      {
        catalogNumber: 12,
        id: "enemy-12",
        displayName: "敵12"
      }
    ]);
  });

  it("直前の敵に3勝すると順番に解放する", () => {
    expect(
      ENEMY_CATALOG_GROUP_3.map(
        (enemy) => enemy.unlockCondition
      )
    ).toEqual([
      {
        requiredEnemyId: "enemy-8",
        requiredFirstPlaceCount: 3,
        description:
          "敵8との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-9",
        requiredFirstPlaceCount: 3,
        description:
          "敵9との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-10",
        requiredFirstPlaceCount: 3,
        description:
          "敵10との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-11",
        requiredFirstPlaceCount: 3,
        description:
          "敵11との対局で3回1位を取る。"
      }
    ]);
  });

  it("仕様書どおりの基本EXPを保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_3.map(
        (enemy) => enemy.baseExperience
      )
    ).toEqual([700, 750, 800, 1000]);
  });

  it("敵9から敵12の能力IDを重複なく保持する", () => {
    const abilityIds =
      ENEMY_CATALOG_GROUP_3.flatMap(
        (enemy) =>
          enemy.abilities.map(
            (ability) => ability.id
          )
      );

    expect(abilityIds).toEqual([
      "E-16",
      "E-17",
      "E-19",
      "E-20",
      "E-22",
      "E-21",
      "E-23",
      "E-24"
    ]);
    expect(new Set(abilityIds).size).toBe(
      abilityIds.length
    );
  });

  it("能力を仕様書の処理段階へ登録する", () => {
    const hooks = Object.fromEntries(
      ENEMY_CATALOG_GROUP_3.flatMap(
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
      "E-16": ["dealComposition"],
      "E-17": ["yakuEvaluation"],
      "E-19": [
        "dealCompleted",
        "discardLegality"
      ],
      "E-20": ["paymentCalculation"],
      "E-22": ["drawTileSelection"],
      "E-21": ["handValueEvaluation"],
      "E-23": ["drawTileSelection"],
      "E-24": [
        "informationVisibility",
        "callLegality",
        "ronLegality",
        "discardVisibility"
      ]
    });
  });

  it("AI傾向と戦術型を仕様書どおり保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_3.map(
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
          closedHand: 5,
          calls: 2,
          riichi: 5,
          defense: 3,
          handValue: 3
        },
        archetype: "ドラ暗刻速攻型"
      },
      {
        aiTendencies: {
          closedHand: 2,
          calls: 4,
          riichi: 3,
          defense: 1,
          handValue: 2
        },
        archetype: "倍率速攻型"
      },
      {
        aiTendencies: {
          closedHand: 2,
          calls: 5,
          riichi: 2,
          defense: 1,
          handValue: 1
        },
        archetype: "最低満貫速攻型"
      },
      {
        aiTendencies: {
          closedHand: 5,
          calls: 1,
          riichi: 5,
          defense: 1,
          handValue: 4
        },
        archetype: "隠密強襲型"
      }
    ]);
  });
});
