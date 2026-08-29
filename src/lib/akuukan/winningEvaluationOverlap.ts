import type {
  NormalYakuId
} from "../mahjong/yaku";
import type {
  YakumanId
} from "../mahjong/yakuman";
import {
  getAkuukanNormalYakuReferenceHan
} from "./winningEvaluation";
import type {
  AkuukanNormalYakuCandidate,
  AkuukanYakumanCandidate
} from "./winningEvaluation";

export interface AkuukanNormalYakuOverlapRule {
  readonly retainedYakuId:
    NormalYakuId;
  readonly excludedYakuId:
    NormalYakuId;
}

export interface AkuukanYakumanOverlapRule {
  readonly retainedYakumanId:
    YakumanId;
  readonly excludedYakumanId:
    YakumanId;
}

export const AKUUKAN_NORMAL_YAKU_OVERLAP_RULES:
  readonly AkuukanNormalYakuOverlapRule[] = [
    {
      retainedYakuId: "doubleRiichi",
      excludedYakuId: "riichi"
    },
    {
      retainedYakuId: "rinshan",
      excludedYakuId: "haitei"
    },
    {
      retainedYakuId: "chankan",
      excludedYakuId: "houtei"
    },
    {
      retainedYakuId: "ryanpeikou",
      excludedYakuId: "iipeikou"
    },
    {
      retainedYakuId: "ryanpeikou",
      excludedYakuId: "sevenPairs"
    },
    {
      retainedYakuId: "junchan",
      excludedYakuId: "chanta"
    },
    {
      retainedYakuId: "chinitsu",
      excludedYakuId: "honitsu"
    }
  ];

export const AKUUKAN_YAKUMAN_OVERLAP_RULES:
  readonly AkuukanYakumanOverlapRule[] = [
    {
      retainedYakumanId:
        "thirteenOrphansThirteenSided",
      excludedYakumanId:
        "thirteenOrphans"
    },
    {
      retainedYakumanId:
        "fourConcealedTripletsSingleWait",
      excludedYakumanId:
        "fourConcealedTriplets"
    },
    {
      retainedYakumanId:
        "bigFourWinds",
      excludedYakumanId:
        "littleFourWinds"
    },
    {
      retainedYakumanId:
        "pureNineGates",
      excludedYakumanId:
        "nineGates"
    }
  ];

function isNormalYakuAvailableBeforeOverlap(
  candidate: AkuukanNormalYakuCandidate
): boolean {
  return (
    candidate.invalidatedBy.length === 0 &&
    getAkuukanNormalYakuReferenceHan(
      candidate
    ) > 0
  );
}

function isYakumanAvailableBeforeOverlap(
  candidate: AkuukanYakumanCandidate
): boolean {
  if (candidate.invalidatedBy.length > 0) {
    return false;
  }

  return Math.max(
    candidate.standardEligible
      ? candidate.standardMultiplier
      : 0,
    ...candidate.abilityGrants.map(
      (grant) => grant.multiplier
    )
  ) > 0;
}

function findNormalYakuExclusion(
  candidate: AkuukanNormalYakuCandidate,
  candidates:
    readonly AkuukanNormalYakuCandidate[]
): NormalYakuId | null {
  const rule =
    AKUUKAN_NORMAL_YAKU_OVERLAP_RULES.find(
      (currentRule) =>
        currentRule.excludedYakuId ===
          candidate.id &&
        candidates.some(
          (currentCandidate) =>
            currentCandidate.id ===
              currentRule.retainedYakuId &&
            isNormalYakuAvailableBeforeOverlap(
              currentCandidate
            )
        )
    );

  return rule?.retainedYakuId ?? null;
}

function findYakumanExclusion(
  candidate: AkuukanYakumanCandidate,
  candidates:
    readonly AkuukanYakumanCandidate[]
): YakumanId | null {
  const rule =
    AKUUKAN_YAKUMAN_OVERLAP_RULES.find(
      (currentRule) =>
        currentRule.excludedYakumanId ===
          candidate.id &&
        candidates.some(
          (currentCandidate) =>
            currentCandidate.id ===
              currentRule.retainedYakumanId &&
            isYakumanAvailableBeforeOverlap(
              currentCandidate
            )
        )
    );

  return rule?.retainedYakumanId ?? null;
}

export function resolveAkuukanNormalYakuOverlaps(
  candidates:
    readonly AkuukanNormalYakuCandidate[]
): readonly AkuukanNormalYakuCandidate[] {
  let changed = false;

  const resolved = candidates.map(
    (candidate) => {
      const excludedBy =
        findNormalYakuExclusion(
          candidate,
          candidates
        );

      if (
        candidate.excludedBy === excludedBy
      ) {
        return candidate;
      }

      changed = true;

      return {
        ...candidate,
        excludedBy
      };
    }
  );

  return changed ? resolved : candidates;
}

export function resolveAkuukanYakumanOverlaps(
  candidates:
    readonly AkuukanYakumanCandidate[]
): readonly AkuukanYakumanCandidate[] {
  let changed = false;

  const resolved = candidates.map(
    (candidate) => {
      const excludedBy =
        findYakumanExclusion(
          candidate,
          candidates
        );

      if (
        candidate.excludedBy === excludedBy
      ) {
        return candidate;
      }

      changed = true;

      return {
        ...candidate,
        excludedBy
      };
    }
  );

  return changed ? resolved : candidates;
}
