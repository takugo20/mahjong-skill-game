import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export const AKUUKAN_E20_PAYMENT_MULTIPLIER =
  2;

export interface ApplyAkuukanE20PaymentMultiplierInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
  readonly paymentPoints: number;
}

function assertValidPaymentPoints(
  paymentPoints: number
): void {
  if (
    !Number.isSafeInteger(paymentPoints) ||
    paymentPoints < 0
  ) {
    throw new RangeError(
      "支払額は0以上の安全な整数で指定してください。"
    );
  }
}

function roundUpToHundred(
  points: number
): number {
  const rounded =
    Math.ceil(points / 100) * 100;

  if (!Number.isSafeInteger(rounded)) {
    throw new RangeError(
      "倍率適用後の支払額が安全な整数になりません。"
    );
  }

  return rounded;
}

export function isAkuukanE20PaymentMultiplierEnabled(
  akuukan: AkuukanGameState,
  winnerIsSelectedEnemy: boolean
): boolean {
  return (
    winnerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      akuukan,
      "E-20"
    )
  );
}

export function applyAkuukanE20PaymentMultiplier(
  input:
    ApplyAkuukanE20PaymentMultiplierInput
): number {
  assertValidPaymentPoints(
    input.paymentPoints
  );

  if (
    !isAkuukanE20PaymentMultiplierEnabled(
      input.akuukan,
      input.winnerIsSelectedEnemy
    )
  ) {
    return input.paymentPoints;
  }

  return roundUpToHundred(
    input.paymentPoints *
      AKUUKAN_E20_PAYMENT_MULTIPLIER
  );
}
