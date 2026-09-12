import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillRoundDrawProgress,
  type PlayerSkillRoundDrawResult
} from "./playerSkillRoundDrawProgress";

export interface PlayerSkillMatchDrawProgress {
  readonly growth: PlayerSkillGrowthState;
  readonly recordedRoundNumbers: readonly number[];
}

export function createPlayerSkillMatchDrawProgress(
  growth: PlayerSkillGrowthState
): PlayerSkillMatchDrawProgress {
  return {
    growth,
    recordedRoundNumbers: []
  };
}

export function recordPlayerSkillMatchDrawProgress(
  state: PlayerSkillMatchDrawProgress,
  roundNumber: number,
  round: PlayerSkillRoundDrawResult
): PlayerSkillMatchDrawProgress {
  // 東1局などの表示番号ではなく、連荘を含む対局内の通し番号。
  if (
    !Number.isSafeInteger(roundNumber) ||
    roundNumber < 1
  ) {
    throw new RangeError(
      "局の通し番号は1以上の安全な整数で指定してください。"
    );
  }

  if (
    state.recordedRoundNumbers.includes(roundNumber) ||
    (
      round.phase !== "roundEnd" &&
      round.phase !== "matchEnd"
    )
  ) {
    return state;
  }

  if (
    !round.winResult &&
    !round.doubleRonResult &&
    !round.nagashiManganResult &&
    !round.abortiveDrawResult &&
    !round.drawResult
  ) {
    return state;
  }

  return {
    growth: recordPlayerSkillRoundDrawProgress(
      state.growth,
      round
    ),
    recordedRoundNumbers: [
      ...state.recordedRoundNumbers,
      roundNumber
    ]
  };
}
