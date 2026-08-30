import type {
  NormalYakuId
} from "../mahjong/yaku";
import type {
  YakumanId
} from "../mahjong/yakuman";
import {
  createAkuukanNormalYakuCandidate,
  createAkuukanYakumanCandidate
} from "./winningEvaluation";
import type {
  AkuukanNormalYakuCandidate,
  AkuukanYakumanCandidate
} from "./winningEvaluation";
import {
  getAkuukanNormalYakuDefinition,
  getAkuukanNormalYakuStandardHan,
  getAkuukanYakumanDefinition,
  isAkuukanYakumanAllowedByClosedState
} from "./winningEvaluationDefinitions";

export interface CreateAkuukanWinningYakuCandidatesInput {
  readonly structuralNormalYakuIds:
    readonly NormalYakuId[];
  readonly structuralYakumanIds:
    readonly YakumanId[];
  readonly isClosed: boolean;
}

export interface AkuukanWinningYakuCandidates {
  readonly normalYakuCandidates:
    readonly AkuukanNormalYakuCandidate[];
  readonly yakumanCandidates:
    readonly AkuukanYakumanCandidate[];
}

function uniqueIds<TId>(
  ids: readonly TId[]
): TId[] {
  return [...new Set(ids)];
}

export function createAkuukanNormalYakuCandidates(
  structuralYakuIds:
    readonly NormalYakuId[],
  isClosed: boolean
): readonly AkuukanNormalYakuCandidate[] {
  return uniqueIds(structuralYakuIds).map(
    (id) => {
      const definition =
        getAkuukanNormalYakuDefinition(id);
      const standardHan =
        getAkuukanNormalYakuStandardHan(
          id,
          isClosed
        );

      return createAkuukanNormalYakuCandidate({
        id,
        name: definition.name,
        closedHan: definition.closedHan,
        standardHan,
        standardEligible: standardHan > 0
      });
    }
  );
}

export function createAkuukanYakumanCandidates(
  structuralYakumanIds:
    readonly YakumanId[],
  isClosed: boolean
): readonly AkuukanYakumanCandidate[] {
  return uniqueIds(structuralYakumanIds).map(
    (id) => {
      const definition =
        getAkuukanYakumanDefinition(id);

      return createAkuukanYakumanCandidate({
        id,
        name: definition.name,
        standardMultiplier:
          definition.multiplier,
        standardEligible:
          isAkuukanYakumanAllowedByClosedState(
            id,
            isClosed
          )
      });
    }
  );
}

export function createAkuukanWinningYakuCandidates(
  input:
    CreateAkuukanWinningYakuCandidatesInput
): AkuukanWinningYakuCandidates {
  return {
    normalYakuCandidates:
      createAkuukanNormalYakuCandidates(
        input.structuralNormalYakuIds,
        input.isClosed
      ),
    yakumanCandidates:
      createAkuukanYakumanCandidates(
        input.structuralYakumanIds,
        input.isClosed
      )
  };
}
