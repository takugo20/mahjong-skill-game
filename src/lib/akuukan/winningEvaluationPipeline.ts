import type {
  YakumanContext
} from "../mahjong/yakuman";
import {
  applyAkuukanWinningYakuAdjustments
} from "./winningEvaluationAdjustments";
import type {
  AkuukanWinningYakuAdjustments
} from "./winningEvaluationAdjustments";
import {
  createAkuukanWinningYakuCandidatesFromContext
} from "./winningEvaluationExtraction";
import {
  resolveAkuukanWinningYaku
} from "./winningEvaluationResolution";
import type {
  AkuukanWinningYakuResolution
} from "./winningEvaluationResolution";

export interface ResolveAkuukanWinningYakuWithAdjustmentsInput {
  readonly context: YakumanContext;
  readonly adjustments?:
    AkuukanWinningYakuAdjustments;
}

export function resolveAkuukanWinningYakuWithAdjustments(
  input:
    ResolveAkuukanWinningYakuWithAdjustmentsInput
): AkuukanWinningYakuResolution {
  const candidates =
    createAkuukanWinningYakuCandidatesFromContext(
      input.context
    );
  const adjustedCandidates = input.adjustments
    ? applyAkuukanWinningYakuAdjustments(
        candidates,
        input.adjustments
      )
    : candidates;

  return resolveAkuukanWinningYaku(
    adjustedCandidates
  );
}

export function resolveAkuukanStandardWinningYaku(
  context: YakumanContext
): AkuukanWinningYakuResolution {
  return resolveAkuukanWinningYakuWithAdjustments({
    context
  });
}
