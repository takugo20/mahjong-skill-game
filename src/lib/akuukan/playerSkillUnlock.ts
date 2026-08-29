import {
  PLAYER_SKILL_CATALOG
} from "./playerSkillCatalog";
import type {
  PlayerSkillGrowthState,
  PlayerSkillProgressById,
  PlayerSkillUnlockConditionId
} from "./playerSkillProgress";
import type {
  PlayerSkillId
} from "./types";

export type PlayerSkillUnlockProgressFailureReason =
  "invalidProgressAmount";

export interface PlayerSkillUnlockProgressResult {
  readonly state: PlayerSkillGrowthState;
  readonly succeeded: boolean;
  readonly failureReason:
    PlayerSkillUnlockProgressFailureReason | null;
  readonly progressAdded: number;
  readonly currentProgress: number;
}

export interface PlayerSkillUnlockResult {
  readonly state: PlayerSkillGrowthState;
  readonly unlockedSkillIds:
    readonly PlayerSkillId[];
}

export function tryAddPlayerSkillUnlockProgress(
  state: PlayerSkillGrowthState,
  conditionId: PlayerSkillUnlockConditionId,
  amount: number
): PlayerSkillUnlockProgressResult {
  const currentProgress =
    state.unlockProgress[conditionId];
  const nextProgress =
    currentProgress + amount;

  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(nextProgress)
  ) {
    return {
      state,
      succeeded: false,
      failureReason:
        "invalidProgressAmount",
      progressAdded: 0,
      currentProgress
    };
  }

  if (amount === 0) {
    return {
      state,
      succeeded: true,
      failureReason: null,
      progressAdded: 0,
      currentProgress
    };
  }

  return {
    state: {
      ...state,
      unlockProgress: {
        ...state.unlockProgress,
        [conditionId]: nextProgress
      }
    },
    succeeded: true,
    failureReason: null,
    progressAdded: amount,
    currentProgress: nextProgress
  };
}

export function unlockEligiblePlayerSkills(
  state: PlayerSkillGrowthState
): PlayerSkillUnlockResult {
  const unlockedSkillIds =
    PLAYER_SKILL_CATALOG.flatMap(
      (skill) => {
        if (
          state.skills[skill.id]
            .isUnlocked ||
          skill.unlockCondition === null
        ) {
          return [];
        }

        const currentProgress =
          state.unlockProgress[
            skill.unlockCondition
              .conditionId
          ];

        return currentProgress >=
          skill.unlockCondition.targetValue
          ? [skill.id]
          : [];
      }
    );

  if (unlockedSkillIds.length === 0) {
    return {
      state,
      unlockedSkillIds
    };
  }

  const unlockedEntries =
    unlockedSkillIds.map(
      (skillId) =>
        [
          skillId,
          {
            isUnlocked: true,
            level: 1,
            currentExp: 0
          }
        ] as const
    );

  return {
    state: {
      ...state,
      skills: {
        ...state.skills,
        ...Object.fromEntries(
          unlockedEntries
        )
      } as PlayerSkillProgressById
    },
    unlockedSkillIds
  };
}
