import type {
  DoraCalculationResult
} from "../mahjong/dora";
import type {
  FuCalculationResult
} from "../mahjong/fu";
import type {
  WaitType,
  WinningHandDecomposition
} from "../mahjong/hand";
import type {
  ScoreCalculationResult
} from "../mahjong/score";
import type {
  NormalYakuId
} from "../mahjong/yaku";
import type {
  YakumanId,
  YakumanResult
} from "../mahjong/yakuman";
import type {
  AkuukanEffectSourceId
} from "./types";

export const AKUUKAN_WINNING_EVALUATION_STAGES = [
  "structuralYakuExtraction",
  "standardEligibility",
  "abilityEligibility",
  "enemyInvalidation",
  "overlapResolution",
  "standardHan",
  "openReductionCancellation",
  "fixedHan",
  "yakuHanAddition",
  "standardFu",
  "fuModification",
  "bonusHan",
  "dora",
  "handValue"
] as const;

export type AkuukanWinningEvaluationStage =
  (typeof AKUUKAN_WINNING_EVALUATION_STAGES)[number];

export interface AkuukanYakuHanGrant {
  readonly sourceId:
    AkuukanEffectSourceId;
  readonly han: number;
}

export interface AkuukanYakuHanChange {
  readonly sourceId:
    AkuukanEffectSourceId;
  readonly han: number;
}

export interface AkuukanNormalYakuCandidate {
  readonly id: NormalYakuId;
  readonly name: string;
  readonly closedHan: number;
  readonly standardHan: number;
  readonly standardEligible: boolean;
  readonly abilityGrants:
    readonly AkuukanYakuHanGrant[];
  readonly invalidatedBy:
    readonly AkuukanEffectSourceId[];
  readonly excludedBy:
    NormalYakuId | null;
  readonly openReductionCancelledBy:
    readonly AkuukanEffectSourceId[];
  readonly fixedHanChanges:
    readonly AkuukanYakuHanChange[];
  readonly hanAdditions:
    readonly AkuukanYakuHanChange[];
}

export interface CreateAkuukanNormalYakuCandidateInput {
  readonly id: NormalYakuId;
  readonly name: string;
  readonly closedHan: number;
  readonly standardHan: number;
  readonly standardEligible: boolean;
}

export interface AkuukanYakumanGrant {
  readonly sourceId:
    AkuukanEffectSourceId;
  readonly multiplier: number;
}

export interface AkuukanYakumanCandidate {
  readonly id: YakumanId;
  readonly name: string;
  readonly standardMultiplier:
    YakumanResult["multiplier"];
  readonly standardEligible: boolean;
  readonly abilityGrants:
    readonly AkuukanYakumanGrant[];
  readonly invalidatedBy:
    readonly AkuukanEffectSourceId[];
  readonly excludedBy:
    YakumanId | null;
}

export interface CreateAkuukanYakumanCandidateInput {
  readonly id: YakumanId;
  readonly name: string;
  readonly standardMultiplier:
    YakumanResult["multiplier"];
  readonly standardEligible: boolean;
}

export interface AkuukanWinningEvaluationCandidate {
  readonly decomposition:
    WinningHandDecomposition;
  readonly waitType: WaitType;
  readonly normalYakuCandidates:
    readonly AkuukanNormalYakuCandidate[];
  readonly yakumanCandidates:
    readonly AkuukanYakumanCandidate[];
  readonly standardFu:
    FuCalculationResult | null;
  readonly finalFu:
    FuCalculationResult | null;
  readonly bonusHan: number;
  readonly dora:
    DoraCalculationResult | null;
  readonly totalHan: number;
  readonly yakumanMultiplier: number;
  readonly score:
    ScoreCalculationResult | null;
}

function assertPositiveInteger(
  label: string,
  value: number
): void {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      `${label}は1以上の整数で指定してください。`
    );
  }
}

function assertNonNegativeInteger(
  label: string,
  value: number
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${label}は0以上の整数で指定してください。`
    );
  }
}

export function createAkuukanNormalYakuCandidate(
  input:
    CreateAkuukanNormalYakuCandidateInput
): AkuukanNormalYakuCandidate {
  assertPositiveInteger(
    "門前時翻数",
    input.closedHan
  );
  assertNonNegativeInteger(
    "標準翻数",
    input.standardHan
  );

  if (
    input.standardEligible &&
    input.standardHan === 0
  ) {
    throw new Error(
      "標準成立する役には1翻以上が必要です。"
    );
  }

  return {
    id: input.id,
    name: input.name,
    closedHan: input.closedHan,
    standardHan: input.standardHan,
    standardEligible:
      input.standardEligible,
    abilityGrants: [],
    invalidatedBy: [],
    excludedBy: null,
    openReductionCancelledBy: [],
    fixedHanChanges: [],
    hanAdditions: []
  };
}

export function getAkuukanNormalYakuReferenceHan(
  candidate: AkuukanNormalYakuCandidate
): number {
  return Math.max(
    candidate.standardEligible
      ? candidate.standardHan
      : 0,
    ...candidate.abilityGrants.map(
      (grant) => grant.han
    )
  );
}

export function isAkuukanNormalYakuCandidateActive(
  candidate: AkuukanNormalYakuCandidate
): boolean {
  return (
    getAkuukanNormalYakuReferenceHan(
      candidate
    ) > 0 &&
    candidate.invalidatedBy.length === 0 &&
    candidate.excludedBy === null
  );
}

export function getAkuukanNormalYakuFinalHan(
  candidate: AkuukanNormalYakuCandidate
): number {
  if (
    !isAkuukanNormalYakuCandidateActive(
      candidate
    )
  ) {
    return 0;
  }

  let han =
    getAkuukanNormalYakuReferenceHan(
      candidate
    );

  if (
    candidate.openReductionCancelledBy
      .length > 0
  ) {
    han = Math.max(
      han,
      candidate.closedHan
    );
  }

  if (
    candidate.fixedHanChanges.length > 0
  ) {
    han = Math.max(
      ...candidate.fixedHanChanges.map(
        (change) => change.han
      )
    );
  }

  return (
    han +
    candidate.hanAdditions.reduce(
      (total, change) =>
        total + change.han,
      0
    )
  );
}

export function createAkuukanYakumanCandidate(
  input:
    CreateAkuukanYakumanCandidateInput
): AkuukanYakumanCandidate {
  return {
    id: input.id,
    name: input.name,
    standardMultiplier:
      input.standardMultiplier,
    standardEligible:
      input.standardEligible,
    abilityGrants: [],
    invalidatedBy: [],
    excludedBy: null
  };
}

export function getAkuukanYakumanMultiplier(
  candidate: AkuukanYakumanCandidate
): number {
  if (
    candidate.invalidatedBy.length > 0 ||
    candidate.excludedBy !== null
  ) {
    return 0;
  }

  return Math.max(
    candidate.standardEligible
      ? candidate.standardMultiplier
      : 0,
    ...candidate.abilityGrants.map(
      (grant) => grant.multiplier
    )
  );
}

export function isAkuukanYakumanCandidateActive(
  candidate: AkuukanYakumanCandidate
): boolean {
  return (
    getAkuukanYakumanMultiplier(
      candidate
    ) > 0
  );
}
