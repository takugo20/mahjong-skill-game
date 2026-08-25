import {
  describe,
  expect,
  it
} from "vitest";
import {
  canPlayerRon,
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo,
  playPlayerDiscard,
  skipPlayerRon
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
    id: `engine-win-${serialNumber}`,
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

function createPinfuHand(): Tile[] {
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

function createDiscard(
  tile: Tile
): Discard {
  return {
    tile,
    tsumogiri: true,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createWinTestState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );

  state.round.liveWall = [
    createTile("man", 9)
  ];

  state.round.honba = 0;
  state.round.riichiPool = 0;
  state.round.winResult = null;

  return state;
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

function createCpuReactionState(): {
  state: GameState;
  discardedTile: Tile;
} {
  const state = createWinTestState();
  const discardedTile =
    createTile("honor", 1);
  const waitingTile =
    createTile("honor", 7);
  const ronTile = createTile("honor", 7);

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...createTiles(
        "man",
        [2, 3, 4]
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
        [5, 5, 5]
      ),
      waitingTile,
      discardedTile
    ],
    drawnTileId: discardedTile.id
  };

  state.round.players[1] = {
    ...state.round.players[1],
    hand: [
      ...createTiles(
        "man",
        [2, 3, 4, 5, 5]
      ),
      ...createTiles(
        "pin",
        [2, 3, 4, 5, 5]
      ),
      ...createTiles(
        "sou",
        [2, 3, 4]
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

  state.round.liveWall = [
    ronTile,
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    discardedTile
  };
}

describe("プレイヤーのツモ宣言", () => {
  it("和了可能なツモを精算して局を終了する", () => {
    const state = createWinTestState();
    const hand = createPinfuHand();
    const winningTile = hand[0];

    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.players[0] = {
      ...state.round.players[0],
      hand,
      drawnTileId: winningTile.id,
      riichi: false,
      ippatsu: false
    };

    expect(canPlayerTsumo(state)).toBe(true);

    const result =
      declarePlayerTsumo(state);

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 0,
      loserSeat: null,
      han: 2,
      fu: 20,
      totalPoints: 2100
    });
    expect(
      result.round.winResult?.yakuNames
    ).toEqual(
      expect.arrayContaining([
        "門前清自摸和",
        "平和"
      ])
    );
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      27100,
      24300,
      24300,
      24300
    ]);
    expect(result.round.riichiPool).toBe(0);
    expect(result.notice).toBe(
      "あなたがツモ和了しました。"
    );
  });

  it("未完成手牌では局を終了しない", () => {
    const state = createWinTestState();
    const hand = [
      ...createTiles(
        "man",
        [1, 2, 4, 5, 7, 8]
      ),
      ...createTiles(
        "pin",
        [1, 2, 4, 5, 7, 8]
      ),
      ...createTiles(
        "honor",
        [1, 2]
      )
    ];

    state.round.players[0] = {
      ...state.round.players[0],
      hand,
      drawnTileId:
        hand[hand.length - 1].id
    };

    expect(canPlayerTsumo(state)).toBe(false);

    const result =
      declarePlayerTsumo(state);

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.winResult).toBeNull();
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
    expect(result.notice).toBe(
      "現在の手牌ではツモ和了できません。"
    );
  });
});

describe("プレイヤーのロン宣言", () => {
  it("放銃者から点数を受け取って局を終了する", () => {
    const state = createWinTestState();
    const completedHand =
      createPinfuHand();
    const winningTile =
      completedHand[0];

    state.round.currentSeat = 2;
    state.round.phase = "reaction";
    state.round.players[0] = {
      ...state.round.players[0],
      hand: completedHand.slice(1),
      drawnTileId: null,
      riichi: false,
      ippatsu: false
    };
    state.round.players[1] = {
      ...state.round.players[1],
      discards: [
        createDiscard(winningTile)
      ]
    };
    state.round.lastDiscard = {
      seat: 1,
      discard: createDiscard(winningTile)
    };

    expect(canPlayerRon(state)).toBe(true);

    const result = declarePlayerRon(state);

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 0,
      loserSeat: 1,
      han: 1,
      fu: 30,
      totalPoints: 1500
    });
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      26500,
      23500,
      25000,
      25000
    ]);
    expect(result.notice).toBe(
      "あなたがCPU・右からロン和了しました。"
    );
  });

  it("自分の捨て牌ではロンできない", () => {
    const state = createWinTestState();
    const tile = createTile("man", 2);

    state.round.phase = "reaction";
    state.round.lastDiscard = {
      seat: 0,
      discard: createDiscard(tile)
    };

    expect(canPlayerRon(state)).toBe(false);
  });
});

describe("CPU手番中のロン待ち", () => {
  it("ロン可能な捨て牌でreaction状態へ移る", () => {
    const {
      state,
      discardedTile
    } = createCpuReactionState();

    const result = playPlayerDiscard(
      state,
      discardedTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(result.round.lastDiscard?.seat).not.toBe(0);
    expect(canPlayerRon(result)).toBe(true);
    expect(result.notice).toContain(
      "ロンできます"
    );
  });

  it("ロンを見送ると残りの手番を進める", () => {
    const {
      state,
      discardedTile
    } = createCpuReactionState();

    let result = playPlayerDiscard(
      state,
      discardedTile.id,
      () => 0.5
    );

    let skipCount = 0;

    while (
      result.round.phase === "reaction" &&
      skipCount < 4
    ) {
      result = skipPlayerRon(
        result,
        () => 0.5
      );

      skipCount += 1;
    }

    expect(skipCount).toBeGreaterThan(0);
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.winResult).toBeNull();
  });

  it("最後の捨て牌のロンを見送ると流局する", () => {
    const state = createWinTestState();
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

    state.round.phase = "reaction";
    state.round.liveWall = [];
    state.round.lastDiscard = {
      seat: 1,
      discard: createDiscard(
        createTile("man", 1)
      )
    };

    const result = skipPlayerRon(state);

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toBeNull();
    expect(result.notice).toContain(
      "荒牌平局"
    );
  });
});
