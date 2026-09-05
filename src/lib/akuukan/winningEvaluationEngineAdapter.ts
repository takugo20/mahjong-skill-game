import type {
  WinningCandidateBonusHanEvaluator,
  WinningCandidateScoreAdjuster,
  WinningCandidateYakuEvaluation,
  WinningCandidateYakuEvaluator
} from "../mahjong/winning";
import type {
  Discard
} from "../mahjong/types";
import type {
  NormalYakuResult,
  WinMethod
} from "../mahjong/yaku";
import type {
  YakumanResult
} from "../mahjong/yakuman";
import {
  getAkuukanPlayerSkill1_7BonusHan
} from "./bonusHan";
import {
  applyAkuukanE21MinimumMangan
} from "./handValueAdjustments";
import {
  getAkuukanNormalYakuFinalHan,
  getAkuukanYakumanMultiplier
} from "./winningEvaluation";
import type {
  AkuukanNormalYakuCandidate,
  AkuukanYakumanCandidate
} from "./winningEvaluation";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";
import {
  resolveAkuukanOpponentWinningYaku,
  resolveAkuukanPlayerWinningYaku
} from "./winningEvaluationPipeline";
import {
  isActivePlayerSkillEffectEnabled
} from "./winningEvaluationPlayerSkillAdjustments";
import type {
  AkuukanWinningYakuResolution
} from "./winningEvaluationResolution";
import type {
  AkuukanGameState
} from "./types";

export type AkuukanWinningCandidateOwner =
  | "player"
  | "selectedEnemy"
  | "normalOpponent";

export interface CreateAkuukanWinningCandidateYakuEvaluatorInput {
  readonly akuukan: AkuukanGameState;
  readonly owner:
    AkuukanWinningCandidateOwner;
}

export interface CreateAkuukanWinningCandidateScoreAdjusterInput
  extends CreateAkuukanWinningCandidateYakuEvaluatorInput {
  readonly winMethod: WinMethod;
  readonly dealer: boolean;
}

export interface CreateAkuukanWinningCandidateBonusHanEvaluatorInput
  extends CreateAkuukanWinningCandidateYakuEvaluatorInput {
  readonly discards: readonly Discard[];
}

export function shouldAkuukanWinningCandidateBeTreatedAsClosed(
  input:
    CreateAkuukanWinningCandidateYakuEvaluatorInput
): boolean {
  if (input.owner === "player") {
    return isActivePlayerSkillEffectEnabled(
      input.akuukan,
      "1-15"
    );
  }

  if (input.owner === "selectedEnemy") {
    return isEnemyAbilityEnabled(
      input.akuukan,
      "E-14"
    );
  }

  return false;
}

function toNormalYakuResult(
  candidate: AkuukanNormalYakuCandidate
): NormalYakuResult {
  return {
    id: candidate.id,
    name: candidate.name,
    han: getAkuukanNormalYakuFinalHan(
      candidate
    )
  };
}

function toYakumanResult(
  candidate: AkuukanYakumanCandidate
): YakumanResult {
  const multiplier =
    getAkuukanYakumanMultiplier(
      candidate
    );

  if (
    multiplier !== 1 &&
    multiplier !== 2
  ) {
    throw new Error(
      "役満候補の倍率は1倍または2倍である必要があります。"
    );
  }

  return {
    id: candidate.id,
    name: candidate.name,
    multiplier
  };
}

export function toWinningCandidateYakuEvaluation(
  resolution:
    AkuukanWinningYakuResolution
): WinningCandidateYakuEvaluation {
  return {
    normalYaku:
      resolution
        .activeNormalYakuCandidates
        .map(toNormalYakuResult),
    yakuman:
      resolution
        .activeYakumanCandidates
        .map(toYakumanResult),
    hasValidYaku:
      resolution.hasValidYaku
  };
}

export function createAkuukanWinningCandidateYakuEvaluator(
  input:
    CreateAkuukanWinningCandidateYakuEvaluatorInput
): WinningCandidateYakuEvaluator {
  return (context) => {
    const resolution =
      input.owner === "player"
        ? resolveAkuukanPlayerWinningYaku({
            context,
            akuukan: input.akuukan
          })
        : resolveAkuukanOpponentWinningYaku({
            context,
            akuukan: input.akuukan,
            winnerIsSelectedEnemy:
              input.owner ===
              "selectedEnemy"
          });

    return toWinningCandidateYakuEvaluation(
      resolution
    );
  };
}

export function createAkuukanWinningCandidateBonusHanEvaluator(
  input:
    CreateAkuukanWinningCandidateBonusHanEvaluatorInput
): WinningCandidateBonusHanEvaluator {
  return (_context, yakuEvaluation) =>
    getAkuukanPlayerSkill1_7BonusHan({
      akuukan: input.akuukan,
      winnerIsPlayer:
        input.owner === "player",
      discards: input.discards,
      hasValidYaku:
        yakuEvaluation.hasValidYaku
    });
}

export function createAkuukanWinningCandidateScoreAdjuster(
  input:
    CreateAkuukanWinningCandidateScoreAdjusterInput
): WinningCandidateScoreAdjuster {
  return (score) =>
    applyAkuukanE21MinimumMangan({
      akuukan: input.akuukan,
      winnerIsSelectedEnemy:
        input.owner === "selectedEnemy",
      score,
      winMethod: input.winMethod,
      dealer: input.dealer
    });
}
