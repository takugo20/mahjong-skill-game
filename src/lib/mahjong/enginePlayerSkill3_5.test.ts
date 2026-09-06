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
  Discard,
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
    id: `engine-player-skill-3-5-${serialNumber}`,
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

function emptyCpuHand(
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

function createState(
  previousDiscardCount: number
): {
  state: GameState;
  calledTile: Tile;
} {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-5",
        level: 1
      }]
    }
  );
  const calledTile =
    createTile("honor", 5);
  const discardAfterCall =
    createTile("man", 9);

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [calledTile],
    melds: [],
    discards: Array.from(
      { length: previousDiscardCount },
      (_, index) =>
        createDiscard(
          createTile("pin", index + 1)
        )
    ),
    drawnTileId: calledTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: createPonHand(
      discardAfterCall
    ),
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    calledTile
  };
}

describe("プレイヤースキル3-5 防御結界【序】のエンジン統合", () => {
  it("Lv.1ではプレイヤーの第1打をCPUがポンできない", () => {
    const {
      state,
      calledTile
    } = createState(0);
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

  it("Lv.1の保護終了後となる第4打はCPUがポンできる", () => {
    const {
      state,
      calledTile
    } = createState(3);
    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds
    ).toHaveLength(1);
    expect(
      result.round.players[1]
        .melds[0].kind
    ).toBe("pon");
    expect(
      result.round.players[0]
        .discards[3].called
    ).toBe(true);
  });

    it("保護期間中でもプレイヤーの捨て牌をCPUがロンできる", () => {
    const {
      state
    } = createState(0);
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
      discards: [],
      drawnTileId: winningTile.id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand,
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
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
      loserSeat: 0
    });
  });
});
