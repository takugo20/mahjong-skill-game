import type {
  MeldCallOption,
  SeatIndex,
  Tile
} from "./types";

export interface MeldCallOptionInput {
  callerSeat: SeatIndex;
  discarderSeat: SeatIndex;
  calledTile: Tile;
  concealedTiles: readonly Tile[];
  callerRiichi: boolean;
  liveWallTileCount: number;
}

interface ChiPattern {
  handRanks: [number, number];
  sujiForbiddenRank: number | null;
}

function nextSeat(
  seat: SeatIndex
): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}

function isSameTileType(
  left: Tile,
  right: Tile
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function canOfferMeldCall(
  input: MeldCallOptionInput
): boolean {
  return (
    input.callerSeat !==
      input.discarderSeat &&
    !input.callerRiichi &&
    input.liveWallTileCount > 0
  );
}

function createTilePairs(
  tiles: readonly Tile[]
): Array<[Tile, Tile]> {
  const pairs: Array<[Tile, Tile]> = [];

  for (
    let leftIndex = 0;
    leftIndex < tiles.length - 1;
    leftIndex += 1
  ) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < tiles.length;
      rightIndex += 1
    ) {
      pairs.push([
        tiles[leftIndex],
        tiles[rightIndex]
      ]);
    }
  }

  return pairs;
}

function getRemainingTiles(
  concealedTiles: readonly Tile[],
  handTiles: readonly [Tile, Tile]
): Tile[] {
  const usedTileIds = new Set(
    handTiles.map((tile) => tile.id)
  );

  return concealedTiles.filter(
    (tile) => !usedTileIds.has(tile.id)
  );
}

function createOption(
  input: MeldCallOptionInput,
  kind: MeldCallOption["kind"],
  handTiles: [Tile, Tile]
): MeldCallOption {
  const handTileIds: [string, string] = [
    handTiles[0].id,
    handTiles[1].id
  ];

  return {
    id: [
      kind,
      input.callerSeat,
      input.discarderSeat,
      input.calledTile.id,
      ...handTileIds
    ].join(":"),
    kind,
    callerSeat: input.callerSeat,
    discarderSeat: input.discarderSeat,
    calledTileId: input.calledTile.id,
    handTileIds
  };
}

function hasLegalPonDiscard(
  input: MeldCallOptionInput,
  handTiles: [Tile, Tile]
): boolean {
  return getRemainingTiles(
    input.concealedTiles,
    handTiles
  ).some(
    (tile) =>
      !isSameTileType(
        tile,
        input.calledTile
      )
  );
}

export function getPonCallOptions(
  input: MeldCallOptionInput
): MeldCallOption[] {
  if (!canOfferMeldCall(input)) {
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

  return createTilePairs(matchingTiles)
    .filter((handTiles) =>
      hasLegalPonDiscard(
        input,
        handTiles
      )
    )
    .map((handTiles) =>
      createOption(
        input,
        "pon",
        handTiles
      )
    );
}

function getChiPatterns(
  calledRank: number
): ChiPattern[] {
  const patterns: ChiPattern[] = [
    {
      handRanks: [
        calledRank - 2,
        calledRank - 1
      ],
      sujiForbiddenRank:
        calledRank - 3
    },
    {
      handRanks: [
        calledRank - 1,
        calledRank + 1
      ],
      sujiForbiddenRank: null
    },
    {
      handRanks: [
        calledRank + 1,
        calledRank + 2
      ],
      sujiForbiddenRank:
        calledRank + 3
    }
  ];

  return patterns
    .filter((pattern) =>
      pattern.handRanks.every(
        (rank) =>
          rank >= 1 && rank <= 9
      )
    )
    .map((pattern) => ({
      ...pattern,
      sujiForbiddenRank:
        pattern.sujiForbiddenRank !== null &&
        pattern.sujiForbiddenRank >= 1 &&
        pattern.sujiForbiddenRank <= 9
          ? pattern.sujiForbiddenRank
          : null
    }));
}

function hasLegalChiDiscard(
  input: MeldCallOptionInput,
  handTiles: [Tile, Tile],
  sujiForbiddenRank: number | null
): boolean {
  return getRemainingTiles(
    input.concealedTiles,
    handTiles
  ).some((tile) => {
    if (
      isSameTileType(
        tile,
        input.calledTile
      )
    ) {
      return false;
    }

    return !(
      sujiForbiddenRank !== null &&
      tile.suit === input.calledTile.suit &&
      tile.rank === sujiForbiddenRank
    );
  });
}

export function getChiCallOptions(
  input: MeldCallOptionInput
): MeldCallOption[] {
  if (
    !canOfferMeldCall(input) ||
    input.calledTile.suit === "honor" ||
    input.callerSeat !==
      nextSeat(input.discarderSeat)
  ) {
    return [];
  }

  const options: MeldCallOption[] = [];

  for (
    const pattern of getChiPatterns(
      input.calledTile.rank
    )
  ) {
    const leftTiles =
      input.concealedTiles.filter(
        (tile) =>
          tile.suit ===
            input.calledTile.suit &&
          tile.rank ===
            pattern.handRanks[0]
      );
    const rightTiles =
      input.concealedTiles.filter(
        (tile) =>
          tile.suit ===
            input.calledTile.suit &&
          tile.rank ===
            pattern.handRanks[1]
      );

    for (const leftTile of leftTiles) {
      for (const rightTile of rightTiles) {
        const handTiles: [Tile, Tile] = [
          leftTile,
          rightTile
        ];

        if (
          !hasLegalChiDiscard(
            input,
            handTiles,
            pattern.sujiForbiddenRank
          )
        ) {
          continue;
        }

        options.push(
          createOption(
            input,
            "chi",
            handTiles
          )
        );
      }
    }
  }

  return options;
}

export function getMeldCallOptions(
  input: MeldCallOptionInput
): MeldCallOption[] {
  return [
    ...getPonCallOptions(input),
    ...getChiCallOptions(input)
  ];
}
