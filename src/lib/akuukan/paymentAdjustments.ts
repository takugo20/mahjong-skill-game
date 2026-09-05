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

export interface AkuukanPlayerSkill1_11PaymentInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsPlayer: boolean;
  readonly paymentPoints: number;
}

export interface ApplyAkuukanPaymentMultipliersInput
  extends AkuukanPlayerSkill1_10PaymentInput {
  readonly winnerIsSelectedEnemy: boolean;
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

function getEnabledAkuukanPlayerSkill1_11AdditionalPoints(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-11"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-11"
    )
  ) {
    return null;
  }

  const additionalPaymentPoints =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("1-11"),
      equippedSkill.level
    ).effectValues.additionalPaymentPoints;

  if (
    typeof additionalPaymentPoints !==
      "number" ||
    !Number.isSafeInteger(
      additionalPaymentPoints
    ) ||
    additionalPaymentPoints < 0
  ) {
    throw new Error(
      "スキル1-11の固定加算点が不正です。"
    );
  }

  return additionalPaymentPoints;
}

export function getAkuukanPlayerSkill1_11AdditionalPaymentPoints(
  input: Omit<
    AkuukanPlayerSkill1_11PaymentInput,
    "paymentPoints"
  >
): number {
  if (!input.winnerIsPlayer) {
    return 0;
  }

  return (
    getEnabledAkuukanPlayerSkill1_11AdditionalPoints(
      input.akuukan
    ) ?? 0
  );
}

export function addAkuukanPlayerSkill1_11PaymentPoints(
  input: AkuukanPlayerSkill1_11PaymentInput
): number {
  assertValidPaymentPoints(
    input.paymentPoints
  );

  const adjusted =
    input.paymentPoints +
    getAkuukanPlayerSkill1_11AdditionalPaymentPoints(
      input
    );

  if (!Number.isSafeInteger(adjusted)) {
    throw new RangeError(
      "固定点加算後の支払額が安全な整数になりません。"
    );
  }

  return adjusted;
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

export function applyAkuukanPaymentMultipliers(
  input: ApplyAkuukanPaymentMultipliersInput
): number {
  assertValidPaymentPoints(
    input.paymentPoints
  );

  const playerSkillMultiplier =
    getAkuukanPlayerSkill1_10PaymentMultiplier(
      input
    );
  const enemyAbilityMultiplier =
    isAkuukanE20PaymentMultiplierEnabled(
      input.akuukan,
      input.winnerIsSelectedEnemy
    )
      ? AKUUKAN_E20_PAYMENT_MULTIPLIER
      : 1;

  return roundUpToHundred(
    input.paymentPoints *
      playerSkillMultiplier *
      enemyAbilityMultiplier
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
  return applyAkuukanPaymentMultipliers({
    ...input,
    winnerIsPlayer: false,
    payerIsPlayer: false
  });
}
