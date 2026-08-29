import type {
  AkuukanMatchSetup,
  PlayerSkillId
} from "./types";

export const AKUUKAN_MAX_EQUIPPED_SKILLS =
  10;

export type AkuukanMatchSetupFailureReason =
  | "tooManyEquippedSkills"
  | "duplicateSkill";

export type AkuukanMatchSetupValidationResult =
  | {
      isValid: true;
      failureReason: null;
      duplicateSkillId: null;
    }
  | {
      isValid: false;
      failureReason:
        "tooManyEquippedSkills";
      duplicateSkillId: null;
    }
  | {
      isValid: false;
      failureReason: "duplicateSkill";
      duplicateSkillId: PlayerSkillId;
    };

export function validateAkuukanMatchSetup(
  setup: AkuukanMatchSetup
): AkuukanMatchSetupValidationResult {
  if (
    setup.equippedSkills.length >
    AKUUKAN_MAX_EQUIPPED_SKILLS
  ) {
    return {
      isValid: false,
      failureReason:
        "tooManyEquippedSkills",
      duplicateSkillId: null
    };
  }

  const equippedSkillIds =
    new Set<PlayerSkillId>();

  for (const skill of setup.equippedSkills) {
    if (equippedSkillIds.has(skill.id)) {
      return {
        isValid: false,
        failureReason: "duplicateSkill",
        duplicateSkillId: skill.id
      };
    }

    equippedSkillIds.add(skill.id);
  }

  return {
    isValid: true,
    failureReason: null,
    duplicateSkillId: null
  };
}

export function assertValidAkuukanMatchSetup(
  setup: AkuukanMatchSetup
): void {
  const validation =
    validateAkuukanMatchSetup(setup);

  if (validation.isValid) {
    return;
  }

  if (
    validation.failureReason ===
    "tooManyEquippedSkills"
  ) {
    throw new Error(
      `装備スキルは最大${AKUUKAN_MAX_EQUIPPED_SKILLS}個です。`
    );
  }

  throw new Error(
    `同じスキルを重複して装備できません: ${validation.duplicateSkillId}`
  );
}
