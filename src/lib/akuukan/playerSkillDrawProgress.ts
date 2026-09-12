import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  tryAddPlayerSkillUnlockProgress
} from "./playerSkillUnlock";

export type PlayerSkillDrawProgressResultKind =
  | "exhaustiveDraw"
  | "abortiveDraw"
  | "specialAbortiveDraw"
  | "nagashiMangan"
  | "win";

export function recordPlayerSkillDrawProgress(
  state: PlayerSkillGrowthState,
  resultKind: PlayerSkillDrawProgressResultKind
): PlayerSkillGrowthState {
  if (
    resultKind !== "exhaustiveDraw" &&
    resultKind !== "abortiveDraw" &&
    resultKind !== "specialAbortiveDraw"
  ) {
    return state;
  }

  // 正式な局終了時に1回呼ぶ。
  // スキルの解放は対局終了時に行う。
  const result = tryAddPlayerSkillUnlockProgress(
    state,
    "round-draw-count",
    1
  );

  if (!result.succeeded) {
    throw new RangeError(
      "流局回数の解放進捗を加算できません。"
    );
  }

  return result.state;
}
