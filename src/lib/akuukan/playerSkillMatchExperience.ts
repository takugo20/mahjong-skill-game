import type {
  MatchRank
} from "../mahjong/matchSettlement";
import {
  tryGrantPlayerSkillExperience
} from "./playerSkillExperience";
import type {
  PlayerSkillExperienceFailureReason
} from "./playerSkillExperience";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  assertValidAkuukanMatchSetup
} from "./setupValidation";
import type {
  AkuukanMatchSetup,
  PlayerSkillId
} from "./types";

export const PLAYER_SKILL_EXPERIENCE_MULTIPLIER_BY_RANK = {
  1: 5,
  2: 1,
  3: 0.5,
  4: 0.1
} as const satisfies Readonly<
  Record<MatchRank, number>
>;

export interface PlayerSkillMatchExperienceAward {
  readonly skillId: PlayerSkillId;
  readonly experience: number;
  readonly succeeded: boolean;
  readonly failureReason:
    PlayerSkillExperienceFailureReason | null;
  readonly levelsGained: number;
  readonly experienceApplied: number;
  readonly experienceDiscarded: number;
}

export interface PlayerSkillMatchExperienceResult {
  readonly state: PlayerSkillGrowthState;
  readonly experiencePerSkill: number;
  readonly awards:
    readonly PlayerSkillMatchExperienceAward[];
}

export function calculatePlayerSkillMatchExperience(
  enemyBaseExperience: number,
  finalRank: MatchRank
): number {
  if (
    !Number.isSafeInteger(
      enemyBaseExperience
    ) ||
    enemyBaseExperience < 0
  ) {
    throw new RangeError(
      "敵の基本EXPは0以上の安全な整数で指定してください。"
    );
  }

  const experience =
    enemyBaseExperience *
    PLAYER_SKILL_EXPERIENCE_MULTIPLIER_BY_RANK[
      finalRank
    ];

  if (!Number.isSafeInteger(experience)) {
    throw new RangeError(
      "順位倍率適用後のスキルEXPが安全な整数になりません。"
    );
  }

  return experience;
}

export function grantPlayerSkillMatchExperience(
  state: PlayerSkillGrowthState,
  setup: AkuukanMatchSetup,
  enemyBaseExperience: number,
  finalRank: MatchRank
): PlayerSkillMatchExperienceResult {
  assertValidAkuukanMatchSetup(setup);

  const experiencePerSkill =
    calculatePlayerSkillMatchExperience(
      enemyBaseExperience,
      finalRank
    );
  let nextState = state;
  const awards:
    PlayerSkillMatchExperienceAward[] = [];

  for (
    const equippedSkill of
      setup.equippedSkills
  ) {
    const result =
      tryGrantPlayerSkillExperience(
        nextState,
        equippedSkill.id,
        experiencePerSkill
      );

    nextState = result.state;
    awards.push({
      skillId: equippedSkill.id,
      experience: experiencePerSkill,
      succeeded: result.succeeded,
      failureReason: result.failureReason,
      levelsGained: result.levelsGained,
      experienceApplied:
        result.experienceApplied,
      experienceDiscarded:
        result.experienceDiscarded
    });
  }

  return {
    state: nextState,
    experiencePerSkill,
    awards
  };
}
