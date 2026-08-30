import {
  getWinningTileTypes
} from "../mahjong/hand";
import type {
  Meld,
  Tile
} from "../mahjong/types";
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

export interface AkuukanE2LiveWallDrawInput {
  readonly akuukan: AkuukanGameState;
  readonly playerId: string;
  readonly concealedTiles: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly liveWall: readonly Tile[];
}

function isSameTileType(
  tile: Tile,
  tileType: Pick<Tile, "suit" | "rank">
): boolean {
  return (
    tile.suit === tileType.suit &&
    tile.rank === tileType.rank
  );
}

export function getAkuukanE2LiveWallDrawIndex(
  input: AkuukanE2LiveWallDrawInput
): number | null {
  if (input.liveWall.length === 0) {
    return null;
  }

  if (
    !isAkuukanE2DrawRestricted({
      akuukan: input.akuukan,
      playerId: input.playerId
    })
  ) {
    return 0;
  }

  const winningTileTypes =
    getWinningTileTypes(
      input.concealedTiles,
      input.melds
    );

  if (winningTileTypes.length === 0) {
    return 0;
  }

  const allowedTileIndex =
    input.liveWall.findIndex(
      (tile) =>
        !winningTileTypes.some(
          (winningTileType) =>
            isSameTileType(
              tile,
              winningTileType
            )
        )
    );

  return allowedTileIndex >= 0
    ? allowedTileIndex
    : 0;
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
