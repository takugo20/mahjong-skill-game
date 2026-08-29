import {
  PLAYER_SKILL_CATALOG
} from "./playerSkillCatalog";
import type {
  PlayerSkillId,
  SkillLevel
} from "./types";

export type PlayerSkillUnlockConditionId =
  NonNullable<
    (typeof PLAYER_SKILL_CATALOG)[number]["unlockCondition"]
  >["conditionId"];

export interface LockedPlayerSkillProgress {
  readonly isUnlocked: false;
  readonly level: null;
  readonly currentExp: 0;
}

export interface UnlockedPlayerSkillProgress {
  readonly isUnlocked: true;
  readonly level: SkillLevel;
  readonly currentExp: number;
}

export type PlayerSkillProgress =
  | LockedPlayerSkillProgress
  | UnlockedPlayerSkillProgress;

export type PlayerSkillProgressById = {
  readonly [skillId in PlayerSkillId]:
    PlayerSkillProgress;
};

export type PlayerSkillUnlockProgress = {
  readonly [conditionId in
    PlayerSkillUnlockConditionId]: number;
};

export interface PlayerSkillGrowthState {
  readonly skills: PlayerSkillProgressById;
  readonly unlockProgress:
    PlayerSkillUnlockProgress;
}

export function createInitialPlayerSkillGrowthState():
  PlayerSkillGrowthState {
  const skillEntries =
    PLAYER_SKILL_CATALOG.map((skill) => {
      const progress: PlayerSkillProgress =
        skill.unlockCondition === null
          ? {
              isUnlocked: true,
              level: 1,
              currentExp: 0
            }
          : {
              isUnlocked: false,
              level: null,
              currentExp: 0
            };

      return [skill.id, progress] as const;
    });

  const unlockProgressEntries =
    PLAYER_SKILL_CATALOG.flatMap(
      (skill) =>
        skill.unlockCondition === null
          ? []
          : [
              [
                skill.unlockCondition
                  .conditionId,
                0
              ] as const
            ]
    );

  return {
    skills: Object.fromEntries(
      skillEntries
    ) as PlayerSkillProgressById,
    unlockProgress: Object.fromEntries(
      unlockProgressEntries
    ) as PlayerSkillUnlockProgress
  };
}
