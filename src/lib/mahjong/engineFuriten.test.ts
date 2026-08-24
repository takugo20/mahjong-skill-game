import {
  describe,
  expect,
  it
} from "vitest";
import {
  canPlayerRon,
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerTsumo,
  drawTile,
  playPlayerDiscard,
  skipPlayerRon,
  startNextRound
} from "./engine";
import type {
  Discard,
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
    id: `engine-furiten-${serialNumber}`,
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

function createCompletedPinfuHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [2, 3, 4, 5, 6, 7]
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

function createRonState(): {
  state: GameState;
  winningTile: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );

  const completedHand =
    createCompletedPinfuHand();
  const winningTile = completedHand[0];

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 9)
  ];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.players[0] = {
    ...state.round.players[0],
    hand: completedHand.slice(1),
    melds: [],
    discards: [],
    riichi: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null
  };
  state.round.players[1] = {
    ...state.round.players[1],
    discards: [
      createDiscard(winningTile)
    ]
  };
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
  state.round.lastDiscard = {
    seat: 1,
    discard: createDiscard(winningTile)
  };

  return {
    state,
    winningTile
  };
}

describe("エンジンの振聴ロン制御", () => {
  it("別の和了牌を自分が捨てているとロンできない", () => {
    const { state } = createRonState();

    state.round.players[0].discards = [
      createDiscard(
        createTile("man", 5)
      )
    ];

    expect(canPlayerRon(state)).toBe(false);
  });

  it("和了牌以外の捨て牌ならロンできる", () => {
    const { state } = createRonState();

    state.round.players[0].discards = [
      createDiscard(
        createTile("honor", 7)
      )
    ];

    expect(canPlayerRon(state)).toBe(true);
  });

  it("同巡内振聴中はロンできない", () => {
    const { state } = createRonState();

    state.round.players[0].temporaryFuriten =
      true;

    expect(canPlayerRon(state)).toBe(false);
  });

  it("立直後振聴中はロンできない", () => {
    const { state } = createRonState();

    state.round.players[0].riichiFuriten =
      true;

    expect(canPlayerRon(state)).toBe(false);
  });

  it("振聴中でもツモ和了できる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const hand = createCompletedPinfuHand();
    const winningTile = hand[0];

    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.players[0] = {
      ...state.round.players[0],
      hand,
      temporaryFuriten: true,
      riichiFuriten: true,
      drawnTileId: winningTile.id
    };

    expect(canPlayerTsumo(state)).toBe(true);

    const result =
      declarePlayerTsumo(state);

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult?.winMethod
    ).toBe("tsumo");
  });
});

describe("振聴フラグの発生と解除", () => {
  it("自分のツモで同巡内振聴だけ解除する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const player = state.round.players[0];

    state.round.phase = "drawing";
    state.round.currentSeat = 0;
    state.round.liveWall = [
      createTile("man", 1)
    ];
    state.round.players[0] = {
      ...player,
      hand: player.hand.slice(0, 13),
      temporaryFuriten: true,
      riichiFuriten: true,
      drawnTileId: null
    };

    const result = drawTile(state, 0);

    expect(
      result.round.players[0]
        .temporaryFuriten
    ).toBe(false);
    expect(
      result.round.players[0]
        .riichiFuriten
    ).toBe(true);
  });

  it("立直中にロンを見逃すと次のツモ後も振聴が残る", () => {
    const { state } = createRonState();

    state.round.players[0].riichi = true;

    const result = skipPlayerRon(
      state,
      () => 0.5
    );

    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(
      result.round.players[0]
        .temporaryFuriten
    ).toBe(false);
    expect(
      result.round.players[0]
        .riichiFuriten
    ).toBe(true);
  });
});

describe("CPUと次局の振聴処理", () => {
  it("CPUも自分の捨て牌による振聴でロンできない", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const completedHand =
      createCompletedPinfuHand();
    const winningTile = completedHand[0];
    const playerHand = [
      ...createNonWinningHand(),
      winningTile
    ];

    state.round.deadWall = Array.from(
      { length: 14 },
      () => createTile("honor", 7)
    );
    state.round.liveWall = [
      createTile("honor", 2),
      createTile("honor", 3),
      createTile("honor", 4),
      createTile("man", 9)
    ];
    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.players[0] = {
      ...state.round.players[0],
      hand: playerHand,
      drawnTileId: winningTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: completedHand.slice(1),
      discards: [
        createDiscard(
          createTile("man", 5)
        )
      ],
      drawnTileId: null
    };
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

    const result = playPlayerDiscard(
      state,
      winningTile.id,
      () => 0.5
    );

    expect(result.round.winResult).toBeNull();
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
  });

  it("次局開始時に全員の振聴フラグを解除する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "roundEnd";
    state.round.winResult = {
      winMethod: "tsumo",
      winnerSeat: 1,
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

    for (const player of state.round.players) {
      player.temporaryFuriten = true;
      player.riichiFuriten = true;
    }

    const result = startNextRound(
      state,
      createSeededRandom(12)
    );

    expect(
      result.round.players.map(
        (player) =>
          player.temporaryFuriten
      )
    ).toEqual([
      false,
      false,
      false,
      false
    ]);
    expect(
      result.round.players.map(
        (player) => player.riichiFuriten
      )
    ).toEqual([
      false,
      false,
      false,
      false
    ]);
  });
});
