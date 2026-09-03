import {
  calculateScore
} from "../mahjong/score";
import type {
  ScoreCalculationResult
} from "../mahjong/score";
import type {
  WinMethod
} from "../mahjong/yaku";
import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export const AKUUKAN_MANGAN_BASE_POINTS =
  2000;

export const AKUUKAN_E21_MINIMUM_BASE_POINTS =
  AKUUKAN_MANGAN_BASE_POINTS;

export interface ApplyAkuukanE21MinimumManganInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
  readonly score: ScoreCalculationResult;
  readonly winMethod: WinMethod;
  readonly dealer: boolean;
}

export interface IsAkuukanE27WinInvalidatedInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
  readonly score: ScoreCalculationResult;
}

function getPointUnitCount(
  label: string,
  points: number,
  unit: number
): number {
  if (
    !Number.isSafeInteger(points) ||
    points < 0 ||
    points % unit !== 0
  ) {
    throw new RangeError(
      `${label}は${unit}点単位の0以上の安全な整数で指定してください。`
    );
  }

  return points / unit;
}

export function isAkuukanE21MinimumManganEnabled(
  akuukan: AkuukanGameState,
  winnerIsSelectedEnemy: boolean
): boolean {
  return (
    winnerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      akuukan,
      "E-21"
    )
  );
}

export function applyAkuukanE21MinimumMangan(
  input: ApplyAkuukanE21MinimumManganInput
): ScoreCalculationResult {
  if (
    !isAkuukanE21MinimumManganEnabled(
      input.akuukan,
      input.winnerIsSelectedEnemy
    ) ||
    input.score.basePoints >=
      AKUUKAN_E21_MINIMUM_BASE_POINTS
  ) {
    return input.score;
  }

  const honba = getPointUnitCount(
    "本場点",
    input.score.honbaPoints,
    300
  );
  const riichiSticks = getPointUnitCount(
    "供託点",
    input.score.riichiPoints,
    1000
  );
  const manganScore = calculateScore({
    han: 5,
    fu: 30,
    winMethod: input.winMethod,
    dealer: input.dealer,
    honba,
    riichiSticks
  });

  return {
    ...manganScore,
    han: input.score.han,
    fu: input.score.fu,
    yakumanMultiplier:
      input.score.yakumanMultiplier
  };
}

export function isAkuukanE27WinInvalidated(
  input: IsAkuukanE27WinInvalidatedInput
): boolean {
  return (
    !input.winnerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-27"
    ) &&
    input.score.basePoints <
      AKUUKAN_MANGAN_BASE_POINTS
  );
}
