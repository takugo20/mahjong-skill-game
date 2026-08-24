import type {
  WinMethod
} from "./yaku";

export type ScoreLimit =
  | "none"
  | "mangan"
  | "haneman"
  | "baiman"
  | "sanbaiman"
  | "kazoeYakuman"
  | "yakuman"
  | "multipleYakuman";

export interface ScoreCalculationInput {
  han: number;
  fu: number;
  winMethod: WinMethod;
  dealer: boolean;
  yakumanMultiplier?: number;
  honba?: number;
  riichiSticks?: number;
  kiriageMangan?: boolean;
  kazoeYakuman?: boolean;
}

export interface TsumoPayments {
  dealerPays: number;
  nonDealerPays: number;
  nonDealerPayerCount: 2 | 3;
}

export interface ScoreCalculationResult {
  han: number;
  fu: number;
  basePoints: number;
  limit: ScoreLimit;
  limitName: string | null;
  yakumanMultiplier: number;
  handPoints: number;
  honbaPoints: number;
  riichiPoints: number;
  totalPoints: number;
  ronPayment: number | null;
  tsumoPayments: TsumoPayments | null;
}

interface BasePointResult {
  basePoints: number;
  limit: ScoreLimit;
  limitName: string | null;
}

function roundUpToHundred(
  value: number
): number {
  return Math.ceil(value / 100) * 100;
}

function getYakumanName(
  multiplier: number
): string {
  if (multiplier === 1) {
    return "役満";
  }

  if (multiplier === 2) {
    return "ダブル役満";
  }

  if (multiplier === 3) {
    return "トリプル役満";
  }

  return `${multiplier}倍役満`;
}

function calculateBasePoints(
  input: ScoreCalculationInput,
  yakumanMultiplier: number
): BasePointResult {
  if (yakumanMultiplier > 0) {
    return {
      basePoints:
        8000 * yakumanMultiplier,
      limit:
        yakumanMultiplier === 1
          ? "yakuman"
          : "multipleYakuman",
      limitName:
        getYakumanName(
          yakumanMultiplier
        )
    };
  }

  if (input.han >= 13) {
    if (input.kazoeYakuman !== false) {
      return {
        basePoints: 8000,
        limit: "kazoeYakuman",
        limitName: "数え役満"
      };
    }

    return {
      basePoints: 6000,
      limit: "sanbaiman",
      limitName: "三倍満"
    };
  }

  if (input.han >= 11) {
    return {
      basePoints: 6000,
      limit: "sanbaiman",
      limitName: "三倍満"
    };
  }

  if (input.han >= 8) {
    return {
      basePoints: 4000,
      limit: "baiman",
      limitName: "倍満"
    };
  }

  if (input.han >= 6) {
    return {
      basePoints: 3000,
      limit: "haneman",
      limitName: "跳満"
    };
  }

  if (input.han >= 5) {
    return {
      basePoints: 2000,
      limit: "mangan",
      limitName: "満貫"
    };
  }

  const rawBasePoints =
    input.fu *
    2 ** (input.han + 2);

  const kiriageMangan =
    input.kiriageMangan === true &&
    (
      (
        input.han === 4 &&
        input.fu === 30
      ) ||
      (
        input.han === 3 &&
        input.fu === 60
      )
    );

  if (
    rawBasePoints >= 2000 ||
    kiriageMangan
  ) {
    return {
      basePoints: 2000,
      limit: "mangan",
      limitName: "満貫"
    };
  }

  return {
    basePoints: rawBasePoints,
    limit: "none",
    limitName: null
  };
}

function assertNonNegativeInteger(
  name: string,
  value: number
): void {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${name}は0以上の整数で指定してください`
    );
  }
}

function validateInput(
  input: ScoreCalculationInput,
  yakumanMultiplier: number,
  honba: number,
  riichiSticks: number
): void {
  assertNonNegativeInteger(
    "翻数",
    input.han
  );
  assertNonNegativeInteger(
    "役満倍率",
    yakumanMultiplier
  );
  assertNonNegativeInteger(
    "本場",
    honba
  );
  assertNonNegativeInteger(
    "供託本数",
    riichiSticks
  );

  if (
    yakumanMultiplier === 0 &&
    input.han < 1
  ) {
    throw new Error(
      "通常和了には1翻以上が必要です"
    );
  }

  if (
    yakumanMultiplier === 0 &&
    (
      !Number.isInteger(input.fu) ||
      (
        input.fu !== 25 &&
        (
          input.fu < 20 ||
          input.fu % 10 !== 0
        )
      )
    )
  ) {
    throw new Error(
      "符は25符、または20以上の10符単位で指定してください"
    );
  }
}

export function calculateScore(
  input: ScoreCalculationInput
): ScoreCalculationResult {
  const yakumanMultiplier =
    input.yakumanMultiplier ?? 0;

  const honba = input.honba ?? 0;

  const riichiSticks =
    input.riichiSticks ?? 0;

  validateInput(
    input,
    yakumanMultiplier,
    honba,
    riichiSticks
  );

  const base = calculateBasePoints(
    input,
    yakumanMultiplier
  );

  const honbaPoints = honba * 300;

  const riichiPoints =
    riichiSticks * 1000;

  if (input.winMethod === "ron") {
    const handPoints =
      roundUpToHundred(
        base.basePoints *
        (input.dealer ? 6 : 4)
      );

    const ronPayment =
      handPoints + honbaPoints;

    return {
      han: input.han,
      fu: input.fu,
      basePoints: base.basePoints,
      limit: base.limit,
      limitName: base.limitName,
      yakumanMultiplier,
      handPoints,
      honbaPoints,
      riichiPoints,
      totalPoints:
        ronPayment + riichiPoints,
      ronPayment,
      tsumoPayments: null
    };
  }

  if (input.dealer) {
    const paymentBeforeHonba =
      roundUpToHundred(
        base.basePoints * 2
      );

    const nonDealerPays =
      paymentBeforeHonba +
      honba * 100;

    const handPoints =
      paymentBeforeHonba * 3;

    return {
      han: input.han,
      fu: input.fu,
      basePoints: base.basePoints,
      limit: base.limit,
      limitName: base.limitName,
      yakumanMultiplier,
      handPoints,
      honbaPoints,
      riichiPoints,
      totalPoints:
        handPoints +
        honbaPoints +
        riichiPoints,
      ronPayment: null,
      tsumoPayments: {
        dealerPays: 0,
        nonDealerPays,
        nonDealerPayerCount: 3
      }
    };
  }

  const dealerPaymentBeforeHonba =
    roundUpToHundred(
      base.basePoints * 2
    );

  const nonDealerPaymentBeforeHonba =
    roundUpToHundred(
      base.basePoints
    );

  const dealerPays =
    dealerPaymentBeforeHonba +
    honba * 100;

  const nonDealerPays =
    nonDealerPaymentBeforeHonba +
    honba * 100;

  const handPoints =
    dealerPaymentBeforeHonba +
    nonDealerPaymentBeforeHonba * 2;

  return {
    han: input.han,
    fu: input.fu,
    basePoints: base.basePoints,
    limit: base.limit,
    limitName: base.limitName,
    yakumanMultiplier,
    handPoints,
    honbaPoints,
    riichiPoints,
    totalPoints:
      handPoints +
      honbaPoints +
      riichiPoints,
    ronPayment: null,
    tsumoPayments: {
      dealerPays,
      nonDealerPays,
      nonDealerPayerCount: 2
    }
  };
}
