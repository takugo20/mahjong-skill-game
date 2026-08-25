import {
  calculateShanten
} from "./hand";
import type {
  AddedKanOption,
  ClosedKanOption,
  SelfKanOption
} from "./kan";
import type {
  Meld,
  PlayerState,
  Tile
} from "./types";

export interface CpuSelfKanDecisionInput {
  player: PlayerState;
  options: readonly SelfKanOption[];
}

export interface CpuSelfKanDecision {
  option: SelfKanOption;
  shantenBefore: number;
  shantenAfter: number;
}

interface SimulatedSelfKan {
  hand: Tile[];
  melds: Meld[];
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

function findUniqueHandTiles(
  hand: readonly Tile[],
  tileIds: readonly string[]
): Tile[] | null {
  if (
    new Set(tileIds).size !==
    tileIds.length
  ) {
    return null;
  }

  const tiles = tileIds
    .map((tileId) =>
      hand.find(
        (tile) => tile.id === tileId
      )
    )
    .filter(
      (tile): tile is Tile =>
        tile !== undefined
    );

  return tiles.length === tileIds.length
    ? tiles
    : null;
}

function removeHandTiles(
  hand: readonly Tile[],
  tiles: readonly Tile[]
): Tile[] {
  const tileIds = new Set(
    tiles.map((tile) => tile.id)
  );

  return hand.filter(
    (tile) => !tileIds.has(tile.id)
  );
}

function simulateClosedKan(
  player: PlayerState,
  option: ClosedKanOption
): SimulatedSelfKan | null {
  const kanTiles = findUniqueHandTiles(
    player.hand,
    option.tileIds
  );
  const firstTile = kanTiles?.[0];

  if (
    !kanTiles ||
    kanTiles.length !== 4 ||
    !firstTile ||
    kanTiles.some(
      (tile) =>
        !isSameTileType(
          tile,
          firstTile
        )
    ) ||
    (
      player.riichi &&
      (
        player.drawnTileId === null ||
        !option.tileIds.includes(
          player.drawnTileId
        )
      )
    )
  ) {
    return null;
  }

  return {
    hand: removeHandTiles(
      player.hand,
      kanTiles
    ),
    melds: [
      ...player.melds,
      {
        kind: "closedKan",
        tiles: kanTiles
      }
    ]
  };
}

function simulateAddedKan(
  player: PlayerState,
  option: AddedKanOption
): SimulatedSelfKan | null {
  if (player.riichi) {
    return null;
  }

  const originalMeld =
    player.melds[option.meldIndex];
  const addedTile = player.hand.find(
    (tile) => tile.id === option.tileId
  );
  const originalTile =
    originalMeld?.tiles[0];

  if (
    !originalMeld ||
    originalMeld.kind !== "pon" ||
    originalMeld.tiles.length !== 3 ||
    !addedTile ||
    !originalTile ||
    !isSameTileType(
      addedTile,
      originalTile
    )
  ) {
    return null;
  }

  return {
    hand: removeHandTiles(
      player.hand,
      [addedTile]
    ),
    melds: player.melds.map(
      (meld, meldIndex): Meld =>
        meldIndex === option.meldIndex
          ? {
              ...originalMeld,
              kind: "addedKan",
              tiles: [
                ...originalMeld.tiles,
                addedTile
              ]
            }
          : meld
    )
  };
}

function simulateSelfKan(
  player: PlayerState,
  option: SelfKanOption
): SimulatedSelfKan | null {
  return option.kind === "closedKan"
    ? simulateClosedKan(player, option)
    : simulateAddedKan(player, option);
}

export function chooseCpuSelfKan(
  input: CpuSelfKanDecisionInput
): CpuSelfKanDecision | null {
  if (
    input.player.seat === 0 ||
    input.player.drawnTileId === null ||
    input.options.length === 0
  ) {
    return null;
  }

  const shantenBefore = calculateShanten(
    input.player.hand,
    input.player.melds
  ).minimum;

  if (!Number.isFinite(shantenBefore)) {
    return null;
  }

  const candidates = input.options
    .map(
      (option): CpuSelfKanDecision | null => {
        const simulated = simulateSelfKan(
          input.player,
          option
        );

        if (!simulated) {
          return null;
        }

        const shantenAfter = calculateShanten(
          simulated.hand,
          simulated.melds
        ).minimum;

        if (
          !Number.isFinite(shantenAfter) ||
          shantenAfter > shantenBefore
        ) {
          return null;
        }

        return {
          option,
          shantenBefore,
          shantenAfter
        };
      }
    )
    .filter(
      (
        decision
      ): decision is CpuSelfKanDecision =>
        decision !== null
    )
    .sort((left, right) => {
      if (
        left.shantenAfter !==
        right.shantenAfter
      ) {
        return (
          left.shantenAfter -
          right.shantenAfter
        );
      }

      if (
        left.option.kind !==
        right.option.kind
      ) {
        return left.option.kind ===
          "closedKan"
          ? -1
          : 1;
      }

      return left.option.id.localeCompare(
        right.option.id
      );
    });

  return candidates[0] ?? null;
}
