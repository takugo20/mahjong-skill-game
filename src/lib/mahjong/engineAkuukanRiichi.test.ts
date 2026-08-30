import {
  describe,
  expect,
  it
} from "vitest";
import type {
  AkuukanMatchSetup
} from "../akuukan/types";
import {
  createInitialGameState,
  getPlayerRiichiDiscardTileIds,
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
    id:
      `engine-akuukan-riichi-` +
      serialNumber,
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

function createOpenRiichiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 2])
  ];
}

function createClosedRiichiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("man", [4, 5, 6]),
    ...createTiles("honor", [1, 2])
  ];
}

function createOneShantenHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3, 5]),
    ...createTiles("pin", [1, 2, 3, 9]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1, 2])
  ];
}

function createOpenMeld(): Meld {
  return {
    kind: "chi",
    tiles: createTiles(
      "man",
      [4, 5, 6]
    )
  };
}

function createDiscard(tile: Tile): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createPlayerOpenRiichiState(
  setup: AkuukanMatchSetup
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    setup
  );
  const hand = createOpenRiichiHand();

  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds: [createOpenMeld()],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: hand[10].id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = createTiles(
    "honor",
    [3, 4, 5, 6, 7, 3, 4, 5]
  );

  return state;
}

function setEmptyCpu(
  state: GameState,
  seat: 1 | 2 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createSelectedEnemyTurn(
  enemyId: AkuukanMatchSetup["enemyId"]
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );
  const playerDiscard = createTile(
    "honor",
    7
  );
  const openHand = createOpenRiichiHand();
  const selectedEnemyDraw =
    openHand[10];

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    discards: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  setEmptyCpu(state, 1);
  state.round.players[2] = {
    ...state.round.players[2],
    hand: openHand.slice(0, -1),
    melds: [createOpenMeld()],
    discards: [
      createDiscard(
        createTile("honor", 5)
      )
    ],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  setEmptyCpu(state, 3);
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = [
    createTile("honor", 6),
    selectedEnemyDraw,
    ...createTiles(
      "pin",
      [7, 8, 9, 7, 8, 9]
    )
  ];

  return {
    state,
    playerDiscard
  };
}

function createClosedCpuRiichiTurn(
  enemyId: AkuukanMatchSetup["enemyId"],
  targetSeat: 1 | 2
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );
  const playerDiscard = createTile(
    "honor",
    7
  );
  const completeHand =
    createClosedRiichiHand();
  const cpuDraw = completeHand[13];

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    discards: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };

  for (const seat of [1, 2, 3] as const) {
    setEmptyCpu(state, seat);
  }

  state.round.players[targetSeat] = {
    ...state.round.players[targetSeat],
    hand: completeHand.slice(0, -1),
    melds: [],
    discards: [
      createDiscard(
        createTile("honor", 5)
      )
    ],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = [
    ...(targetSeat === 2
      ? [createTile("honor", 6)]
      : []),
    cpuDraw,
    ...createTiles(
      "pin",
      [7, 8, 9, 7, 8, 9, 6]
    )
  ];

  return {
    state,
    playerDiscard
  };
}

function createSelectedEnemyNotenRiichiTurn(
  enemyId: AkuukanMatchSetup["enemyId"]
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );
  const playerDiscard = createTile(
    "honor",
    7
  );
  const completeHand =
    createOneShantenHand();
  const selectedEnemyDraw =
    completeHand[13];

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    discards: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };

  for (const seat of [1, 2, 3] as const) {
    setEmptyCpu(state, seat);
  }

  state.round.players[2] = {
    ...state.round.players[2],
    hand: completeHand.slice(0, -1),
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = [
    createTile("honor", 6),
    selectedEnemyDraw,
    ...createTiles(
      "pin",
      [7, 8, 9, 7, 8, 9]
    )
  ];

  return {
    state,
    playerDiscard
  };
}

describe("亜空間麻雀の副露立直", () => {
  it("2-7装備中のプレイヤーへ立直候補を返す", () => {
    const state =
      createPlayerOpenRiichiState({
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "2-7",
            level: 1
          }
        ]
      });
    const hand =
      state.round.players[0].hand;

    expect(
      getPlayerRiichiDiscardTileIds(state)
    ).toEqual([
      hand[9].id,
      hand[10].id
    ]);
  });

  it("発動中の1-15だけでは副露立直を許可しない", () => {
    const state =
      createPlayerOpenRiichiState({
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-15",
            level: 1
          }
        ]
      });

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state.akuukan = {
      ...state.akuukan,
      activeEffects: [
        {
          instanceId:
            "menzen-kaiki-active",
          sourceId:
            "player-skill:1-15",
          remainingTurns: 1
        }
      ]
    };

    expect(
      getPlayerRiichiDiscardTileIds(state)
    ).toEqual([]);
  });

  it("E-14で能力者CPUが副露後も立直する", () => {
    const {
      state,
      playerDiscard
    } = createSelectedEnemyTurn(
      "enemy-5"
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const selectedEnemy =
      result.round.players[2];

    expect(selectedEnemy.riichi).toBe(
      true
    );
    expect(
      selectedEnemy.doubleRiichi
    ).toBe(false);
    expect(selectedEnemy.melds).toHaveLength(
      1
    );
    expect(selectedEnemy.score).toBe(
      24000
    );
  });

  it("E-14を持たない能力者CPUは副露立直しない", () => {
    const {
      state,
      playerDiscard
    } = createSelectedEnemyTurn(
      "enemy-1"
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(
      result.round.players[2].riichi
    ).toBe(false);
  });

    it("E-9は2-7装備中のプレイヤーも立直禁止にする", () => {
    const state =
      createPlayerOpenRiichiState({
        enemyId: "enemy-3",
        equippedSkills: [
          {
            id: "2-7",
            level: 1
          }
        ]
      });

    expect(
      getPlayerRiichiDiscardTileIds(state)
    ).toEqual([]);
  });

  it("E-9は通常CPUの立直を禁止する", () => {
    const {
      state,
      playerDiscard
    } = createClosedCpuRiichiTurn(
      "enemy-3",
      1
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(
      result.round.players[1].riichi
    ).toBe(false);
  });

  it("E-9を持つ敵3本人は立直できる", () => {
    const {
      state,
      playerDiscard
    } = createClosedCpuRiichiTurn(
      "enemy-3",
      2
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(
      result.round.players[2].riichi
    ).toBe(true);
  });
});

describe("E-4のノーテン立直", () => {
  it("敵2本人は一向聴からノーテン立直する", () => {
    const {
      state,
      playerDiscard
    } =
      createSelectedEnemyNotenRiichiTurn(
        "enemy-2"
      );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const selectedEnemy =
      result.round.players[2];

    expect(selectedEnemy.riichi).toBe(
      true
    );
    expect(
      selectedEnemy.doubleRiichi
    ).toBe(true);
    expect(selectedEnemy.ippatsu).toBe(
      true
    );
    expect(selectedEnemy.score).toBe(
      24000
    );
    expect(
      selectedEnemy.discards[0]
        .riichiDeclaration
    ).toBe(true);
  });

  it("E-4を持たない敵はノーテン立直しない", () => {
    const {
      state,
      playerDiscard
    } =
      createSelectedEnemyNotenRiichiTurn(
        "enemy-1"
      );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(
      result.round.players[2].riichi
    ).toBe(false);
  });
});
