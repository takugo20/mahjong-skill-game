import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export type AkuukanNormalTurnActionCount =
  | 1
  | 2;

export type AkuukanNormalTurnActionResult =
  | "uninterruptedDiscard"
  | "reactionPending"
  | "tsumoWin"
  | "ron"
  | "call"
  | "abortiveDraw"
  | "exhaustiveDraw";

export interface AkuukanNormalTurnActionCountInput {
  readonly akuukan: AkuukanGameState;
  readonly actorIsSelectedEnemy: boolean;
}

export interface AkuukanAdditionalNormalActionCheckInput
  extends AkuukanNormalTurnActionCountInput {
  readonly completedActionCount:
    AkuukanNormalTurnActionCount;
  readonly result:
    AkuukanNormalTurnActionResult;
}

export function getAkuukanNormalTurnActionCount(
  input: AkuukanNormalTurnActionCountInput
): AkuukanNormalTurnActionCount {
  return (
    input.actorIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-25"
    )
  )
    ? 2
    : 1;
}

export function shouldStartAkuukanAdditionalNormalAction(
  input:
    AkuukanAdditionalNormalActionCheckInput
): boolean {
  return (
    input.completedActionCount === 1 &&
    input.result ===
      "uninterruptedDiscard" &&
    getAkuukanNormalTurnActionCount(
      input
    ) === 2
  );
}
