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
