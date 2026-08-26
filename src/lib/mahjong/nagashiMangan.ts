import {
  calculateScore
} from "./score";
import type {
  PlayerPointChange,
  RoundScorePlayer
} from "./settlement";
import type {
  Discard,
  Wind
} from "./types";

export interface NagashiManganPlayer
  extends RoundScorePlayer {
  discards: readonly Discard[];
}

export interface NagashiManganSettlementInput<
  TPlayer extends NagashiManganPlayer =
    NagashiManganPlayer
> {
  players: readonly TPlayer[];
  honba: number;
  riichiPool: number;
}

export interface NagashiManganPayment {
  winnerId: string;
  payerId: string;
  points: number;
}

export interface NagashiManganSettlementResult<
  TPlayer extends NagashiManganPlayer =
    NagashiManganPlayer
> {
  winnerIds: string[];
  payments: NagashiManganPayment[];
  riichiPoolRecipientId: string | null;
  pointChanges: PlayerPointChange[];
  playersAfter: TPlayer[];
}

const WINDS: readonly Wind[] = [
  "east",
  "south",
  "west",
  "north"
];

function isYaochu(
  discard: Discard
): boolean {
  return (
    discard.tile.suit === "honor" ||
    discard.tile.rank === 1 ||
    discard.tile.rank === 9
  );
}

export function isNagashiManganEligible(
  discards: readonly Discard[]
): boolean {
  return (
    discards.length > 0 &&
    discards.every(
      (discard) =>
        isYaochu(discard) &&
        !discard.called
    )
  );
}

function validatePlayers(
  players: readonly NagashiManganPlayer[]
): void {
  if (players.length !== 4) {
    throw new Error(
      "流し満貫の精算には4人のプレイヤーが必要です"
    );
  }

  const playerIds = new Set(
    players.map((player) => player.id)
  );
  const winds = new Set(
    players.map((player) => player.wind)
  );

  if (
    playerIds.size !== players.length ||
    players.some(
      (player) => player.id.length === 0
    )
  ) {
    throw new Error(
      "プレイヤーIDは空でない一意の値にしてください"
    );
  }

  if (
    winds.size !== WINDS.length ||
    WINDS.some((wind) => !winds.has(wind))
  ) {
    throw new Error(
      "東・南・西・北のプレイヤーを1人ずつ指定してください"
    );
  }

  if (
    players.some(
      (player) =>
        !Number.isInteger(player.points)
    )
  ) {
    throw new Error(
      "持ち点は整数で指定してください"
    );
  }
}

function validateTablePoints(
  honba: number,
  riichiPool: number
): void {
  if (
    !Number.isInteger(honba) ||
    honba < 0
  ) {
    throw new Error(
      "本場は0以上の整数で指定してください"
    );
  }

  if (
    !Number.isInteger(riichiPool) ||
    riichiPool < 0 ||
    riichiPool % 1000 !== 0
  ) {
    throw new Error(
      "供託点は0以上の1000点単位で指定してください"
    );
  }
}

function addPointChange(
  changes: Map<string, number>,
  playerId: string,
  points: number
): void {
  changes.set(
    playerId,
    (changes.get(playerId) ?? 0) +
      points
  );
}

function getTsumoPayment(
  winner: NagashiManganPlayer,
  payer: NagashiManganPlayer,
  honba: number
): number {
  const score = calculateScore({
    han: 5,
    fu: 20,
    winMethod: "tsumo",
    dealer: winner.wind === "east",
    honba
  });
  const payments = score.tsumoPayments;

  if (!payments) {
    throw new Error(
      "流し満貫のツモ支払点を計算できませんでした"
    );
  }

  return payer.wind === "east"
    ? payments.dealerPays
    : payments.nonDealerPays;
}

function applyChanges<
  TPlayer extends NagashiManganPlayer
>(
  players: readonly TPlayer[],
  changes: ReadonlyMap<string, number>
): {
  pointChanges: PlayerPointChange[];
  playersAfter: TPlayer[];
} {
  const pointChanges = players.map(
    (player) => {
      const change =
        changes.get(player.id) ?? 0;

      return {
        playerId: player.id,
        pointsBefore: player.points,
        change,
        pointsAfter:
          player.points + change
      };
    }
  );

  const playersAfter = players.map(
    (player) => ({
      ...player,
      points:
        player.points +
        (changes.get(player.id) ?? 0)
    })
  );

  return {
    pointChanges,
    playersAfter
  };
}

export function resolveNagashiManganSettlement<
  TPlayer extends NagashiManganPlayer
>(
  input:
    NagashiManganSettlementInput<TPlayer>
): NagashiManganSettlementResult<TPlayer> | null {
  validatePlayers(input.players);
  validateTablePoints(
    input.honba,
    input.riichiPool
  );

  const playersByWind = WINDS.map(
    (wind) =>
      input.players.find(
        (player) => player.wind === wind
      )
  );

  if (
    playersByWind.some(
      (player) => player === undefined
    )
  ) {
    throw new Error(
      "流し満貫の席順を決定できませんでした"
    );
  }

  const orderedPlayers =
    playersByWind as TPlayer[];
  const winners = orderedPlayers.filter(
    (player) =>
      isNagashiManganEligible(
        player.discards
      )
  );

  if (winners.length === 0) {
    return null;
  }

  const changes = new Map(
    input.players.map(
      (player) => [player.id, 0]
    )
  );
  const payments:
    NagashiManganPayment[] = [];

  for (const winner of winners) {
    for (const payer of orderedPlayers) {
      if (payer.id === winner.id) {
        continue;
      }

      const points = getTsumoPayment(
        winner,
        payer,
        input.honba
      );

      payments.push({
        winnerId: winner.id,
        payerId: payer.id,
        points
      });
      addPointChange(
        changes,
        winner.id,
        points
      );
      addPointChange(
        changes,
        payer.id,
        -points
      );
    }
  }

  const riichiPoolRecipient =
    input.riichiPool > 0
      ? winners[0]
      : null;

  if (riichiPoolRecipient) {
    addPointChange(
      changes,
      riichiPoolRecipient.id,
      input.riichiPool
    );
  }

  const applied = applyChanges(
    input.players,
    changes
  );

  return {
    winnerIds: winners.map(
      (winner) => winner.id
    ),
    payments,
    riichiPoolRecipientId:
      riichiPoolRecipient?.id ?? null,
    pointChanges:
      applied.pointChanges,
    playersAfter:
      applied.playersAfter
  };
}
