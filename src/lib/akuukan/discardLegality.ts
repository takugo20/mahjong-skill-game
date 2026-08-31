import type {
  Tile
} from "../mahjong/types";
import type {
  AkuukanE19DiscardRestriction,
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export const AKUUKAN_E19_RESTRICTION_COUNT_PER_PLAYER =
  3;

export interface AkuukanE19DealPlayer {
  readonly playerId: string;
  readonly isSelectedEnemy: boolean;
  readonly concealedTiles: readonly Tile[];
}

export interface AssignAkuukanE19DiscardRestrictionsInput {
  readonly akuukan: AkuukanGameState;
  readonly players:
    readonly AkuukanE19DealPlayer[];
  readonly random: () => number;
}

function selectRandomDistinctTileIds(
  tiles: readonly Tile[],
  count: number,
  random: () => number
): string[] {
  const candidates = [
    ...new Map(
      tiles.map((tile) => [
        tile.id,
        tile
      ])
    ).values()
  ];
  const selectedTileIds: string[] = [];

  while (
    selectedTileIds.length < count &&
    candidates.length > 0
  ) {
    const randomIndex = Math.min(
      candidates.length - 1,
      Math.max(
        0,
        Math.floor(
          random() * candidates.length
        )
      )
    );
    const [selectedTile] =
      candidates.splice(randomIndex, 1);

    if (selectedTile) {
      selectedTileIds.push(
        selectedTile.id
      );
    }
  }

  return selectedTileIds;
}

export function clearAkuukanE19DiscardRestrictions(
  akuukan: AkuukanGameState
): AkuukanGameState {
  if (!akuukan.e19DiscardRestrictions) {
    return akuukan;
  }

  const nextAkuukan = {
    ...akuukan
  };

  delete nextAkuukan.e19DiscardRestrictions;

  return nextAkuukan;
}

export function assignAkuukanE19DiscardRestrictions(
  input:
    AssignAkuukanE19DiscardRestrictionsInput
): AkuukanGameState {
  const clearedAkuukan =
    clearAkuukanE19DiscardRestrictions(
      input.akuukan
    );

  if (
    !isEnemyAbilityEnabled(
      clearedAkuukan,
      "E-19"
    )
  ) {
    return clearedAkuukan;
  }

  const restrictions:
    AkuukanE19DiscardRestriction[] = [];

  for (const player of input.players) {
    if (player.isSelectedEnemy) {
      continue;
    }

    const selectedTileIds =
      selectRandomDistinctTileIds(
        player.concealedTiles,
        AKUUKAN_E19_RESTRICTION_COUNT_PER_PLAYER,
        input.random
      );

    for (const tileId of selectedTileIds) {
      restrictions.push({
        playerId: player.playerId,
        tileId
      });
    }
  }

  return restrictions.length > 0
    ? {
        ...clearedAkuukan,
        e19DiscardRestrictions:
          restrictions
      }
    : clearedAkuukan;
}

export function getAkuukanE19ForbiddenTileIds(
  akuukan: AkuukanGameState,
  playerId: string
): readonly string[] {
  if (
    !isEnemyAbilityEnabled(
      akuukan,
      "E-19"
    )
  ) {
    return [];
  }

  return (
    akuukan.e19DiscardRestrictions ?? []
  )
    .filter(
      (restriction) =>
        restriction.playerId === playerId
    )
    .map(
      (restriction) =>
        restriction.tileId
    );
}

export interface AkuukanE19DiscardLegalityInput {
  readonly akuukan: AkuukanGameState;
  readonly playerId: string;
  readonly tileId: string;
}

export function isAkuukanE19DiscardAllowed(
  input: AkuukanE19DiscardLegalityInput
): boolean {
  return !getAkuukanE19ForbiddenTileIds(
    input.akuukan,
    input.playerId
  ).includes(input.tileId);
}

export interface SynchronizeAkuukanE19PlayerHandRestrictionsInput {
  readonly akuukan: AkuukanGameState;
  readonly playerId: string;
  readonly concealedTiles: readonly Tile[];
}

export function synchronizeAkuukanE19PlayerHandRestrictions(
  input:
    SynchronizeAkuukanE19PlayerHandRestrictionsInput
): AkuukanGameState {
  const currentRestrictions =
    input.akuukan.e19DiscardRestrictions;

  if (!currentRestrictions) {
    return input.akuukan;
  }

  const concealedTileIds = new Set(
    input.concealedTiles.map(
      (tile) => tile.id
    )
  );
  const nextRestrictions =
    currentRestrictions.filter(
      (restriction) =>
        restriction.playerId !==
          input.playerId ||
        concealedTileIds.has(
          restriction.tileId
        )
    );

  if (
    nextRestrictions.length ===
    currentRestrictions.length
  ) {
    return input.akuukan;
  }

  if (nextRestrictions.length === 0) {
    return clearAkuukanE19DiscardRestrictions(
      input.akuukan
    );
  }

  return {
    ...input.akuukan,
    e19DiscardRestrictions:
      nextRestrictions
  };
}
