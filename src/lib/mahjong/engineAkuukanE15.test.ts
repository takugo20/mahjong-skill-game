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
  Meld,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `akuukan-e15-engine-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[],
  red = false
): Tile[] {
  return ranks.map(
    (rank) => createTile(
      suit,
      rank,
      red
    )
  );
}

function createState(): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-8",
      equippedSkills: []
    }
  );
}

function clearCpuHands(
  state: GameState
): void {
  for (const seat of [1, 2, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
  }
}

function setPlayerDiscard(
  state: GameState,
  tile: Tile
): void {
  state.round.players[0] = {
    ...state.round.players[0],
    hand: [tile],
    melds: [],
    drawnTileId: tile.id,
    drawnTileSource: "liveWall"
  };
}

function setLiveWall(
  state: GameState,
  firstTiles: readonly Tile[] = []
): void {
  state.round.liveWall = [
    ...firstTiles,
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

function createChiHand(
  discardAfterCall: Tile
): Tile[] {
  return [
    ...createTiles("man", [5, 6, 7, 8]),
    ...createTiles(
      "pin",
      [2, 2, 2, 3, 4]
    ),
    ...createTiles("sou", [5, 6, 7]),
    discardAfterCall
  ];
}

function prepareEnemyPon(): {
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

  setPlayerDiscard(state, calledTile);
  clearCpuHands(state);
  state.round.players[2] = {
    ...state.round.players[2],
    hand: createPonHand(
      discardAfterCall
    ),
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  setLiveWall(state);

  return {
    state,
    calledTile
  };
}

function prepareEnemyOpenKan(): {
  state: GameState;
  calledTile: Tile;
} {
  const state = createState();
  const calledTile = createTile(
    "honor",
    5
  );

  setPlayerDiscard(state, calledTile);
  clearCpuHands(state);
  state.round.players[2] = {
    ...state.round.players[2],
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
  setLiveWall(state);
  state.round.deadWall[0] =
    createTile("honor", 7);

  return {
    state,
    calledTile
  };
}

function prepareEnemyChi(): {
  state: GameState;
  playerDiscard: Tile;
  calledTile: Tile;
} {
  const state = createState();
  const playerDiscard = createTile(
    "honor",
    7
  );
  const calledTile = createTile(
    "man",
    4
  );
  const discardAfterCall = createTile(
    "honor",
    6
  );

  setPlayerDiscard(state, playerDiscard);
  clearCpuHands(state);
  state.round.players[2] = {
    ...state.round.players[2],
    hand: createChiHand(
      discardAfterCall
    ),
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  setLiveWall(state, [calledTile]);

  return {
    state,
    playerDiscard,
    calledTile
  };
}

function prepareEnemyAddedKan(): {
  state: GameState;
  playerDiscard: Tile;
  addedTile: Tile;
} {
  const state = createState();
  const playerDiscard = createTile(
    "honor",
    7
  );
  const firstCpuDraw = createTile(
    "honor",
    4
  );
  const addedTile = createTile(
    "honor",
    6
  );
  const ponTiles = createTiles(
    "honor",
    [6, 6, 6]
  );
  const pon: Meld = {
    kind: "pon",
    tiles: ponTiles,
    calledFrom: 3,
    calledTileId: ponTiles[0].id
  };

  setPlayerDiscard(state, playerDiscard);
  clearCpuHands(state);
  state.round.players[2] = {
    ...state.round.players[2],
    hand: createTiles(
      "sou",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    ),
    melds: [pon],
    drawnTileId: null,
    drawnTileSource: null
  };
  setLiveWall(
    state,
    [firstCpuDraw, addedTile]
  );
  state.round.deadWall[0] =
    createTile("honor", 2);

  return {
    state,
    playerDiscard,
    addedTile
  };
}

describe("E-15のエンジン統合", () => {
  it("敵8がチーした3枚すべてを赤ドラ化する", () => {
    const {
      state,
      playerDiscard,
      calledTile
    } = prepareEnemyChi();

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const meld =
      result.round.players[2].melds[0];

    expect(meld).toMatchObject({
      kind: "chi",
      calledTileId: calledTile.id
    });
    expect(
      meld.tiles.map(
        (tile) => tile.red
      )
    ).toEqual([true, true, true]);
  });

  it("敵8がポンした3枚すべてを赤ドラ化する", () => {
    const { state, calledTile } =
      prepareEnemyPon();

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );
    const meld =
      result.round.players[2].melds[0];

    expect(meld).toMatchObject({
      kind: "pon",
      calledTileId: calledTile.id
    });
    expect(
      meld.tiles.map(
        (tile) => tile.red
      )
    ).toEqual([true, true, true]);
  });

  it("敵8が大明槓した4枚すべてを赤ドラ化する", () => {
    const { state, calledTile } =
      prepareEnemyOpenKan();

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );
    const meld =
      result.round.players[2].melds[0];

    expect(meld).toMatchObject({
      kind: "openKan",
      calledTileId: calledTile.id
    });
    expect(
      meld.tiles.map(
        (tile) => tile.red
      )
    ).toEqual([
      true,
      true,
      true,
      true
    ]);
  });

  it("敵8の加槓では新しく加えた1枚だけを赤ドラ化する", () => {
    const {
      state,
      playerDiscard,
      addedTile
    } = prepareEnemyAddedKan();

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const meld =
      result.round.players[2].melds[0];
    const addedMeldTile = meld.tiles.find(
      (tile) => tile.id === addedTile.id
    );

    expect(meld.kind).toBe("addedKan");
    expect(meld.tiles).toHaveLength(4);
    expect(addedMeldTile?.red).toBe(true);
    expect(
      meld.tiles
        .filter(
          (tile) =>
            tile.id !== addedTile.id
        )
        .map((tile) => tile.red)
    ).toEqual([false, false, false]);
  });

  it("赤ドラ化したポンを和了時に赤ドラ3翻として数える", () => {
    const { state, calledTile } =
      prepareEnemyPon();
    const stateAfterPon =
      playPlayerDiscard(
        state,
        calledTile.id,
        () => 0.5
      );
    const winningTile = createTile(
      "honor",
      1
    );
    const redPon =
      stateAfterPon.round.players[2]
        .melds[0];

    stateAfterPon.round.players[0] = {
      ...stateAfterPon.round.players[0],
      hand: [winningTile],
      drawnTileId: winningTile.id,
      drawnTileSource: "liveWall"
    };
    stateAfterPon.round.players[1] = {
      ...stateAfterPon.round.players[1],
      hand: [],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    stateAfterPon.round.players[2] = {
      ...stateAfterPon.round.players[2],
      hand: [
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        createTile("honor", 1)
      ],
      melds: [redPon],
      discards: [],
      temporaryFuriten: false,
      riichiFuriten: false,
      drawnTileId: null,
      drawnTileSource: null
    };
    stateAfterPon.round.players[3] = {
      ...stateAfterPon.round.players[3],
      hand: [],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    stateAfterPon.round.currentSeat = 0;
    stateAfterPon.round.phase =
      "discarding";
    stateAfterPon.round.lastDiscard = null;
    stateAfterPon.round.meldCallOptions = [];
    stateAfterPon.round.pendingKan = null;
    stateAfterPon.round.winResult = null;
    stateAfterPon.round.doubleRonResult =
      null;
    stateAfterPon.round.liveWall = [
      createTile("honor", 7)
    ];
    stateAfterPon.round.deadWall =
      Array.from(
        { length: 14 },
        () => createTile("honor", 1)
      );

    const result = playPlayerDiscard(
      stateAfterPon,
      winningTile.id,
      () => 0.5
    );

    expect(
      redPon.tiles.every(
        (tile) => tile.red
      )
    ).toBe(true);
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 2,
      loserSeat: 0,
      doraCount: 3
    });
  });
});
