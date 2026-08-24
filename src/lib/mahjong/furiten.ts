import {
  getWinningTileTypes
} from "./hand";
import type {
  TileType
} from "./hand";
import type {
  Discard,
  Meld,
  Tile
} from "./types";

export interface DiscardFuritenInput {
  concealedTiles: readonly Tile[];
  melds?: readonly Meld[];
  discards: readonly Discard[];
}

export interface FuritenCheckInput
  extends DiscardFuritenInput {
  temporaryFuriten?: boolean;
  riichiFuriten?: boolean;
}

export interface FuritenStatus {
  isFuriten: boolean;
  discardFuriten: boolean;
  temporaryFuriten: boolean;
  riichiFuriten: boolean;
  winningTileTypes: TileType[];
}

function getTileTypeKey(
  tile: TileType
): string {
  return `${tile.suit}-${tile.rank}`;
}

function getDiscardedTileTypeKeys(
  discards: readonly Discard[]
): Set<string> {
  return new Set(
    discards.map((discard) =>
      getTileTypeKey(discard.tile)
    )
  );
}

function hasDiscardedWinningTile(
  winningTileTypes: readonly TileType[],
  discards: readonly Discard[]
): boolean {
  const discardedTileTypeKeys =
    getDiscardedTileTypeKeys(discards);

  return winningTileTypes.some(
    (tileType) =>
      discardedTileTypeKeys.has(
        getTileTypeKey(tileType)
      )
  );
}

export function isDiscardFuriten(
  input: DiscardFuritenInput
): boolean {
  const winningTileTypes =
    getWinningTileTypes(
      input.concealedTiles,
      input.melds ?? []
    );

  return hasDiscardedWinningTile(
    winningTileTypes,
    input.discards
  );
}

export function getFuritenStatus(
  input: FuritenCheckInput
): FuritenStatus {
  const winningTileTypes =
    getWinningTileTypes(
      input.concealedTiles,
      input.melds ?? []
    );

  const discardFuriten =
    hasDiscardedWinningTile(
      winningTileTypes,
      input.discards
    );

  const temporaryFuriten =
    input.temporaryFuriten === true;

  const riichiFuriten =
    input.riichiFuriten === true;

  return {
    isFuriten:
      discardFuriten ||
      temporaryFuriten ||
      riichiFuriten,
    discardFuriten,
    temporaryFuriten,
    riichiFuriten,
    winningTileTypes
  };
}
