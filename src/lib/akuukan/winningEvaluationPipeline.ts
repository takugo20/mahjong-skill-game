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
  createAkuukanPlayerSkillWinningYakuAdjustments
} from "./winningEvaluationPlayerSkillAdjustments";
import {
  resolveAkuukanWinningYaku
} from "./winningEvaluationResolution";
import type {
  AkuukanWinningYakuResolution
} from "./winningEvaluationResolution";
import type {
  AkuukanGameState
} from "./types";

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

export interface ResolveAkuukanPlayerWinningYakuInput {
  readonly context: YakumanContext;
  readonly akuukan: AkuukanGameState;
}

export function resolveAkuukanPlayerWinningYaku(
  input:
    ResolveAkuukanPlayerWinningYakuInput
): AkuukanWinningYakuResolution {
  return resolveAkuukanWinningYakuWithAdjustments({
    context: input.context,
    adjustments:
      createAkuukanPlayerSkillWinningYakuAdjustments(
        input.akuukan
      )
  });
}

export function resolveAkuukanStandardWinningYaku(
  context: YakumanContext
): AkuukanWinningYakuResolution {
  return resolveAkuukanWinningYakuWithAdjustments({
    context
  });
}
