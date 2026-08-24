import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  startNextRound
} from "./engine";
import type {
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
    id: `round-progress-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createTenpaiHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [3, 4, 5, 6, 7]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4]
    ),
    ...createTiles(
      "sou",
      [6, 7, 8]
    ),
    ...createTiles(
      "honor",
      [3, 3]
    )
  ];
}

function createNonTenpaiHand(): Tile[] {
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

function createSeededRandom(
  initialSeed: number
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (
      seed * 1664525 +
      1013904223
    ) >>> 0;

    return seed / 4294967296;
  };
}

function finishRoundWithWinner(
  state: GameState,
  winnerSeat: SeatIndex
): void {
  state.round.phase = "roundEnd";
  state.round.winResult = {
    winMethod: "tsumo",
    winnerSeat,
    loserSeat: null,
    winningTile: createTile("man", 2),
    yakuNames: ["門前清自摸和"],
    han: 1,
    fu: 30,
    yakumanMultiplier: 0,
    limitName: null,
    totalPoints: 1000,
    pointChanges: []
  };
}

describe("和了後の局進行", () => {
  it("親が和了すると同じ局で連荘し本場を増やす", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.players[0].score = 28000;
    state.round.players[1].score = 24000;
    state.round.players[2].score = 24000;
    state.round.players[3].score = 24000;
    finishRoundWithWinner(state, 0);

    const result = startNextRound(
      state,
      createSeededRandom(1)
    );

    expect(result.round.handNumber).toBe(1);
    expect(result.round.honba).toBe(1);
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.liveWall).toHaveLength(69);
    expect(
      result.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([
      14,
      13,
      13,
      13
    ]);
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      28000,
      24000,
      24000,
      24000
    ]);
    expect(result.round.players[0].isDealer).toBe(
      true
    );
    expect(result.round.players[0].seatWind).toBe(
      "east"
    );
    expect(result.playerMp).toBe(840);
  });

  it("子が和了すると親を交代して次局へ進む", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.honba = 2;
    state.round.players[0].score = 24000;
    state.round.players[1].score = 26000;
    finishRoundWithWinner(state, 1);

    const result = startNextRound(
      state,
      createSeededRandom(2)
    );

    expect(result.round.handNumber).toBe(2);
    expect(result.round.honba).toBe(0);
    expect(result.round.players[1].isDealer).toBe(
      true
    );
    expect(
      result.round.players.map(
        (player) => player.seatWind
      )
    ).toEqual([
      "north",
      "east",
      "south",
      "west"
    ]);
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      24000,
      26000,
      25000,
      25000
    ]);
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
  });

  it("流局時に親が聴牌なら連荘する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "roundEnd";
    state.round.honba = 1;
    state.round.riichiPool = 1000;
    state.round.winResult = null;
    state.round.players[0] = {
      ...state.round.players[0],
      hand: createTenpaiHand(),
      drawnTileId: null
    };

    const result = startNextRound(
      state,
      createSeededRandom(3)
    );

    expect(result.round.handNumber).toBe(1);
    expect(result.round.honba).toBe(2);
    expect(result.round.riichiPool).toBe(1000);
    expect(result.round.players[0].isDealer).toBe(
      true
    );
  });

  it("流局時に親が不聴なら本場を増やして次局へ進む", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "roundEnd";
    state.round.honba = 1;
    state.round.riichiPool = 1000;
    state.round.winResult = null;
    state.round.players[0] = {
      ...state.round.players[0],
      hand: createNonTenpaiHand(),
      drawnTileId: null
    };

    const result = startNextRound(
      state,
      createSeededRandom(4)
    );

    expect(result.round.handNumber).toBe(2);
    expect(result.round.honba).toBe(2);
    expect(result.round.riichiPool).toBe(1000);
    expect(result.round.players[1].isDealer).toBe(
      true
    );
  });

  it("東4局で親が流れると南1局へ進む", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.handNumber = 4;
    state.round.players[0].score = 23000;
    state.round.players[1].score = 27000;
    finishRoundWithWinner(state, 1);

    const result = startNextRound(
      state,
      createSeededRandom(5)
    );

    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(1);
    expect(result.round.honba).toBe(0);
    expect(result.round.players[1].isDealer).toBe(
      true
    );
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.winResult).toBeNull();

    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      23000,
      27000,
      25000,
      25000
    ]);

    expect(result.playerMp).toBe(840);
  });

  it("南4局で親が流れると半荘戦を終了する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.prevailingWind = "south";
    state.round.handNumber = 4;
    state.round.players[0].score = 23000;
    state.round.players[1].score = 27000;
    finishRoundWithWinner(state, 1);

    const result = startNextRound(
      state,
      createSeededRandom(6)
    );

    expect(result.round.phase).toBe(
      "matchEnd"
    );
    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(4);
    expect(result.round.winResult).toBeNull();

    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      23000,
      27000,
      25000,
      25000
    ]);

    expect(result.playerMp).toBe(420);
    expect(result.notice).toBe(
      "半荘戦が終了しました。最終得点を確認してください。"
    );
  });

  it("南4局でも親が和了すれば連荘する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.prevailingWind = "south";
    state.round.handNumber = 4;
    state.round.honba = 2;
    finishRoundWithWinner(state, 0);

    const result = startNextRound(
      state,
      createSeededRandom(7)
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(4);
    expect(result.round.honba).toBe(3);
    expect(result.round.players[0].isDealer).toBe(
      true
    );
  });
  it("点数移動後に0点未満のプレイヤーがいると飛び終了する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.players[0].score = 30100;
    state.round.players[1].score = 25000;
    state.round.players[2].score = -100;
    state.round.players[3].score = 45000;
    finishRoundWithWinner(state, 1);

    const result = startNextRound(
      state,
      createSeededRandom(8)
    );

    expect(result.round.phase).toBe(
      "matchEnd"
    );

    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      30100,
      25000,
      -100,
      45000
    ]);

    expect(result.playerMp).toBe(420);

    expect(result.notice).toBe(
      "持ち点が0点未満のプレイヤーがいるため、半荘戦が終了しました。"
    );
  });

  it("持ち点が0点ちょうどなら対局を続行する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.players[0].score = 25000;
    state.round.players[1].score = 50000;
    state.round.players[2].score = 0;
    state.round.players[3].score = 25000;
    finishRoundWithWinner(state, 1);

    const result = startNextRound(
      state,
      createSeededRandom(9)
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.prevailingWind).toBe(
      "east"
    );
    expect(result.round.handNumber).toBe(2);
    expect(
      result.round.players[2].score
    ).toBe(0);
  });
    it("南4局終了時に供託を暫定1位へ付与し最終順位を保存する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.prevailingWind = "south";
    state.round.handNumber = 4;
    state.round.riichiPool = 2000;
    state.round.players[0].score = 29000;
    state.round.players[1].score = 29000;
    state.round.players[2].score = 20000;
    state.round.players[3].score = 20000;
    finishRoundWithWinner(state, 1);

    const result = startNextRound(
      state,
      createSeededRandom(10)
    );

    expect(result.round.phase).toBe(
      "matchEnd"
    );
    expect(result.round.riichiPool).toBe(0);
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      31000,
      29000,
      20000,
      20000
    ]);
    expect(
      result.matchResult?.riichiPoolRecipientId
    ).toBe("player-0");
    expect(
      result.matchResult?.riichiPoolAward
    ).toBe(2000);
    expect(
      result.matchResult?.rankings.map(
        (ranking) => ranking.seat
      )
    ).toEqual([0, 1, 2, 3]);
    expect(
      result.matchResult?.rankings[0]
    ).toEqual({
      rank: 1,
      playerId: "player-0",
      seat: 0,
      pointsBeforePool: 29000,
      riichiPoolAward: 2000,
      finalPoints: 31000
    });
  });

  it("飛び終了時にも供託と最終順位を精算する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.riichiPool = 1000;
    state.round.players[0].score = 30000;
    state.round.players[1].score = 25000;
    state.round.players[2].score = -100;
    state.round.players[3].score = 44100;
    finishRoundWithWinner(state, 1);

    const result = startNextRound(
      state,
      createSeededRandom(11)
    );

    expect(result.round.phase).toBe(
      "matchEnd"
    );
    expect(result.round.riichiPool).toBe(0);
    expect(
      result.round.players[3].score
    ).toBe(45100);
    expect(
      result.matchResult?.riichiPoolRecipientId
    ).toBe("player-3");
    expect(
      result.matchResult?.rankings[0].seat
    ).toBe(3);
    expect(
      result.matchResult?.rankings[3].seat
    ).toBe(2);
  });
});
