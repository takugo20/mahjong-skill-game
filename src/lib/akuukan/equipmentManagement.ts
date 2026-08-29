import {
  validateAkuukanMatchSetup
} from "./setupValidation";
import type {
  AkuukanMatchSetup,
  PlayerSkillId,
  SkillLevel
} from "./types";

export type AkuukanEquipmentChangeFailureReason =
  | "equipmentFull"
  | "skillAlreadyEquipped"
  | "skillNotEquipped";

export type AkuukanEquipmentChangeResult =
  | {
      setup: AkuukanMatchSetup;
      succeeded: true;
      failureReason: null;
    }
  | {
      setup: AkuukanMatchSetup;
      succeeded: false;
      failureReason:
        AkuukanEquipmentChangeFailureReason;
    };

export function tryEquipAkuukanPlayerSkill(
  setup: AkuukanMatchSetup,
  skillId: PlayerSkillId,
  level: SkillLevel
): AkuukanEquipmentChangeResult {
  if (
    setup.equippedSkills.some(
      (skill) => skill.id === skillId
    )
  ) {
    return {
      setup,
      succeeded: false,
      failureReason: "skillAlreadyEquipped"
    };
  }

  const nextSetup: AkuukanMatchSetup = {
    ...setup,
    equippedSkills: [
      ...setup.equippedSkills,
      {
        id: skillId,
        level
      }
    ]
  };

  const validation =
    validateAkuukanMatchSetup(nextSetup);

  if (!validation.isValid) {
    return {
      setup,
      succeeded: false,
      failureReason:
        validation.failureReason ===
        "tooManyEquippedSkills"
          ? "equipmentFull"
          : "skillAlreadyEquipped"
    };
  }

  return {
    setup: nextSetup,
    succeeded: true,
    failureReason: null
  };
}

export function tryUnequipAkuukanPlayerSkill(
  setup: AkuukanMatchSetup,
  skillId: PlayerSkillId
): AkuukanEquipmentChangeResult {
  const equippedSkills =
    setup.equippedSkills.filter(
      (skill) => skill.id !== skillId
    );

  if (
    equippedSkills.length ===
    setup.equippedSkills.length
  ) {
    return {
      setup,
      succeeded: false,
      failureReason: "skillNotEquipped"
    };
  }

  return {
    setup: {
      ...setup,
      equippedSkills
    },
    succeeded: true,
    failureReason: null
  };
}

export function tryUpdateAkuukanPlayerSkillLevel(
  setup: AkuukanMatchSetup,
  skillId: PlayerSkillId,
  level: SkillLevel
): AkuukanEquipmentChangeResult {
  const skill = setup.equippedSkills.find(
    (equippedSkill) =>
      equippedSkill.id === skillId
  );

  if (!skill) {
    return {
      setup,
      succeeded: false,
      failureReason: "skillNotEquipped"
    };
  }

  if (skill.level === level) {
    return {
      setup,
      succeeded: true,
      failureReason: null
    };
  }

  return {
    setup: {
      ...setup,
      equippedSkills:
        setup.equippedSkills.map(
          (equippedSkill) =>
            equippedSkill.id === skillId
              ? {
                  ...equippedSkill,
                  level
                }
              : equippedSkill
        )
    },
    succeeded: true,
    failureReason: null
  };
}
