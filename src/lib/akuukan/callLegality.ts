import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export const AKUUKAN_E3_CALL_DEPOSIT =
  1000;

export type AkuukanCallOwner =
  | "player"
  | "selectedEnemy"
  | "normalOpponent";

export type AkuukanCallKind =
  | "chi"
  | "pon"
  | "openKan"
  | "closedKan"
  | "addedKan";

export interface AkuukanCallCheckInput {
  readonly akuukan: AkuukanGameState;
  readonly owner: AkuukanCallOwner;
  readonly kind: AkuukanCallKind;
  readonly score: number;
}

function isAkuukanE3DepositRequired(
  input: AkuukanCallCheckInput
): boolean {
  return (
    input.owner !== "selectedEnemy" &&
    (
      input.kind === "chi" ||
      input.kind === "pon" ||
      input.kind === "openKan"
    ) &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-3"
    )
  );
}

function isAkuukanE8CallProhibited(
  input: AkuukanCallCheckInput
): boolean {
  return (
    input.owner !== "selectedEnemy" &&
    (
      input.kind === "chi" ||
      input.kind === "pon" ||
      input.kind === "openKan" ||
      input.kind === "closedKan"
    ) &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-8"
    )
  );
}

function isAkuukanE13PlayerCallProhibited(
  input: AkuukanCallCheckInput
): boolean {
  return (
    input.owner === "player" &&
    (
      input.kind === "chi" ||
      input.kind === "pon" ||
      input.kind === "openKan"
    ) &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-13"
    )
  );
}

export function isAkuukanCallAllowed(
  input: AkuukanCallCheckInput
): boolean {
  if (
    isAkuukanE8CallProhibited(input) ||
    isAkuukanE13PlayerCallProhibited(
      input
    )
  ) {
    return false;
  }

  return (
    !isAkuukanE3DepositRequired(input) ||
    input.score >=
      AKUUKAN_E3_CALL_DEPOSIT
  );
}

export function getAkuukanCallDeposit(
  input: AkuukanCallCheckInput
): number {
  return isAkuukanE3DepositRequired(input) &&
    isAkuukanCallAllowed(input)
    ? AKUUKAN_E3_CALL_DEPOSIT
    : 0;
}
