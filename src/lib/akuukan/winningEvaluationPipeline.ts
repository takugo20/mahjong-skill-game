import type {
  YakumanContext
} from "../mahjong/yakuman";
import {
  createAkuukanWinningYakuCandidatesFromContext
} from "./winningEvaluationExtraction";
import {
  resolveAkuukanWinningYaku
} from "./winningEvaluationResolution";
import type {
  AkuukanWinningYakuResolution
} from "./winningEvaluationResolution";

export function resolveAkuukanStandardWinningYaku(
  context: YakumanContext
): AkuukanWinningYakuResolution {
  const candidates =
    createAkuukanWinningYakuCandidatesFromContext(
      context
    );

  return resolveAkuukanWinningYaku(
    candidates
  );
}
