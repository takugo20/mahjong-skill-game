import {
  describe,
  expect,
  it
} from "vitest";
import type {
  EnemyId,
  SkillLevel
} from "../akuukan/types";
import {
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo
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
    id: `engine-player-skill-1-7-${serialNumber}`,
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
  tile: Tile,
  called = false
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called
  };
}

function createHonorDiscards(
  count: number
): Discard[] {
  return Array.from(
    { length: count },
    (_, index) =>
      createDiscard(
        createTile(
          "honor",
          (index % 7) + 1
        )
      )
  );
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [2, 3, 4, 5, 6]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4, 5, 5]
    ),
    ...createTiles("sou", [6, 7, 8])
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

function setPlayerHand(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[]
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createBaseState(
  level: SkillLevel = 5,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: [{
        id: "1-7",
        level
      }]
    }
  );

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("honor", 2)
  ];
  state.round.honba = 0;
  state.round.riichiPool = 0;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;
  state.round.pendingKan = null;

  return state;
}

function preparePlayerTsumoState(
  honorDiscardCount: number,
  options: {
    readonly level?: SkillLevel;
    readonly enemyId?: EnemyId;
    readonly calledLastHonor?: boolean;
  } = {}
): GameState {
  const state = createBaseState(
    options.level ?? 5,
    options.enemyId ?? "enemy-1"
  );
  const winningTile = createTile(
    "man",
    1
  );
  const discards = createHonorDiscards(
    honorDiscardCount
  );

  if (
    options.calledLastHonor &&
    discards.length > 0
  ) {
    const lastIndex = discards.length - 1;
    const lastDiscard = discards[lastIndex];

    if (lastDiscard) {
      discards[lastIndex] = {
        ...lastDiscard,
        called: true
      };
    }
  }

  setPlayerHand(
    state,
    0,
    [
      ...createPinfuWaitHand(),
      winningTile
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
    discards,
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 16;
  state.round.lastDiscard = null;

  return state;
}

function preparePlayerRonState(
  honorDiscardCount: number
): GameState {
  const state = createBaseState();
  const winningTile = createTile(
    "man",
    1
  );
  const discard = createDiscard(
    winningTile
  );

  setPlayerHand(
    state,
    0,
    createPinfuWaitHand()
  );
  state.round.players[0] = {
    ...state.round.players[0],
    discards: createHonorDiscards(
      honorDiscardCount
    )
  };

  for (
    const seat of [1, 2, 3] as const
  ) {
    setPlayerHand(
      state,
      seat,
      createNonWinningHand()
    );
  }

  state.round.players[1] = {
    ...state.round.players[1],
    discards: [discard]
  };
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard
  };

  return state;
}

describe("プレイヤースキル1-7のエンジン統合", () => {
  it("必要枚数の字牌が河にあればツモ和了へ1翻加算する", () => {
    const below = declarePlayerTsumo(
      preparePlayerTsumoState(2)
    );
    const reached = declarePlayerTsumo(
      preparePlayerTsumoState(3)
    );

    expect(reached.round.winResult?.han).toBe(
      (below.round.winResult?.han ?? 0) + 1
    );
    expect(
      reached.round.winResult?.totalPoints
    ).toBeGreaterThan(
      below.round.winResult?.totalPoints ?? 0
    );
  });

  it("副露されて河から離れた字牌は必要枚数に含めない", () => {
    const below = declarePlayerTsumo(
      preparePlayerTsumoState(2)
    );
    const called = declarePlayerTsumo(
      preparePlayerTsumoState(3, {
        calledLastHonor: true
      })
    );

    expect(called.round.winResult?.han).toBe(
      below.round.winResult?.han
    );
  });

  it("ロン和了にも河の字牌による1翻を加算する", () => {
    const below = declarePlayerRon(
      preparePlayerRonState(2)
    );
    const reached = declarePlayerRon(
      preparePlayerRonState(3)
    );

    expect(reached.round.winResult?.han).toBe(
      (below.round.winResult?.han ?? 0) + 1
    );
    expect(
      reached.round.winResult?.totalPoints
    ).toBeGreaterThan(
      below.round.winResult?.totalPoints ?? 0
    );
  });

  it("レベル1では河の字牌を9枚要求する", () => {
    const below = declarePlayerTsumo(
      preparePlayerTsumoState(8, {
        level: 1
      })
    );
    const reached = declarePlayerTsumo(
      preparePlayerTsumoState(9, {
        level: 1
      })
    );

    expect(reached.round.winResult?.han).toBe(
      (below.round.winResult?.han ?? 0) + 1
    );
  });

  it("敵6のE-18で無効化中は加算しない", () => {
    const below = declarePlayerTsumo(
      preparePlayerTsumoState(2)
    );
    const disabledState =
      preparePlayerTsumoState(3, {
        enemyId: "enemy-6"
      });
    const disabled = declarePlayerTsumo(
      disabledState
    );

    expect(
      disabledState.akuukan?.disabledSources
    ).toContain("player-skill:1-7");
    expect(disabled.round.winResult?.han).toBe(
      below.round.winResult?.han
    );
  });
});
