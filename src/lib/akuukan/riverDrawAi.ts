import {
  calculateShanten,
  getWinningTileTypes,
  isWinningHand
} from "../mahjong/hand";
import {
  getDoraTileType
} from "../mahjong/dora";
import {
  isDiscardFuriten
} from "../mahjong/furiten";
import type {
  PlayerState,
  Tile
} from "../mahjong/types";
import type {
  AkuukanE28RiverDrawCandidate
} from "./riverDraw";

export interface SelectAkuukanE28RiverDrawCandidateInput {
  readonly drawer: PlayerState;
  readonly players?: readonly PlayerState[];
  readonly candidates:
    readonly AkuukanE28RiverDrawCandidate[];
  readonly liveWall?: readonly Tile[];
  readonly doraIndicators?: readonly Tile[];
}

interface AkuukanE28RiverDrawEvaluation {
  readonly candidate:
    AkuukanE28RiverDrawCandidate;
  readonly winning: boolean;
  readonly shantenAfter: number;
  readonly handsAfterDiscard:
    readonly (readonly Tile[])[];
}

interface AkuukanE28PostDrawHands {
  readonly shanten: number;
  readonly hands: readonly Tile[][];
}

function getBestHandsAfterDraw(
  drawer: PlayerState,
  drawnTile: Tile
): AkuukanE28PostDrawHands {
  const handAfterDraw = [
    ...drawer.hand,
    drawnTile
  ];

  if (
    isWinningHand(
      handAfterDraw,
      drawer.melds
    )
  ) {
    return {
      shanten: -1,
      hands: []
    };
  }

  let bestShanten =
    Number.POSITIVE_INFINITY;
  let bestHands: Tile[][] = [];

  for (
    let discardIndex = 0;
    discardIndex < handAfterDraw.length;
    discardIndex += 1
  ) {
    const handAfterDiscard = [
      ...handAfterDraw.slice(
        0,
        discardIndex
      ),
      ...handAfterDraw.slice(
        discardIndex + 1
      )
    ];
    const shanten = calculateShanten(
      handAfterDiscard,
      drawer.melds
    ).minimum;

    if (shanten < bestShanten) {
      bestShanten = shanten;
      bestHands = [handAfterDiscard];
    } else if (
      shanten === bestShanten
    ) {
      bestHands.push(handAfterDiscard);
    }
  }

  return {
    shanten: bestShanten,
    hands: bestHands
  };
}

function evaluateCandidate(
  drawer: PlayerState,
  candidate:
    AkuukanE28RiverDrawCandidate
): AkuukanE28RiverDrawEvaluation {
  const handAfterDraw = [
    ...drawer.hand,
    candidate.tile
  ];
  const winning = isWinningHand(
    handAfterDraw,
    drawer.melds
  );
  const postDrawHands =
    getBestHandsAfterDraw(
      drawer,
      candidate.tile
    );

  return {
    candidate,
    winning,
    shantenAfter: postDrawHands.shanten,
    handsAfterDiscard:
      postDrawHands.hands
  };
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

function countImprovingLiveWallTiles(
  hand: readonly Tile[],
  drawer: PlayerState,
  liveWall: readonly Tile[]
): number {
  const currentShanten = calculateShanten(
    hand,
    drawer.melds
  ).minimum;

  return liveWall.filter((tile) => {
    const handAfterDraw = [
      ...hand,
      tile
    ];

    if (
      isWinningHand(
        handAfterDraw,
        drawer.melds
      )
    ) {
      return true;
    }

    return (
      calculateShanten(
        handAfterDraw,
        drawer.melds
      ).minimum < currentShanten
    );
  }).length;
}

function getAcceptanceAfterCandidate(
  evaluation:
    AkuukanE28RiverDrawEvaluation,
  drawer: PlayerState,
  liveWall: readonly Tile[]
): number {
  return evaluation.handsAfterDiscard.reduce(
    (bestAcceptance, hand) =>
      Math.max(
        bestAcceptance,
        countImprovingLiveWallTiles(
          hand,
          drawer,
          liveWall
        )
      ),
    0
  );
}

function getBonusTileValue(
  tile: Tile,
  doraIndicators: readonly Tile[]
): number {
  const doraValue =
    doraIndicators.filter(
      (indicator) =>
        isSameTileType(
          tile,
          getDoraTileType(indicator)
        )
    ).length;

  return doraValue + (tile.red ? 1 : 0);
}

function doesCandidateLiftOwnFuriten(
  drawer: PlayerState,
  candidate:
    AkuukanE28RiverDrawCandidate
): boolean {
  if (
    candidate.riverOwnerSeat !==
    drawer.seat
  ) {
    return false;
  }

  const winningTileTypes =
    getWinningTileTypes(
      drawer.hand,
      drawer.melds
    );

  if (winningTileTypes.length === 0) {
    return false;
  }

  const isWinningDiscard = (
    tile: Tile
  ): boolean =>
    winningTileTypes.some(
      (winningTileType) =>
        isSameTileType(
          tile,
          winningTileType
        )
    );
  const currentlyFuriten =
    drawer.discards.some(
      (discard) =>
        isWinningDiscard(discard.tile)
    );
  const remainsFuritenAfterRemoval =
    drawer.discards.some(
      (discard, discardIndex) =>
        discardIndex !==
          candidate.discardIndex &&
        isWinningDiscard(discard.tile)
    );

  return (
    currentlyFuriten &&
    !remainsFuritenAfterRemoval
  );
}

function doesCandidateLiftOtherPlayerFuriten(
  drawer: PlayerState,
  candidate:
    AkuukanE28RiverDrawCandidate,
  players: readonly PlayerState[]
): boolean {
  if (
    candidate.riverOwnerSeat ===
    drawer.seat
  ) {
    return false;
  }

  const riverOwner = players.find(
    (player) =>
      player.seat ===
      candidate.riverOwnerSeat
  );

  if (!riverOwner) {
    return false;
  }

  const furitenInput = {
    concealedTiles: riverOwner.hand,
    melds: riverOwner.melds
  };
  const currentlyFuriten =
    isDiscardFuriten({
      ...furitenInput,
      discards: riverOwner.discards
    });
  const discardsAfterRemoval =
    riverOwner.discards.filter(
      (_discard, discardIndex) =>
        discardIndex !==
        candidate.discardIndex
    );
  const remainsFuritenAfterRemoval =
    isDiscardFuriten({
      ...furitenInput,
      discards: discardsAfterRemoval
    });

  return (
    currentlyFuriten &&
    !remainsFuritenAfterRemoval
  );
}

export function selectAkuukanE28RiverDrawCandidate(
  input:
    SelectAkuukanE28RiverDrawCandidateInput
): AkuukanE28RiverDrawCandidate | null {
  const visibleCandidates =
    input.candidates.filter(
      (candidate) => !candidate.faceDown
    );

  if (visibleCandidates.length === 0) {
    return null;
  }

  const evaluations =
    visibleCandidates.map(
      (candidate) =>
        evaluateCandidate(
          input.drawer,
          candidate
        )
    );
  const winningCandidate =
    evaluations.find(
      (evaluation) => evaluation.winning
    );

  if (winningCandidate) {
    return winningCandidate.candidate;
  }

    const currentShanten = calculateShanten(
    input.drawer.hand,
    input.drawer.melds
  ).minimum;
  const players = input.players ?? [];
  const liftsOtherPlayerFuriten = (
    evaluation:
      AkuukanE28RiverDrawEvaluation
  ): boolean =>
    doesCandidateLiftOtherPlayerFuriten(
      input.drawer,
      evaluation.candidate,
      players
    );
  const improvingCandidates =
    evaluations
      .filter(
        (evaluation) =>
          evaluation.shantenAfter <
          currentShanten
      )
      .sort(
        (left, right) => {
          const shantenDifference =
            left.shantenAfter -
            right.shantenAfter;

          if (shantenDifference !== 0) {
            return shantenDifference;
          }

          return (
            Number(
              liftsOtherPlayerFuriten(
                left
              )
            ) -
            Number(
              liftsOtherPlayerFuriten(
                right
              )
            )
          );
        }
      );

  if (improvingCandidates.length > 0) {
    return improvingCandidates[0].candidate;
  }

  const lowRiskEvaluations =
    evaluations.filter(
      (evaluation) =>
        !liftsOtherPlayerFuriten(
          evaluation
        )
    );
  
  const liveWall = input.liveWall ?? [];

  if (liveWall.length > 0) {
    const currentAcceptance =
      countImprovingLiveWallTiles(
        input.drawer.hand,
        input.drawer,
        liveWall
      );
    const acceptanceCandidates =
      lowRiskEvaluations
        .map((evaluation) => ({
          evaluation,
          acceptance:
            getAcceptanceAfterCandidate(
              evaluation,
              input.drawer,
              liveWall
            )
        }))
        .filter(
          ({ acceptance }) =>
            acceptance > currentAcceptance
        )
        .sort(
          (left, right) =>
            right.acceptance -
            left.acceptance
        );

    if (acceptanceCandidates.length > 0) {
      return acceptanceCandidates[0]
        .evaluation.candidate;
    }
  }

  const doraIndicators =
    input.doraIndicators ?? [];
  const bonusCandidates =
    lowRiskEvaluations
    .map((evaluation) => ({
      evaluation,
      bonusValue: getBonusTileValue(
        evaluation.candidate.tile,
        doraIndicators
      )
    }))
    .filter(
      ({ bonusValue }) => bonusValue > 0
    )
    .sort(
      (left, right) =>
        right.bonusValue - left.bonusValue
    );

  if (bonusCandidates.length > 0) {
    return bonusCandidates[0]
      .evaluation.candidate;
  }

  const furitenRecoveryCandidate =
    evaluations.find((evaluation) =>
      doesCandidateLiftOwnFuriten(
        input.drawer,
        evaluation.candidate
      )
    );

  return (
    furitenRecoveryCandidate?.candidate ??
    null
  );
}
