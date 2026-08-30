import type {
  NormalYakuId
} from "../mahjong/yaku";
import type {
  YakumanId
} from "../mahjong/yakuman";
import type {
  AkuukanEffectSourceId
} from "./types";
import {
  isAkuukanNormalYakuCandidateActive
} from "./winningEvaluation";
import type {
  AkuukanNormalYakuCandidate,
  AkuukanYakumanCandidate
} from "./winningEvaluation";
import type {
  AkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import {
  resolveAkuukanNormalYakuOverlaps,
  resolveAkuukanYakumanOverlaps
} from "./winningEvaluationOverlap";
import {
  addAkuukanNormalYakuHan,
  cancelAkuukanNormalYakuOpenReduction,
  grantAkuukanNormalYaku,
  grantAkuukanYakuman,
  invalidateAkuukanNormalYaku,
  invalidateAkuukanYakuman,
  setAkuukanNormalYakuFixedHan
} from "./winningEvaluationUpdates";

export interface AkuukanNormalYakuSourceAdjustment {
  readonly yakuId: NormalYakuId;
  readonly sourceId:
    AkuukanEffectSourceId;
}

export interface AkuukanNormalYakuHanAdjustment
  extends AkuukanNormalYakuSourceAdjustment {
  readonly han: number;
}

export interface AkuukanYakumanSourceAdjustment {
  readonly yakumanId: YakumanId;
  readonly sourceId:
    AkuukanEffectSourceId;
}

export interface AkuukanYakumanMultiplierAdjustment
  extends AkuukanYakumanSourceAdjustment {
  readonly multiplier: number;
}

export interface AkuukanWinningYakuAdjustments {
  readonly normalYakuGrants?:
    readonly AkuukanNormalYakuHanAdjustment[];
  readonly yakumanGrants?:
    readonly AkuukanYakumanMultiplierAdjustment[];
  readonly normalYakuInvalidations?:
    readonly AkuukanNormalYakuSourceAdjustment[];
  readonly yakumanInvalidations?:
    readonly AkuukanYakumanSourceAdjustment[];
  readonly openReductionCancellations?:
    readonly AkuukanNormalYakuSourceAdjustment[];
  readonly fixedHanChanges?:
    readonly AkuukanNormalYakuHanAdjustment[];
  readonly hanAdditions?:
    readonly AkuukanNormalYakuHanAdjustment[];
}

function updateNormalYakuCandidate(
  candidates:
    readonly AkuukanNormalYakuCandidate[],
  yakuId: NormalYakuId,
  update: (
    candidate: AkuukanNormalYakuCandidate
  ) => AkuukanNormalYakuCandidate
): readonly AkuukanNormalYakuCandidate[] {
  let changed = false;

  const updatedCandidates = candidates.map(
    (candidate) => {
      if (candidate.id !== yakuId) {
        return candidate;
      }

      const updated = update(candidate);

      if (updated !== candidate) {
        changed = true;
      }

      return updated;
    }
  );

  return changed
    ? updatedCandidates
    : candidates;
}

function updateActiveNormalYakuCandidate(
  candidates:
    readonly AkuukanNormalYakuCandidate[],
  yakuId: NormalYakuId,
  update: (
    candidate: AkuukanNormalYakuCandidate
  ) => AkuukanNormalYakuCandidate
): readonly AkuukanNormalYakuCandidate[] {
  return updateNormalYakuCandidate(
    candidates,
    yakuId,
    (candidate) =>
      isAkuukanNormalYakuCandidateActive(
        candidate
      )
        ? update(candidate)
        : candidate
  );
}

function updateYakumanCandidate(
  candidates:
    readonly AkuukanYakumanCandidate[],
  yakumanId: YakumanId,
  update: (
    candidate: AkuukanYakumanCandidate
  ) => AkuukanYakumanCandidate
): readonly AkuukanYakumanCandidate[] {
  let changed = false;

  const updatedCandidates = candidates.map(
    (candidate) => {
      if (candidate.id !== yakumanId) {
        return candidate;
      }

      const updated = update(candidate);

      if (updated !== candidate) {
        changed = true;
      }

      return updated;
    }
  );

  return changed
    ? updatedCandidates
    : candidates;
}

export function applyAkuukanWinningYakuAdjustments(
  candidates:
    AkuukanWinningYakuCandidates,
  adjustments:
    AkuukanWinningYakuAdjustments
): AkuukanWinningYakuCandidates {
  let normalYakuCandidates =
    candidates.normalYakuCandidates;
  let yakumanCandidates =
    candidates.yakumanCandidates;

  for (
    const adjustment of
      adjustments.normalYakuGrants ?? []
  ) {
    normalYakuCandidates =
      updateNormalYakuCandidate(
        normalYakuCandidates,
        adjustment.yakuId,
        (candidate) =>
          grantAkuukanNormalYaku(
            candidate,
            adjustment.sourceId,
            adjustment.han
          )
      );
  }

  for (
    const adjustment of
      adjustments.yakumanGrants ?? []
  ) {
    yakumanCandidates =
      updateYakumanCandidate(
        yakumanCandidates,
        adjustment.yakumanId,
        (candidate) =>
          grantAkuukanYakuman(
            candidate,
            adjustment.sourceId,
            adjustment.multiplier
          )
      );
  }

  for (
    const adjustment of
      adjustments.normalYakuInvalidations ??
      []
  ) {
    normalYakuCandidates =
      updateNormalYakuCandidate(
        normalYakuCandidates,
        adjustment.yakuId,
        (candidate) =>
          invalidateAkuukanNormalYaku(
            candidate,
            adjustment.sourceId
          )
      );
  }

  for (
    const adjustment of
      adjustments.yakumanInvalidations ??
      []
  ) {
    yakumanCandidates =
      updateYakumanCandidate(
        yakumanCandidates,
        adjustment.yakumanId,
        (candidate) =>
          invalidateAkuukanYakuman(
            candidate,
            adjustment.sourceId
          )
      );
  }

  normalYakuCandidates =
    resolveAkuukanNormalYakuOverlaps(
      normalYakuCandidates
    );
  yakumanCandidates =
    resolveAkuukanYakumanOverlaps(
      yakumanCandidates
    );

  for (
    const adjustment of
      adjustments.openReductionCancellations ??
      []
  ) {
    normalYakuCandidates =
      updateActiveNormalYakuCandidate(
        normalYakuCandidates,
        adjustment.yakuId,
        (candidate) =>
          cancelAkuukanNormalYakuOpenReduction(
            candidate,
            adjustment.sourceId
          )
      );
  }

  for (
    const adjustment of
      adjustments.fixedHanChanges ?? []
  ) {
    normalYakuCandidates =
      updateActiveNormalYakuCandidate(
        normalYakuCandidates,
        adjustment.yakuId,
        (candidate) =>
          setAkuukanNormalYakuFixedHan(
            candidate,
            adjustment.sourceId,
            adjustment.han
          )
      );
  }

  for (
    const adjustment of
      adjustments.hanAdditions ?? []
  ) {
    normalYakuCandidates =
      updateActiveNormalYakuCandidate(
        normalYakuCandidates,
        adjustment.yakuId,
        (candidate) =>
          addAkuukanNormalYakuHan(
            candidate,
            adjustment.sourceId,
            adjustment.han
          )
      );
  }

  if (
    normalYakuCandidates ===
      candidates.normalYakuCandidates &&
    yakumanCandidates ===
      candidates.yakumanCandidates
  ) {
    return candidates;
  }

  return {
    normalYakuCandidates,
    yakumanCandidates
  };
}
