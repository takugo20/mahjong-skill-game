import type {
  WinningHandEvaluationResult
} from "../mahjong/winning";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillWinProgress
} from "./playerSkillWinProgress";

export interface PlayerSkillWinningEvaluationProgressInput {
  readonly evaluation: WinningHandEvaluationResult;
  readonly winnerIsPlayer: boolean;

  // E-27などの無効化判定を通過し、
  // 正式に成立した和了のみtrue。
  readonly winIsValid: boolean;
}

export function recordPlayerSkillWinningEvaluationProgress(
  state: PlayerSkillGrowthState,
  input: PlayerSkillWinningEvaluationProgressInput
): PlayerSkillGrowthState {
  if (
    !input.winnerIsPlayer ||
    !input.winIsValid ||
    !input.evaluation.valid
  ) {
    return state;
  }

  const best = input.evaluation.best;

  return recordPlayerSkillWinProgress(state, {
    winnerIsPlayer: true,
    winIsValid: true,
    isNagashiMangan: false,
    yakuIds: [
      ...best.evaluatedNormalYaku.map(yaku => yaku.id),
      ...best.yakuman.map(yaku => yaku.id)
    ],
    waitType: best.waitType,
    redDoraCount: best.dora.redDora,
    uraDoraHan: best.dora.uraDora
  });
}
