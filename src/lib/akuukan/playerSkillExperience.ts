import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition,
  getPlayerSkillMaxLevel
} from "./playerSkillCatalogTypes";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import type {
  PlayerSkillId,
  SkillLevel
} from "./types";

export type PlayerSkillExperienceFailureReason =
  | "invalidExperience"
  | "skillLocked"
  | "maximumLevel";

export interface PlayerSkillExperienceResult {
  readonly state: PlayerSkillGrowthState;
  readonly succeeded: boolean;
  readonly failureReason:
    PlayerSkillExperienceFailureReason | null;
  readonly levelsGained: number;
  readonly experienceApplied: number;
  readonly experienceDiscarded: number;
}

function createFailureResult(
  state: PlayerSkillGrowthState,
  failureReason:
    PlayerSkillExperienceFailureReason
): PlayerSkillExperienceResult {
  return {
    state,
    succeeded: false,
    failureReason,
    levelsGained: 0,
    experienceApplied: 0,
    experienceDiscarded: 0
  };
}

export function tryGrantPlayerSkillExperience(
  state: PlayerSkillGrowthState,
  skillId: PlayerSkillId,
  experience: number
): PlayerSkillExperienceResult {
  if (
    !Number.isSafeInteger(experience) ||
    experience < 0
  ) {
    return createFailureResult(
      state,
      "invalidExperience"
    );
  }

  const progress = state.skills[skillId];

  if (!progress.isUnlocked) {
    return createFailureResult(
      state,
      "skillLocked"
    );
  }

  const skill =
    getPlayerSkillDefinition(skillId);
  const maximumLevel =
    getPlayerSkillMaxLevel(skill);

  if (progress.level >= maximumLevel) {
    return createFailureResult(
      state,
      "maximumLevel"
    );
  }

  if (experience === 0) {
    return {
      state,
      succeeded: true,
      failureReason: null,
      levelsGained: 0,
      experienceApplied: 0,
      experienceDiscarded: 0
    };
  }

  let level = progress.level;
  let currentExp =
    progress.currentExp + experience;
  let levelsGained = 0;

  while (level < maximumLevel) {
    const requiredExp =
      getPlayerSkillLevelDefinition(
        skill,
        level
      ).requiredExp;

    if (requiredExp <= 0) {
      throw new Error(
        `スキル${skillId}のレベル${level}に必要なEXPが不正です。`
      );
    }

    if (currentExp < requiredExp) {
      break;
    }

    currentExp -= requiredExp;
    level = (level + 1) as SkillLevel;
    levelsGained += 1;
  }

  const experienceDiscarded =
    level === maximumLevel
      ? currentExp
      : 0;

  if (level === maximumLevel) {
    currentExp = 0;
  }

  return {
    state: {
      ...state,
      skills: {
        ...state.skills,
        [skillId]: {
          isUnlocked: true,
          level,
          currentExp
        }
      }
    },
    succeeded: true,
    failureReason: null,
    levelsGained,
    experienceApplied:
      experience - experienceDiscarded,
    experienceDiscarded
  };
}
