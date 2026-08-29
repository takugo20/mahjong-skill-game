import type {
  AkuukanSaveData
} from "./saveData";
import {
  validateAkuukanMatchSetup
} from "./setupValidation";
import type {
  AkuukanMatchSetup,
  EnemyId
} from "./types";

export type AkuukanSaveDataMatchSetupFailureReason =
  | "enemyLocked"
  | "skillLocked"
  | "tooManyEquippedSkills"
  | "duplicateSkill";

export type AkuukanSaveDataMatchSetupResult =
  | {
      readonly setup: AkuukanMatchSetup;
      readonly succeeded: true;
      readonly failureReason: null;
    }
  | {
      readonly setup: null;
      readonly succeeded: false;
      readonly failureReason:
        AkuukanSaveDataMatchSetupFailureReason;
    };

function createMatchSetupFailureResult(
  failureReason:
    AkuukanSaveDataMatchSetupFailureReason
): AkuukanSaveDataMatchSetupResult {
  return {
    setup: null,
    succeeded: false,
    failureReason
  };
}

export function tryCreateAkuukanMatchSetupFromSaveData(
  saveData: AkuukanSaveData,
  enemyId: EnemyId
): AkuukanSaveDataMatchSetupResult {
  if (
    !saveData.enemyProgress.enemies[
      enemyId
    ].isUnlocked
  ) {
    return createMatchSetupFailureResult(
      "enemyLocked"
    );
  }

  const equippedSkills = [];

  for (
    const equippedSkill of
      saveData.equippedSkills
  ) {
    const progress =
      saveData.playerSkillGrowth.skills[
        equippedSkill.id
      ];

    if (!progress.isUnlocked) {
      return createMatchSetupFailureResult(
        "skillLocked"
      );
    }

    equippedSkills.push({
      id: equippedSkill.id,
      level: progress.level
    });
  }

  const setup: AkuukanMatchSetup = {
    enemyId,
    equippedSkills
  };
  const validation =
    validateAkuukanMatchSetup(setup);

  if (!validation.isValid) {
    return createMatchSetupFailureResult(
      validation.failureReason
    );
  }

  return {
    setup,
    succeeded: true,
    failureReason: null
  };
}
