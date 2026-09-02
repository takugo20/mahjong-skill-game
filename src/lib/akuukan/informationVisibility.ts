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

export interface AkuukanHandVisibilityInput {
  readonly akuukan: AkuukanGameState;
  readonly viewer: AkuukanInformationViewer;
  readonly viewerIsHandOwner: boolean;
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

export function areAkuukanHandTilesVisible(
  input: AkuukanHandVisibilityInput
): boolean {
  return (
    input.viewerIsHandOwner ||
    (
      input.viewer === "selectedEnemy" &&
      isEnemyAbilityEnabled(
        input.akuukan,
        "E-10"
      )
    )
  );
}

export function areAkuukanRiverTilesVisible(
  input: AkuukanRiverVisibilityInput
): boolean {
  return (
    !(
      input.riverOwner ===
        "selectedEnemy" &&
      isEnemyAbilityEnabled(
        input.akuukan,
        "E-24"
      )
    ) &&
    (
      input.viewer !== "player" ||
      input.riverOwner === "player" ||
      !isEnemyAbilityEnabled(
        input.akuukan,
        "E-13"
      )
    )
  );
}
