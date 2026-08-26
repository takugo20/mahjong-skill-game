import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  playPlayerDiscard
} from "./engine";
import type {
  GameState,
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
    id: `engine-cpu-win-${serialNumber}`,
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

function createPinfuWait(): {
  hand: Tile[];
  winningTile: Tile;
} {
  return {
    hand: [
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
    ],
    winningTile: createTile("man", 2)
  };
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

function prepareState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );

  state.round.players[2] = {
    ...state.round.players[2],
    hand: createNonWinningHand(),
    drawnTileId: null
  };

  state.round.players[3] = {
    ...state.round.players[3],
    hand: createNonWinningHand(),
    drawnTileId: null
  };

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;
  state.round.winResult = null;

  return state;
}

describe("CPUの和了", () => {
  it("プレイヤーの捨て牌をCPUがロンする", () => {
    const state = prepareState();
    const {
      hand,
      winningTile
    } = createPinfuWait();

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        winningTile,
        ...createNonWinningHand()
      ],
      drawnTileId: winningTile.id
    };

    state.round.players[1] = {
      ...state.round.players[1],
      hand,
      drawnTileId: null
    };

    state.round.liveWall = [
      createTile("honor", 1)
    ];

    const result = playPlayerDiscard(
      state,
      winningTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 1,
      loserSeat: 0,
      han: 1,
      fu: 30,
      totalPoints: 1000
    });
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
    expect(result.notice).toBe(
      "CPU・右があなたからロン和了しました。"
    );
  });

  it("CPUがツモった完成牌で和了する", () => {
    const state = prepareState();
    const {
      hand,
      winningTile
    } = createPinfuWait();
    const discardedTile =
      createTile("honor", 7);

    state.round.turnNumber = 4;
    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        discardedTile,
        ...createNonWinningHand()
      ],
      drawnTileId: discardedTile.id
    };

    state.round.players[1] = {
      ...state.round.players[1],
      hand,
      drawnTileId: null
    };

    state.round.liveWall = [
      winningTile,
      createTile("honor", 1)
    ];

    const result = playPlayerDiscard(
      state,
      discardedTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 1,
      loserSeat: null,
      han: 2,
      fu: 20,
      totalPoints: 1500
    });
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      24300,
      26500,
      24600,
      24600
    ]);
    expect(result.notice).toBe(
      "CPU・右がツモ和了しました。"
    );
  });
});
