import type { WaitType } from "../mahjong/hand";
import type {
  WinningHandEvaluationResult
} from "../mahjong/winning";

export function hasAkuukanLegalWinningWait(
  evaluation:
    | WinningHandEvaluationResult
    | null
    | undefined,
  waitTypes: readonly WaitType[]
): boolean {
  if (!evaluation?.valid) {
    return false;
  }

  // 最高得点の構成だけでなく、合法な全構成を調べる。
  return evaluation.candidates.some(candidate =>
    waitTypes.includes(candidate.waitType)
  );
}
