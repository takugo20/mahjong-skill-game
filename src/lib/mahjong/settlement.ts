import type {
  InvalidWinningHandEvaluation,
  ValidWinningHandEvaluation,
  WinningHandEvaluationInput
} from "./winning";
import {
  evaluateWinningHand
} from "./winning";
import type {
  Wind
} from "./types";
import type {
  WinMethod
} from "./yaku";

export interface RoundScorePlayer {
  id: string;
  wind: Wind;
  points: number;
}

export interface WinningSettlementInput<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> {
  players: readonly TPlayer[];
  winnerId: string;
  loserId?: string;
  winMethod: WinMethod;
  hand: Omit<
    WinningHandEvaluationInput,
    "winMethod" | "seatWind"
  >;
}

export interface PlayerPointChange {
  playerId: string;
  pointsBefore: number;
  change: number;
  pointsAfter: number;
}

export interface ValidWinningSettlement<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> {
  valid: true;
  winMethod: WinMethod;
  winnerId: string;
  loserId: string | null;
  evaluation:
    ValidWinningHandEvaluation;
  pointChanges: PlayerPointChange[];
  playersAfter: TPlayer[];
}

export interface InvalidWinningSettlement {
  valid: false;
  reason:
    InvalidWinningHandEvaluation["reason"];
  evaluation:
    InvalidWinningHandEvaluation;
}

export type WinningSettlementResult<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> =
  | ValidWinningSettlement<TPlayer>
  | InvalidWinningSettlement;

const WINDS: readonly Wind[] = [
  "east",
  "south",
  "west",
  "north"
];

function validatePlayers(
  players: readonly RoundScorePlayer[]
): void {
  if (players.length !== 4) {
    throw new Error(
      "和了精算には4人のプレイヤーが必要です"
    );
  }

  const playerIds = new Set(
    players.map((player) => player.id)
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

  const winds = new Set(
    players.map((player) => player.wind)
  );

  if (
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

function findPlayer(
  players: readonly RoundScorePlayer[],
  playerId: string,
  role: string
): RoundScorePlayer {
  const player = players.find(
    (candidate) =>
      candidate.id === playerId
  );

  if (!player) {
    throw new Error(
      `${role}のプレイヤーが見つかりません`
    );
  }

  return player;
}

function validateDeclaration(
  input: WinningSettlementInput,
  winner: RoundScorePlayer
): RoundScorePlayer | null {
  if (input.winMethod === "tsumo") {
    if (input.loserId !== undefined) {
      throw new Error(
        "ツモ和了では放銃者を指定できません"
      );
    }

    return null;
  }

  if (!input.loserId) {
    throw new Error(
      "ロン和了では放銃者を指定してください"
    );
  }

  const loser = findPlayer(
    input.players,
    input.loserId,
    "放銃者"
  );

  if (loser.id === winner.id) {
    throw new Error(
      "和了者と放銃者は別のプレイヤーにしてください"
    );
  }

  return loser;
}

function createPointChangeMap(
  players: readonly RoundScorePlayer[]
): Map<string, number> {
  return new Map(
    players.map(
      (player) => [player.id, 0]
    )
  );
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

function applyRonPayments(
  changes: Map<string, number>,
  winnerId: string,
  loserId: string,
  evaluation:
    ValidWinningHandEvaluation
): void {
  const score = evaluation.best.score;

  if (score.ronPayment === null) {
    throw new Error(
      "ロン和了の支払点が計算されていません"
    );
  }

  addPointChange(
    changes,
    winnerId,
    score.totalPoints
  );

  addPointChange(
    changes,
    loserId,
    -score.ronPayment
  );
}

function applyTsumoPayments(
  changes: Map<string, number>,
  players: readonly RoundScorePlayer[],
  winner: RoundScorePlayer,
  evaluation:
    ValidWinningHandEvaluation
): void {
  const score = evaluation.best.score;
  const payments = score.tsumoPayments;

  if (!payments) {
    throw new Error(
      "ツモ和了の支払点が計算されていません"
    );
  }

  addPointChange(
    changes,
    winner.id,
    score.totalPoints
  );

  for (const player of players) {
    if (player.id === winner.id) {
      continue;
    }

    const payment =
      winner.wind !== "east" &&
      player.wind === "east"
        ? payments.dealerPays
        : payments.nonDealerPays;

    addPointChange(
      changes,
      player.id,
      -payment
    );
  }
}

function buildPointChanges<
  TPlayer extends RoundScorePlayer
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

  const changeById = new Map(
    pointChanges.map(
      (change) => [
        change.playerId,
        change.pointsAfter
      ]
    )
  );

  const playersAfter = players.map(
    (player) => ({
      ...player,
      points:
        changeById.get(player.id) ??
        player.points
    })
  );

  return {
    pointChanges,
    playersAfter
  };
}

export function resolveWinningSettlement<
  TPlayer extends RoundScorePlayer
>(
  input: WinningSettlementInput<TPlayer>
): WinningSettlementResult<TPlayer> {
  validatePlayers(input.players);

  const winner = findPlayer(
    input.players,
    input.winnerId,
    "和了者"
  );

  const loser = validateDeclaration(
    input,
    winner
  );

  const evaluation =
    evaluateWinningHand({
      ...input.hand,
      winMethod: input.winMethod,
      seatWind: winner.wind
    });

  if (!evaluation.valid) {
    return {
      valid: false,
      reason: evaluation.reason,
      evaluation
    };
  }

  const changes = createPointChangeMap(
    input.players
  );

  if (input.winMethod === "ron") {
    if (!loser) {
      throw new Error(
        "ロン和了の放銃者が見つかりません"
      );
    }

    applyRonPayments(
      changes,
      winner.id,
      loser.id,
      evaluation
    );
  } else {
    applyTsumoPayments(
      changes,
      input.players,
      winner,
      evaluation
    );
  }

  const applied = buildPointChanges(
    input.players,
    changes
  );

  return {
    valid: true,
    winMethod: input.winMethod,
    winnerId: winner.id,
    loserId: loser?.id ?? null,
    evaluation,
    pointChanges:
      applied.pointChanges,
    playersAfter:
      applied.playersAfter
  };
}
