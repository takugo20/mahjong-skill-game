import {
  evaluateNormalYaku,
  isClosedHand
} from "../mahjong/yaku";
import type {
  NormalYakuContext,
  NormalYakuId
} from "../mahjong/yaku";
import {
  evaluateYakuman
} from "../mahjong/yakuman";
import type {
  YakumanContext,
  YakumanId
} from "../mahjong/yakuman";
import {
  createAkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import type {
  AkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import {
  AKUUKAN_NORMAL_YAKU_OVERLAP_RULES,
  AKUUKAN_YAKUMAN_OVERLAP_RULES
} from "./winningEvaluationOverlap";

interface StructuralOverlapRule<TId> {
  readonly retainedId: TId;
  readonly excludedId: TId;
}

const NORMAL_YAKU_STRUCTURAL_OVERLAPS:
  readonly StructuralOverlapRule<
    NormalYakuId
  >[] =
    AKUUKAN_NORMAL_YAKU_OVERLAP_RULES.map(
      (rule) => ({
        retainedId: rule.retainedYakuId,
        excludedId: rule.excludedYakuId
      })
    );

const YAKUMAN_STRUCTURAL_OVERLAPS:
  readonly StructuralOverlapRule<
    YakumanId
  >[] =
    AKUUKAN_YAKUMAN_OVERLAP_RULES.map(
      (rule) => ({
        retainedId:
          rule.retainedYakumanId,
        excludedId:
          rule.excludedYakumanId
      })
    );

function expandStructuralIds<TId>(
  detectedIds: readonly TId[],
  overlapRules:
    readonly StructuralOverlapRule<TId>[]
): readonly TId[] {
  const expandedIds: TId[] = [];
  const includedIds = new Set<TId>();

  const appendId = (id: TId): void => {
    if (includedIds.has(id)) {
      return;
    }

    includedIds.add(id);
    expandedIds.push(id);

    for (const rule of overlapRules) {
      if (rule.retainedId === id) {
        appendId(rule.excludedId);
      }
    }
  };

  for (const id of detectedIds) {
    appendId(id);
  }

  return expandedIds;
}

export function extractAkuukanStructuralNormalYakuIds(
  context: NormalYakuContext
): readonly NormalYakuId[] {
  const structuralContext = {
    ...context,
    treatAsClosed: true
  };
  const detectedIds = evaluateNormalYaku(
    structuralContext
  ).map((result) => result.id);

  return expandStructuralIds(
    detectedIds,
    NORMAL_YAKU_STRUCTURAL_OVERLAPS
  );
}

export function extractAkuukanStructuralYakumanIds(
  context: YakumanContext
): readonly YakumanId[] {
  const structuralContext = {
    ...context,
    treatAsClosed: true
  };
  const detectedIds = evaluateYakuman(
    structuralContext
  ).map((result) => result.id);

  return expandStructuralIds(
    detectedIds,
    YAKUMAN_STRUCTURAL_OVERLAPS
  );
}

export function createAkuukanWinningYakuCandidatesFromContext(
  context: YakumanContext
): AkuukanWinningYakuCandidates {
  return createAkuukanWinningYakuCandidates({
    structuralNormalYakuIds:
      extractAkuukanStructuralNormalYakuIds(
        context
      ),
    structuralYakumanIds:
      extractAkuukanStructuralYakumanIds(
        context
      ),
    isClosed: isClosedHand(context.melds)
  });
}
