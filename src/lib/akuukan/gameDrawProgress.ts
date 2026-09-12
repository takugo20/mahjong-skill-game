import type { GameState } from "../mahjong/types";
import {
  recordPlayerSkillMatchDrawProgress
} from "./playerSkillMatchDrawProgress";

export function recordAkuukanGameDrawProgress(
  state: GameState
): GameState {
  if (!state.akuukan || !state.playerSkillDrawProgress) {
    return state;
  }

  const progress = recordPlayerSkillMatchDrawProgress(
    state.playerSkillDrawProgress,
    state.roundSequence ?? 1,
    state.round
  );

  return progress === state.playerSkillDrawProgress
    ? state
    : {
        ...state,
        playerSkillDrawProgress: progress
      };
}

export function advanceAkuukanDrawProgressRound(
  state: GameState
): GameState {
  const recorded = recordAkuukanGameDrawProgress(state);

  if (!recorded.akuukan || !recorded.playerSkillDrawProgress) {
    return recorded;
  }

  const roundSequence = (recorded.roundSequence ?? 1) + 1;

  if (!Number.isSafeInteger(roundSequence)) {
    throw new RangeError(
      "局の通し番号が安全な整数の範囲を超えます。"
    );
  }

  return {
    ...recorded,
    roundSequence
  };
}
