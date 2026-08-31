import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export type AkuukanInformationViewer =
  | "player"
  | "selectedEnemy"
  | "normalOpponent";

export interface AkuukanDoraIndicatorVisibilityInput {
  readonly akuukan: AkuukanGameState;
  readonly viewer: AkuukanInformationViewer;
}

export interface AkuukanRiverVisibilityInput {
  readonly akuukan: AkuukanGameState;
  readonly viewer: AkuukanInformationViewer;
  readonly riverOwner: AkuukanInformationViewer;
}

export function areAkuukanDoraIndicatorsVisible(
  input:
    AkuukanDoraIndicatorVisibilityInput
): boolean {
  return (
    input.viewer === "selectedEnemy" ||
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-1"
    )
  );
}

export function areAkuukanRiverTilesVisible(
  input: AkuukanRiverVisibilityInput
): boolean {
  return (
    input.viewer !== "player" ||
    input.riverOwner === "player" ||
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-13"
    )
  );
}
