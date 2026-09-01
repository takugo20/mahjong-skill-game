import {
  calculateShanten,
  getTileTypeIndex
} from "../mahjong/hand";
import type {
  Tile
} from "../mahjong/types";
import type {
  AkuukanGameState
} from "./types";
import {
  isEnemyAbilityEnabled
} from "./winningEvaluationEnemyAbilityAdjustments";

export const AKUUKAN_E29_HAND_SIZE = 13;

export const AKUUKAN_E29_SELECTED_ENEMY_MAX_SHANTEN =
  1;

export const AKUUKAN_E29_OTHER_PLAYER_MIN_SHANTEN =
  4;

const MAHJONG_TILE_TYPE_COUNT = 34;
const SELECTED_ENEMY_SEAT = 2;

const OTHER_PLAYER_SEATS = [
  0,
  1,
  3
] as const;

const SUIT_OFFSETS = [0, 9, 18] as const;

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

const HONOR_TILE_TYPE_INDICES = [
  27,
  28,
  29,
  30,
  31,
  32,
  33
] as const;

const ISOLATED_RANK_INDEX_GROUPS = [
  [0, 3, 6],
  [0, 3, 7],
  [0, 3, 8],
  [0, 4, 7],
  [0, 4, 8],
  [0, 5, 8],
  [1, 4, 7],
  [1, 4, 8],
  [1, 5, 8],
  [2, 5, 8]
] as const;

type StandardMeldTileTypeIndices =
  readonly [number, number, number];

type TileTypeSelectionsBySeat = [
  number[],
  number[],
  number[],
  number[]
];

export type AkuukanE29ReservedTilesBySeat = [
  Tile[],
  Tile[],
  Tile[],
  Tile[]
];

export interface ReserveAkuukanE29ShantenHandsInput {
  readonly akuukan: AkuukanGameState;
  readonly availableTiles: readonly Tile[];
}

export interface AkuukanE29ShantenHandReservation {
  readonly reservedTilesBySeat:
    AkuukanE29ReservedTilesBySeat;
  readonly remainingTiles: Tile[];
  readonly constraintsSatisfied: boolean;
}

function createEmptyTileTypeSelectionsBySeat():
  TileTypeSelectionsBySeat {
  return [[], [], [], []];
}

function createEmptyReservedTilesBySeat():
  AkuukanE29ReservedTilesBySeat {
  return [[], [], [], []];
}

function createNoE29Reservation(
  availableTiles: readonly Tile[]
): AkuukanE29ShantenHandReservation {
  return {
    reservedTilesBySeat:
      createEmptyReservedTilesBySeat(),
    remainingTiles: [...availableTiles],
    constraintsSatisfied: false
  };
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

function createTileTypePriorityData(
  availableTiles: readonly Tile[]
): {
  priorityOrder: number[];
  firstPositions: number[];
} {
  const firstPositions = Array<number>(
    MAHJONG_TILE_TYPE_COUNT
  ).fill(Number.POSITIVE_INFINITY);

  availableTiles.forEach((tile, position) => {
    const tileTypeIndex =
      getTileTypeIndex(tile);

    if (
      firstPositions[tileTypeIndex] ===
      Number.POSITIVE_INFINITY
    ) {
      firstPositions[tileTypeIndex] =
        position;
    }
  });

  const priorityOrder = Array.from(
    {
      length: MAHJONG_TILE_TYPE_COUNT
    },
    (_, tileTypeIndex) => tileTypeIndex
  ).sort(
    (first, second) =>
      firstPositions[first] -
        firstPositions[second] ||
      first - second
  );

  return {
    priorityOrder,
    firstPositions
  };
}

function createStandardMeldCandidates():
  StandardMeldTileTypeIndices[] {
  const candidates:
    StandardMeldTileTypeIndices[] = [];

  for (const suitOffset of SUIT_OFFSETS) {
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

function prioritizeStandardMeldCandidates(
  firstPositions: readonly number[]
): StandardMeldTileTypeIndices[] {
  return [
    ...STANDARD_MELD_CANDIDATES
  ].sort((first, second) => {
    const firstPriority = first.reduce(
      (total, tileTypeIndex) =>
        total +
        firstPositions[tileTypeIndex],
      0
    );
    const secondPriority = second.reduce(
      (total, tileTypeIndex) =>
        total +
        firstPositions[tileTypeIndex],
      0
    );

    return firstPriority - secondPriority;
  });
}

function createRequiredTileTypeCounts(
  tileTypeIndices: readonly number[]
): Map<number, number> {
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

  return requiredCounts;
}

function canTakeBalancedMeld(
  remainingCounts: readonly number[],
  selectedCounts: readonly number[],
  candidate:
    StandardMeldTileTypeIndices,
  maximumSelectedCount: number
): boolean {
  const requiredCounts =
    createRequiredTileTypeCounts(candidate);

  return [...requiredCounts].every(
    ([tileTypeIndex, requiredCount]) =>
      remainingCounts[tileTypeIndex] >=
        requiredCount &&
      selectedCounts[tileTypeIndex] +
        requiredCount <=
        maximumSelectedCount
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

function findWaitTileTypeIndex(
  remainingCounts: readonly number[],
  selectedCounts: readonly number[],
  priorityOrder: readonly number[],
  maximumSelectedCount: number
): number | null {
  const conditions = [
    (
      remainingCount: number,
      selectedCount: number
    ) =>
      remainingCount >= 2 &&
      selectedCount === 0,
    (
      remainingCount: number,
      selectedCount: number
    ) =>
      remainingCount >= 1 &&
      selectedCount === 0,
    (
      remainingCount: number,
      selectedCount: number
    ) =>
      remainingCount >= 2 &&
      selectedCount < maximumSelectedCount,
    (
      remainingCount: number,
      selectedCount: number
    ) =>
      remainingCount >= 1 &&
      selectedCount < maximumSelectedCount
  ];

  for (const condition of conditions) {
    const tileTypeIndex =
      priorityOrder.find((currentIndex) =>
        condition(
          remainingCounts[currentIndex],
          selectedCounts[currentIndex]
        )
      );

    if (tileTypeIndex !== undefined) {
      return tileTypeIndex;
    }
  }

  return null;
}

function findBalancedStandardTenpaiTileTypes(
  availableCounts: readonly number[],
  priorityOrder: readonly number[],
  meldCandidates:
    readonly StandardMeldTileTypeIndices[]
): number[] | null {
  for (
    let maximumSelectedCount = 1;
    maximumSelectedCount <= 4;
    maximumSelectedCount += 1
  ) {
    const remainingCounts = [
      ...availableCounts
    ];
    const selectedCounts = Array<number>(
      MAHJONG_TILE_TYPE_COUNT
    ).fill(0);
    const selectedTileTypeIndices:
      number[] = [];

    function search(
      completedMeldCount: number,
      firstCandidateIndex: number
    ): number[] | null {
      if (completedMeldCount === 4) {
        const waitTileTypeIndex =
          findWaitTileTypeIndex(
            remainingCounts,
            selectedCounts,
            priorityOrder,
            maximumSelectedCount
          );

        return waitTileTypeIndex === null
          ? null
          : [
              ...selectedTileTypeIndices,
              waitTileTypeIndex
            ];
      }

      for (
        let candidateIndex =
          firstCandidateIndex;
        candidateIndex <
        meldCandidates.length;
        candidateIndex += 1
      ) {
        const candidate =
          meldCandidates[candidateIndex];

        if (
          !canTakeBalancedMeld(
            remainingCounts,
            selectedCounts,
            candidate,
            maximumSelectedCount
          )
        ) {
          continue;
        }

        changeTileTypeCounts(
          remainingCounts,
          candidate,
          -1
        );
        changeTileTypeCounts(
          selectedCounts,
          candidate,
          1
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
          selectedCounts,
          candidate,
          -1
        );
        changeTileTypeCounts(
          remainingCounts,
          candidate,
          1
        );
      }

      return null;
    }

    const result = search(0, 0);

    if (result !== null) {
      return result;
    }
  }

  return null;
}

function findSevenPairsTenpaiTileTypes(
  availableCounts: readonly number[],
  priorityOrder: readonly number[]
): number[] | null {
  const pairTileTypeIndices =
    priorityOrder.filter(
      (tileTypeIndex) =>
        availableCounts[tileTypeIndex] >= 2
    );

  if (pairTileTypeIndices.length < 6) {
    return null;
  }

  const selectedPairs =
    pairTileTypeIndices.slice(0, 6);
  const selectedPairSet = new Set(
    selectedPairs
  );
  const waitTileTypeIndex =
    priorityOrder.find(
      (tileTypeIndex) =>
        availableCounts[tileTypeIndex] >=
          1 &&
        !selectedPairSet.has(tileTypeIndex)
    );

  if (waitTileTypeIndex === undefined) {
    return null;
  }

  return [
    ...selectedPairs.flatMap(
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
  return THIRTEEN_ORPHANS_TILE_TYPE_INDICES.every(
    (tileTypeIndex) =>
      availableCounts[tileTypeIndex] >= 1
  )
    ? [
        ...THIRTEEN_ORPHANS_TILE_TYPE_INDICES
      ]
    : null;
}

function createHonorGroups(): number[][] {
  const groups: number[][] = [];

  for (
    let first = 0;
    first <= 3;
    first += 1
  ) {
    for (
      let second = first + 1;
      second <= 4;
      second += 1
    ) {
      for (
        let third = second + 1;
        third <= 5;
        third += 1
      ) {
        for (
          let fourth = third + 1;
          fourth <= 6;
          fourth += 1
        ) {
          groups.push([
            HONOR_TILE_TYPE_INDICES[first],
            HONOR_TILE_TYPE_INDICES[second],
            HONOR_TILE_TYPE_INDICES[third],
            HONOR_TILE_TYPE_INDICES[fourth]
          ]);
        }
      }
    }
  }

  return groups;
}

const HONOR_GROUPS = createHonorGroups();

function getDistantHandCandidateScore(
  candidate: readonly number[],
  availableCounts: readonly number[],
  firstPositions: readonly number[]
): {
  minimumAvailability: number;
  totalAvailability: number;
  positionScore: number;
} {
  return {
    minimumAvailability: Math.min(
      ...candidate.map(
        (tileTypeIndex) =>
          availableCounts[tileTypeIndex]
      )
    ),
    totalAvailability: candidate.reduce(
      (total, tileTypeIndex) =>
        total +
        availableCounts[tileTypeIndex],
      0
    ),
    positionScore: candidate.reduce(
      (total, tileTypeIndex) =>
        total +
        firstPositions[tileTypeIndex],
      0
    )
  };
}

function isBetterDistantHandCandidate(
  candidateScore: ReturnType<
    typeof getDistantHandCandidateScore
  >,
  currentScore: ReturnType<
    typeof getDistantHandCandidateScore
  > | null
): boolean {
  if (currentScore === null) {
    return true;
  }

  if (
    candidateScore.minimumAvailability !==
    currentScore.minimumAvailability
  ) {
    return (
      candidateScore.minimumAvailability >
      currentScore.minimumAvailability
    );
  }

  if (
    candidateScore.totalAvailability !==
    currentScore.totalAvailability
  ) {
    return (
      candidateScore.totalAvailability >
      currentScore.totalAvailability
    );
  }

  return (
    candidateScore.positionScore <
    currentScore.positionScore
  );
}

function findDistantHandTileTypes(
  availableCounts: readonly number[],
  firstPositions: readonly number[]
): number[] | null {
  let bestCandidate: number[] | null = null;
  let bestScore: ReturnType<
    typeof getDistantHandCandidateScore
  > | null = null;

  for (const manRanks of
    ISOLATED_RANK_INDEX_GROUPS) {
    for (const pinRanks of
      ISOLATED_RANK_INDEX_GROUPS) {
      for (const souRanks of
        ISOLATED_RANK_INDEX_GROUPS) {
        for (const honors of HONOR_GROUPS) {
          const candidate = [
            ...manRanks.map(
              (rankIndex) => rankIndex
            ),
            ...pinRanks.map(
              (rankIndex) => 9 + rankIndex
            ),
            ...souRanks.map(
              (rankIndex) => 18 + rankIndex
            ),
            ...honors
          ];
          const score =
            getDistantHandCandidateScore(
              candidate,
              availableCounts,
              firstPositions
            );

          if (
            score.minimumAvailability < 1 ||
            !isBetterDistantHandCandidate(
              score,
              bestScore
            )
          ) {
            continue;
          }

          bestCandidate = candidate;
          bestScore = score;
        }
      }
    }
  }

  return bestCandidate;
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

function removeReservedTiles(
  availableTiles: readonly Tile[],
  reservedTiles: readonly Tile[]
): Tile[] {
  const reservedTileIds = new Set(
    reservedTiles.map((tile) => tile.id)
  );

  return availableTiles.filter(
    (tile) =>
      !reservedTileIds.has(tile.id)
  );
}

function materializeReservationsBySeat(
  availableTiles: readonly Tile[],
  selectionsBySeat:
    TileTypeSelectionsBySeat
): {
  reservedTilesBySeat:
    AkuukanE29ReservedTilesBySeat;
  remainingTiles: Tile[];
} | null {
  const reservedTilesBySeat =
    createEmptyReservedTilesBySeat();
  let remainingTiles = [...availableTiles];

  for (const seat of [
    SELECTED_ENEMY_SEAT,
    ...OTHER_PLAYER_SEATS
  ] as const) {
    const reservedTiles =
      materializeReservedTiles(
        remainingTiles,
        selectionsBySeat[seat]
      );

    if (reservedTiles === null) {
      return null;
    }

    reservedTilesBySeat[seat] =
      reservedTiles;
    remainingTiles = removeReservedTiles(
      remainingTiles,
      reservedTiles
    );
  }

  return {
    reservedTilesBySeat,
    remainingTiles
  };
}

function areE29ConstraintsSatisfied(
  reservedTilesBySeat:
    AkuukanE29ReservedTilesBySeat
): boolean {
  const shantenBySeat =
    reservedTilesBySeat.map(
      (tiles) =>
        calculateShanten(tiles).minimum
    );

  return (
    reservedTilesBySeat.every(
      (tiles) =>
        tiles.length ===
        AKUUKAN_E29_HAND_SIZE
    ) &&
    shantenBySeat[SELECTED_ENEMY_SEAT] <=
      AKUUKAN_E29_SELECTED_ENEMY_MAX_SHANTEN &&
    OTHER_PLAYER_SEATS.every(
      (seat) =>
        shantenBySeat[seat] >=
        AKUUKAN_E29_OTHER_PLAYER_MIN_SHANTEN
    )
  );
}

export function reserveAkuukanE29ShantenHands(
  input:
    ReserveAkuukanE29ShantenHandsInput
): AkuukanE29ShantenHandReservation {
  if (
    !isEnemyAbilityEnabled(
      input.akuukan,
      "E-29"
    ) ||
    input.availableTiles.length <
      AKUUKAN_E29_HAND_SIZE * 4
  ) {
    return createNoE29Reservation(
      input.availableTiles
    );
  }

  const availableCounts =
    createAvailableTileTypeCounts(
      input.availableTiles
    );
  const {
    priorityOrder,
    firstPositions
  } = createTileTypePriorityData(
    input.availableTiles
  );
  const meldCandidates =
    prioritizeStandardMeldCandidates(
      firstPositions
    );
  const selectedEnemyTileTypes =
    findBalancedStandardTenpaiTileTypes(
      availableCounts,
      priorityOrder,
      meldCandidates
    ) ??
    findSevenPairsTenpaiTileTypes(
      availableCounts,
      priorityOrder
    ) ??
    findThirteenOrphansTenpaiTileTypes(
      availableCounts
    );

  if (selectedEnemyTileTypes === null) {
    return createNoE29Reservation(
      input.availableTiles
    );
  }

  const selectionsBySeat =
    createEmptyTileTypeSelectionsBySeat();
  selectionsBySeat[SELECTED_ENEMY_SEAT] =
    selectedEnemyTileTypes;
  changeTileTypeCounts(
    availableCounts,
    selectedEnemyTileTypes,
    -1
  );

  for (const seat of OTHER_PLAYER_SEATS) {
    const distantHandTileTypes =
      findDistantHandTileTypes(
        availableCounts,
        firstPositions
      );

    if (distantHandTileTypes === null) {
      return createNoE29Reservation(
        input.availableTiles
      );
    }

    selectionsBySeat[seat] =
      distantHandTileTypes;
    changeTileTypeCounts(
      availableCounts,
      distantHandTileTypes,
      -1
    );
  }

  const materialized =
    materializeReservationsBySeat(
      input.availableTiles,
      selectionsBySeat
    );

  if (
    materialized === null ||
    !areE29ConstraintsSatisfied(
      materialized.reservedTilesBySeat
    )
  ) {
    return createNoE29Reservation(
      input.availableTiles
    );
  }

  return {
    ...materialized,
    constraintsSatisfied: true
  };
}
