import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  AkuukanMatchSetup,
  EnemyId
} from "../akuukan/types";
import {
  createInitialGameState,
  drawTile,
  startNextRound
} from "./engine";
import type {
  GameState,
  SeatIndex,
  Tile
} from "./types";

const E11_TEST_SEED = 123456789;

function createSetup(
  enemyId: EnemyId
): AkuukanMatchSetup {
  return {
    enemyId,
    equippedSkills: []
  };
}

function createSeededRandom(
  initialSeed: number
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (
      seed * 1664525 +
      1013904223
    ) >>> 0;

    return seed / 0x100000000;
  };
}

function createState(
  enemyId: EnemyId = "enemy-7"
): GameState {
  return createInitialGameState(
    createSeededRandom(E11_TEST_SEED),
    createSetup(enemyId)
  );
}

function endRoundWithAbortiveDraw(
  state: GameState
): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      phase: "roundEnd",
      abortiveDrawResult: {
        reason: "nineTerminals",
        declarerSeat: 0,
        distinctYaochuCount: 9
      }
    }
  };
}

function isWindTile(tile: Tile): boolean {
  return (
    tile.suit === "honor" &&
    tile.rank >= 1 &&
    tile.rank <= 4
  );
}

function expectOtherPlayersHaveNoWindTiles(
  state: GameState
): void {
  for (const seat of [0, 1, 3] as const) {
    expect(
      state.round.players[seat].hand.some(
        isWindTile
      )
    ).toBe(false);
  }
}

function expectStandardTileDistribution(
  state: GameState
): void {
  expect(
    state.round.players.map(
      (player) => player.hand.length
    )
  ).toEqual([14, 13, 13, 13]);
  expect(state.round.liveWall).toHaveLength(
    69
  );
  expect(state.round.deadWall).toHaveLength(
    14
  );

  const allTileIds = [
    ...state.round.players.flatMap(
      (player) =>
        player.hand.map((tile) => tile.id)
    ),
    ...state.round.liveWall.map(
      (tile) => tile.id
    ),
    ...state.round.deadWall.map(
      (tile) => tile.id
    )
  ];

  expect(allTileIds).toHaveLength(136);
  expect(new Set(allTileIds).size).toBe(136);
}

function getHandTileIds(
  state: GameState
): string[][] {
  return state.round.players.map(
    (player) =>
      player.hand.map((tile) => tile.id)
  );
}

function createTestTile(
  id: string,
  suit: Tile["suit"],
  rank: number
): Tile {
  return {
    id,
    suit,
    rank,
    red: false
  };
}

function prepareForcedDraw(
  state: GameState,
  seat: SeatIndex,
  liveWall: Tile[]
): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      currentSeat: seat,
      phase: "drawing",
      liveWall,
      players: state.round.players.map(
        (player) =>
          player.seat === seat
            ? {
                ...player,
                drawnTileId: null,
                drawnTileSource: null
              }
            : player
      )
    }
  };
}

describe("敵7 E-11のエンジン統合", () => {
  it("初期配牌と親の第1ツモから他家の風牌を除外する", () => {
    const state = createState();

    expectOtherPlayersHaveNoWindTiles(
      state
    );

    const dealerDrawnTileId =
      state.round.players[0].drawnTileId;
    const dealerDrawnTile =
      state.round.players[0].hand.find(
        (tile) =>
          tile.id === dealerDrawnTileId
      );

    expect(dealerDrawnTile).toBeDefined();

    if (!dealerDrawnTile) {
      throw new Error(
        "親の第1ツモ牌がありません。"
      );
    }

    expect(
      isWindTile(dealerDrawnTile)
    ).toBe(false);
    expectStandardTileDistribution(state);
  });

  it("E-11を持たない敵では通常配牌を変更しない", () => {
    const normalState =
      createInitialGameState(
        createSeededRandom(E11_TEST_SEED)
      );
    const otherEnemyState = createState(
      "enemy-8"
    );

    expect(
      getHandTileIds(otherEnemyState)
    ).toEqual(getHandTileIds(normalState));
    expect(
      otherEnemyState.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalState.round.liveWall.map(
        (tile) => tile.id
      )
    );
    expect(
      otherEnemyState.round.deadWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalState.round.deadWall.map(
        (tile) => tile.id
      )
    );
  });

  it("他家の通常ツモでは風牌を山に残して非風牌を取得する", () => {
    const windTile = createTestTile(
      "e11-wind-for-player",
      "honor",
      1
    );
    const numberTile = createTestTile(
      "e11-number-for-player",
      "man",
      1
    );
    const state = prepareForcedDraw(
      createState(),
      0,
      [windTile, numberTile]
    );

    const result = drawTile(state, 0);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(numberTile.id);
    expect(result.round.liveWall).toEqual([
      windTile
    ]);
  });

  it("能力者CPU本人は通常ツモで風牌を取得できる", () => {
    const windTile = createTestTile(
      "e11-wind-for-enemy",
      "honor",
      2
    );
    const numberTile = createTestTile(
      "e11-number-for-enemy",
      "pin",
      2
    );
    const state = prepareForcedDraw(
      createState(),
      2,
      [windTile, numberTile]
    );

    const result = drawTile(state, 2);

    expect(
      result.round.players[2].drawnTileId
    ).toBe(windTile.id);
    expect(result.round.liveWall).toEqual([
      numberTile
    ]);
  });

  it("E-11が無効なら他家も通常ツモで風牌を取得する", () => {
    const state = createState();

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...state,
      akuukan: disableAkuukanSource(
        state.akuukan,
        "enemy-ability:E-11"
      )
    };
    const windTile = createTestTile(
      "e11-disabled-wind",
      "honor",
      3
    );
    const numberTile = createTestTile(
      "e11-disabled-number",
      "sou",
      3
    );
    const drawingState = prepareForcedDraw(
      disabledState,
      0,
      [windTile, numberTile]
    );

    const result = drawTile(
      drawingState,
      0
    );

    expect(
      result.round.players[0].drawnTileId
    ).toBe(windTile.id);
    expect(result.round.liveWall).toEqual([
      numberTile
    ]);
  });

  it("次局の配牌と親の第1ツモにも再適用する", () => {
    const nextState = startNextRound(
      endRoundWithAbortiveDraw(
        createState()
      ),
      createSeededRandom(987654321)
    );

    expectOtherPlayersHaveNoWindTiles(
      nextState
    );
    expectStandardTileDistribution(
      nextState
    );
  });

  it("E-11が無効なら次局も通常配牌と同じになる", () => {
    const e11State = createState();
    const otherEnemyState = createState(
      "enemy-8"
    );

    if (!e11State.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...e11State,
      akuukan: disableAkuukanSource(
        e11State.akuukan,
        "enemy-ability:E-11"
      )
    };
    const disabledNextState = startNextRound(
      endRoundWithAbortiveDraw(disabledState),
      createSeededRandom(987654321)
    );
    const otherEnemyNextState = startNextRound(
      endRoundWithAbortiveDraw(
        otherEnemyState
      ),
      createSeededRandom(987654321)
    );

    expect(
      getHandTileIds(disabledNextState)
    ).toEqual(
      getHandTileIds(otherEnemyNextState)
    );
    expect(
      disabledNextState.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      otherEnemyNextState.round.liveWall.map(
        (tile) => tile.id
      )
    );
    expect(
      disabledNextState.round.deadWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      otherEnemyNextState.round.deadWall.map(
        (tile) => tile.id
      )
    );
  });
});
