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
    id: `akuukan-e12-${serialNumber}`,
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

type E12TestEnemyId =
  | "enemy-1"
  | "enemy-4";

function createState(
  enemyId: E12TestEnemyId = "enemy-4"
): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId,
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

function prepareEnemyPon(
  enemyId: E12TestEnemyId = "enemy-4"
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
  setShortLiveWall(state);

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

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [calledTile],
    drawnTileId: calledTile.id,
    drawnTileSource: "liveWall"
  };
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
  setShortLiveWall(state);
  state.round.deadWall[0] =
    createTile("honor", 7);

  return {
    state,
    calledTile
  };
}

describe("E-12のエンジン統合", () => {
  it("敵4のポン成立時に各他家から1000点ずつ奪う", () => {
    const { state, calledTile } =
      prepareEnemyPon();

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
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      24000,
      24000,
      28000,
      24000
    ]);
    expect(result.round.riichiPool).toBe(0);
  });

  it("敵4の大明槓成立時に各他家から1000点ずつ奪う", () => {
    const { state, calledTile } =
      prepareEnemyOpenKan();

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[2].melds[0]
    ).toMatchObject({
      kind: "openKan",
      calledTileId: calledTile.id
    });
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      24000,
      24000,
      28000,
      24000
    ]);
    expect(result.round.riichiPool).toBe(0);
  });

  it("E-12を持たない敵のポンでは点数を移動しない", () => {
    const { state, calledTile } =
      prepareEnemyPon("enemy-1");

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
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      25000,
      25000,
      25000,
      25000
    ]);
  });

  it("ロンが優先されてポンが不成立なら点数を奪わない", () => {
    const { state, calledTile } =
      prepareEnemyPon();

    state.round.players[2] = {
      ...state.round.players[2],
      hand: [
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles("honor", [1, 1]),
        ...createTiles("honor", [5, 5])
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
    const winResult =
      result.round.winResult;

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 2,
      loserSeat: 0
    });

    if (!winResult) {
      throw new Error(
        "敵4のロン結果がありません。"
      );
    }

    expect(
      result.round.players[2].melds
    ).toHaveLength(0);
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(false);
    expect(
      result.round.players[1].score
    ).toBe(25000);
    expect(
      result.round.players[3].score
    ).toBe(25000);
    expect(
      result.round.players[2].score
    ).toBe(
      25000 + winResult.totalPoints
    );
  });
});
