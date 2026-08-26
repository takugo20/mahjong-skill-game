import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerOpenKan,
  declarePlayerTsumo,
  getPlayerOpenKanCallOptions,
  getPlayerSelfKanOptions,
  playPlayerDiscard,
  playPlayerSelfKan
} from "./engine";
import type {
  Discard,
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
    id: `engine-four-kans-${serialNumber}`,
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

function createKanMeld(
  suit: TileSuit,
  rank: number
): Meld {
  return {
    kind: "closedKan",
    tiles: createTiles(
      suit,
      [rank, rank, rank, rank]
    )
  };
}

function setThreeEstablishedKans(
  state: GameState
): void {
  state.round.kanCount = 3;
  state.round.doraIndicatorCount = 4;
  state.round.rinshanDrawCount = 3;
}

function emptyPlayer(
  state: GameState,
  seat: SeatIndex
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    drawnTileId: null,
    drawnTileSource: null
  };
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

function setPlayerClosedKanHand(
  state: GameState
): void {
  const kanTiles = createTiles(
    "honor",
    [7, 7, 7, 7]
  );
  const otherTiles = createTiles(
    "sou",
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...kanTiles,
      ...otherTiles
    ],
    drawnTileId:
      otherTiles[
        otherTiles.length - 1
      ].id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
}

function createPlayerOpenKanState(): {
  state: GameState;
  optionId: string;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const calledTile = createTile(
    "honor",
    5
  );
  const handTiles = createTiles(
    "honor",
    [5, 5, 5]
  );
  const discard = createDiscard(
    calledTile
  );

  setThreeEstablishedKans(state);
  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...handTiles,
      ...createTiles(
        "sou",
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
      )
    ],
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: [],
    melds: [],
    discards: [discard],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.players[2] = {
    ...state.round.players[2],
    hand: [],
    melds: [
      createKanMeld("man", 1),
      createKanMeld("pin", 1),
      createKanMeld("sou", 1)
    ],
    drawnTileId: null,
    drawnTileSource: null
  };
  emptyPlayer(state, 3);
  state.round.phase = "reaction";
  state.round.currentSeat = 2;
  state.round.lastDiscard = {
    seat: 1,
    discard
  };
  state.round.meldCallOptions = [{
    id: "four-kans-pon-priority",
    kind: "pon",
    callerSeat: 0,
    discarderSeat: 1,
    calledTileId: calledTile.id,
    handTileIds: [
      handTiles[0].id,
      handTiles[1].id
    ]
  }];

  const option =
    getPlayerOpenKanCallOptions(
      state
    )[0];

  if (!option) {
    throw new Error(
      "4回目の大明槓候補が見つかりません。"
    );
  }

  return {
    state,
    optionId: option.id
  };
}

describe("四槓散了のゲーム進行", () => {
  it("プレイヤーの4回目の暗槓後は嶺上ツモと打牌を行ってから途中流局にする", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    setThreeEstablishedKans(state);
    setPlayerClosedKanHand(state);
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [],
      melds: [
        createKanMeld("man", 1),
        createKanMeld("pin", 1),
        createKanMeld("sou", 1)
      ]
    };
    emptyPlayer(state, 2);
    emptyPlayer(state, 3);

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "4回目の暗槓候補が見つかりません。"
      );
    }

    const kanResult = playPlayerSelfKan(
      state,
      option.id
    );

    expect(kanResult.round.phase).toBe(
      "discarding"
    );
    expect(
      kanResult.round.abortiveDrawResult
    ).toBeNull();
    expect(
      kanResult.round.players[0]
        .drawnTileSource
    ).toBe("rinshan");
    expect(kanResult.round.kanCount).toBe(4);

    const discardTile =
      kanResult.round.players[0].hand[0];

    if (!discardTile) {
      throw new Error(
        "4回目の槓後の打牌がありません。"
      );
    }

    const result = playPlayerDiscard(
      kanResult,
      discardTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourKans",
      kanCountsBySeat: [1, 3, 0, 0]
    });
    expect(result.round.winResult).toBeNull();
    expect(result.notice).toBe(
      "四槓散了で途中流局です。"
    );
  });

  it("プレイヤーの4回目の大明槓後も打牌を行ってから途中流局にする", () => {
    const {
      state,
      optionId
    } = createPlayerOpenKanState();

    const kanResult = declarePlayerOpenKan(
      state,
      optionId
    );

    expect(kanResult.round.phase).toBe(
      "discarding"
    );
    expect(
      kanResult.round.abortiveDrawResult
    ).toBeNull();
    expect(
      kanResult.round.players[0]
        .drawnTileSource
    ).toBe("rinshan");

    const discardTile =
      kanResult.round.players[0].hand[0];

    if (!discardTile) {
      throw new Error(
        "4回目の槓後の打牌がありません。"
      );
    }

    const result = playPlayerDiscard(
      kanResult,
      discardTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourKans",
      kanCountsBySeat: [1, 0, 3, 0]
    });
    expect(result.round.kanCount).toBe(4);
  });

  it("CPUが4回目の大明槓後に打牌してから途中流局にする", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile = createTile(
      "honor",
      5
    );
    const matchingTiles = createTiles(
      "honor",
      [5, 5, 5]
    );

    setThreeEstablishedKans(state);
    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      melds: [
        createKanMeld("man", 1),
        createKanMeld("pin", 1),
        createKanMeld("sou", 1)
      ],
      drawnTileId: calledTile.id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...matchingTiles,
        ...createTiles("man", [2, 2]),
        createTile("man", 9),
        ...createTiles(
          "pin",
          [1, 2, 3, 4, 5, 6]
        ),
        createTile("sou", 7)
      ],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    emptyPlayer(state, 2);
    emptyPlayer(state, 3);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourKans",
      kanCountsBySeat: [3, 1, 0, 0]
    });
    expect(
      result.round.players[1].discards
    ).toHaveLength(1);
  });

  it("CPUが複数家による4回目の暗槓後に打牌してから途中流局にする", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const playerDiscard = createTile(
      "honor",
      7
    );
    const kanTiles = createTiles(
      "man",
      [5, 5, 5, 5]
    );

    setThreeEstablishedKans(state);
    state.round.players[0] = {
      ...state.round.players[0],
      hand: [playerDiscard],
      melds: [
        createKanMeld("man", 1),
        createKanMeld("pin", 1),
        createKanMeld("sou", 1)
      ],
      drawnTileId: playerDiscard.id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...kanTiles,
        ...createTiles(
          "pin",
          [1, 2, 3, 4, 5, 6]
        ),
        ...createTiles(
          "sou",
          [7, 8, 9]
        )
      ],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    emptyPlayer(state, 2);
    emptyPlayer(state, 3);
    state.round.liveWall = [
      createTile("honor", 1),
      createTile("honor", 2),
      createTile("honor", 3),
      createTile("honor", 4),
      createTile("man", 9),
      createTile("pin", 9),
      createTile("sou", 9),
      createTile("honor", 6)
    ];

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourKans",
      kanCountsBySeat: [3, 1, 0, 0]
    });
    expect(
      result.round.players[1].discards
    ).toHaveLength(1);
  });

  it("4回目の槓後の嶺上開花を四槓散了より優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const kanTiles = createTiles(
      "honor",
      [7, 7, 7, 7]
    );
    const otherTiles = [
      ...createTiles("man", [1, 2]),
      ...createTiles(
        "man",
        [4, 5, 6]
      ),
      ...createTiles(
        "pin",
        [2, 3, 4]
      ),
      ...createTiles("sou", [5, 5])
    ];
    const rinshanTile = createTile(
      "man",
      3
    );

    setThreeEstablishedKans(state);
    state.round.deadWall[3] =
      rinshanTile;
    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...kanTiles,
        ...otherTiles
      ],
      melds: [],
      drawnTileId:
        otherTiles[
          otherTiles.length - 1
        ].id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [],
      melds: [
        createKanMeld("man", 9),
        createKanMeld("pin", 9),
        createKanMeld("sou", 9)
      ],
      drawnTileId: null,
      drawnTileSource: null
    };
    emptyPlayer(state, 2);
    emptyPlayer(state, 3);
    state.round.currentSeat = 0;
    state.round.phase = "discarding";

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "4回目の暗槓候補が見つかりません。"
      );
    }

    const kanResult = playPlayerSelfKan(
      state,
      option.id
    );

    expect(
      kanResult.round.players[0]
        .drawnTileId
    ).toBe(rinshanTile.id);
    expect(
      kanResult.round.abortiveDrawResult
    ).toBeNull();

    const result = declarePlayerTsumo(
      kanResult
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 0,
      winningTile: rinshanTile
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("嶺上開花");
    expect(result.round.kanCount).toBe(4);
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
  });

  it("4回目の槓後の打牌へのロンを四槓散了より優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const kanTiles = createTiles(
      "honor",
      [7, 7, 7, 7]
    );
    const winningTile = createTile(
      "man",
      2
    );
    const otherTiles = [
      winningTile,
      ...createTiles(
        "sou",
        [1, 2, 3, 4, 5, 6, 7, 8, 9]
      )
    ];

    setThreeEstablishedKans(state);
    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...kanTiles,
        ...otherTiles
      ],
      melds: [],
      drawnTileId:
        otherTiles[
          otherTiles.length - 1
        ].id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
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
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: [],
      melds: [
        createKanMeld("man", 9),
        createKanMeld("pin", 9),
        createKanMeld("sou", 9)
      ],
      drawnTileId: null,
      drawnTileSource: null
    };
    emptyPlayer(state, 3);
    state.round.currentSeat = 0;
    state.round.phase = "discarding";

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "4回目の暗槓候補が見つかりません。"
      );
    }

    const kanResult = playPlayerSelfKan(
      state,
      option.id
    );
    const result = playPlayerDiscard(
      kanResult,
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
    expect(result.round.kanCount).toBe(4);
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
  });
  
  it("4回すべて同じプレイヤーの槓なら流局させず続行する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    setThreeEstablishedKans(state);
    setPlayerClosedKanHand(state);
    state.round.players[0].melds = [
      createKanMeld("man", 1),
      createKanMeld("pin", 1),
      createKanMeld("sou", 1)
    ];
    emptyPlayer(state, 1);
    emptyPlayer(state, 2);
    emptyPlayer(state, 3);

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "4回目の暗槓候補が見つかりません。"
      );
    }

    const result = playPlayerSelfKan(
      state,
      option.id
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.kanCount).toBe(4);
    expect(
      result.round.players[0].melds
    ).toHaveLength(4);
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
  });

  it("4回目の加槓牌がロンされた場合は槍槓を優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const ponTiles = createTiles(
      "man",
      [2, 2, 2]
    );
    const addedTile = createTile(
      "man",
      2
    );
    const otherTiles = createTiles(
      "sou",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    );
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    setThreeEstablishedKans(state);
    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        addedTile,
        ...otherTiles
      ],
      melds: [pon],
      drawnTileId:
        otherTiles[
          otherTiles.length - 1
        ].id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
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
      melds: []
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: [],
      melds: [
        createKanMeld("man", 1),
        createKanMeld("pin", 1),
        createKanMeld("sou", 1)
      ]
    };
    emptyPlayer(state, 3);

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "4回目の加槓候補が見つかりません。"
      );
    }

    const result = playPlayerSelfKan(
      state,
      option.id
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 1,
      loserSeat: 0,
      winningTile: addedTile
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("槍槓");
    expect(result.round.kanCount).toBe(3);
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
    expect(
      result.round.players[0].melds[0].kind
    ).toBe("pon");
  });
});
