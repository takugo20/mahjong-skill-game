import {
  calculateShanten
} from "./hand";
import type {
  Meld,
  MeldCallOption,
  PlayerState,
  Tile,
  Wind
} from "./types";

export interface CpuMeldCallDecisionInput {
  player: PlayerState;
  prevailingWind: Wind;
  calledTile: Tile;
  options: readonly MeldCallOption[];
}

export interface CpuMeldCallDecision {
  option: MeldCallOption;
  discardTileId: string;
  shantenBefore: number;
  shantenAfter: number;
}

interface EvaluatedOption {
  decision: CpuMeldCallDecision;
  yakuPriority: number;
  discardsRedTile: boolean;
}

const WIND_RANKS: Record<Wind, number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4
};

function isSameTileType(
  left: Pick<Tile, "suit" | "rank">,
  right: Pick<Tile, "suit" | "rank">
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function isSimpleTile(tile: Tile): boolean {
  return (
    tile.suit !== "honor" &&
    tile.rank >= 2 &&
    tile.rank <= 8
  );
}

function isValueHonor(
  tile: Tile,
  seatWind: Wind,
  prevailingWind: Wind
): boolean {
  if (tile.suit !== "honor") {
    return false;
  }

  return (
    tile.rank >= 5 ||
    tile.rank === WIND_RANKS[seatWind] ||
    tile.rank === WIND_RANKS[prevailingWind]
  );
}

function hasValueHonorMeld(
  melds: readonly Meld[],
  seatWind: Wind,
  prevailingWind: Wind
): boolean {
  return melds.some((meld) => {
    if (meld.kind === "chi") {
      return false;
    }

    const tile = meld.tiles[0];

    return (
      tile !== undefined &&
      isValueHonor(
        tile,
        seatWind,
        prevailingWind
      )
    );
  });
}

function isAllSimplesHand(
  concealedTiles: readonly Tile[],
  melds: readonly Meld[]
): boolean {
  return (
    concealedTiles.every(isSimpleTile) &&
    melds.every((meld) =>
      meld.tiles.every(isSimpleTile)
    )
  );
}

function findHandTiles(
  player: PlayerState,
  option: MeldCallOption
): [Tile, Tile] | null {
  const firstTile = player.hand.find(
    (tile) =>
      tile.id === option.handTileIds[0]
  );
  const secondTile = player.hand.find(
    (tile) =>
      tile.id === option.handTileIds[1]
  );

  if (
    !firstTile ||
    !secondTile ||
    firstTile.id === secondTile.id
  ) {
    return null;
  }

  return [firstTile, secondTile];
}

function getSujiForbiddenRank(
  option: MeldCallOption,
  calledTile: Tile,
  handTiles: readonly [Tile, Tile]
): number | null {
  if (
    option.kind !== "chi" ||
    calledTile.suit === "honor"
  ) {
    return null;
  }

  const ranks = [
    calledTile.rank,
    handTiles[0].rank,
    handTiles[1].rank
  ].sort((left, right) => left - right);

  if (
    calledTile.rank === ranks[0] &&
    ranks[2] < 9
  ) {
    return ranks[2] + 1;
  }

  if (
    calledTile.rank === ranks[2] &&
    ranks[0] > 1
  ) {
    return ranks[0] - 1;
  }

  return null;
}

function isLegalDiscardAfterCall(
  tile: Tile,
  option: MeldCallOption,
  calledTile: Tile,
  handTiles: readonly [Tile, Tile]
): boolean {
  if (isSameTileType(tile, calledTile)) {
    return false;
  }

  const sujiForbiddenRank =
    getSujiForbiddenRank(
      option,
      calledTile,
      handTiles
    );

  return !(
    sujiForbiddenRank !== null &&
    tile.suit === calledTile.suit &&
    tile.rank === sujiForbiddenRank
  );
}

function createCalledMeld(
  option: MeldCallOption,
  calledTile: Tile,
  handTiles: readonly [Tile, Tile]
): Meld {
  return {
    kind: option.kind,
    tiles: [
      handTiles[0],
      handTiles[1],
      calledTile
    ],
    calledFrom: option.discarderSeat,
    calledTileId: calledTile.id
  };
}

function getYakuPriority(
  calledTile: Tile,
  nextMelds: readonly Meld[],
  seatWind: Wind,
  prevailingWind: Wind
): number {
  if (
    isValueHonor(
      calledTile,
      seatWind,
      prevailingWind
    )
  ) {
    return 2;
  }

  return hasValueHonorMeld(
    nextMelds,
    seatWind,
    prevailingWind
  )
    ? 1
    : 0;
}

function evaluateOption(
  input: CpuMeldCallDecisionInput,
  option: MeldCallOption,
  shantenBefore: number
): EvaluatedOption | null {
  if (
    option.callerSeat !==
      input.player.seat ||
    option.discarderSeat ===
      input.player.seat ||
    option.calledTileId !==
      input.calledTile.id
  ) {
    return null;
  }

  const handTiles = findHandTiles(
    input.player,
    option
  );

  if (!handTiles) {
    return null;
  }

  const handTileIds = new Set(
    option.handTileIds
  );
  const remainingTiles =
    input.player.hand.filter(
      (tile) => !handTileIds.has(tile.id)
    );
  const nextMelds = [
    ...input.player.melds,
    createCalledMeld(
      option,
      input.calledTile,
      handTiles
    )
  ];
  const hasValueYaku =
    hasValueHonorMeld(
      nextMelds,
      input.player.seatWind,
      input.prevailingWind
    );

  const discardCandidates =
    remainingTiles
      .filter((tile) =>
        isLegalDiscardAfterCall(
          tile,
          option,
          input.calledTile,
          handTiles
        )
      )
      .map((tile) => {
        const handAfterDiscard =
          remainingTiles.filter(
            (candidate) =>
              candidate.id !== tile.id
          );
        const hasReliableYaku =
          hasValueYaku ||
          isAllSimplesHand(
            handAfterDiscard,
            nextMelds
          );

        return {
          tile,
          hasReliableYaku,
          shanten: calculateShanten(
            handAfterDiscard,
            nextMelds
          ).minimum
        };
      })
      .filter(
        (candidate) =>
          candidate.hasReliableYaku &&
          Number.isFinite(
            candidate.shanten
          )
      )
      .sort((left, right) => {
        if (
          left.shanten !== right.shanten
        ) {
          return (
            left.shanten - right.shanten
          );
        }

        if (left.tile.red !== right.tile.red) {
          return left.tile.red ? 1 : -1;
        }

        return left.tile.id.localeCompare(
          right.tile.id
        );
      });

  const bestDiscard = discardCandidates[0];

  if (
    !bestDiscard ||
    bestDiscard.shanten >= shantenBefore
  ) {
    return null;
  }

  return {
    decision: {
      option,
      discardTileId: bestDiscard.tile.id,
      shantenBefore,
      shantenAfter: bestDiscard.shanten
    },
    yakuPriority: getYakuPriority(
      input.calledTile,
      nextMelds,
      input.player.seatWind,
      input.prevailingWind
    ),
    discardsRedTile: bestDiscard.tile.red
  };
}

export function chooseCpuMeldCall(
  input: CpuMeldCallDecisionInput
): CpuMeldCallDecision | null {
  if (
    input.player.seat === 0 ||
    input.player.riichi ||
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
    .map((option) =>
      evaluateOption(
        input,
        option,
        shantenBefore
      )
    )
    .filter(
      (
        candidate
      ): candidate is EvaluatedOption =>
        candidate !== null
    )
    .sort((left, right) => {
      if (
        left.decision.shantenAfter !==
        right.decision.shantenAfter
      ) {
        return (
          left.decision.shantenAfter -
          right.decision.shantenAfter
        );
      }

      if (
        left.yakuPriority !==
        right.yakuPriority
      ) {
        return (
          right.yakuPriority -
          left.yakuPriority
        );
      }

      if (
        left.decision.option.kind !==
        right.decision.option.kind
      ) {
        return left.decision.option.kind ===
          "pon"
          ? -1
          : 1;
      }

      if (
        left.discardsRedTile !==
        right.discardsRedTile
      ) {
        return left.discardsRedTile
          ? 1
          : -1;
      }

      return left.decision.option.id.localeCompare(
        right.decision.option.id
      );
    });

  return candidates[0]?.decision ?? null;
}
