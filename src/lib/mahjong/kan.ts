import {
  getTileTypeIndex
} from "./hand";
import type {
  Meld,
  SeatIndex,
  Tile
} from "./types";

export const MAX_KAN_COUNT = 4;

export const MAX_RINSHAN_DRAW_COUNT = 4;

interface KanAvailabilityInput {
  kanCount: number;
  rinshanDrawCount: number;
  liveWallTileCount: number;
}

export interface ClosedKanOption {
  id: string;
  kind: "closedKan";
  tileIds: [
    string,
    string,
    string,
    string
  ];
}

export interface AddedKanOption {
  id: string;
  kind: "addedKan";
  meldIndex: number;
  tileId: string;
}

export type SelfKanOption =
  | ClosedKanOption
  | AddedKanOption;

export interface SelfKanOptionInput
  extends KanAvailabilityInput {
  concealedTiles: readonly Tile[];
  melds: readonly Meld[];
  riichi: boolean;
  drawnTileId: string | null;
  riichiClosedKanAllowedTileTypes?:
    readonly Pick<Tile, "suit" | "rank">[];
}

export interface OpenKanCallOption {
  id: string;
  kind: "openKan";
  callerSeat: SeatIndex;
  discarderSeat: SeatIndex;
  calledTileId: string;
  handTileIds: [
    string,
    string,
    string
  ];
}

export interface OpenKanCallOptionInput
  extends KanAvailabilityInput {
  callerSeat: SeatIndex;
  discarderSeat: SeatIndex;
  calledTile: Tile;
  concealedTiles: readonly Tile[];
  callerRiichi: boolean;
}

function isSameTileType(
  left: Pick<Tile, "suit" | "rank">,
  right: Pick<Tile, "suit" | "rank">
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function canUseRinshanTile(
  input: KanAvailabilityInput
): boolean {
  return (
    Number.isInteger(input.kanCount) &&
    input.kanCount >= 0 &&
    input.kanCount < MAX_KAN_COUNT &&
    Number.isInteger(
      input.rinshanDrawCount
    ) &&
    input.rinshanDrawCount >= 0 &&
    input.rinshanDrawCount <
      MAX_RINSHAN_DRAW_COUNT &&
    Number.isInteger(
      input.liveWallTileCount
    ) &&
    input.liveWallTileCount > 0
  );
}

function groupTilesByType(
  tiles: readonly Tile[]
): Tile[][] {
  const groups = new Map<
    number,
    Tile[]
  >();

  for (const tile of tiles) {
    const typeIndex =
      getTileTypeIndex(tile);
    const group = groups.get(typeIndex);

    if (group) {
      group.push(tile);
    } else {
      groups.set(typeIndex, [tile]);
    }
  }

  return [...groups.entries()]
    .sort(
      ([leftIndex], [rightIndex]) =>
        leftIndex - rightIndex
    )
    .map(([, group]) => group);
}

function getFourTileIds(
  tiles: readonly Tile[]
): ClosedKanOption["tileIds"] | null {
  if (tiles.length !== 4) {
    return null;
  }

  return [
    tiles[0].id,
    tiles[1].id,
    tiles[2].id,
    tiles[3].id
  ];
}

function canDeclareRiichiClosedKan(
  input: SelfKanOptionInput,
  tiles: readonly Tile[]
): boolean {
  if (!input.riichi) {
    return true;
  }

  if (
    input.drawnTileId === null ||
    !tiles.some(
      (tile) =>
        tile.id === input.drawnTileId
    )
  ) {
    return false;
  }

  const tile = tiles[0];

  return (
    tile !== undefined &&
    (
      input
        .riichiClosedKanAllowedTileTypes ??
      []
    ).some((allowedTileType) =>
      isSameTileType(
        tile,
        allowedTileType
      )
    )
  );
}

export function getClosedKanOptions(
  input: SelfKanOptionInput
): ClosedKanOption[] {
  if (!canUseRinshanTile(input)) {
    return [];
  }

  return groupTilesByType(
    input.concealedTiles
  ).flatMap((tiles) => {
    const tileIds = getFourTileIds(tiles);

    if (
      tileIds === null ||
      !canDeclareRiichiClosedKan(
        input,
        tiles
      )
    ) {
      return [];
    }

    const tile = tiles[0];

    return [{
      id:
        `closedKan:${tile.suit}:` +
        `${tile.rank}:` +
        tileIds.join(":"),
      kind: "closedKan" as const,
      tileIds
    }];
  });
}

export function getAddedKanOptions(
  input: SelfKanOptionInput
): AddedKanOption[] {
  if (
    !canUseRinshanTile(input) ||
    input.riichi
  ) {
    return [];
  }

  return input.melds.flatMap(
    (meld, meldIndex) => {
      if (
        meld.kind !== "pon" ||
        meld.tiles.length !== 3
      ) {
        return [];
      }

      const meldTile = meld.tiles[0];

      if (!meldTile) {
        return [];
      }

      const matchingTiles =
        input.concealedTiles.filter(
          (tile) =>
            isSameTileType(
              tile,
              meldTile
            )
        );

      if (matchingTiles.length !== 1) {
        return [];
      }

      const tile = matchingTiles[0];

      return [{
        id:
          `addedKan:${meldIndex}:` +
          tile.id,
        kind: "addedKan" as const,
        meldIndex,
        tileId: tile.id
      }];
    }
  );
}

export function getSelfKanOptions(
  input: SelfKanOptionInput
): SelfKanOption[] {
  return [
    ...getClosedKanOptions(input),
    ...getAddedKanOptions(input)
  ];
}

export function getOpenKanCallOptions(
  input: OpenKanCallOptionInput
): OpenKanCallOption[] {
  if (
    !canUseRinshanTile(input) ||
    input.callerRiichi ||
    input.callerSeat ===
      input.discarderSeat
  ) {
    return [];
  }

  const matchingTiles =
    input.concealedTiles.filter(
      (tile) =>
        isSameTileType(
          tile,
          input.calledTile
        )
    );

  if (matchingTiles.length !== 3) {
    return [];
  }

  const handTileIds:
    OpenKanCallOption["handTileIds"] = [
      matchingTiles[0].id,
      matchingTiles[1].id,
      matchingTiles[2].id
    ];

  return [{
    id: [
      "openKan",
      input.callerSeat,
      input.discarderSeat,
      input.calledTile.id,
      ...handTileIds
    ].join(":"),
    kind: "openKan",
    callerSeat: input.callerSeat,
    discarderSeat:
      input.discarderSeat,
    calledTileId:
      input.calledTile.id,
    handTileIds
  }];
}
