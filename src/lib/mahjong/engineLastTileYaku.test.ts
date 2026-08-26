import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerTsumo,
  playPlayerDiscard
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
    id: `last-tile-yaku-${serialNumber}`,
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

function createWaitingHand(): Tile[] {
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

function emptyPlayer(
  state: GameState,
  seat: SeatIndex
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createLastDiscardState(
  drawnTileSource:
    "liveWall" | "rinshan"
): {
  state: GameState;
  winningTile: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const winningTile = createTile(
    "man",
    2
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [winningTile],
    melds: [],
    discards: [],
    drawnTileId: winningTile.id,
    drawnTileSource
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: createWaitingHand(),
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  emptyPlayer(state, 2);
  emptyPlayer(state, 3);
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = [];

  return {
    state,
    winningTile
  };
}

describe("海底・河底のゲーム進行", () => {
  it("通常山の最後の牌によるツモ和了に海底摸月を付ける", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const winningTile = createTile(
      "man",
      2
    );

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        winningTile,
        ...createWaitingHand()
      ],
      melds: [],
      discards: [],
      drawnTileId: winningTile.id,
      drawnTileSource: "liveWall"
    };
    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.liveWall = [];
    state.round.turnNumber = 60;

    const result = declarePlayerTsumo(
      state
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult?.yakuNames
    ).toContain("海底摸月");
  });

  it("海底牌取得後の打牌へのロンに河底撈魚を付ける", () => {
    const {
      state,
      winningTile
    } = createLastDiscardState(
      "liveWall"
    );

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
      winningTile
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("河底撈魚");
  });

  it("嶺上牌後の打牌には通常山が空でも河底撈魚を付けない", () => {
    const {
      state,
      winningTile
    } = createLastDiscardState(
      "rinshan"
    );

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
      winningTile
    });
    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("河底撈魚");
  });
});
