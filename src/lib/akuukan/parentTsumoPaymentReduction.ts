import type {
  WinMethod
} from "../mahjong/yaku";
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
import type {
  AkuukanGameState
} from "./types";

export interface ApplyPlayerSkill3_2Input {
  readonly akuukan: AkuukanGameState;
  readonly winMethod: WinMethod;
  readonly winnerIsDealer: boolean;
  readonly payerIsPlayer: boolean;
  readonly payerIsDealer: boolean;
  readonly paymentPoints: number;
  readonly responsibilityPaymentPoints?:
    number;
}

function assertValidPoints(
  paymentPoints: number,
  responsibilityPaymentPoints: number
): void {
  if (
    !Number.isSafeInteger(paymentPoints) ||
    paymentPoints < 0
  ) {
    throw new RangeError(
      "支払額は0以上の安全な整数で指定してください。"
    );
  }

  if (
    !Number.isSafeInteger(
      responsibilityPaymentPoints
    ) ||
    responsibilityPaymentPoints < 0 ||
    responsibilityPaymentPoints >
      paymentPoints
  ) {
    throw new RangeError(
      "責任払い額は支払総額以下の0以上の安全な整数で指定してください。"
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
      "軽減後の支払額が安全な整数になりません。"
    );
  }

  return rounded;
}

function getEnabledMultiplier(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "3-2"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-2"
    )
  ) {
    return null;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("3-2"),
      equippedSkill.level
    ).effectValues
      .parentTsumoPaymentMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier < 0 ||
    multiplier > 1
  ) {
    throw new Error(
      "スキル3-2の親被り支払倍率が不正です。"
    );
  }

  return multiplier;
}

export function applyPlayerSkill3_2ToPayment(
  input: ApplyPlayerSkill3_2Input
): number {
  const responsibilityPaymentPoints =
    input.responsibilityPaymentPoints ?? 0;

  assertValidPoints(
    input.paymentPoints,
    responsibilityPaymentPoints
  );

  const multiplier =
    getEnabledMultiplier(input.akuukan);

  if (
    multiplier === null ||
    input.winMethod !== "tsumo" ||
    input.winnerIsDealer ||
    !input.payerIsPlayer ||
    !input.payerIsDealer
  ) {
    return input.paymentPoints;
  }

  const normalPaymentPoints =
    input.paymentPoints -
    responsibilityPaymentPoints;
  const reducedNormalPaymentPoints =
    roundUpToHundred(
      normalPaymentPoints * multiplier
    );

  return (
    reducedNormalPaymentPoints +
    responsibilityPaymentPoints
  );
}
