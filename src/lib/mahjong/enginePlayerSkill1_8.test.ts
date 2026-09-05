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
    id: `engine-player-skill-1-8-${serialNumber}`,
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

function createSevenPairsWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 1, 2, 2]),
    ...createTiles("pin", [3, 3, 4, 4]),
    ...createTiles("sou", [5, 5, 6, 6]),
    createTile("honor", 1)
  ];
}

function createRyanmenWaitHand(): Tile[] {
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
            id: "1-8",
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
  options: {
    readonly enemyId?: EnemyId;
    readonly ryanmen?: boolean;
  } = {}
): GameState {
  const state = createBaseState(
    level,
    options.enemyId
  );
  const winningTile = options.ryanmen
    ? createTile("man", 1)
    : createTile("honor", 1);
  const waitingHand = options.ryanmen
    ? createRyanmenWaitHand()
    : createSevenPairsWaitHand();

  setPlayerHand(
    state,
    0,
    [...waitingHand, winningTile]
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
  level: SkillLevel | null
): GameState {
  const state = createBaseState(level);
  const winningTile = createTile(
    "honor",
    1
  );
  const discard = createDiscard(
    winningTile
  );

  setPlayerHand(
    state,
    0,
    createSevenPairsWaitHand()
  );

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

describe("プレイヤースキル1-8のエンジン統合", () => {
  it("レベル1の単騎ツモへ1翻加算する", () => {
    const withoutSkill = declarePlayerTsumo(
      preparePlayerTsumoState(null)
    );
    const withSkill = declarePlayerTsumo(
      preparePlayerTsumoState(1)
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

  it("レベル5の単騎ツモへ2翻加算する", () => {
    const withoutSkill = declarePlayerTsumo(
      preparePlayerTsumoState(null)
    );
    const withSkill = declarePlayerTsumo(
      preparePlayerTsumoState(5)
    );

    expect(withSkill.round.winResult?.han).toBe(
      (withoutSkill.round.winResult?.han ?? 0) + 2
    );
  });

  it("単騎ロンへも2翻加算する", () => {
    const withoutSkill = declarePlayerRon(
      preparePlayerRonState(null)
    );
    const withSkill = declarePlayerRon(
      preparePlayerRonState(5)
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
        { ryanmen: true }
      )
    );
    const withSkill = declarePlayerTsumo(
      preparePlayerTsumoState(
        5,
        { ryanmen: true }
      )
    );

    expect(withSkill.round.winResult?.han).toBe(
      withoutSkill.round.winResult?.han
    );
  });

  it("敵6のE-18で無効化中は加算しない", () => {
    const withoutSkill = declarePlayerTsumo(
      preparePlayerTsumoState(null)
    );
    const disabledState =
      preparePlayerTsumoState(
        5,
        { enemyId: "enemy-6" }
      );
    const disabled = declarePlayerTsumo(
      disabledState
    );

    expect(
      disabledState.akuukan?.disabledSources
    ).toContain("player-skill:1-8");
    expect(disabled.round.winResult?.han).toBe(
      withoutSkill.round.winResult?.han
    );
  });
});
