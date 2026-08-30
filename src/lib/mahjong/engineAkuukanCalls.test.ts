import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerMeldCall,
  declarePlayerOpenKan,
  getPlayerOpenKanCallOptions,
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
    id: `akuukan-call-${serialNumber}`,
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

function createState(): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-2",
      equippedSkills: []
    }
  );
}

function createPonHand(
  discardAfterCall: Tile
): Tile[] {
  return [
    ...createTiles("honor", [5, 5]),
    ...createTiles("man", [2, 2]),
    discardAfterCall,
    ...createTiles(
      "pin",
      [1, 2, 3, 4, 5, 6]
    ),
    ...createTiles("sou", [7, 8])
  ];
}

function setEmptyCpuHands(
  state: GameState
): void {
  for (const seat of [1, 2, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      melds: [],
      drawnTileId: null,
      drawnTileSource: null
    };
  }
}

function setShortLiveWall(
  state: GameState
): void {
  state.round.liveWall = [
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 1),
    createTile("pin", 9),
    createTile("sou", 1),
    createTile("sou", 9)
  ];
}

function prepareCpuPon(
  callerSeat: SeatIndex,
  score: number
): {
  state: GameState;
  calledTile: Tile;
} {
  const state = createState();
  const calledTile = createTile(
    "honor",
    5
  );
  const discardAfterCall = createTile(
    "man",
    9
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [calledTile],
    drawnTileId: calledTile.id,
    drawnTileSource: "liveWall"
  };
  setEmptyCpuHands(state);
  state.round.players[callerSeat] = {
    ...state.round.players[callerSeat],
    score,
    hand: createPonHand(
      discardAfterCall
    ),
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  setShortLiveWall(state);

  return {
    state,
    calledTile
  };
}

function prepareCpuOpenKan(
  score: number
): {
  state: GameState;
  calledTile: Tile;
} {
  const state = createState();
  const calledTile = createTile(
    "honor",
    5
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [calledTile],
    drawnTileId: calledTile.id,
    drawnTileSource: "liveWall"
  };
  setEmptyCpuHands(state);
  state.round.players[1] = {
    ...state.round.players[1],
    score,
    hand: [
      ...createTiles(
        "honor",
        [5, 5, 5]
      ),
      ...createTiles("man", [2, 2]),
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles("sou", [7, 8])
    ],
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  setShortLiveWall(state);

  return {
    state,
    calledTile
  };
}

function createPlayerOpenKanState(
  score: number
): GameState {
  const state = createState();
  const calledTile = createTile(
    "man",
    2
  );
  const handTiles = createTiles(
    "man",
    [2, 2, 2]
  );
  const discard = {
    tile: calledTile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };

  state.round.players[0] = {
    ...state.round.players[0],
    score,
    hand: [
      ...handTiles,
      ...createTiles(
        "sou",
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      ),
      createTile("pin", 1)
    ],
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.players[1] = {
    ...state.round.players[1],
    discards: [discard]
  };
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard
  };
  state.round.meldCallOptions = [{
    id: "akuukan-open-kan-pon",
    kind: "pon",
    callerSeat: 0,
    discarderSeat: 1,
    calledTileId: calledTile.id,
    handTileIds: [
      handTiles[0].id,
      handTiles[1].id
    ]
  }];

  return state;
}

describe("E-3の副露候補制限", () => {
  it("1000点未満の通常CPUはポンしない", () => {
    const { state, calledTile } =
      prepareCpuPon(1, 999);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds
    ).toHaveLength(0);
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(false);
  });

  it("1000点ちょうどの通常CPUはポンできる", () => {
    const { state, calledTile } =
      prepareCpuPon(1, 1000);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds[0]
    ).toMatchObject({
      kind: "pon",
      calledTileId: calledTile.id
    });
    expect(
      result.round.players[1].score
    ).toBe(0);
    expect(result.round.riichiPool).toBe(
      1000
    );
  });

  it("E-3所有者本人は0点でもポンできる", () => {
    const { state, calledTile } =
      prepareCpuPon(2, 0);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[2].melds[0]
    ).toMatchObject({
      kind: "pon",
      calledTileId: calledTile.id
    });
    expect(
      result.round.players[2].score
    ).toBe(0);
    expect(result.round.riichiPool).toBe(0);
  });

  it("プレイヤーの大明槓候補を所持点で切り替える", () => {
    const insufficient =
      createPlayerOpenKanState(999);
    const exact =
      createPlayerOpenKanState(1000);

    expect(
      getPlayerOpenKanCallOptions(
        insufficient
      )
    ).toEqual([]);
    expect(
      getPlayerOpenKanCallOptions(exact)
    ).toHaveLength(1);
  });

    it("プレイヤーの大明槓成立時に1000点を供託する", () => {
    const state =
      createPlayerOpenKanState(1000);
    state.round.riichiPool = 2000;
    const option =
      getPlayerOpenKanCallOptions(state)[0];

    const result = declarePlayerOpenKan(
      state,
      option.id
    );

    expect(
      result.round.players[0].score
    ).toBe(0);
    expect(result.round.riichiPool).toBe(
      3000
    );
    expect(
      result.round.players[0].melds[0]
    ).toMatchObject({
      kind: "openKan"
    });
  });

    it("プレイヤーのポン成立時に1000点を供託する", () => {
    const state =
      createPlayerOpenKanState(1000);
    state.round.riichiPool = 2000;

    const result = declarePlayerMeldCall(
      state,
      "akuukan-open-kan-pon"
    );

    expect(
      result.round.players[0].score
    ).toBe(0);
    expect(result.round.riichiPool).toBe(
      3000
    );
    expect(
      result.round.players[0].melds[0]
    ).toMatchObject({
      kind: "pon"
    });
  });

    it("通常CPUの大明槓成立時に1000点を供託する", () => {
    const { state, calledTile } =
      prepareCpuOpenKan(1000);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].score
    ).toBe(0);
    expect(result.round.riichiPool).toBe(
      1000
    );
    expect(
      result.round.players[1].melds[0]
    ).toMatchObject({
      kind: "openKan",
      calledTileId: calledTile.id
    });
  });

    it("ロンが優先されてCPUのポンが不成立なら供託しない", () => {
    const { state, calledTile } =
      prepareCpuPon(1, 1000);

    state.round.players[2] = {
      ...state.round.players[2],
      hand: [
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles(
          "honor",
          [1, 1, 1]
        ),
        createTile("honor", 5)
      ],
      melds: [],
      drawnTileId: null,
      drawnTileSource: null
    };

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult?.winnerSeat
    ).toBe(2);
    expect(
      result.round.players[1].score
    ).toBe(1000);
    expect(
      result.round.players[1].melds
    ).toHaveLength(0);
  });
});
