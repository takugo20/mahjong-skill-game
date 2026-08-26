import type {
  Meld,
  SeatIndex
} from "./types";

export type ResponsibilityYakumanId =
  | "bigThreeDragons"
  | "bigFourWinds";

export interface YakumanResponsibility {
  yakumanId: ResponsibilityYakumanId;
  yakumanMultiplier: 1 | 2;
  responsibleSeat: SeatIndex;
}

interface ResponsibilityTarget {
  yakumanId: ResponsibilityYakumanId;
  yakumanMultiplier: 1 | 2;
  ranks: readonly number[];
}

const RESPONSIBILITY_TARGETS:
  readonly ResponsibilityTarget[] = [
    {
      yakumanId: "bigThreeDragons",
      yakumanMultiplier: 1,
      ranks: [5, 6, 7]
    },
    {
      yakumanId: "bigFourWinds",
      yakumanMultiplier: 2,
      ranks: [1, 2, 3, 4]
    }
  ];

function isOpenTripletOrKan(
  meld: Meld
): boolean {
  return (
    meld.kind === "pon" ||
    meld.kind === "openKan" ||
    meld.kind === "addedKan"
  );
}

function getHonorRank(
  meld: Meld
): number | null {
  if (!isOpenTripletOrKan(meld)) {
    return null;
  }

  const firstTile = meld.tiles[0];

  if (
    !firstTile ||
    firstTile.suit !== "honor" ||
    meld.tiles.some(
      (tile) =>
        tile.suit !== "honor" ||
        tile.rank !== firstTile.rank
    )
  ) {
    return null;
  }

  return firstTile.rank;
}

function findResponsibility(
  melds: readonly Meld[],
  target: ResponsibilityTarget
): YakumanResponsibility | null {
  const openedRanks = new Set<number>();

  for (const meld of melds) {
    const rank = getHonorRank(meld);

    if (
      rank === null ||
      !target.ranks.includes(rank) ||
      openedRanks.has(rank)
    ) {
      continue;
    }

    openedRanks.add(rank);

    if (
      openedRanks.size ===
      target.ranks.length
    ) {
      return meld.calledFrom === undefined
        ? null
        : {
            yakumanId:
              target.yakumanId,
            yakumanMultiplier:
              target.yakumanMultiplier,
            responsibleSeat:
              meld.calledFrom
          };
    }
  }

  return null;
}

export function getYakumanResponsibilities(
  melds: readonly Meld[]
): YakumanResponsibility[] {
  return RESPONSIBILITY_TARGETS
    .map((target) =>
      findResponsibility(
        melds,
        target
      )
    )
    .filter(
      (
        responsibility
      ): responsibility is YakumanResponsibility =>
        responsibility !== null
    );
}
