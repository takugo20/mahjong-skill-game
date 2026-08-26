import {
  getWinningTileTypes
} from "./hand";
import type {
  ConcealedMeldGroup,
  StandardWinningDecomposition,
  TileType
} from "./hand";
import type {
  Meld,
  Tile,
  Wind
} from "./types";
import type {
  WinMethod
} from "./yaku";
import {
  evaluateWinningHand
} from "./winning";
import type {
  WinningHandCandidate
} from "./winning";

const WIN_METHODS: WinMethod[] = [
  "tsumo",
  "ron"
];

export interface RiichiClosedKanCheckInput {
  concealedTiles: readonly Tile[];
  melds: readonly Meld[];
  drawnTileId: string | null;
  seatWind: Wind;
  prevailingWind: Wind;
}

function isSameTileType(
  left: TileType,
  right: TileType
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function getTileTypeKey(
  tileType: TileType
): string {
  return (
    `${tileType.suit}-` +
    tileType.rank
  );
}

function getGroupKey(
  group: ConcealedMeldGroup
): string {
  if (group.kind === "sequence") {
    return (
      `sequence-${group.suit}-` +
      group.startRank
    );
  }

  return (
    `triplet-${group.tile.suit}-` +
    group.tile.rank
  );
}

function getShapeKey(
  decomposition:
    StandardWinningDecomposition
): string {
  const meldKey =
    decomposition.concealedMelds
      .map(getGroupKey)
      .sort()
      .join("/");

  return (
    `pair-${decomposition.pair.suit}-` +
    `${decomposition.pair.rank}|` +
    meldKey
  );
}

function removeKanTriplet(
  decomposition:
    StandardWinningDecomposition,
  kanTileType: TileType
): StandardWinningDecomposition | null {
  const tripletIndex =
    decomposition.concealedMelds
      .findIndex(
        (group) =>
          group.kind === "triplet" &&
          isSameTileType(
            group.tile,
            kanTileType
          )
      );

  if (tripletIndex < 0) {
    return null;
  }

  return {
    ...decomposition,
    concealedMelds:
      decomposition.concealedMelds
        .filter(
          (_, index) =>
            index !== tripletIndex
        )
  };
}

function createWinningCandidate(
  tileType: TileType
): Tile {
  return {
    id:
      `riichi-kan-winning-` +
      getTileTypeKey(tileType),
    suit: tileType.suit,
    rank: tileType.rank,
    red: false
  };
}

function getYakuKey(
  candidate: WinningHandCandidate
): string {
  const normalYakuKeys =
    candidate.normalYaku.map(
      (yaku) =>
        `normal-${yaku.id}-${yaku.han}`
    );
  const yakumanKeys =
    candidate.yakuman.map(
      (yaku) =>
        `yakuman-${yaku.id}-` +
        yaku.multiplier
    );

  return [
    ...normalYakuKeys,
    ...yakumanKeys
  ]
    .sort()
    .join("/");
}

function getWinningSignatures(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[],
  winningTile: TileType,
  winMethod: WinMethod,
  seatWind: Wind,
  prevailingWind: Wind,
  kanTileType?: TileType
): string[] | null {
  const winningCandidate =
    createWinningCandidate(
      winningTile
    );
  const evaluation = evaluateWinningHand({
    concealedTiles: [
      ...concealedTiles,
      winningCandidate
    ],
    melds,
    winningTile,
    winMethod,
    seatWind,
    prevailingWind,
    riichi: true
  });

  if (!evaluation.valid) {
    return null;
  }

  const signatures: string[] = [];

  for (
    const candidate of
    evaluation.candidates
  ) {
    if (
      candidate.decomposition.kind !==
      "standard"
    ) {
      return null;
    }

    const shape = kanTileType
      ? removeKanTriplet(
          candidate.decomposition,
          kanTileType
        )
      : candidate.decomposition;

    if (!shape) {
      return null;
    }

    signatures.push([
      getShapeKey(shape),
      candidate.waitType,
      winMethod,
      getYakuKey(candidate)
    ].join("|"));
  }

  return [
    ...new Set(signatures)
  ].sort();
}

function haveSameKeys(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (key, index) =>
        key === right[index]
    )
  );
}

function haveSameWinningTileTypes(
  before: readonly TileType[],
  after: readonly TileType[]
): boolean {
  const beforeKeys = before
    .map(getTileTypeKey)
    .sort();
  const afterKeys = after
    .map(getTileTypeKey)
    .sort();

  return haveSameKeys(
    beforeKeys,
    afterKeys
  );
}

function hasSameWinningSignatures(
  beforeDrawTiles: readonly Tile[],
  meldsBefore: readonly Meld[],
  afterKanTiles: readonly Tile[],
  meldsAfter: readonly Meld[],
  kanTileType: TileType,
  winningTile: TileType,
  seatWind: Wind,
  prevailingWind: Wind
): boolean {
  return WIN_METHODS.every(
    (winMethod) => {
      const beforeSignatures =
        getWinningSignatures(
          beforeDrawTiles,
          meldsBefore,
          winningTile,
          winMethod,
          seatWind,
          prevailingWind,
          kanTileType
        );
      const afterSignatures =
        getWinningSignatures(
          afterKanTiles,
          meldsAfter,
          winningTile,
          winMethod,
          seatWind,
          prevailingWind
        );

      return (
        beforeSignatures !== null &&
        afterSignatures !== null &&
        haveSameKeys(
          beforeSignatures,
          afterSignatures
        )
      );
    }
  );
}

export function getRiichiClosedKanAllowedTileTypes(
  input: RiichiClosedKanCheckInput
): TileType[] {
  const drawnTile =
    input.concealedTiles.find(
      (tile) =>
        tile.id === input.drawnTileId
    );

  if (!drawnTile) {
    return [];
  }

  const kanTiles =
    input.concealedTiles.filter(
      (tile) =>
        isSameTileType(
          tile,
          drawnTile
        )
    );

  if (kanTiles.length !== 4) {
    return [];
  }

  const kanTileIds = new Set(
    kanTiles.map((tile) => tile.id)
  );
  const beforeDrawTiles =
    input.concealedTiles.filter(
      (tile) =>
        tile.id !== drawnTile.id
    );
  const afterKanTiles =
    input.concealedTiles.filter(
      (tile) =>
        !kanTileIds.has(tile.id)
    );
  const kanTileType: TileType = {
    suit: drawnTile.suit,
    rank: drawnTile.rank
  };
  const afterKanMelds: Meld[] = [
    ...input.melds,
    {
      kind: "closedKan",
      tiles: kanTiles
    }
  ];
  const winningTileTypesBefore =
    getWinningTileTypes(
      beforeDrawTiles,
      input.melds
    );
  const winningTileTypesAfter =
    getWinningTileTypes(
      afterKanTiles,
      afterKanMelds
    );

  if (
    winningTileTypesBefore.length === 0 ||
    !haveSameWinningTileTypes(
      winningTileTypesBefore,
      winningTileTypesAfter
    )
  ) {
    return [];
  }

  const signaturesStaySame =
    winningTileTypesBefore.every(
      (winningTile) =>
        hasSameWinningSignatures(
          beforeDrawTiles,
          input.melds,
          afterKanTiles,
          afterKanMelds,
          kanTileType,
          winningTile,
          input.seatWind,
          input.prevailingWind
        )
    );

  return signaturesStaySame
    ? [kanTileType]
    : [];
}
