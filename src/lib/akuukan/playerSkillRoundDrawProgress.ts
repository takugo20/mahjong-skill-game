import type { RoundState } from "../mahjong/types";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillDrawProgress
} from "./playerSkillDrawProgress";

export type PlayerSkillRoundDrawResult = Pick<
  RoundState,
  | "phase"
  | "winResult"
  | "doubleRonResult"
  | "drawResult"
  | "nagashiManganResult"
  | "abortiveDrawResult"
>;

export function recordPlayerSkillRoundDrawProgress(
  state: PlayerSkillGrowthState,
  round: PlayerSkillRoundDrawResult
): PlayerSkillGrowthState {
  if (
    round.phase !== "roundEnd" &&
    round.phase !== "matchEnd"
  ) {
    return state;
  }

  if (
    round.winResult ||
    round.doubleRonResult ||
    round.nagashiManganResult
  ) {
    return state;
  }

  // 確定した局結果を1回だけ渡す。
  // 画面の再表示時には呼ばない。
  if (round.abortiveDrawResult) {
    return recordPlayerSkillDrawProgress(
      state,
      round.abortiveDrawResult.reason === "enemyAbilityE27"
        ? "specialAbortiveDraw"
        : "abortiveDraw"
    );
  }

  if (round.drawResult) {
    return recordPlayerSkillDrawProgress(
      state,
      "exhaustiveDraw"
    );
  }

  return state;
}
