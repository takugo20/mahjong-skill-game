import type {
  AkuukanGameState
} from "./types";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";
import {
  isAkuukanSourceDisabled
} from "./state";
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

export interface AkuukanPlayerSkill1_10PaymentInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsPlayer: boolean;
  readonly payerIsPlayer: boolean;
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

function getEnabledAkuukanPlayerSkill1_10Multiplier(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-10"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-10"
    )
  ) {
    return null;
  }

  const paymentMultiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("1-10"),
      equippedSkill.level
    ).effectValues.paymentMultiplier;

  if (
    typeof paymentMultiplier !== "number" ||
    !Number.isFinite(paymentMultiplier) ||
    paymentMultiplier <= 0
  ) {
    throw new Error(
      "スキル1-10の支払倍率が不正です。"
    );
  }

  return paymentMultiplier;
}

export function getAkuukanPlayerSkill1_10PaymentMultiplier(
  input: Omit<
    AkuukanPlayerSkill1_10PaymentInput,
    "paymentPoints"
  >
): number {
  if (
    !input.winnerIsPlayer &&
    !input.payerIsPlayer
  ) {
    return 1;
  }

  return (
    getEnabledAkuukanPlayerSkill1_10Multiplier(
      input.akuukan
    ) ?? 1
  );
}

export function applyAkuukanPlayerSkill1_10PaymentMultiplier(
  input: AkuukanPlayerSkill1_10PaymentInput
): number {
  assertValidPaymentPoints(
    input.paymentPoints
  );

  return roundUpToHundred(
    input.paymentPoints *
      getAkuukanPlayerSkill1_10PaymentMultiplier(
        input
      )
  );
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
