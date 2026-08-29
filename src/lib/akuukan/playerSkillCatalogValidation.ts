import {
  PLAYER_SKILL_LEVELS
} from "./playerSkillCatalogTypes";
import type {
  PlayerSkillDefinition
} from "./playerSkillCatalogTypes";
import {
  PLAYER_SKILL_IDS
} from "./types";
import type {
  PlayerSkillId,
  SkillLevel
} from "./types";

export const EXPECTED_PLAYER_SKILL_COUNT =
  PLAYER_SKILL_IDS.length;

export type PlayerSkillCatalogIssue =
  | {
      type: "incorrectSkillCount";
      expected: number;
      actual: number;
    }
  | {
      type: "missingSkillId";
      skillId: PlayerSkillId;
    }
  | {
      type: "duplicateSkillId";
      skillId: PlayerSkillId;
    }
  | {
      type: "invalidCatalogNumber";
      skillId: PlayerSkillId;
      catalogNumber: number;
    }
  | {
      type: "duplicateCatalogNumber";
      catalogNumber: number;
    }
  | {
      type: "invalidRequiredExp";
      skillId: PlayerSkillId;
      level: SkillLevel;
      value: number;
    }
  | {
      type: "invalidMpCost";
      skillId: PlayerSkillId;
      level: SkillLevel;
      value: number;
    };

export interface PlayerSkillCatalogValidationResult {
  isValid: boolean;
  issues: PlayerSkillCatalogIssue[];
}

function isNonNegativeInteger(
  value: number
): boolean {
  return (
    Number.isInteger(value) && value >= 0
  );
}

export function validatePlayerSkillCatalog(
  catalog: readonly PlayerSkillDefinition[]
): PlayerSkillCatalogValidationResult {
  const issues: PlayerSkillCatalogIssue[] = [];

  if (
    catalog.length !==
    EXPECTED_PLAYER_SKILL_COUNT
  ) {
    issues.push({
      type: "incorrectSkillCount",
      expected:
        EXPECTED_PLAYER_SKILL_COUNT,
      actual: catalog.length
    });
  }

  const seenSkillIds =
    new Set<PlayerSkillId>();
  const reportedDuplicateSkillIds =
    new Set<PlayerSkillId>();
  const seenCatalogNumbers =
    new Set<number>();
  const reportedDuplicateCatalogNumbers =
    new Set<number>();

  for (const skill of catalog) {
    if (seenSkillIds.has(skill.id)) {
      if (
        !reportedDuplicateSkillIds.has(
          skill.id
        )
      ) {
        issues.push({
          type: "duplicateSkillId",
          skillId: skill.id
        });
        reportedDuplicateSkillIds.add(
          skill.id
        );
      }
    } else {
      seenSkillIds.add(skill.id);
    }

    const catalogNumberIsValid =
      Number.isInteger(
        skill.catalogNumber
      ) &&
      skill.catalogNumber >= 1 &&
      skill.catalogNumber <=
        EXPECTED_PLAYER_SKILL_COUNT;

    if (!catalogNumberIsValid) {
      issues.push({
        type: "invalidCatalogNumber",
        skillId: skill.id,
        catalogNumber: skill.catalogNumber
      });
    } else if (
      seenCatalogNumbers.has(
        skill.catalogNumber
      )
    ) {
      if (
        !reportedDuplicateCatalogNumbers.has(
          skill.catalogNumber
        )
      ) {
        issues.push({
          type: "duplicateCatalogNumber",
          catalogNumber:
            skill.catalogNumber
        });
        reportedDuplicateCatalogNumbers.add(
          skill.catalogNumber
        );
      }
    } else {
      seenCatalogNumbers.add(
        skill.catalogNumber
      );
    }

    for (const level of PLAYER_SKILL_LEVELS) {
      const levelDefinition =
        skill.levels[level];

      if (
        !isNonNegativeInteger(
          levelDefinition.requiredExp
        )
      ) {
        issues.push({
          type: "invalidRequiredExp",
          skillId: skill.id,
          level,
          value:
            levelDefinition.requiredExp
        });
      }

      if (skill.kind === "active") {
        const mpCost =
          skill.levels[level].mpCost;

        if (!isNonNegativeInteger(mpCost)) {
          issues.push({
            type: "invalidMpCost",
            skillId: skill.id,
            level,
            value: mpCost
          });
        }
      }
    }
  }

  for (const skillId of PLAYER_SKILL_IDS) {
    if (!seenSkillIds.has(skillId)) {
      issues.push({
        type: "missingSkillId",
        skillId
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}
