import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import {
  createInitialGameState,
  declarePlayerMeldCall,
  declarePlayerOpenKan,
  getPlayerMeldCallOptions,
  getPlayerOpenKanCallOptions,
  getPlayerSelfKanOptions,
  playPlayerDiscard
} from "./engine";
import type {
  GameState,
  Meld,
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

type CallTestEnemyId =
  | "enemy-2"
  | "enemy-4"
  | "enemy-8";

function createState(
  enemyId: CallTestEnemyId = "enemy-2"
): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId,
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
  score: number,
  enemyId: CallTestEnemyId = "enemy-2"
): {
  state: GameState;
  calledTile: Tile;
} {
  const state = createState(enemyId);
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
  score: number,
  callerSeat: 1 | 2 | 3 = 1,
  enemyId: CallTestEnemyId = "enemy-2"
): {
  state: GameState;
  calledTile: Tile;
} {
  const state = createState(enemyId);
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
  state.round.players[callerSeat] = {
    ...state.round.players[callerSeat],
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
  score: number,
  enemyId: CallTestEnemyId = "enemy-2"
): GameState {
  const state = createState(enemyId);
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

function preparePlayerCallFromCpuDiscard(
  enemyId: CallTestEnemyId
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createState(enemyId);
  const playerDiscard = createTile(
    "honor",
    7
  );
  const calledTile = createTile(
    "honor",
    5
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...createTiles(
        "honor",
        [5, 5, 5]
      ),
      createTile("man", 9),
      playerDiscard
    ],
    melds: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  setEmptyCpuHands(state);
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = [
    calledTile,
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 1),
    createTile("pin", 9),
    createTile("sou", 1),
    createTile("sou", 9)
  ];

  return {
    state,
    playerDiscard
  };
}

function createPlayerSelfKanState(
  enemyId: CallTestEnemyId = "enemy-4"
): {
  state: GameState;
  addedTile: Tile;
} {
  const state = createState(enemyId);
  const ponTiles = createTiles(
    "honor",
    [6, 6, 6]
  );
  const addedTile = createTile(
    "honor",
    6
  );
  const closedKanTiles = createTiles(
    "man",
    [5, 5, 5, 5]
  );
  const otherTiles = createTiles(
    "pin",
    [1, 2, 3, 4, 6, 7]
  );
  const pon: Meld = {
    kind: "pon",
    tiles: ponTiles,
    calledFrom: 3,
    calledTileId: ponTiles[0].id
  };

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      addedTile,
      ...closedKanTiles,
      ...otherTiles
    ],
    melds: [pon],
    drawnTileId:
      otherTiles[otherTiles.length - 1].id,
    drawnTileSource: "liveWall"
  };

  return {
    state,
    addedTile
  };
}

function prepareCpuClosedKan(
  callerSeat: 1 | 2
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createState("enemy-4");
  const playerDiscard = createTile(
    "honor",
    7
  );
  const kanTiles = createTiles(
    "man",
    [5, 5, 5, 5]
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  setEmptyCpuHands(state);
  state.round.players[callerSeat] = {
    ...state.round.players[callerSeat],
    hand: [
      ...kanTiles,
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      )
    ],
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.liveWall = [
    ...(callerSeat === 2
      ? [createTile("honor", 2)]
      : []),
    createTile("honor", 1),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 1),
    createTile("pin", 9),
    createTile("sou", 1),
    createTile("sou", 9),
    createTile("honor", 5)
  ];
  state.round.deadWall[0] =
    createTile("honor", 6);

  return {
    state,
    playerDiscard
  };
}

function prepareCpuAddedKan(): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createState("enemy-4");
  const playerDiscard = createTile(
    "honor",
    7
  );
  const ponTiles = createTiles(
    "honor",
    [6, 6, 6]
  );
  const addedTile = createTile(
    "honor",
    6
  );
  const pon: Meld = {
    kind: "pon",
    tiles: ponTiles,
    calledFrom: 3,
    calledTileId: ponTiles[0].id
  };

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  setEmptyCpuHands(state);
  state.round.players[1] = {
    ...state.round.players[1],
    hand: createTiles(
      "sou",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    ),
    melds: [pon],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.liveWall = [
    addedTile,
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 1),
    createTile("pin", 9),
    createTile("sou", 9)
  ];
  state.round.deadWall[0] =
    createTile("honor", 5);

  return {
    state,
    playerDiscard
  };
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

describe("E-8のエンジン統合", () => {
  it("プレイヤーのポン・大明槓候補を表示しない", () => {
    const normal =
      preparePlayerCallFromCpuDiscard(
        "enemy-2"
      );
    const restricted =
      preparePlayerCallFromCpuDiscard(
        "enemy-4"
      );

    const normalResult = playPlayerDiscard(
      normal.state,
      normal.playerDiscard.id,
      () => 0.5
    );
    const restrictedResult =
      playPlayerDiscard(
        restricted.state,
        restricted.playerDiscard.id,
        () => 0.5
      );

    const normalMeldOptions =
      getPlayerMeldCallOptions(
        normalResult
      );

    expect(
      normalMeldOptions.length
    ).toBeGreaterThan(0);
    expect(
      normalMeldOptions.every(
        (option) =>
          option.kind === "pon"
      )
    ).toBe(true);
    expect(
      getPlayerOpenKanCallOptions(
        normalResult
      )
    ).toHaveLength(1);
    expect(
      getPlayerMeldCallOptions(
        restrictedResult
      )
    ).toEqual([]);
    expect(
      getPlayerOpenKanCallOptions(
        restrictedResult
      )
    ).toEqual([]);
  });

  it("通常CPUのポン・大明槓を禁止し敵4本人には許可する", () => {
    const normalPon = prepareCpuPon(
      1,
      25000,
      "enemy-4"
    );
    const enemyPon = prepareCpuPon(
      2,
      25000,
      "enemy-4"
    );
    const normalOpenKan =
      prepareCpuOpenKan(
        25000,
        1,
        "enemy-4"
      );
    const enemyOpenKan =
      prepareCpuOpenKan(
        25000,
        2,
        "enemy-4"
      );

    const normalPonResult =
      playPlayerDiscard(
        normalPon.state,
        normalPon.calledTile.id,
        () => 0.5
      );
    const enemyPonResult =
      playPlayerDiscard(
        enemyPon.state,
        enemyPon.calledTile.id,
        () => 0.5
      );
    const normalOpenKanResult =
      playPlayerDiscard(
        normalOpenKan.state,
        normalOpenKan.calledTile.id,
        () => 0.5
      );
    const enemyOpenKanResult =
      playPlayerDiscard(
        enemyOpenKan.state,
        enemyOpenKan.calledTile.id,
        () => 0.5
      );

    expect(
      normalPonResult.round.players[1]
        .melds
    ).toHaveLength(0);
    expect(
      enemyPonResult.round.players[2]
        .melds[0]
    ).toMatchObject({ kind: "pon" });
    expect(
      normalOpenKanResult.round.players[1]
        .melds
    ).toHaveLength(0);
    expect(
      enemyOpenKanResult.round.players[2]
        .melds[0]
    ).toMatchObject({ kind: "openKan" });
  });

  it("プレイヤーの暗槓だけを禁止して加槓候補を残す", () => {
    const { state, addedTile } =
      createPlayerSelfKanState();
    const options =
      getPlayerSelfKanOptions(state);

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "addedKan",
      tileId: addedTile.id
    });
    expect(
      options.some(
        (option) =>
          option.kind === "closedKan"
      )
    ).toBe(false);
  });

  it("通常CPUの暗槓だけを禁止して加槓と敵4本人の暗槓を許可する", () => {
    const normalClosedKan =
      prepareCpuClosedKan(1);
    const enemyClosedKan =
      prepareCpuClosedKan(2);
    const normalAddedKan =
      prepareCpuAddedKan();

    const normalClosedKanResult =
      playPlayerDiscard(
        normalClosedKan.state,
        normalClosedKan.playerDiscard.id,
        () => 0.5
      );
    const enemyClosedKanResult =
      playPlayerDiscard(
        enemyClosedKan.state,
        enemyClosedKan.playerDiscard.id,
        () => 0.5
      );
    const normalAddedKanResult =
      playPlayerDiscard(
        normalAddedKan.state,
        normalAddedKan.playerDiscard.id,
        () => 0.5
      );

    expect(
      normalClosedKanResult.round.players[1]
        .melds
    ).toHaveLength(0);
    expect(
      enemyClosedKanResult.round.players[2]
        .melds[0]
    ).toMatchObject({ kind: "closedKan" });
    expect(
      normalAddedKanResult.round.players[1]
        .melds[0]
    ).toMatchObject({ kind: "addedKan" });
  });
});

describe("E-13の副露・槓エンジン統合", () => {
  it("プレイヤーのポン・大明槓候補を表示しない", () => {
    const prepared =
      preparePlayerCallFromCpuDiscard(
        "enemy-8"
      );

    const result = playPlayerDiscard(
      prepared.state,
      prepared.playerDiscard.id,
      () => 0.5
    );

    expect(
      getPlayerMeldCallOptions(result)
    ).toEqual([]);
    expect(
      getPlayerOpenKanCallOptions(result)
    ).toEqual([]);
  });

  it("E-13が無効ならプレイヤーの副露候補を表示する", () => {
    const prepared =
      preparePlayerCallFromCpuDiscard(
        "enemy-8"
      );

    if (!prepared.state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    prepared.state.akuukan =
      disableAkuukanSource(
        prepared.state.akuukan,
        "enemy-ability:E-13"
      );

    const result = playPlayerDiscard(
      prepared.state,
      prepared.playerDiscard.id,
      () => 0.5
    );

    const meldOptions =
      getPlayerMeldCallOptions(result);

    expect(
      meldOptions.length
    ).toBeGreaterThan(0);
    expect(
      meldOptions.every(
        (option) => option.kind === "pon"
      )
    ).toBe(true);
    expect(
      getPlayerOpenKanCallOptions(result)
    ).toHaveLength(1);
  });

  it("プレイヤーの暗槓・加槓候補を両方残す", () => {
    const { state, addedTile } =
      createPlayerSelfKanState(
        "enemy-8"
      );
    const options =
      getPlayerSelfKanOptions(state);

    expect(
      options.some(
        (option) =>
          option.kind === "closedKan"
      )
    ).toBe(true);
    expect(
      options.some(
        (option) =>
          option.kind === "addedKan" &&
          option.tileId === addedTile.id
      )
    ).toBe(true);
  });

  it("通常CPUのポン・大明槓を禁止しない", () => {
    const pon = prepareCpuPon(
      1,
      25000,
      "enemy-8"
    );
    const openKan = prepareCpuOpenKan(
      25000,
      1,
      "enemy-8"
    );

    const ponResult = playPlayerDiscard(
      pon.state,
      pon.calledTile.id,
      () => 0.5
    );
    const openKanResult =
      playPlayerDiscard(
        openKan.state,
        openKan.calledTile.id,
        () => 0.5
      );

    expect(
      ponResult.round.players[1].melds[0]
    ).toMatchObject({ kind: "pon" });
    expect(
      openKanResult.round.players[1]
        .melds[0]
    ).toMatchObject({ kind: "openKan" });
  });
});
