import {
  calculateScore
} from "./score";
import type {
  ResponsibilityYakumanId
} from "./responsibility";
import type {
  PlayerPointChange,
  RoundScorePlayer
} from "./settlement";
import type {
  Wind
} from "./types";
import type {
  WinMethod
} from "./yaku";
import type {
  YakumanResult
} from "./yakuman";

export interface ResponsibilityDeclaration {
  yakumanId: ResponsibilityYakumanId;
  responsiblePlayerId: string;
}

export interface ResponsibilitySettlementInput<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> {
  players: readonly TPlayer[];
  winnerId: string;
  loserId?: string;
  winMethod: WinMethod;
  yakuman: readonly YakumanResult[];
  responsibility:
    ResponsibilityDeclaration;
  honba: number;
  riichiPool: number;
}

export interface ResponsibilitySettlementResult<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> {
  winnerId: string;
  loserId: string | null;
  responsibility:
    ResponsibilityDeclaration & {
      yakumanMultiplier: 1 | 2;
    };
  pointChanges: PlayerPointChange[];
  playersAfter: TPlayer[];
}

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
      "責任払いの精算には4人のプレイヤーが必要です"
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

function getLoser(
  input: ResponsibilitySettlementInput,
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

function getResponsibilityYakuman(
  input: ResponsibilitySettlementInput
): YakumanResult {
  const matches = input.yakuman.filter(
    (yakuman) =>
      yakuman.id ===
      input.responsibility.yakumanId
  );

  if (matches.length !== 1) {
    throw new Error(
      "責任払い対象の役満が和了結果にありません"
    );
  }

  return matches[0];
}

function createChangeMap(
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

function roundUpToHundred(
  points: number
): number {
  return Math.ceil(points / 100) * 100;
}

function applyNormalYakumanPayment(
  changes: Map<string, number>,
  players: readonly RoundScorePlayer[],
  winner: RoundScorePlayer,
  loser: RoundScorePlayer | null,
  winMethod: WinMethod,
  yakumanMultiplier: number
): void {
  if (yakumanMultiplier === 0) {
    return;
  }

  const score = calculateScore({
    han: 0,
    fu: 20,
    winMethod,
    dealer: winner.wind === "east",
    yakumanMultiplier
  });

  if (winMethod === "ron") {
    if (
      !loser ||
      score.ronPayment === null
    ) {
      throw new Error(
        "複合役満のロン支払点を計算できませんでした"
      );
    }

    addPointChange(
      changes,
      winner.id,
      score.ronPayment
    );
    addPointChange(
      changes,
      loser.id,
      -score.ronPayment
    );
    return;
  }

  const payments = score.tsumoPayments;

  if (!payments) {
    throw new Error(
      "複合役満のツモ支払点を計算できませんでした"
    );
  }

  addPointChange(
    changes,
    winner.id,
    score.handPoints
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

function applyResponsibilityPayment(
  changes: Map<string, number>,
  winner: RoundScorePlayer,
  loser: RoundScorePlayer | null,
  responsiblePlayer:
    RoundScorePlayer,
  winMethod: WinMethod,
  yakumanMultiplier: 1 | 2
): void {
  const score = calculateScore({
    han: 0,
    fu: 20,
    winMethod,
    dealer: winner.wind === "east",
    yakumanMultiplier
  });
  const responsibilityPoints =
    score.handPoints;

  if (winMethod === "tsumo") {
    addPointChange(
      changes,
      winner.id,
      responsibilityPoints
    );
    addPointChange(
      changes,
      responsiblePlayer.id,
      -responsibilityPoints
    );
    return;
  }

  if (!loser) {
    throw new Error(
      "責任払いロンの放銃者が見つかりません"
    );
  }

  if (
    responsiblePlayer.id === loser.id
  ) {
    addPointChange(
      changes,
      winner.id,
      responsibilityPoints
    );
    addPointChange(
      changes,
      loser.id,
      -responsibilityPoints
    );
    return;
  }

  const halfPayment =
    roundUpToHundred(
      responsibilityPoints / 2
    );

  addPointChange(
    changes,
    winner.id,
    halfPayment * 2
  );
  addPointChange(
    changes,
    responsiblePlayer.id,
    -halfPayment
  );
  addPointChange(
    changes,
    loser.id,
    -halfPayment
  );
}

function applyHonbaAndRiichiPool(
  changes: Map<string, number>,
  winner: RoundScorePlayer,
  loser: RoundScorePlayer | null,
  responsiblePlayer:
    RoundScorePlayer,
  winMethod: WinMethod,
  honba: number,
  riichiPool: number
): void {
  const honbaPoints = honba * 300;
  const honbaPayer =
    winMethod === "tsumo"
      ? responsiblePlayer
      : loser;

  if (
    honbaPoints > 0 &&
    !honbaPayer
  ) {
    throw new Error(
      "本場を支払うプレイヤーが見つかりません"
    );
  }

  if (honbaPayer) {
    addPointChange(
      changes,
      winner.id,
      honbaPoints
    );
    addPointChange(
      changes,
      honbaPayer.id,
      -honbaPoints
    );
  }

  addPointChange(
    changes,
    winner.id,
    riichiPool
  );
}

function buildResult<
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

export function resolveResponsibilitySettlement<
  TPlayer extends RoundScorePlayer
>(
  input:
    ResponsibilitySettlementInput<TPlayer>
): ResponsibilitySettlementResult<TPlayer> {
  validatePlayers(input.players);
  validateTablePoints(
    input.honba,
    input.riichiPool
  );

  const winner = findPlayer(
    input.players,
    input.winnerId,
    "和了者"
  );
  const loser = getLoser(
    input,
    winner
  );
  const responsiblePlayer = findPlayer(
    input.players,
    input.responsibility
      .responsiblePlayerId,
    "責任者"
  );

  if (
    responsiblePlayer.id === winner.id
  ) {
    throw new Error(
      "和了者自身を責任者にはできません"
    );
  }

  const responsibilityYakuman =
    getResponsibilityYakuman(input);
  const totalYakumanMultiplier =
    input.yakuman.reduce(
      (total, yakuman) =>
        total + yakuman.multiplier,
      0
    );
  const normalYakumanMultiplier =
    totalYakumanMultiplier -
    responsibilityYakuman.multiplier;

  if (normalYakumanMultiplier < 0) {
    throw new Error(
      "責任払い対象の役満倍率が合計倍率を超えています"
    );
  }

  const changes = createChangeMap(
    input.players
  );

  applyResponsibilityPayment(
    changes,
    winner,
    loser,
    responsiblePlayer,
    input.winMethod,
    responsibilityYakuman.multiplier
  );
  applyNormalYakumanPayment(
    changes,
    input.players,
    winner,
    loser,
    input.winMethod,
    normalYakumanMultiplier
  );
  applyHonbaAndRiichiPool(
    changes,
    winner,
    loser,
    responsiblePlayer,
    input.winMethod,
    input.honba,
    input.riichiPool
  );

  const result = buildResult(
    input.players,
    changes
  );

  return {
    winnerId: winner.id,
    loserId: loser?.id ?? null,
    responsibility: {
      ...input.responsibility,
      yakumanMultiplier:
        responsibilityYakuman.multiplier
    },
    pointChanges: result.pointChanges,
    playersAfter: result.playersAfter
  };
}
