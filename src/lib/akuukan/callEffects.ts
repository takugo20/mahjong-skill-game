import type {
  PlayerState
} from "../mahjong/types";
import type {
  AkuukanCallKind
} from "./callLegality";
import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export const AKUUKAN_E12_STEAL_POINTS =
  1000;

export interface AkuukanE12PointTransfer {
  readonly fromPlayerId: string;
  readonly points: number;
}

export interface ApplyAkuukanE12AfterCallInput {
  readonly akuukan: AkuukanGameState;
  readonly callerIsSelectedEnemy: boolean;
  readonly kind: AkuukanCallKind;
  readonly callerId: string;
  readonly players: readonly PlayerState[];
}

export interface AkuukanE12AfterCallResult {
  readonly players: PlayerState[];
  readonly transfers:
    AkuukanE12PointTransfer[];
  readonly totalStolenPoints: number;
}

function isAkuukanE12TargetCall(
  kind: AkuukanCallKind
): boolean {
  return (
    kind === "pon" ||
    kind === "openKan"
  );
}

function getAkuukanE12StealPoints(
  score: number
): number {
  return Math.min(
    AKUUKAN_E12_STEAL_POINTS,
    Math.max(0, score)
  );
}

export function applyAkuukanE12AfterCall(
  input: ApplyAkuukanE12AfterCallInput
): AkuukanE12AfterCallResult | null {
  if (
    !input.callerIsSelectedEnemy ||
    !isAkuukanE12TargetCall(
      input.kind
    ) ||
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-12"
    ) ||
    !input.players.some(
      (player) =>
        player.id === input.callerId
    )
  ) {
    return null;
  }

  const transfers = input.players
    .filter(
      (player) =>
        player.id !== input.callerId
    )
    .map(
      (player): AkuukanE12PointTransfer => ({
        fromPlayerId: player.id,
        points:
          getAkuukanE12StealPoints(
            player.score
          )
      })
    )
    .filter(
      (transfer) =>
        transfer.points > 0
    );
  const transferByPlayerId = new Map(
    transfers.map(
      (transfer) => [
        transfer.fromPlayerId,
        transfer.points
      ]
    )
  );
  const totalStolenPoints =
    transfers.reduce(
      (total, transfer) =>
        total + transfer.points,
      0
    );

  const players = input.players.map(
    (player): PlayerState => {
      if (player.id === input.callerId) {
        return {
          ...player,
          score:
            player.score +
            totalStolenPoints
        };
      }

      const stolenPoints =
        transferByPlayerId.get(
          player.id
        ) ?? 0;

      return stolenPoints === 0
        ? player
        : {
            ...player,
            score:
              player.score -
              stolenPoints
          };
    }
  );

  return {
    players,
    transfers,
    totalStolenPoints
  };
}
