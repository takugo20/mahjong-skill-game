import {
  getAkuukanNormalYakuFinalHan,
  getAkuukanYakumanMultiplier,
  isAkuukanNormalYakuCandidateActive,
  isAkuukanYakumanCandidateActive
} from "./winningEvaluation";
import type {
  AkuukanNormalYakuCandidate,
  AkuukanYakumanCandidate
} from "./winningEvaluation";
import {
  resolveAkuukanNormalYakuOverlaps,
  resolveAkuukanYakumanOverlaps
} from "./winningEvaluationOverlap";

export interface ResolveAkuukanWinningYakuInput {
  readonly normalYakuCandidates:
    readonly AkuukanNormalYakuCandidate[];
  readonly yakumanCandidates:
    readonly AkuukanYakumanCandidate[];
}

export interface AkuukanWinningYakuResolution {
  readonly normalYakuCandidates:
    readonly AkuukanNormalYakuCandidate[];
  readonly yakumanCandidates:
    readonly AkuukanYakumanCandidate[];
  readonly activeNormalYakuCandidates:
    readonly AkuukanNormalYakuCandidate[];
  readonly activeYakumanCandidates:
    readonly AkuukanYakumanCandidate[];
  readonly normalYakuHan: number;
  readonly scoringNormalYakuHan: number;
  readonly yakumanMultiplier: number;
  readonly hasValidYaku: boolean;
  readonly usesYakumanScoring: boolean;
}

export function resolveAkuukanWinningYaku(
  input: ResolveAkuukanWinningYakuInput
): AkuukanWinningYakuResolution {
  const normalYakuCandidates =
    resolveAkuukanNormalYakuOverlaps(
      input.normalYakuCandidates
    );
  const yakumanCandidates =
    resolveAkuukanYakumanOverlaps(
      input.yakumanCandidates
    );

  const activeNormalYakuCandidates =
    normalYakuCandidates.filter(
      isAkuukanNormalYakuCandidateActive
    );
  const activeYakumanCandidates =
    yakumanCandidates.filter(
      isAkuukanYakumanCandidateActive
    );

  const normalYakuHan =
    activeNormalYakuCandidates.reduce(
      (total, candidate) =>
        total +
        getAkuukanNormalYakuFinalHan(
          candidate
        ),
      0
    );
  const yakumanMultiplier =
    activeYakumanCandidates.reduce(
      (total, candidate) =>
        total +
        getAkuukanYakumanMultiplier(
          candidate
        ),
      0
    );
  const usesYakumanScoring =
    yakumanMultiplier > 0;

  return {
    normalYakuCandidates,
    yakumanCandidates,
    activeNormalYakuCandidates,
    activeYakumanCandidates,
    normalYakuHan,
    scoringNormalYakuHan:
      usesYakumanScoring
        ? 0
        : normalYakuHan,
    yakumanMultiplier,
    hasValidYaku:
      activeNormalYakuCandidates.length > 0 ||
      activeYakumanCandidates.length > 0,
    usesYakumanScoring
  };
}
