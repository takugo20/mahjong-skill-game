import type {
  AkuukanSaveData
} from "./saveData";
import {
  AKUUKAN_MAX_EQUIPPED_SKILLS
} from "./setupValidation";
import type {
  PlayerSkillId
} from "./types";

export type AkuukanSaveDataEquipmentFailureReason =
  | "skillLocked"
  | "skillAlreadyEquipped"
  | "equipmentFull"
  | "skillNotEquipped";

export type AkuukanSaveDataEquipmentResult =
  | {
      readonly saveData: AkuukanSaveData;
      readonly succeeded: true;
      readonly failureReason: null;
    }
  | {
      readonly saveData: AkuukanSaveData;
      readonly succeeded: false;
      readonly failureReason:
        AkuukanSaveDataEquipmentFailureReason;
    };

function createEquipmentFailureResult(
  saveData: AkuukanSaveData,
  failureReason:
    AkuukanSaveDataEquipmentFailureReason
): AkuukanSaveDataEquipmentResult {
  return {
    saveData,
    succeeded: false,
    failureReason
  };
}

export function tryEquipPlayerSkillInSaveData(
  saveData: AkuukanSaveData,
  skillId: PlayerSkillId
): AkuukanSaveDataEquipmentResult {
  const progress =
    saveData.playerSkillGrowth.skills[
      skillId
    ];

  if (!progress.isUnlocked) {
    return createEquipmentFailureResult(
      saveData,
      "skillLocked"
    );
  }

  if (
    saveData.equippedSkills.some(
      (skill) => skill.id === skillId
    )
  ) {
    return createEquipmentFailureResult(
      saveData,
      "skillAlreadyEquipped"
    );
  }

  if (
    saveData.equippedSkills.length >=
    AKUUKAN_MAX_EQUIPPED_SKILLS
  ) {
    return createEquipmentFailureResult(
      saveData,
      "equipmentFull"
    );
  }

  return {
    saveData: {
      ...saveData,
      equippedSkills: [
        ...saveData.equippedSkills,
        {
          id: skillId,
          level: progress.level
        }
      ]
    },
    succeeded: true,
    failureReason: null
  };
}

export function tryUnequipPlayerSkillFromSaveData(
  saveData: AkuukanSaveData,
  skillId: PlayerSkillId
): AkuukanSaveDataEquipmentResult {
  const equippedSkills =
    saveData.equippedSkills.filter(
      (skill) => skill.id !== skillId
    );

  if (
    equippedSkills.length ===
    saveData.equippedSkills.length
  ) {
    return createEquipmentFailureResult(
      saveData,
      "skillNotEquipped"
    );
  }

  return {
    saveData: {
      ...saveData,
      equippedSkills
    },
    succeeded: true,
    failureReason: null
  };
}

export function synchronizeEquippedPlayerSkillLevels(
  saveData: AkuukanSaveData
): AkuukanSaveData {
  let changed = false;
  const equippedSkills =
    saveData.equippedSkills.map(
      (equippedSkill) => {
        const progress =
          saveData.playerSkillGrowth.skills[
            equippedSkill.id
          ];

        if (!progress.isUnlocked) {
          throw new Error(
            `未解放スキルの装備レベルは同期できません: ${equippedSkill.id}`
          );
        }

        if (
          equippedSkill.level ===
          progress.level
        ) {
          return equippedSkill;
        }

        changed = true;

        return {
          ...equippedSkill,
          level: progress.level
        };
      }
    );

  if (!changed) {
    return saveData;
  }

  return {
    ...saveData,
    equippedSkills
  };
}
