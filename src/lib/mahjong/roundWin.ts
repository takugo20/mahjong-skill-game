import type {
  PlayerPointChange
} from "./settlement";
import {
  resolveWinningSettlement
} from "./settlement";
import {
  getYakumanResponsibilities
} from "./responsibility";
import type {
  ResponsibilityDeclaration,
  ResponsibilitySettlementResult
} from "./responsibilitySettlement";
import type {
  InvalidWinningHandEvaluation,
  ValidWinningHandEvaluation,
  WinningHandEvaluationInput,
  WinningHandEvaluationResult
} from "./winning";
import {
  evaluateWinningHand
} from "./winning";
import type {
  PlayerState,
  RoundState,
  SeatIndex,
  Tile
} from "./types";
import type {
  WinMethod
} from "./yaku";

export interface ChankanWinSource {
  declarerSeat: SeatIndex;
  winningTile: Tile;
}

export interface RoundWinActionInput {
  round: RoundState;
  winnerSeat: SeatIndex;
  winMethod: WinMethod;
  doraIndicators: readonly Tile[];
  uraDoraIndicators?: readonly Tile[];
  treatAsClosed?: boolean;
  doubleRiichi?: boolean;
  rinshan?: boolean;
  chankan?: boolean;
  chankanSource?: ChankanWinSource;
  tenhou?: boolean;
  chiihou?: boolean;
}

export interface RoundPointChange
  extends PlayerPointChange {
  seat: SeatIndex;
}

export interface ValidRoundWinResolution {
  valid: true;
  winMethod: WinMethod;
  winnerSeat: SeatIndex;
  loserSeat: SeatIndex | null;
  winningTile: Tile;
  evaluation:
    ValidWinningHandEvaluation;
  responsibility:
    ResponsibilitySettlementResult["responsibility"] |
    null;
  pointChanges: RoundPointChange[];
  playersAfter: PlayerState[];
}

export interface InvalidRoundWinResolution {
  valid: false;
  reason:
    InvalidWinningHandEvaluation["reason"];
  evaluation:
    InvalidWinningHandEvaluation;
}

export type RoundWinResolution =
  | ValidRoundWinResolution
  | InvalidRoundWinResolution;

interface WinSource {
  winner: PlayerState;
  loser: PlayerState | null;
  winningTile: Tile;
}

function getPlayer(
  round: RoundState,
  seat: SeatIndex,
  role: string
): PlayerState {
  const player = round.players.find(
    (candidate) =>
      candidate.seat === seat
  );

  if (!player) {
    throw new Error(
      `${role}のプレイヤーが見つかりません`
    );
  }

  return player;
}

function getTsumoSource(
  input: RoundWinActionInput,
  winner: PlayerState
): WinSource {
  if (
    input.round.phase !== "discarding" ||
    input.round.currentSeat !==
      input.winnerSeat
  ) {
    throw new Error(
      "現在はツモ和了を宣言できる手番ではありません"
    );
  }

  if (!winner.drawnTileId) {
    throw new Error(
      "ツモ和了に必要なツモ牌がありません"
    );
  }

  const winningTile = winner.hand.find(
    (tile) =>
      tile.id === winner.drawnTileId
  );

  if (!winningTile) {
    throw new Error(
      "ツモ牌が手牌内に見つかりません"
    );
  }

  return {
    winner,
    loser: null,
    winningTile
  };
}

function getRonSource(
  input: RoundWinActionInput,
  winner: PlayerState
): WinSource {
  const chankanSource =
    input.chankanSource;

  if (chankanSource) {
    if (
      chankanSource.declarerSeat ===
      input.winnerSeat
    ) {
      throw new Error(
        "自分の槓宣言牌ではロン和了できません"
      );
    }

    const loser = getPlayer(
      input.round,
      chankanSource.declarerSeat,
      "槓宣言者"
    );

    return {
      winner,
      loser,
      winningTile:
        chankanSource.winningTile
    };
  }

  if (input.chankan) {
    throw new Error(
      "槍槓ロンの対象牌がありません"
    );
  }

  const lastDiscard =
    input.round.lastDiscard;

  if (!lastDiscard) {
    throw new Error(
      "ロン和了の対象となる捨て牌がありません"
    );
  }

  if (
    lastDiscard.seat ===
      input.winnerSeat
  ) {
    throw new Error(
      "自分の捨て牌ではロン和了できません"
    );
  }

  const loser = getPlayer(
    input.round,
    lastDiscard.seat,
    "放銃者"
  );

  return {
    winner,
    loser,
    winningTile:
      lastDiscard.discard.tile
  };
}

function getWinSource(
  input: RoundWinActionInput
): WinSource {
  const winner = getPlayer(
    input.round,
    input.winnerSeat,
    "和了者"
  );

  return input.winMethod === "tsumo"
    ? getTsumoSource(input, winner)
    : getRonSource(input, winner);
}

function getRiichiStickCount(
  round: RoundState
): number {
  if (
    !Number.isInteger(round.riichiPool) ||
    round.riichiPool < 0 ||
    round.riichiPool % 1000 !== 0
  ) {
    throw new Error(
      "供託点は1000点単位で指定してください"
    );
  }

  return round.riichiPool / 1000;
}

function getResponsibilityDeclaration(
  round: RoundState,
  winner: PlayerState
): ResponsibilityDeclaration | undefined {
  const responsibility =
    getYakumanResponsibilities(
      winner.melds
    )[0];

  if (!responsibility) {
    return undefined;
  }

  const responsiblePlayer = getPlayer(
    round,
    responsibility.responsibleSeat,
    "責任者"
  );

  return {
    yakumanId:
      responsibility.yakumanId,
    responsiblePlayerId:
      responsiblePlayer.id
  };
}

function toTileType(tile: Tile): {
  suit: Tile["suit"];
  rank: number;
} {
  return {
    suit: tile.suit,
    rank: tile.rank
  };
}

function createWinningInput(
  input: RoundWinActionInput,
  source: WinSource
): WinningHandEvaluationInput {
  const concealedTiles =
    input.winMethod === "ron"
      ? [
          ...source.winner.hand,
          source.winningTile
        ]
      : [...source.winner.hand];

  return {
    concealedTiles,
    melds: source.winner.melds,
    winningTile:
      toTileType(source.winningTile),
    winMethod: input.winMethod,
    seatWind: source.winner.seatWind,
    prevailingWind:
      input.round.prevailingWind,
    doraIndicators:
      input.doraIndicators.map(
        toTileType
      ),
    uraDoraIndicators:
      input.uraDoraIndicators?.map(
        toTileType
      ),
    riichi: source.winner.riichi,
    doubleRiichi:
      input.doubleRiichi,
    ippatsu: source.winner.ippatsu,
    rinshan: input.rinshan,
    chankan:
      input.chankan === true ||
      input.chankanSource !== undefined,
    haitei:
      input.winMethod === "tsumo" &&
      input.round.liveWall.length === 0,
    houtei:
      input.winMethod === "ron" &&
      input.round.liveWall.length === 0,
    tenhou: input.tenhou,
    chiihou: input.chiihou,
    treatAsClosed:
      input.treatAsClosed,
    kiriageMangan: true,
    honba: input.round.honba,
    riichiSticks:
      getRiichiStickCount(input.round)
  };
}

export function evaluateRoundWin(
  input: RoundWinActionInput
): WinningHandEvaluationResult {
  const source = getWinSource(input);

  return evaluateWinningHand(
    createWinningInput(input, source)
  );
}

function createPointChanges(
  round: RoundState,
  changes:
    readonly PlayerPointChange[]
): RoundPointChange[] {
  return changes.map((change) => {
    const player = round.players.find(
      (candidate) =>
        candidate.id === change.playerId
    );

    if (!player) {
      throw new Error(
        "点数移動の対象プレイヤーが見つかりません"
      );
    }

    return {
      ...change,
      seat: player.seat
    };
  });
}

function applyScores(
  players: readonly PlayerState[],
  changes:
    readonly PlayerPointChange[]
): PlayerState[] {
  const changeByPlayerId = new Map(
    changes.map((change) => [
      change.playerId,
      change.pointsAfter
    ])
  );

  return players.map((player) => ({
    ...player,
    score:
      changeByPlayerId.get(player.id) ??
      player.score
  }));
}

export function resolveRoundWin(
  input: RoundWinActionInput
): RoundWinResolution {
  const source = getWinSource(input);
  const winningInput = createWinningInput(
    input,
    source
  );

  const responsibility =
    getResponsibilityDeclaration(
      input.round,
      source.winner
    );
  
  const {
    winMethod: _winMethod,
    seatWind: _seatWind,
    ...hand
  } = winningInput;

  const settlement =
    resolveWinningSettlement({
      players: input.round.players.map(
        (player) => ({
          id: player.id,
          wind: player.seatWind,
          points: player.score
        })
      ),
      winnerId: source.winner.id,
      loserId: source.loser?.id,
      winMethod: input.winMethod,
      responsibility,
      hand
    });

  if (!settlement.valid) {
    return {
      valid: false,
      reason: settlement.reason,
      evaluation: settlement.evaluation
    };
  }

  return {
    valid: true,
    winMethod: input.winMethod,
    winnerSeat: source.winner.seat,
    loserSeat: source.loser?.seat ?? null,
    winningTile: source.winningTile,
    evaluation: settlement.evaluation,
    responsibility:
      settlement.responsibility,
    pointChanges: createPointChanges(
      input.round,
      settlement.pointChanges
    ),
    playersAfter: applyScores(
      input.round.players,
      settlement.pointChanges
    )
  };
}
