import {
  isTenpai
} from "./hand";
import type {
  Meld,
  Tile
} from "./types";
import {
  isClosedHand
} from "./yaku";

export const RIICHI_DEPOSIT = 1000;

export const MIN_LIVE_WALL_TILES_FOR_RIICHI = 4;

export interface RiichiCheckInput {
  concealedTiles: readonly Tile[];
  melds: readonly Meld[];
  score: number;
  liveWallTileCount: number;
  alreadyRiichi: boolean;
  allowOpenHand?: boolean;
  riichiProhibited?: boolean;
}

function hasDiscardTurnTileCount(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[]
): boolean {
  if (melds.length > 4) {
    return false;
  }

  const expectedConcealedTileCount =
    (4 - melds.length) * 3 + 2;

  return (
    concealedTiles.length ===
    expectedConcealedTileCount
  );
}

function meetsBaseRiichiConditions(
  input: RiichiCheckInput
): boolean {
  return (
    input.riichiProhibited !== true &&
    input.alreadyRiichi === false &&
    Number.isInteger(input.score) &&
    input.score >= RIICHI_DEPOSIT &&
    Number.isInteger(
      input.liveWallTileCount
    ) &&
    input.liveWallTileCount >=
      MIN_LIVE_WALL_TILES_FOR_RIICHI &&
    (
      isClosedHand(input.melds) ||
      input.allowOpenHand === true
    ) &&
    hasDiscardTurnTileCount(
      input.concealedTiles,
      input.melds
    )
  );
}

function removeTileAt(
  tiles: readonly Tile[],
  removeIndex: number
): Tile[] {
  return tiles.filter(
    (_, index) => index !== removeIndex
  );
}

export function getRiichiDiscardTileIds(
  input: RiichiCheckInput
): string[] {
  if (!meetsBaseRiichiConditions(input)) {
    return [];
  }

  return input.concealedTiles.flatMap(
    (tile, index) => {
      const remainingTiles = removeTileAt(
        input.concealedTiles,
        index
      );

      return isTenpai(
        remainingTiles,
        input.melds
      )
        ? [tile.id]
        : [];
    }
  );
}

export function canDeclareRiichi(
  input: RiichiCheckInput
): boolean {
  return (
    getRiichiDiscardTileIds(input)
      .length > 0
  );
}
