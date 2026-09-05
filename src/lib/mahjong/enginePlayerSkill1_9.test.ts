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

type TestedWaitType =
  | "kanchan"
  | "penchan"
  | "ryanmen";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-1-9-${serialNumber}`,
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

function createDiscard(tile: Tile): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createWaitHand(
  waitType: TestedWaitType
): Tile[] {
  const waitTiles =
    waitType === "kanchan"
      ? [1, 3]
      : waitType === "penchan"
        ? [1, 2]
        : [2, 3];

  return [
    ...createTiles("man", waitTiles),
    ...createTiles("man", [4, 5, 6]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    ...createTiles("pin", [5, 5])
  ];
}

function getWinningTile(
  waitType: TestedWaitType
): Tile {
  return createTile(
    "man",
    waitType === "kanchan" ? 2 :
      waitType === "penchan" ? 3 : 1
  );
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
  level: SkillLevel | null,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: level === null
        ? []
        : [{
            id: "1-9",
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
  level: SkillLevel | null,
  waitType: TestedWaitType,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createBaseState(
    level,
    enemyId
  );
  const winningTile =
    getWinningTile(waitType);

  setPlayerHand(
    state,
    0,
    [
      ...createWaitHand(waitType),
      winningTile
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
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
  level: SkillLevel | null,
  waitType: TestedWaitType
): GameState {
  const state = createBaseState(level);
  const winningTile =
    getWinningTile(waitType);
  const discard = createDiscard(
    winningTile
  );

  setPlayerHand(
    state,
    0,
    createWaitHand(waitType)
  );
  state.round.players[0] = {
    ...state.round.players[0],
    riichi: true
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

describe("プレイヤースキル1-9のエンジン統合", () => {
  it("レベル1の嵌張ツモへ1翻加算する", () => {
    const withoutSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        "kanchan"
      )
    );
    const withSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        1,
        "kanchan"
      )
    );

    expect(withSkill.round.winResult?.han).toBe(
      (withoutSkill.round.winResult?.han ?? 0) + 1
    );
    expect(
      withSkill.round.winResult?.totalPoints
    ).toBeGreaterThan(
      withoutSkill.round.winResult?.totalPoints ?? 0
    );
  });

  it("レベル5の辺張ツモへ2翻加算する", () => {
    const withoutSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        "penchan"
      )
    );
    const withSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        5,
        "penchan"
      )
    );

    expect(withSkill.round.winResult?.han).toBe(
      (withoutSkill.round.winResult?.han ?? 0) + 2
    );
  });

  it("嵌張ロンへも2翻加算する", () => {
    const withoutSkill = declarePlayerRon(
      preparePlayerRonState(
        null,
        "kanchan"
      )
    );
    const withSkill = declarePlayerRon(
      preparePlayerRonState(
        5,
        "kanchan"
      )
    );

    expect(withSkill.round.winResult?.han).toBe(
      (withoutSkill.round.winResult?.han ?? 0) + 2
    );
    expect(
      withSkill.round.winResult?.totalPoints
    ).toBeGreaterThan(
      withoutSkill.round.winResult?.totalPoints ?? 0
    );
  });

  it("両面待ちには加算しない", () => {
    const withoutSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        "ryanmen"
      )
    );
    const withSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        5,
        "ryanmen"
      )
    );

    expect(withSkill.round.winResult?.han).toBe(
      withoutSkill.round.winResult?.han
    );
  });

  it("敵6のE-18で無効化中は加算しない", () => {
    const withoutSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        "kanchan"
      )
    );
    const disabledState =
      preparePlayerTsumoState(
        5,
        "kanchan",
        "enemy-6"
      );
    const disabled = declarePlayerTsumo(
      disabledState
    );

    expect(
      disabledState.akuukan?.disabledSources
    ).toContain("player-skill:1-9");
    expect(disabled.round.winResult?.han).toBe(
      withoutSkill.round.winResult?.han
    );
  });
});
