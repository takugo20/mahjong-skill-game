import {
  calculateShanten,
  isWinningHand
} from "../mahjong/hand";
import type {
  PlayerState,
  Tile
} from "../mahjong/types";
import type {
  AkuukanE28RiverDrawCandidate
} from "./riverDraw";

export interface SelectAkuukanE28RiverDrawCandidateInput {
  readonly drawer: PlayerState;
  readonly candidates:
    readonly AkuukanE28RiverDrawCandidate[];
}

interface AkuukanE28RiverDrawEvaluation {
  readonly candidate:
    AkuukanE28RiverDrawCandidate;
  readonly winning: boolean;
  readonly shantenAfter: number;
}

function getBestShantenAfterDraw(
  drawer: PlayerState,
  drawnTile: Tile
): number {
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
    return -1;
  }

  let bestShanten =
    Number.POSITIVE_INFINITY;

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

    bestShanten = Math.min(
      bestShanten,
      shanten
    );
  }

  return bestShanten;
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

  return {
    candidate,
    winning,
    shantenAfter: winning
      ? -1
      : getBestShantenAfterDraw(
          drawer,
          candidate.tile
        )
  };
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
  const improvingCandidates =
    evaluations
      .filter(
        (evaluation) =>
          evaluation.shantenAfter <
          currentShanten
      )
      .sort(
        (left, right) =>
          left.shantenAfter -
          right.shantenAfter
      );

  return (
    improvingCandidates[0]?.candidate ??
    null
  );
}
