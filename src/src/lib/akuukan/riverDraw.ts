import type {
  PlayerState,
  SeatIndex,
  Tile
} from "../mahjong/types";
import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export interface AkuukanE28RiverDrawCandidate {
  readonly tile: Tile;
  readonly riverOwnerSeat: SeatIndex;
  readonly discardIndex: number;
}

export interface GetAkuukanE28RiverDrawCandidatesInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsSelectedEnemy: boolean;
  readonly players: readonly PlayerState[];
}

export interface TakeAkuukanE28RiverTileInput
  extends GetAkuukanE28RiverDrawCandidatesInput {
  readonly riverOwnerSeat: SeatIndex;
  readonly tileId: string;
}

export interface AkuukanE28RiverTileTakeResult {
  readonly drawnTile: Tile;
  readonly riverOwnerSeat: SeatIndex;
  readonly discardIndex: number;
  readonly players: PlayerState[];
}

export function isAkuukanE28RiverDrawEnabled(
  akuukan: AkuukanGameState,
  drawerIsSelectedEnemy: boolean
): boolean {
  return (
    drawerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      akuukan,
      "E-28"
    )
  );
}

export function getAkuukanE28RiverDrawCandidates(
  input:
    GetAkuukanE28RiverDrawCandidatesInput
): AkuukanE28RiverDrawCandidate[] {
  if (
    !isAkuukanE28RiverDrawEnabled(
      input.akuukan,
      input.drawerIsSelectedEnemy
    )
  ) {
    return [];
  }

  return input.players.flatMap(
    (player) =>
      player.discards.flatMap(
        (discard, discardIndex) =>
          discard.called
            ? []
            : [{
                tile: discard.tile,
                riverOwnerSeat:
                  player.seat,
                discardIndex
              }]
      )
  );
}

export function takeAkuukanE28RiverTile(
  input: TakeAkuukanE28RiverTileInput
): AkuukanE28RiverTileTakeResult | null {
  const candidate =
    getAkuukanE28RiverDrawCandidates(
      input
    ).find(
      (currentCandidate) =>
        currentCandidate.riverOwnerSeat ===
          input.riverOwnerSeat &&
        currentCandidate.tile.id ===
          input.tileId
    );

  if (!candidate) {
    return null;
  }

  const riverOwner = input.players.find(
    (player) =>
      player.seat ===
      candidate.riverOwnerSeat
  );

  if (!riverOwner) {
    return null;
  }

  const selectedDiscard =
    riverOwner.discards[
      candidate.discardIndex
    ];

  if (
    !selectedDiscard ||
    selectedDiscard.called ||
    selectedDiscard.tile.id !==
      candidate.tile.id
  ) {
    return null;
  }

  const updatedRiverOwner: PlayerState = {
    ...riverOwner,
    discards: [
      ...riverOwner.discards.slice(
        0,
        candidate.discardIndex
      ),
      ...riverOwner.discards.slice(
        candidate.discardIndex + 1
      )
    ]
  };

  return {
    drawnTile: candidate.tile,
    riverOwnerSeat:
      candidate.riverOwnerSeat,
    discardIndex:
      candidate.discardIndex,
    players: input.players.map(
      (player) =>
        player.seat ===
        candidate.riverOwnerSeat
          ? updatedRiverOwner
          : player
    )
  };
}
