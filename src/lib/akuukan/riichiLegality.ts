import {
  isAkuukanPlayerSkillEquipped
} from "./equipment";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export type AkuukanRiichiOwner =
  | "player"
  | "selectedEnemy"
  | "normalOpponent";

export interface AkuukanOpenRiichiCheckInput {
  readonly akuukan: AkuukanGameState;
  readonly owner: AkuukanRiichiOwner;
}

export interface AkuukanRiichiProhibitionCheckInput {
  readonly akuukan: AkuukanGameState;
  readonly owner: AkuukanRiichiOwner;
}

function isPlayerOpenRiichiEnabled(
  akuukan: AkuukanGameState
): boolean {
  return (
    isAkuukanPlayerSkillEquipped(
      akuukan,
      "2-7"
    ) &&
    !isAkuukanSourceDisabled(
      akuukan,
      "player-skill:2-7"
    )
  );
}

export function isAkuukanOpenRiichiAllowed(
  input: AkuukanOpenRiichiCheckInput
): boolean {
  if (input.owner === "player") {
    return isPlayerOpenRiichiEnabled(
      input.akuukan
    );
  }

  if (input.owner === "selectedEnemy") {
    return isEnemyAbilityEnabled(
      input.akuukan,
      "E-14"
    );
  }

  return false;
}

export function isAkuukanRiichiProhibited(
  input:
    AkuukanRiichiProhibitionCheckInput
): boolean {
  return (
    input.owner !== "selectedEnemy" &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-9"
    )
  );
}
