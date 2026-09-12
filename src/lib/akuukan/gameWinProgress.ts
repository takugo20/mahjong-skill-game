import type { GameState } from "../mahjong/types";
import type {
  ValidRoundWinResolution
} from "../mahjong/roundWin";
import {
  recordPlayerSkillWinningEvaluationProgress
} from "./playerSkillWinningEvaluationProgress";

export function recordAkuukanGameWinProgress(
  state: GameState,
  resolutions: readonly ValidRoundWinResolution[]
): GameState {
  const progress = state.playerSkillDrawProgress;

  if (
    !state.akuukan ||
    !progress ||
    (
      state.round.phase !== "roundEnd" &&
      state.round.phase !== "matchEnd"
    ) ||
    state.round.abortiveDrawResult ||
    state.round.nagashiManganResult
  ) {
    return state;
  }

  const roundNumber = state.roundSequence ?? 1;

  if (progress.recordedRoundNumbers.includes(roundNumber)) {
    return state;
  }

  const playerWin = state.round.winResult?.winnerSeat === 0
    ? state.round.winResult
    : state.round.doubleRonResult?.winResults.find(
        win => win.winnerSeat === 0
      );

  if (!playerWin) {
    return state;
  }

  const resolution = resolutions.find(value =>
    value.winnerSeat === 0 &&
    value.winMethod === playerWin.winMethod &&
    value.winningTile.id === playerWin.winningTile.id
  );

  if (!resolution) {
    throw new Error(
      "確定したプレイヤー和了に対応する判定結果がありません。"
    );
  }

  if (!Number.isSafeInteger(roundNumber) || roundNumber < 1) {
    throw new RangeError("局の通し番号が不正です。");
  }

  return {
    ...state,
    playerSkillDrawProgress: {
      growth: recordPlayerSkillWinningEvaluationProgress(
        progress.growth,
        {
          evaluation: resolution.evaluation,
          winnerIsPlayer: true,
          winIsValid: true
        }
      ),
      recordedRoundNumbers: [
        ...progress.recordedRoundNumbers,
        roundNumber
      ]
    }
  };
}
