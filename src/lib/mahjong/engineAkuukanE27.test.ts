import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import {
  canPlayerRon,
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo,
  skipPlayerRon,
  startNextRound
} from "./engine";
import type {
  Discard,
  GameState,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-akuukan-e27-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createDiscard(
  tile: Tile
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [2, 3, 4, 5, 6]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4, 5, 5]
    ),
    ...createTiles(
      "sou",
      [6, 7, 8]
    )
  ];
}

function createNonWinningHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 4, 5, 7, 8]
    ),
    ...createTiles(
      "pin",
      [1, 2, 4, 5, 7, 8]
    ),
    createTile("honor", 1)
  ];
}

function setPlayerHand(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[]
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createBaseState(): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-15",
      equippedSkills: []
    }
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("honor", 2)
  ];
  state.round.honba = 0;
  state.round.riichiPool = 0;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

function preparePlayerTsumoState(): GameState {
  const state = createBaseState();
  const winningTile = createTile(
    "man",
    1
  );

  setPlayerHand(
    state,
    0,
    [
      ...createPinfuWaitHand(),
      winningTile
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 4;
  state.round.lastDiscard = null;

  return state;
}

function prepareRonState(
  winnerSeats: readonly SeatIndex[]
): GameState {
  const state = createBaseState();
  const winningTile = createTile(
    "man",
    1
  );
  const discard = createDiscard(
    winningTile
  );
  const winnerSeatSet = new Set(
    winnerSeats
  );

  for (
    let seat = 0 as SeatIndex;
    seat < 4;
    seat = (seat + 1) as SeatIndex
  ) {
    setPlayerHand(
      state,
      seat,
      winnerSeatSet.has(seat)
        ? createPinfuWaitHand()
        : createNonWinningHand()
    );
  }

  state.round.players[1].discards = [
    discard
  ];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard
  };

  return state;
}

function getScores(
  state: GameState
): number[] {
  return state.round.players.map(
    (player) => player.score
  );
}

describe("敵15 E-27のエンジン統合", () => {
  it("プレイヤーの満貫未満ツモを無効化して特殊途中流局にする", () => {
    const state = preparePlayerTsumoState();
    const scoresBefore = getScores(state);

    const result = declarePlayerTsumo(
      state
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toBeNull();
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "enemyAbilityE27",
      invalidatedWinnerSeats: [0]
    });
    expect(getScores(result)).toEqual(
      scoresBefore
    );
    expect(result.notice).toContain(
      "E-27"
    );
  });

  it("プレイヤーの満貫未満ロンを宣言可能なまま無効化する", () => {
    const state = prepareRonState([0]);

    expect(canPlayerRon(state)).toBe(true);

    const result = declarePlayerRon(state);

    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "enemyAbilityE27",
      invalidatedWinnerSeats: [0]
    });
    expect(getScores(result)).toEqual([
      25000,
      25000,
      25000,
      25000
    ]);
  });

  it("敵15本人の満貫未満ロンは無効化しない", () => {
    const state = prepareRonState([2]);

    const result = skipPlayerRon(state);

    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
    expect(result.round.winResult).toMatchObject({
      winnerSeat: 2,
      loserSeat: 1,
      han: 1,
      fu: 30,
      totalPoints: 1000
    });
    expect(getScores(result)).toEqual([
      25000,
      24000,
      26000,
      25000
    ]);
  });

  it("切り上げ満貫のロンは無効化しない", () => {
    const state = prepareRonState([0]);
    state.round.players[0] = {
      ...state.round.players[0],
      riichi: true,
      doubleRiichi: true,
      ippatsu: true
    };

    const result = declarePlayerRon(state);

    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
    expect(result.round.winResult).toMatchObject({
      winnerSeat: 0,
      han: 4,
      fu: 30,
      limitName: "満貫",
      totalPoints: 12000
    });
  });

  it("ダブロンの一方が満貫未満なら両方の和了を無効化する", () => {
    const state = prepareRonState([2, 0]);
    const scoresBefore = getScores(state);

    const result = declarePlayerRon(state);

    expect(result.round.winResult).toBeNull();
    expect(
      result.round.doubleRonResult
    ).toBeNull();
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "enemyAbilityE27",
      invalidatedWinnerSeats: [2, 0]
    });
    expect(getScores(result)).toEqual(
      scoresBefore
    );
  });

  it("3人がロンできる場合はE-27より三家和を優先する", () => {
    const state = prepareRonState([
      2,
      3,
      0
    ]);

    const result = declarePlayerRon(state);

    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "tripleRon",
      discarderSeat: 1,
      ronCandidateSeats: [2, 3, 0]
    });
    expect(getScores(result)).toEqual([
      25000,
      25000,
      25000,
      25000
    ]);
  });

  it("E-27が無効なら満貫未満ロンを通常どおり精算する", () => {
    const state = prepareRonState([0]);

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-27"
    );

    const result = declarePlayerRon(state);

    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
    expect(result.round.winResult).toMatchObject({
      winnerSeat: 0,
      loserSeat: 1,
      han: 1,
      fu: 30,
      totalPoints: 1500
    });
  });

  it("特殊途中流局後は親連荘・本場加算・供託持越しとする", () => {
    const state = preparePlayerTsumoState();
    state.round.honba = 2;
    state.round.riichiPool = 3000;

    const drawResult = declarePlayerTsumo(
      state
    );
    const nextRound = startNextRound(
      drawResult,
      () => 0.5
    );

    expect(nextRound.round.handNumber).toBe(1);
    expect(nextRound.round.honba).toBe(3);
    expect(nextRound.round.riichiPool).toBe(
      3000
    );
    expect(
      nextRound.round.players[0].isDealer
    ).toBe(true);
  });
});
