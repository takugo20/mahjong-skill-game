import {
  describe,
  expect,
  it
} from "vitest";
import {
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerTsumo,
  playPlayerDiscard
} from "./engine";
import type {
  Discard,
  GameState,
  Meld,
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
    id: `engine-tenhou-chiihou-${serialNumber}`,
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

function createCompletedHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("man", [6, 7, 8]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    ...createTiles("honor", [3, 3])
  ];
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

function clearInterruptions(
  state: GameState
): void {
  state.round.kanCount = 0;
  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        melds: [],
        discards: [],
        drawnTileId: null,
        drawnTileSource: null
      })
    );
}

function createPlayerTenhouState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const hand = createCompletedHand();
  const winningTile =
    hand[hand.length - 1];

  clearInterruptions(state);
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 0;
  state.round.lastDiscard = null;
  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds: [],
    discards: [],
    isDealer: true,
    seatWind: "east",
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };

  return state;
}

function createPlayerChiihouState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const hand = createCompletedHand();
  const winningTile =
    hand[hand.length - 1];
  const dealerDiscardTile =
    createTile("honor", 7);
  const dealerDiscard =
    createDiscard(dealerDiscardTile);

  clearInterruptions(state);
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 1;
  state.round.lastDiscard = {
    seat: 3,
    discard: dealerDiscard
  };
  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds: [],
    discards: [],
    isDealer: false,
    seatWind: "south",
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    isDealer: false,
    seatWind: "west"
  };
  state.round.players[2] = {
    ...state.round.players[2],
    isDealer: false,
    seatWind: "north"
  };
  state.round.players[3] = {
    ...state.round.players[3],
    isDealer: true,
    seatWind: "east",
    discards: [dealerDiscard]
  };

  return state;
}

function expectYakuman(
  state: GameState,
  yakuName: "天和" | "地和"
): void {
  expect(canPlayerTsumo(state)).toBe(
    true
  );

  const result = declarePlayerTsumo(
    state
  );

  expect(result.round.phase).toBe(
    "roundEnd"
  );
  expect(
    result.round.winResult?.yakuNames
  ).toContain(yakuName);
  expect(
    result.round.winResult
      ?.yakumanMultiplier
  ).toBe(1);
  expect(
    result.round.winResult?.limitName
  ).toBe("役満");
}

describe("天和・地和のゲーム進行", () => {
  it("親の配牌直後のツモ和了を天和にする", () => {
    expectYakuman(
      createPlayerTenhouState(),
      "天和"
    );
  });

  it("子の最初の通常ツモによる和了を地和にする", () => {
    expectYakuman(
      createPlayerChiihouState(),
      "地和"
    );
  });

  it("CPUも最初の通常ツモで地和を成立させる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const completedHand =
      createCompletedHand();
    const winningTile =
      completedHand[
        completedHand.length - 1
      ];
    const playerDiscard =
      createTile("honor", 7);

    clearInterruptions(state);
    state.round.players[0] = {
      ...state.round.players[0],
      hand: [playerDiscard],
      drawnTileId: playerDiscard.id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: completedHand.slice(0, -1),
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.players[2].hand = [];
    state.round.players[3].hand = [];
    state.round.liveWall = [
      winningTile,
      createTile("man", 1),
      createTile("pin", 1),
      createTile("sou", 1)
    ];

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 1,
      yakuNames: ["地和"],
      yakumanMultiplier: 1,
      limitName: "役満"
    });
  });

  it("親でも第1打後のツモ和了は天和にしない", () => {
    const state =
      createPlayerTenhouState();

    state.round.turnNumber = 4;
    state.round.players[0].discards = [
      createDiscard(
        createTile("honor", 7)
      )
    ];

    const result = declarePlayerTsumo(
      state
    );

    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("天和");
    expect(
      result.round.winResult
        ?.yakumanMultiplier
    ).toBe(0);
  });

  it("子でも第1打後のツモ和了は地和にしない", () => {
    const state =
      createPlayerChiihouState();

    state.round.players[0].discards = [
      createDiscard(
        createTile("honor", 6)
      )
    ];

    const result = declarePlayerTsumo(
      state
    );

    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("地和");
  });

  it("副露後の最初のツモ和了は地和にしない", () => {
    const state =
      createPlayerChiihouState();
    const ponTiles = createTiles(
      "honor",
      [5, 5, 5]
    );
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    state.round.players[1].melds = [pon];

    const result = declarePlayerTsumo(
      state
    );

    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("地和");
  });

  it("槓成立後の嶺上ツモ和了は地和にしない", () => {
    const state =
      createPlayerChiihouState();

    state.round.kanCount = 1;
    state.round.players[0]
      .drawnTileSource = "rinshan";

    const result = declarePlayerTsumo(
      state
    );

    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("地和");
  });
});
