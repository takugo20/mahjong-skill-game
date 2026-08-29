import {
  ENEMY_AI_TENDENCY_LEVELS
} from "./enemyCatalogTypes";
import type {
  EnemyAiTendencies,
  EnemyDefinition
} from "./enemyCatalogTypes";
import {
  ENEMY_ABILITY_IDS,
  ENEMY_IDS
} from "./types";
import type {
  EnemyAbilityId,
  EnemyId
} from "./types";

export const EXPECTED_ENEMY_COUNT =
  ENEMY_IDS.length;

export const EXPECTED_ENEMY_ABILITY_COUNT =
  ENEMY_ABILITY_IDS.length;

export const ENEMY_AI_TENDENCY_KEYS = [
  "closedHand",
  "calls",
  "riichi",
  "defense",
  "handValue"
] as const satisfies readonly (
  keyof EnemyAiTendencies
)[];

export type EnemyAiTendencyKey =
  (typeof ENEMY_AI_TENDENCY_KEYS)[number];

export type EnemyCatalogIssue =
  | {
      type: "incorrectEnemyCount";
      expected: number;
      actual: number;
    }
  | {
      type: "missingEnemyId";
      enemyId: EnemyId;
    }
  | {
      type: "duplicateEnemyId";
      enemyId: EnemyId;
    }
  | {
      type: "invalidCatalogNumber";
      enemyId: EnemyId;
      catalogNumber: number;
    }
  | {
      type: "duplicateCatalogNumber";
      catalogNumber: number;
    }
  | {
      type: "invalidBaseExperience";
      enemyId: EnemyId;
      value: number;
    }
  | {
      type:
        "unexpectedInitialUnlockCondition";
      enemyId: "enemy-1";
    }
  | {
      type: "missingUnlockCondition";
      enemyId: EnemyId;
    }
  | {
      type: "incorrectRequiredEnemyId";
      enemyId: EnemyId;
      expected: EnemyId;
      actual: EnemyId;
    }
  | {
      type:
        "invalidRequiredFirstPlaceCount";
      enemyId: EnemyId;
      value: number;
    }
  | {
      type: "incorrectAbilityCount";
      expected: number;
      actual: number;
    }
  | {
      type: "missingAbilityId";
      abilityId: EnemyAbilityId;
    }
  | {
      type: "duplicateAbilityId";
      abilityId: EnemyAbilityId;
    }
  | {
      type: "missingAbilityActivationHook";
      enemyId: EnemyId;
      abilityId: EnemyAbilityId;
    }
  | {
      type: "invalidAiTendency";
      enemyId: EnemyId;
      tendency: EnemyAiTendencyKey;
      value: number;
    };

export interface EnemyCatalogValidationResult {
  readonly isValid: boolean;
  readonly issues: readonly EnemyCatalogIssue[];
}

function isPositiveSafeInteger(
  value: number
): boolean {
  return (
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isValidAiTendency(
  value: number
): boolean {
  return ENEMY_AI_TENDENCY_LEVELS.some(
    (level) => level === value
  );
}

export function validateEnemyCatalog(
  catalog: readonly EnemyDefinition[]
): EnemyCatalogValidationResult {
  const issues: EnemyCatalogIssue[] = [];

  if (
    catalog.length !==
    EXPECTED_ENEMY_COUNT
  ) {
    issues.push({
      type: "incorrectEnemyCount",
      expected: EXPECTED_ENEMY_COUNT,
      actual: catalog.length
    });
  }

  const seenEnemyIds =
    new Set<EnemyId>();
  const reportedDuplicateEnemyIds =
    new Set<EnemyId>();
  const seenCatalogNumbers =
    new Set<number>();
  const reportedDuplicateCatalogNumbers =
    new Set<number>();
  const seenAbilityIds =
    new Set<EnemyAbilityId>();
  const reportedDuplicateAbilityIds =
    new Set<EnemyAbilityId>();
  let abilityCount = 0;

  for (const enemy of catalog) {
    if (seenEnemyIds.has(enemy.id)) {
      if (
        !reportedDuplicateEnemyIds.has(
          enemy.id
        )
      ) {
        issues.push({
          type: "duplicateEnemyId",
          enemyId: enemy.id
        });
        reportedDuplicateEnemyIds.add(
          enemy.id
        );
      }
    } else {
      seenEnemyIds.add(enemy.id);
    }

    const catalogNumberIsValid =
      Number.isInteger(
        enemy.catalogNumber
      ) &&
      enemy.catalogNumber >= 1 &&
      enemy.catalogNumber <=
        EXPECTED_ENEMY_COUNT;

    if (!catalogNumberIsValid) {
      issues.push({
        type: "invalidCatalogNumber",
        enemyId: enemy.id,
        catalogNumber:
          enemy.catalogNumber
      });
    } else if (
      seenCatalogNumbers.has(
        enemy.catalogNumber
      )
    ) {
      if (
        !reportedDuplicateCatalogNumbers.has(
          enemy.catalogNumber
        )
      ) {
        issues.push({
          type: "duplicateCatalogNumber",
          catalogNumber:
            enemy.catalogNumber
        });
        reportedDuplicateCatalogNumbers.add(
          enemy.catalogNumber
        );
      }
    } else {
      seenCatalogNumbers.add(
        enemy.catalogNumber
      );
    }

    if (
      !isPositiveSafeInteger(
        enemy.baseExperience
      )
    ) {
      issues.push({
        type: "invalidBaseExperience",
        enemyId: enemy.id,
        value: enemy.baseExperience
      });
    }

    if (enemy.id === "enemy-1") {
      if (enemy.unlockCondition !== null) {
        issues.push({
          type:
            "unexpectedInitialUnlockCondition",
          enemyId: "enemy-1"
        });
      }
    } else if (
      enemy.unlockCondition === null
    ) {
      issues.push({
        type: "missingUnlockCondition",
        enemyId: enemy.id
      });
    } else {
      const enemyIndex =
        ENEMY_IDS.indexOf(enemy.id);
      const expectedRequiredEnemyId =
        ENEMY_IDS[enemyIndex - 1];

      if (
        expectedRequiredEnemyId !==
        enemy.unlockCondition
          .requiredEnemyId
      ) {
        issues.push({
          type: "incorrectRequiredEnemyId",
          enemyId: enemy.id,
          expected:
            expectedRequiredEnemyId,
          actual:
            enemy.unlockCondition
              .requiredEnemyId
        });
      }

      if (
        !isPositiveSafeInteger(
          enemy.unlockCondition
            .requiredFirstPlaceCount
        )
      ) {
        issues.push({
          type:
            "invalidRequiredFirstPlaceCount",
          enemyId: enemy.id,
          value:
            enemy.unlockCondition
              .requiredFirstPlaceCount
        });
      }
    }

    for (
      const tendency of
        ENEMY_AI_TENDENCY_KEYS
    ) {
      const value =
        enemy.aiTendencies[tendency];

      if (!isValidAiTendency(value)) {
        issues.push({
          type: "invalidAiTendency",
          enemyId: enemy.id,
          tendency,
          value
        });
      }
    }

    abilityCount += enemy.abilities.length;

    for (const ability of enemy.abilities) {
      if (seenAbilityIds.has(ability.id)) {
        if (
          !reportedDuplicateAbilityIds.has(
            ability.id
          )
        ) {
          issues.push({
            type: "duplicateAbilityId",
            abilityId: ability.id
          });
          reportedDuplicateAbilityIds.add(
            ability.id
          );
        }
      } else {
        seenAbilityIds.add(ability.id);
      }

      if (
        ability.activationHooks.length === 0
      ) {
        issues.push({
          type:
            "missingAbilityActivationHook",
          enemyId: enemy.id,
          abilityId: ability.id
        });
      }
    }
  }

  if (
    abilityCount !==
    EXPECTED_ENEMY_ABILITY_COUNT
  ) {
    issues.push({
      type: "incorrectAbilityCount",
      expected:
        EXPECTED_ENEMY_ABILITY_COUNT,
      actual: abilityCount
    });
  }

  for (const enemyId of ENEMY_IDS) {
    if (!seenEnemyIds.has(enemyId)) {
      issues.push({
        type: "missingEnemyId",
        enemyId
      });
    }
  }

  for (
    const abilityId of
      ENEMY_ABILITY_IDS
  ) {
    if (!seenAbilityIds.has(abilityId)) {
      issues.push({
        type: "missingAbilityId",
        abilityId
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
