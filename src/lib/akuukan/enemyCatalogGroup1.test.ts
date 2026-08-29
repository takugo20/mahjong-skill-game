import {
  describe,
  expect,
  it
} from "vitest";
import {
  ENEMY_CATALOG_GROUP_1
} from "./enemyCatalogGroup1";

describe("敵カタログ1～4", () => {
  it("敵1から敵4を番号順に定義する", () => {
    expect(
      ENEMY_CATALOG_GROUP_1.map(
        (enemy) => ({
          catalogNumber:
            enemy.catalogNumber,
          id: enemy.id,
          displayName: enemy.displayName
        })
      )
    ).toEqual([
      {
        catalogNumber: 1,
        id: "enemy-1",
        displayName: "敵1"
      },
      {
        catalogNumber: 2,
        id: "enemy-2",
        displayName: "敵2"
      },
      {
        catalogNumber: 3,
        id: "enemy-3",
        displayName: "敵3"
      },
      {
        catalogNumber: 4,
        id: "enemy-4",
        displayName: "敵4"
      }
    ]);
  });

  it("敵1だけを初期解放し、以降を3勝で順番に解放する", () => {
    expect(
      ENEMY_CATALOG_GROUP_1.map(
        (enemy) => enemy.unlockCondition
      )
    ).toEqual([
      null,
      {
        requiredEnemyId: "enemy-1",
        requiredFirstPlaceCount: 3,
        description:
          "敵1との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-2",
        requiredFirstPlaceCount: 3,
        description:
          "敵2との対局で3回1位を取る。"
      },
      {
        requiredEnemyId: "enemy-3",
        requiredFirstPlaceCount: 3,
        description:
          "敵3との対局で3回1位を取る。"
      }
    ]);
  });

  it("仕様書どおりの基本EXPを保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_1.map(
        (enemy) => enemy.baseExperience
      )
    ).toEqual([100, 200, 220, 280]);
  });

  it("敵1から敵4の能力IDを重複なく保持する", () => {
    const abilityIds =
      ENEMY_CATALOG_GROUP_1.flatMap(
        (enemy) =>
          enemy.abilities.map(
            (ability) => ability.id
          )
      );

    expect(abilityIds).toEqual([
      "E-1",
      "E-2",
      "E-3",
      "E-4",
      "E-9",
      "E-6",
      "E-8",
      "E-12"
    ]);
    expect(new Set(abilityIds).size).toBe(
      abilityIds.length
    );
  });

  it("能力を仕様書の処理段階へ登録する", () => {
    const hooks = Object.fromEntries(
      ENEMY_CATALOG_GROUP_1.flatMap(
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
      "E-1": ["informationVisibility"],
      "E-2": ["drawTileSelection"],
      "E-3": [
        "callLegality",
        "afterCall"
      ],
      "E-4": ["riichiLegality"],
      "E-9": ["riichiLegality"],
      "E-6": [
        "yakuEvaluation",
        "afterWin"
      ],
      "E-8": [
        "callLegality",
        "kanLegality"
      ],
      "E-12": ["afterCall"]
    });
  });

  it("AI傾向と戦術型を仕様書どおり保持する", () => {
    expect(
      ENEMY_CATALOG_GROUP_1.map(
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
          defense: 3,
          handValue: 3
        },
        archetype: "追っかけ立直型"
      },
      {
        aiTendencies: {
          closedHand: 5,
          calls: 1,
          riichi: 5,
          defense: 2,
          handValue: 3
        },
        archetype: "先制・偽装立直型"
      },
      {
        aiTendencies: {
          closedHand: 3,
          calls: 3,
          riichi: 4,
          defense: 2,
          handValue: 4
        },
        archetype: "同一役連続型"
      },
      {
        aiTendencies: {
          closedHand: 1,
          calls: 5,
          riichi: 1,
          defense: 2,
          handValue: 2
        },
        archetype: "ポン・大明槓型"
      }
    ]);
  });
});
