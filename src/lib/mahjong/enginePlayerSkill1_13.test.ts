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
    id: `engine-player-skill-1-13-${serialNumber}`,
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

function createSevenPairsWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 1, 2, 2]),
    ...createTiles("pin", [3, 3, 4, 4]),
    ...createTiles("sou", [5, 5, 6, 6]),
    createTile("honor", 1)
  ];
}

function createFortyFuWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 1, 1]),
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("pin", [4, 5, 6]),
    ...createTiles("sou", [6, 7, 8]),
    createTile("pin", 5)
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
        : [{ id: "1-13", level }]
    }
  );

  state.round.honba = 0;
  state.round.riichiPool = 0;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.lastDiscard = null;

  return state;
}

function preparePlayerTsumoState(
  level: SkillLevel | null,
  waitingHand: Tile[],
  winningTile: Tile,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createBaseState(
    level,
    enemyId
  );

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

  return state;
}

function preparePlayerRonState(
  level: SkillLevel | null,
  waitingHand: Tile[],
  winningTile: Tile
): GameState {
  const state = createBaseState(level);
  const discard = createDiscard(
    winningTile
  );

  setPlayerHand(state, 0, waitingHand);

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

function getWinResult(state: GameState) {
  const result = state.round.winResult;

  if (!result) {
    throw new Error(
      "和了結果が見つかりません。"
    );
  }

  return result;
}

describe("プレイヤースキル1-13のエンジン統合", () => {
  it("平和ツモの20符を30符へ変更する", () => {
    const normal = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        createPinfuWaitHand(),
        createTile("man", 1)
      )
    );
    const skill = declarePlayerTsumo(
      preparePlayerTsumoState(
        5,
        createPinfuWaitHand(),
        createTile("man", 1)
      )
    );

    expect(getWinResult(normal).fu).toBe(20);
    expect(getWinResult(skill).fu).toBe(30);
    expect(getWinResult(skill).han).toBe(
      getWinResult(normal).han
    );
    expect(
      getWinResult(skill).totalPoints
    ).toBeGreaterThan(
      getWinResult(normal).totalPoints
    );
  });

  it("七対子の25符を40符へ変更する", () => {
    const normal = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        createSevenPairsWaitHand(),
        createTile("honor", 1)
      )
    );
    const skill = declarePlayerTsumo(
      preparePlayerTsumoState(
        5,
        createSevenPairsWaitHand(),
        createTile("honor", 1)
      )
    );

    expect(getWinResult(normal).fu).toBe(25);
    expect(getWinResult(skill).fu).toBe(40);
    expect(getWinResult(skill).han).toBe(
      getWinResult(normal).han
    );
    expect(
      getWinResult(skill).totalPoints
    ).toBeGreaterThan(
      getWinResult(normal).totalPoints
    );
  });

  it("平和ロンの30符を40符へ変更する", () => {
    const normal = declarePlayerRon(
      preparePlayerRonState(
        null,
        createPinfuWaitHand(),
        createTile("man", 1)
      )
    );
    const skill = declarePlayerRon(
      preparePlayerRonState(
        5,
        createPinfuWaitHand(),
        createTile("man", 1)
      )
    );

    expect(getWinResult(normal).fu).toBe(30);
    expect(getWinResult(skill).fu).toBe(40);
    expect(getWinResult(skill).han).toBe(
      getWinResult(normal).han
    );
  });

  it("変更前が40符以上なら符を変えずレベル5で2翻加算する", () => {
    const normal = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        createFortyFuWaitHand(),
        createTile("pin", 5)
      )
    );
    const skill = declarePlayerTsumo(
      preparePlayerTsumoState(
        5,
        createFortyFuWaitHand(),
        createTile("pin", 5)
      )
    );

    expect(getWinResult(normal).fu).toBe(40);
    expect(getWinResult(skill).fu).toBe(40);
    expect(getWinResult(skill).han).toBe(
      getWinResult(normal).han + 2
    );
    expect(
      getWinResult(skill).totalPoints
    ).toBeGreaterThan(
      getWinResult(normal).totalPoints
    );
  });

  it("敵6のE-18で無効化中は符も翻も変更しない", () => {
    const normal = declarePlayerTsumo(
      preparePlayerTsumoState(
        null,
        createSevenPairsWaitHand(),
        createTile("honor", 1)
      )
    );
    const disabledState =
      preparePlayerTsumoState(
        5,
        createSevenPairsWaitHand(),
        createTile("honor", 1),
        "enemy-6"
      );
    const disabled = declarePlayerTsumo(
      disabledState
    );

    expect(
      disabledState.akuukan?.disabledSources
    ).toContain("player-skill:1-13");
    expect(getWinResult(disabled).fu).toBe(
      getWinResult(normal).fu
    );
    expect(getWinResult(disabled).han).toBe(
      getWinResult(normal).han
    );
  });
});
