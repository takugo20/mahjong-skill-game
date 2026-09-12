import type { MatchRank } from "../mahjong/matchSettlement";
import { PLAYER_SKILL_CATALOG } from "./playerSkillCatalog";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  tryAddPlayerSkillUnlockProgress
} from "./playerSkillUnlock";
import type { EnemyId } from "./types";

export interface PlayerSkillRankProgressInput {
  readonly matchIsFinalized: boolean;
  readonly enemyId: EnemyId;
  readonly finalRank: MatchRank;
}

export function recordPlayerSkillRankProgress(
  state: PlayerSkillGrowthState,
  input: PlayerSkillRankProgressInput
): PlayerSkillGrowthState {
  if (!input.matchIsFinalized) {
    return state;
  }

  const targetCondition = input.finalRank === 1
    ? `${input.enemyId}-first-place-count`
    : input.finalRank === 4
      ? "fourth-place-count"
      : null;

  if (!targetCondition) {
    return state;
  }

  // 複数スキルが同じ条件を参照していても、
  // 1対局につき1回だけ加算する。
  const conditions = new Set(
    PLAYER_SKILL_CATALOG.flatMap(skill => {
      const condition = skill.unlockCondition;

      return condition?.conditionId === targetCondition
        ? [condition.conditionId]
        : [];
    })
  );

  let next = state;

  for (const condition of conditions) {
    const result = tryAddPlayerSkillUnlockProgress(
      next,
      condition,
      1
    );

    if (!result.succeeded) {
      throw new RangeError(
        "最終順位による解放進捗を加算できません。"
      );
    }

    next = result.state;
  }

  return next;
}
