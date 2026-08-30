import type {
  WinningCandidateYakuEvaluation,
  WinningCandidateYakuEvaluator
} from "../mahjong/winning";
import type {
  NormalYakuResult
} from "../mahjong/yaku";
import type {
  YakumanResult
} from "../mahjong/yakuman";
import {
  getAkuukanNormalYakuFinalHan,
  getAkuukanYakumanMultiplier
} from "./winningEvaluation";
import type {
  AkuukanNormalYakuCandidate,
  AkuukanYakumanCandidate
} from "./winningEvaluation";
import {
  resolveAkuukanOpponentWinningYaku,
  resolveAkuukanPlayerWinningYaku
} from "./winningEvaluationPipeline";
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
