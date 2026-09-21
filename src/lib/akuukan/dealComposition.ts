import type {
  Tile
} from "../mahjong/types";
import {
  calculateShanten,
  getTileTypeIndex
} from "../mahjong/hand";
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

export const AKUUKAN_E26_TENPAI_HAND_SIZE =
  13;

const MAHJONG_TILE_TYPE_COUNT = 34;

const THIRTEEN_ORPHANS_TILE_TYPE_INDICES = [
  0,
  8,
  9,
  17,
  18,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33
] as const;

type StandardMeldTileTypeIndices =
  readonly [number, number, number];

export interface ReserveAkuukanE16DoraTripletInput {
  readonly akuukan: AkuukanGameState;
  readonly doraIndicator: Tile;
  readonly availableTiles: readonly Tile[];
}

export interface AkuukanE16DoraTripletReservation {
  readonly reservedTiles: Tile[];
  readonly remainingTiles: Tile[];
}

export interface ReserveAkuukanE26TenpaiHandInput {
  readonly akuukan: AkuukanGameState;
  readonly availableTiles: readonly Tile[];
  readonly random?: () => number;
}

export interface AkuukanE26TenpaiHandReservation {
  readonly reservedTiles: Tile[];
  readonly remainingTiles: Tile[];
  readonly tenpaiGuaranteed: boolean;
}

function createAvailableTileTypeCounts(
  availableTiles: readonly Tile[]
): number[] {
  const counts = Array<number>(
    MAHJONG_TILE_TYPE_COUNT
  ).fill(0);

  for (const tile of availableTiles) {
    counts[getTileTypeIndex(tile)] += 1;
  }

  return counts;
}

function createStandardMeldCandidates():
  StandardMeldTileTypeIndices[] {
  const candidates:
    StandardMeldTileTypeIndices[] = [];

  for (const suitOffset of [0, 9, 18]) {
    for (
      let startRankIndex = 0;
      startRankIndex <= 6;
      startRankIndex += 1
    ) {
      const first =
        suitOffset + startRankIndex;

      candidates.push([
        first,
        first + 1,
        first + 2
      ]);
    }
  }

  for (
    let tileTypeIndex = 0;
    tileTypeIndex <
    MAHJONG_TILE_TYPE_COUNT;
    tileTypeIndex += 1
  ) {
    candidates.push([
      tileTypeIndex,
      tileTypeIndex,
      tileTypeIndex
    ]);
  }

  return candidates;
}

const STANDARD_MELD_CANDIDATES =
  createStandardMeldCandidates();

function canTakeTileTypes(
  counts: readonly number[],
  tileTypeIndices: readonly number[]
): boolean {
  const requiredCounts = new Map<
    number,
    number
  >();

  for (const tileTypeIndex of
    tileTypeIndices) {
    requiredCounts.set(
      tileTypeIndex,
      (requiredCounts.get(tileTypeIndex) ??
        0) + 1
    );
  }

  return [...requiredCounts].every(
    ([tileTypeIndex, requiredCount]) =>
      counts[tileTypeIndex] >=
      requiredCount
  );
}

function changeTileTypeCounts(
  counts: number[],
  tileTypeIndices: readonly number[],
  amount: 1 | -1
): void {
  for (const tileTypeIndex of
    tileTypeIndices) {
    counts[tileTypeIndex] += amount;
  }
}

function findRandomStandardTenpaiTileTypes(
  availableCounts: readonly number[],
  random: () => number
): number[] | null {
  // Choose the shape before tile types: equal sampling of all 55 melds
  // overweights the 34 triplets relative to the 21 sequences.
  // These are game-balance weights, not measured real-world frequencies.
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const counts = [...availableCounts];
    const selected: number[] = [];
    const roll = random();
    const tripletCount = roll < 0.45 ? 0 : roll < 0.9 ? 1 : 2;
    // Also prevent repeated/overlapping sequences from constructing a
    // disguised three/four-triplet hand (e.g. 123 + 123 + 123).
    const hasTooManyTripletTypes = (extra: readonly number[]) => {
      const handCounts = Array<number>(MAHJONG_TILE_TYPE_COUNT).fill(0);
      for (const type of [...selected, ...extra]) handCounts[type] += 1;
      return handCounts.filter(count => count >= 3).length > 2;
    };
    for (let meld = 0; meld < 4; meld += 1) {
      const wantsTriplet = meld < tripletCount;
      const candidates = STANDARD_MELD_CANDIDATES.filter(candidate =>
        (candidate[0] === candidate[1]) === wantsTriplet &&
        canTakeTileTypes(counts, candidate) &&
        !hasTooManyTripletTypes(candidate)
      );
      if (candidates.length === 0) break;
      const candidate = candidates[Math.floor(random() * candidates.length)];
      selected.push(...candidate);
      changeTileTypeCounts(counts, candidate, -1);
    }
    if (selected.length !== 12) continue;
    const pairs = counts.flatMap((count, index) =>
      count >= 2 && !hasTooManyTripletTypes([index, index]) ? [index] : []
    );
    if (pairs.length === 0) continue;
    const pair = pairs[Math.floor(random() * pairs.length)];
    selected.push(pair, pair);
    selected.splice(Math.floor(random() * selected.length), 1);
    return selected;
  }
  return null;
}

function findStandardTenpaiTileTypes(
  availableCounts: readonly number[]
): number[] | null {
  const counts = [...availableCounts];
  const selectedTileTypeIndices:
    number[] = [];

  function search(
    completedMeldCount: number,
    firstCandidateIndex: number
  ): number[] | null {
    if (completedMeldCount === 4) {
      const liveWaitTileTypeIndex =
        counts.findIndex(
          (count) => count >= 2
        );
      const waitTileTypeIndex =
        liveWaitTileTypeIndex >= 0
          ? liveWaitTileTypeIndex
          : counts.findIndex(
              (count) => count >= 1
            );

      if (waitTileTypeIndex < 0) {
        return null;
      }

      return [
        ...selectedTileTypeIndices,
        waitTileTypeIndex
      ];
    }

    for (
      let candidateIndex =
        firstCandidateIndex;
      candidateIndex <
      STANDARD_MELD_CANDIDATES.length;
      candidateIndex += 1
    ) {
      const candidate =
        STANDARD_MELD_CANDIDATES[
          candidateIndex
        ];

      if (
        !canTakeTileTypes(
          counts,
          candidate
        )
      ) {
        continue;
      }

      changeTileTypeCounts(
        counts,
        candidate,
        -1
      );
      selectedTileTypeIndices.push(
        ...candidate
      );

      const result = search(
        completedMeldCount + 1,
        candidateIndex
      );

      if (result !== null) {
        return result;
      }

      selectedTileTypeIndices.splice(-3);
      changeTileTypeCounts(
        counts,
        candidate,
        1
      );
    }

    return null;
  }

  return search(0, 0);
}

function findSevenPairsTenpaiTileTypes(
  availableCounts: readonly number[]
): number[] | null {
  const pairTileTypeIndices =
    availableCounts
      .map((count, tileTypeIndex) => ({
        count,
        tileTypeIndex
      }))
      .filter(({ count }) => count >= 2)
      .map(
        ({ tileTypeIndex }) =>
          tileTypeIndex
      );

  if (pairTileTypeIndices.length < 6) {
    return null;
  }

  const selectedPairTileTypeIndices =
    pairTileTypeIndices.slice(0, 6);
  const selectedPairTileTypeIndexSet =
    new Set(
      selectedPairTileTypeIndices
    );
  const waitTileTypeIndex =
    availableCounts.findIndex(
      (count, tileTypeIndex) =>
        count >= 1 &&
        !selectedPairTileTypeIndexSet.has(
          tileTypeIndex
        )
    );

  if (waitTileTypeIndex < 0) {
    return null;
  }

  return [
    ...selectedPairTileTypeIndices.flatMap(
      (tileTypeIndex) => [
        tileTypeIndex,
        tileTypeIndex
      ]
    ),
    waitTileTypeIndex
  ];
}

function findThirteenOrphansTenpaiTileTypes(
  availableCounts: readonly number[]
): number[] | null {
  if (
    !THIRTEEN_ORPHANS_TILE_TYPE_INDICES.every(
      (tileTypeIndex) =>
        availableCounts[tileTypeIndex] >= 1
    )
  ) {
    return null;
  }

  return [
    ...THIRTEEN_ORPHANS_TILE_TYPE_INDICES
  ];
}

function materializeReservedTiles(
  availableTiles: readonly Tile[],
  selectedTileTypeIndices:
    readonly number[]
): Tile[] | null {
  const requiredCounts = Array<number>(
    MAHJONG_TILE_TYPE_COUNT
  ).fill(0);

  for (const tileTypeIndex of
    selectedTileTypeIndices) {
    requiredCounts[tileTypeIndex] += 1;
  }

  const reservedTiles: Tile[] = [];

  for (const tile of availableTiles) {
    const tileTypeIndex =
      getTileTypeIndex(tile);

    if (requiredCounts[tileTypeIndex] <= 0) {
      continue;
    }

    reservedTiles.push(tile);
    requiredCounts[tileTypeIndex] -= 1;
  }

  return reservedTiles.length ===
    selectedTileTypeIndices.length
    ? reservedTiles
    : null;
}

function createNoE26Reservation(
  availableTiles: readonly Tile[]
): AkuukanE26TenpaiHandReservation {
  return {
    reservedTiles: [],
    remainingTiles: [...availableTiles],
    tenpaiGuaranteed: false
  };
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

export function reserveAkuukanE26TenpaiHand(
  input:
    ReserveAkuukanE26TenpaiHandInput
): AkuukanE26TenpaiHandReservation {
  if (
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-26"
    ) ||
    input.availableTiles.length <
      AKUUKAN_E26_TENPAI_HAND_SIZE
  ) {
    return createNoE26Reservation(
      input.availableTiles
    );
  }

  const availableCounts =
    createAvailableTileTypeCounts(
      input.availableTiles
    );
  const selectedTileTypeIndices =
    findRandomStandardTenpaiTileTypes(
      availableCounts,
      input.random ?? Math.random
    ) ??
    findStandardTenpaiTileTypes(
      availableCounts
    ) ??
    findSevenPairsTenpaiTileTypes(
      availableCounts
    ) ??
    findThirteenOrphansTenpaiTileTypes(
      availableCounts
    );

  if (selectedTileTypeIndices === null) {
    return createNoE26Reservation(
      input.availableTiles
    );
  }

  const reservedTiles =
    materializeReservedTiles(
      input.availableTiles,
      selectedTileTypeIndices
    );

  if (
    reservedTiles === null ||
    reservedTiles.length !==
      AKUUKAN_E26_TENPAI_HAND_SIZE ||
    calculateShanten(reservedTiles).minimum !==
      0
  ) {
    return createNoE26Reservation(
      input.availableTiles
    );
  }

  const reservedTileIds = new Set(
    reservedTiles.map((tile) => tile.id)
  );

  return {
    reservedTiles,
    remainingTiles:
      input.availableTiles.filter(
        (tile) =>
          !reservedTileIds.has(tile.id)
      ),
    tenpaiGuaranteed: true
  };
}
