import type {
  SeatIndex
} from "./types";

export interface MatchScorePlayer {
  id: string;
  seat: SeatIndex;
  points: number;
}

export type MatchRank = 1 | 2 | 3 | 4;

export interface MatchRanking {
  rank: MatchRank;
  playerId: string;
  seat: SeatIndex;
  pointsBeforePool: number;
  riichiPoolAward: number;
  finalPoints: number;
}

export interface MatchSettlementInput<
  TPlayer extends MatchScorePlayer =
    MatchScorePlayer
> {
  players: readonly TPlayer[];
  riichiPool: number;
  initialDealerSeat: SeatIndex;
}

export interface MatchSettlementResult<
  TPlayer extends MatchScorePlayer =
    MatchScorePlayer
> {
  provisionalLeaderId: string;
  riichiPoolRecipientId: string | null;
  riichiPoolAward: number;
  rankings: MatchRanking[];
  playersAfter: TPlayer[];
}

const SEATS: readonly SeatIndex[] = [
  0,
  1,
  2,
  3
];

function validateInput(
  input: MatchSettlementInput
): void {
  if (input.players.length !== 4) {
    throw new Error(
      "対局終了精算には4人のプレイヤーが必要です"
    );
  }

  const playerIds = new Set(
    input.players.map(
      (player) => player.id
    )
  );

  if (
    playerIds.size !== 4 ||
    input.players.some(
      (player) => player.id.length === 0
    )
  ) {
    throw new Error(
      "プレイヤーIDは空でない一意の値にしてください"
    );
  }

  const seats = new Set(
    input.players.map(
      (player) => player.seat
    )
  );

  if (
    seats.size !== 4 ||
    SEATS.some((seat) => !seats.has(seat))
  ) {
    throw new Error(
      "0から3の席を1人ずつ指定してください"
    );
  }

  if (
    input.players.some(
      (player) =>
        !Number.isInteger(player.points)
    )
  ) {
    throw new Error(
      "持ち点は整数で指定してください"
    );
  }

  if (
    !Number.isInteger(input.riichiPool) ||
    input.riichiPool < 0 ||
    input.riichiPool % 1000 !== 0
  ) {
    throw new Error(
      "供託点は0以上の1000点単位で指定してください"
    );
  }

  if (!seats.has(input.initialDealerSeat)) {
    throw new Error(
      "起家の席がプレイヤーに存在しません"
    );
  }
}

function getSeatOrder(
  seat: SeatIndex,
  initialDealerSeat: SeatIndex
): number {
  return (
    seat - initialDealerSeat + 4
  ) % 4;
}

function sortByPointsAndSeatOrder<
  TPlayer extends MatchScorePlayer
>(
  players: readonly TPlayer[],
  initialDealerSeat: SeatIndex
): TPlayer[] {
  return [...players].sort(
    (first, second) => {
      const pointDifference =
        second.points - first.points;

      if (pointDifference !== 0) {
        return pointDifference;
      }

      return (
        getSeatOrder(
          first.seat,
          initialDealerSeat
        ) -
        getSeatOrder(
          second.seat,
          initialDealerSeat
        )
      );
    }
  );
}

export function resolveMatchSettlement<
  TPlayer extends MatchScorePlayer
>(
  input: MatchSettlementInput<TPlayer>
): MatchSettlementResult<TPlayer> {
  validateInput(input);

  const provisionalOrder =
    sortByPointsAndSeatOrder(
      input.players,
      input.initialDealerSeat
    );

  const provisionalLeader =
    provisionalOrder[0];

  const playersAfter = input.players.map(
    (player) => ({
      ...player,
      points:
        player.points +
        (player.id === provisionalLeader.id
          ? input.riichiPool
          : 0)
    })
  );

  const finalOrder =
    sortByPointsAndSeatOrder(
      playersAfter,
      input.initialDealerSeat
    );

  const pointsBeforeById = new Map(
    input.players.map((player) => [
      player.id,
      player.points
    ])
  );

  const rankings = finalOrder.map(
    (player, index): MatchRanking => {
      const receivedPool =
        player.id === provisionalLeader.id
          ? input.riichiPool
          : 0;

      return {
        rank: (index + 1) as MatchRank,
        playerId: player.id,
        seat: player.seat,
        pointsBeforePool:
          pointsBeforeById.get(player.id) ??
          player.points,
        riichiPoolAward: receivedPool,
        finalPoints: player.points
      };
    }
  );

  return {
    provisionalLeaderId:
      provisionalLeader.id,
    riichiPoolRecipientId:
      input.riichiPool > 0
        ? provisionalLeader.id
        : null,
    riichiPoolAward: input.riichiPool,
    rankings,
    playersAfter
  };
}
