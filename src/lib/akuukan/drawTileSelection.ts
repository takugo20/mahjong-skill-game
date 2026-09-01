import {
  getWinningTileTypes
} from "../mahjong/hand";
import type {
  Meld,
  NumberSuit,
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

export const AKUUKAN_E5_TARGET_SUITS = [
  "sou",
  "pin",
  "man"
] as const satisfies readonly NumberSuit[];

export type AkuukanE5TargetSuit =
  (typeof AKUUKAN_E5_TARGET_SUITS)[number];

export interface SelectAkuukanE5TargetSuitInput {
  readonly akuukan: AkuukanGameState;
  readonly random: () => number;
}

export function selectAkuukanE5TargetSuit(
  input: SelectAkuukanE5TargetSuitInput
): AkuukanE5TargetSuit | null {
  if (
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-5"
    )
  ) {
    return null;
  }

  const selectedIndex = Math.floor(
    input.random() *
      AKUUKAN_E5_TARGET_SUITS.length
  );

  return (
    AKUUKAN_E5_TARGET_SUITS[
      selectedIndex
    ] ?? AKUUKAN_E5_TARGET_SUITS[0]
  );
}

export interface AssignAkuukanE5TargetSuitInput {
  readonly akuukan: AkuukanGameState;
  readonly random: () => number;
}

export function assignAkuukanE5TargetSuit(
  input: AssignAkuukanE5TargetSuitInput
): AkuukanGameState {
  const targetSuit =
    selectAkuukanE5TargetSuit(input);

  if (targetSuit !== null) {
    return {
      ...input.akuukan,
      e5TargetSuit: targetSuit
    };
  }

  if (
    input.akuukan.e5TargetSuit ===
    undefined
  ) {
    return input.akuukan;
  }

  const nextAkuukan = {
    ...input.akuukan
  };

  delete nextAkuukan.e5TargetSuit;

  return nextAkuukan;
}

export function getAkuukanE5TargetSuit(
  akuukan: AkuukanGameState
): AkuukanE5TargetSuit | null {
  return akuukan.e5TargetSuit ?? null;
}

export interface AkuukanE5LiveWallDrawInput {
  readonly akuukan: AkuukanGameState;
  readonly recipientIsSelectedEnemy:
    boolean;
  readonly targetSuit:
    AkuukanE5TargetSuit | null;
  readonly liveWall: readonly Tile[];
}

export function getAkuukanE5LiveWallDrawIndex(
  input: AkuukanE5LiveWallDrawInput
): number | null {
  if (input.liveWall.length === 0) {
    return null;
  }

  if (
    !input.recipientIsSelectedEnemy ||
    input.targetSuit === null ||
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-5"
    )
  ) {
    return 0;
  }

  const targetSuitTileIndex =
    input.liveWall.findIndex(
      (tile) =>
        tile.suit === input.targetSuit
    );

  return targetSuitTileIndex >= 0
    ? targetSuitTileIndex
    : 0;
}

export interface AkuukanE11LiveWallTileInput {
  readonly akuukan: AkuukanGameState;
  readonly recipientIsSelectedEnemy:
    boolean;
  readonly liveWall: readonly Tile[];
}

function isWindTile(tile: Tile): boolean {
  return (
    tile.suit === "honor" &&
    tile.rank >= 1 &&
    tile.rank <= 4
  );
}

export function getAkuukanE11LiveWallTileIndex(
  input: AkuukanE11LiveWallTileInput
): number | null {
  if (input.liveWall.length === 0) {
    return null;
  }

  if (
    input.recipientIsSelectedEnemy ||
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-11"
    ) ||
    !isWindTile(input.liveWall[0])
  ) {
    return 0;
  }

  const nonWindTileIndex =
    input.liveWall.findIndex(
      (tile) => !isWindTile(tile)
    );

  return nonWindTileIndex >= 0
    ? nonWindTileIndex
    : 0;
}
