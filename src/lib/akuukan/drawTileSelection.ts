import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export interface ActivateAkuukanE2DrawRestrictionInput {
  readonly akuukan: AkuukanGameState;
  readonly declarerIsSelectedEnemy: boolean;
  readonly priorRiichiPlayerIds:
    readonly string[];
}

export function activateAkuukanE2DrawRestriction(
  input:
    ActivateAkuukanE2DrawRestrictionInput
): AkuukanGameState {
  if (
    !input.declarerIsSelectedEnemy ||
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-2"
    ) ||
    input.akuukan.e2DrawRestriction
  ) {
    return input.akuukan;
  }

  const restrictedPlayerIds = [
    ...new Set(
      input.priorRiichiPlayerIds
    )
  ];

  if (restrictedPlayerIds.length === 0) {
    return input.akuukan;
  }

  return {
    ...input.akuukan,
    e2DrawRestriction: {
      restrictedPlayerIds
    }
  };
}

export function getAkuukanE2RestrictedPlayerIds(
  akuukan: AkuukanGameState
): readonly string[] {
  return (
    akuukan.e2DrawRestriction
      ?.restrictedPlayerIds ?? []
  );
}

export interface AkuukanE2DrawRestrictionCheckInput {
  readonly akuukan: AkuukanGameState;
  readonly playerId: string;
}

export function isAkuukanE2DrawRestricted(
  input:
    AkuukanE2DrawRestrictionCheckInput
): boolean {
  return (
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-2"
    ) &&
    getAkuukanE2RestrictedPlayerIds(
      input.akuukan
    ).includes(input.playerId)
  );
}

export function clearAkuukanE2DrawRestriction(
  akuukan: AkuukanGameState
): AkuukanGameState {
  if (!akuukan.e2DrawRestriction) {
    return akuukan;
  }

  const nextAkuukan = {
    ...akuukan
  };

  delete nextAkuukan.e2DrawRestriction;

  return nextAkuukan;
}
