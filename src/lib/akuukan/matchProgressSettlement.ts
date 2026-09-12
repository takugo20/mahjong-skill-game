import type { MatchRank } from "../mahjong/matchSettlement";
import { getEnemyDefinition } from "./enemyCatalog";
import type { EnemyProgressState } from "./enemyProgress";
import {
  recordEnemyMatchResult,
  unlockNextEnemyAfterMatch
} from "./enemyUnlock";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillRankProgress
} from "./playerSkillRankProgress";
import {
  grantPlayerSkillMatchExperience,
  type PlayerSkillMatchExperienceAward
} from "./playerSkillMatchExperience";
import {
  unlockEligiblePlayerSkills
} from "./playerSkillUnlock";
import type {
  AkuukanMatchSetup,
  EnemyId,
  PlayerSkillId
} from "./types";

export interface AkuukanMatchProgressSettlementInput {
  readonly matchIsFinalized: boolean;
  readonly finalRank: MatchRank;

  // 対局開始時の装備情報を渡す。
  readonly setup: AkuukanMatchSetup;

  // この対局の和了・流局進捗を反映済みの状態。
  readonly growth: PlayerSkillGrowthState;
  readonly enemyProgress: EnemyProgressState;
}

export interface AkuukanMatchProgressSettlement {
  readonly growth: PlayerSkillGrowthState;
  readonly enemyProgress: EnemyProgressState;
  readonly experiencePerSkill: number;
  readonly awards: readonly PlayerSkillMatchExperienceAward[];
  readonly unlockedSkillIds: readonly PlayerSkillId[];
  readonly unlockedEnemyId: EnemyId | null;
}

export function settleAkuukanMatchProgress(
  input: AkuukanMatchProgressSettlementInput
): AkuukanMatchProgressSettlement | null {
  if (!input.matchIsFinalized) {
    return null;
  }

  const enemy = getEnemyDefinition(input.setup.enemyId);

  const enemyRecord = recordEnemyMatchResult(
    input.enemyProgress,
    enemy.id,
    input.finalRank
  );

  const rankedGrowth = recordPlayerSkillRankProgress(
    input.growth,
    {
      matchIsFinalized: true,
      enemyId: enemy.id,
      finalRank: input.finalRank
    }
  );

  const experience = grantPlayerSkillMatchExperience(
    rankedGrowth,
    input.setup,
    enemy.baseExperience,
    input.finalRank
  );

  if (
    experience.awards.some(award =>
      !award.succeeded &&
      award.failureReason !== "maximumLevel"
    )
  ) {
    throw new Error(
      "装備スキルへの経験値付与に失敗しました。"
    );
  }

  // 新規解放スキルに今回の経験値が入らないよう、
  // 経験値付与後に解放する。
  const skills = unlockEligiblePlayerSkills(experience.state);

  const enemies = unlockNextEnemyAfterMatch(
    enemyRecord.state,
    enemy.id,
    input.finalRank
  );

  return {
    growth: skills.state,
    enemyProgress: enemies.state,
    experiencePerSkill: experience.experiencePerSkill,
    awards: experience.awards,
    unlockedSkillIds: skills.unlockedSkillIds,
    unlockedEnemyId: enemies.unlockedEnemyId
  };
}
