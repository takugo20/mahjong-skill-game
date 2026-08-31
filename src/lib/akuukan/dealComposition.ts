import type {
  Tile
} from "../mahjong/types";
import {
  isDora
} from "../mahjong/tiles";
import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export const AKUUKAN_E16_DORA_TRIPLET_SIZE =
  3;

export interface ReserveAkuukanE16DoraTripletInput {
  readonly akuukan: AkuukanGameState;
  readonly doraIndicator: Tile;
  readonly availableTiles: readonly Tile[];
}

export interface AkuukanE16DoraTripletReservation {
  readonly reservedTiles: Tile[];
  readonly remainingTiles: Tile[];
}

export function reserveAkuukanE16DoraTriplet(
  input:
    ReserveAkuukanE16DoraTripletInput
): AkuukanE16DoraTripletReservation {
  if (
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-16"
    )
  ) {
    return {
      reservedTiles: [],
      remainingTiles: [
        ...input.availableTiles
      ]
    };
  }

  const reservedTileIds = new Set(
    input.availableTiles
      .filter(
        (tile) =>
          isDora(
            tile,
            input.doraIndicator
          )
      )
      .slice(
        0,
        AKUUKAN_E16_DORA_TRIPLET_SIZE
      )
      .map((tile) => tile.id)
  );

  return {
    reservedTiles:
      input.availableTiles.filter(
        (tile) =>
          reservedTileIds.has(tile.id)
      ),
    remainingTiles:
      input.availableTiles.filter(
        (tile) =>
          !reservedTileIds.has(tile.id)
      )
  };
}
