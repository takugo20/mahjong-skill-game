import {
  describe,
  expect,
  it
} from "vitest";
import type {
  EnemyDefinition
} from "./enemyCatalogTypes";
import {
  validateEnemyCatalog
} from "./enemyCatalogValidation";
import {
  ENEMY_ABILITY_IDS,
  ENEMY_IDS
} from "./types";

function createValidEnemyCatalog():
  EnemyDefinition[] {
  let abilityIndex = 0;

  return ENEMY_IDS.map(
    (enemyId, enemyIndex) => {
      const abilityCount =
        enemyIndex < 13 ? 2 : 1;
      const abilities =
        ENEMY_ABILITY_IDS.slice(
          abilityIndex,
          abilityIndex + abilityCount
        ).map((abilityId) => ({
          id: abilityId,
          description:
            `${abilityId}の説明`,
          activationHooks: [
            "matchSetup" as const
          ]
        }));

      abilityIndex += abilityCount;

      return {
        catalogNumber: enemyIndex + 1,
        id: enemyId,
        displayName: `敵${enemyIndex + 1}`,
        unlockCondition:
          enemyIndex === 0
            ? null
            : {
                requiredEnemyId:
                  ENEMY_IDS[
                    enemyIndex - 1
                  ],
                requiredFirstPlaceCount:
                  enemyIndex >= 14
                    ? 1
                    : 3,
                description:
                  `敵${enemyIndex}との対局で1位を取る。`
              },
        baseExperience:
          (enemyIndex + 1) * 100,
        abilities,
        aiTendencies: {
          closedHand: 3,
          calls: 3,
          riichi: 3,
          defense: 3,
          handValue: 3
        },
        strategy: {
          archetype: "テスト型",
          description:
            "検証用の戦術説明。",
          priorities: ["手を進める"]
        }
      };
    }
  );
}

describe("敵カタログの検証", () => {
  it("16体・29能力の正しいカタログを受理する", () => {
    const result = validateEnemyCatalog(
      createValidEnemyCatalog()
    );

    expect(result).toEqual({
      isValid: true,
      issues: []
    });
  });

  it("敵数・敵IDの欠落と重複を検出する", () => {
    const missing =
      createValidEnemyCatalog().slice(
        0,
        -1
      );
    const duplicated =
      createValidEnemyCatalog();
    duplicated[15] = {
      ...duplicated[15],
      id: "enemy-1"
    };

    expect(
      validateEnemyCatalog(missing).issues
    ).toEqual(
      expect.arrayContaining([
        {
          type: "incorrectEnemyCount",
          expected: 16,
          actual: 15
        },
        {
          type: "missingEnemyId",
          enemyId: "enemy-16"
        }
      ])
    );
    expect(
      validateEnemyCatalog(duplicated)
        .issues
    ).toEqual(
      expect.arrayContaining([
        {
          type: "duplicateEnemyId",
          enemyId: "enemy-1"
        },
        {
          type: "missingEnemyId",
          enemyId: "enemy-16"
        }
      ])
    );
  });

  it("敵番号と基本EXPの不正を検出する", () => {
    const catalog =
      createValidEnemyCatalog();
    catalog[0] = {
      ...catalog[0],
      catalogNumber: 0,
      baseExperience: 0
    };
    catalog[2] = {
      ...catalog[2],
      catalogNumber: 2,
      baseExperience: 1.5
    };
    const issues =
      validateEnemyCatalog(catalog).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          type: "invalidCatalogNumber",
          enemyId: "enemy-1",
          catalogNumber: 0
        },
        {
          type: "duplicateCatalogNumber",
          catalogNumber: 2
        },
        {
          type: "invalidBaseExperience",
          enemyId: "enemy-1",
          value: 0
        },
        {
          type: "invalidBaseExperience",
          enemyId: "enemy-3",
          value: 1.5
        }
      ])
    );
  });

  it("初期解放と前の敵を参照する解放条件を検証する", () => {
    const catalog =
      createValidEnemyCatalog();
    catalog[0] = {
      ...catalog[0],
      unlockCondition: {
        requiredEnemyId: "enemy-2",
        requiredFirstPlaceCount: 1,
        description: "不正な条件"
      }
    };
    catalog[1] = {
      ...catalog[1],
      unlockCondition: null
    };
    catalog[2] = {
      ...catalog[2],
      unlockCondition: {
        requiredEnemyId: "enemy-1",
        requiredFirstPlaceCount: 0,
        description: "不正な条件"
      }
    };
    const issues =
      validateEnemyCatalog(catalog).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          type:
            "unexpectedInitialUnlockCondition",
          enemyId: "enemy-1"
        },
        {
          type: "missingUnlockCondition",
          enemyId: "enemy-2"
        },
        {
          type: "incorrectRequiredEnemyId",
          enemyId: "enemy-3",
          expected: "enemy-2",
          actual: "enemy-1"
        },
        {
          type:
            "invalidRequiredFirstPlaceCount",
          enemyId: "enemy-3",
          value: 0
        }
      ])
    );
  });

  it("能力数・能力ID・発動段階を検証する", () => {
    const catalog =
      createValidEnemyCatalog();
    catalog[0] = {
      ...catalog[0],
      abilities: [
        {
          ...catalog[0].abilities[0],
          activationHooks: []
        },
        catalog[0].abilities[1]
      ]
    };
    catalog[15] = {
      ...catalog[15],
      abilities: [
        {
          ...catalog[15].abilities[0],
          id: "E-1"
        }
      ]
    };
    const issues =
      validateEnemyCatalog(catalog).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          type: "duplicateAbilityId",
          abilityId: "E-1"
        },
        {
          type: "missingAbilityId",
          abilityId: "E-29"
        },
        {
          type:
            "missingAbilityActivationHook",
          enemyId: "enemy-1",
          abilityId: "E-1"
        }
      ])
    );
  });

  it("1から5の範囲外にあるAI傾向を検出する", () => {
    const catalog =
      createValidEnemyCatalog();
    catalog[0] = {
      ...catalog[0],
      aiTendencies: {
        ...catalog[0].aiTendencies,
        defense: 0,
        handValue: 6
      }
    } as unknown as EnemyDefinition;
    const issues =
      validateEnemyCatalog(catalog).issues;

    expect(issues).toEqual(
      expect.arrayContaining([
        {
          type: "invalidAiTendency",
          enemyId: "enemy-1",
          tendency: "defense",
          value: 0
        },
        {
          type: "invalidAiTendency",
          enemyId: "enemy-1",
          tendency: "handValue",
          value: 6
        }
      ])
    );
  });
});
