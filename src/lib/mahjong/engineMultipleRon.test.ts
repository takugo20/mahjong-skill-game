import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerRon,
  playPlayerDiscard,
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
    id:
      `engine-multiple-ron-${serialNumber}`,
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
      [3, 4, 5, 6, 7]
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
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null
  };
}

function createBaseState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("honor", 2)
  ];
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

function createPlayerDiscardState(): {
  state: GameState;
  winningTile: Tile;
} {
  const state = createBaseState();
  const winningTile =
    createTile("man", 2);

  setPlayerHand(
    state,
    0,
    [
      winningTile,
      ...createNonWinningHand()
    ]
  );
  state.round.players[0].drawnTileId =
    winningTile.id;
  setPlayerHand(
    state,
    1,
    createPinfuWaitHand()
  );
  setPlayerHand(
    state,
    2,
    createPinfuWaitHand()
  );
  setPlayerHand(
    state,
    3,
    createNonWinningHand()
  );
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    winningTile
  };
}

function createCpuDiscardReactionState(
  includeThirdWinner: boolean
): GameState {
  const state = createBaseState();
  const winningTile =
    createTile("man", 2);

  setPlayerHand(
    state,
    0,
    createPinfuWaitHand()
  );
  setPlayerHand(
    state,
    1,
    createNonWinningHand()
  );
  setPlayerHand(
    state,
    2,
    createPinfuWaitHand()
  );
  setPlayerHand(
    state,
    3,
    includeThirdWinner
      ? createPinfuWaitHand()
      : createNonWinningHand()
  );
  state.round.players[1].discards = [
    createDiscard(winningTile)
  ];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard: createDiscard(winningTile)
  };

  return state;
}

describe("ゲーム本体のダブロン", () => {
  it("プレイヤーの打牌をCPU2人が同時にロンする", () => {
    const {
      state,
      winningTile
    } = createPlayerDiscardState();

    state.round.honba = 1;
    state.round.riichiPool = 2000;

    const result = playPlayerDiscard(
      state,
      winningTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toBeNull();
    expect(
      result.round.doubleRonResult
        ?.winResults.map(
          (winResult) =>
            winResult.winnerSeat
        )
    ).toEqual([1, 2]);
    expect(
      result.round.doubleRonResult
        ?.riichiPoolRecipientSeat
    ).toBe(1);
    expect(
      result.round.doubleRonResult
        ?.pointChanges.map(
          (change) => change.change
        )
    ).toEqual([
      -4600,
      4300,
      2300,
      0
    ]);
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      20400,
      29300,
      27300,
      25000
    ]);
    expect(result.round.riichiPool).toBe(0);

    const nextRound = startNextRound(
      result,
      () => 0.5
    );

    expect(nextRound.round.handNumber).toBe(2);
    expect(nextRound.round.honba).toBe(0);
    expect(
      nextRound.round.players[1].isDealer
    ).toBe(true);
  });

  it("プレイヤーとCPUのダブロンに親が含まれれば連荘する", () => {
    const state =
      createCpuDiscardReactionState(false);

    state.round.honba = 2;
    state.round.riichiPool = 1000;

    const result = declarePlayerRon(state);

    expect(
      result.round.doubleRonResult
        ?.winResults.map(
          (winResult) =>
            winResult.winnerSeat
        )
    ).toEqual([2, 0]);
    expect(
      result.round.doubleRonResult
        ?.riichiPoolRecipientSeat
    ).toBe(2);

    const nextRound = startNextRound(
      result,
      () => 0.5
    );

    expect(nextRound.round.handNumber).toBe(1);
    expect(nextRound.round.honba).toBe(3);
    expect(
      nextRound.round.players[0].isDealer
    ).toBe(true);
  });

  it("すべての支払い後に持ち点が負なら飛び終了する", () => {
    const {
      state,
      winningTile
    } = createPlayerDiscardState();

    state.round.players[0].score = 1500;
    state.round.honba = 0;
    state.round.riichiPool = 0;

    const result = playPlayerDiscard(
      state,
      winningTile.id,
      () => 0.5
    );

    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      -2500,
      27000,
      27000,
      25000
    ]);

    const matchEnd = startNextRound(
      result,
      () => 0.5
    );

    expect(matchEnd.round.phase).toBe(
      "matchEnd"
    );
    expect(matchEnd.notice).toContain(
      "0点未満"
    );
  });

  it("南4局で親を含まないダブロンなら対局を終了する", () => {
    const {
      state,
      winningTile
    } = createPlayerDiscardState();

    state.round.prevailingWind = "south";
    state.round.handNumber = 4;
    state.round.honba = 0;
    state.round.riichiPool = 0;

    const result = playPlayerDiscard(
      state,
      winningTile.id,
      () => 0.5
    );
    const matchEnd = startNextRound(
      result,
      () => 0.5
    );

    expect(matchEnd.round.phase).toBe(
      "matchEnd"
    );
    expect(matchEnd.notice).toBe(
      "半荘戦が終了しました。最終得点を確認してください。"
    );
  });
});

describe("ゲーム本体の三家和", () => {
  it("点数を移動せず親連荘・本場加算・供託持越しとする", () => {
    const state =
      createCpuDiscardReactionState(true);

    state.round.honba = 1;
    state.round.riichiPool = 2000;

    const result = declarePlayerRon(state);

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toBeNull();
    expect(
      result.round.doubleRonResult
    ).toBeNull();
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "tripleRon",
      discarderSeat: 1,
      ronCandidateSeats: [2, 3, 0]
    });
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      25000,
      25000,
      25000,
      25000
    ]);
    expect(result.round.riichiPool).toBe(2000);

    const nextRound = startNextRound(
      result,
      () => 0.5
    );

    expect(nextRound.round.handNumber).toBe(1);
    expect(nextRound.round.honba).toBe(2);
    expect(nextRound.round.riichiPool).toBe(2000);
    expect(
      nextRound.round.players[0].isDealer
    ).toBe(true);
  });
});
