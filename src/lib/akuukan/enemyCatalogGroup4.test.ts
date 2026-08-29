import {
  describe,
  expect,
  it
} from "vitest";
import {
  ENEMY_CATALOG_GROUP_4
} from "./enemyCatalogGroup4";

describe("敵カタログ13～16", () => {
  it("敵13から敵16を番号順に定義する", () => {
    expect(
      ENEMY_CATALOG_GROUP_4.map(
        (enemy) => ({
          catalogNumber:
            enemy.catalogNumber,
          id: enemy.id,
          displayName: enemy.displayName
        })
      )
    ).toEqual([
      {
        catalogNumber: 13,
        id: "enemy-13",
        displayName: "敵13"
      },
      {
        catalogNumber: 14,
        id: "enemy-14",
        displayName: "敵14"
      },
      {
        catalogNumber: 15,
        id: "enemy-15",
        displayName: "敵15"
      },
      {
        catalogNumber: 16,
        id: "enemy-16",
        displayName: "敵16"
      }
    ]);
  });

  it("仕様書どおり3勝または1勝で順番に解放する", () => {
    expect(
      ENEMY_CATALOG_GROUP_4.map(
        (enemy) => enemy.unlockCondition
      )
    ).toEqual([
      {
        requiredEnemyId: "enemy-12",
        requiredFirstPlaceCount: 3,
        description:
          "敵12との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-13",
        requiredFirstPlaceCount: 3,
        description:
          "敵13との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-14",
        requiredFirstPlaceCount: 1,
        description:
          "敵14との対局で1回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-15",
        requiredFirstPlaceCount: 1,
        description:
          "敵15との対局で1回1位を取る。"
      }
    ]);
  });

  it("仕様書どおりの基本EXPを保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_4.map(
        (enemy) => enemy.baseExperience
      )
    ).toEqual([
      1200,
      2000,
      2200,
      2500
    ]);
  });

  it("敵13から敵16の能力IDを重複なく保持する", () => {
    const abilityIds =
      ENEMY_CATALOG_GROUP_4.flatMap(
        (enemy) =>
          enemy.abilities.map(
            (ability) => ability.id
          )
      );

    expect(abilityIds).toEqual([
      "E-25",
      "E-26",
      "E-27",
      "E-28",
      "E-29"
    ]);
    expect(new Set(abilityIds).size).toBe(
      abilityIds.length
    );
  });

  it("能力を仕様書の処理段階へ登録する", () => {
    const hooks = Object.fromEntries(
      ENEMY_CATALOG_GROUP_4.flatMap(
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
      "E-25": ["turnCountChange"],
      "E-26": ["dealComposition"],
      "E-27": ["handValueEvaluation"],
      "E-28": [
        "drawTileSelection",
        "afterDraw",
        "discardHistory"
      ],
      "E-29": ["dealComposition"]
    });
  });

  it("AI傾向と戦術型を仕様書どおり保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_4.map(
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
          calls: 1,
          riichi: 5,
          defense: 2,
          handValue: 3
        },
        archetype: "2回行動型"
      },
      {
        aiTendencies: {
          closedHand: 5,
          calls: 1,
          riichi: 5,
          defense: 1,
          handValue: 2
        },
        archetype: "配牌聴牌型"
      },
      {
        aiTendencies: {
          closedHand: 3,
          calls: 2,
          riichi: 3,
          defense: 4,
          handValue: 4
        },
        archetype: "河支配型"
      },
      {
        aiTendencies: {
          closedHand: 4,
          calls: 2,
          riichi: 4,
          defense: 4,
          handValue: 3
        },
        archetype: "正統派最終型"
      }
    ]);
  });
});
