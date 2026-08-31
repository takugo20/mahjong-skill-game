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
  getDoraIndicators,
  startNextRound
} from "./engine";
import {
  isDora
} from "./tiles";
import type {
  GameState,
  Tile
} from "./types";

const E16_TEST_SEED = 123456789;

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

function getInitialDoraIndicator(
  state: GameState
): Tile {
  const indicator =
    getDoraIndicators(state.round)[0];

  if (!indicator) {
    throw new Error(
      "初期ドラ表示牌がありません。"
    );
  }

  return indicator;
}

function countSelectedEnemyDora(
  state: GameState
): number {
  const indicator =
    getInitialDoraIndicator(state);

  return state.round.players[2].hand.filter(
    (tile) => isDora(tile, indicator)
  ).length;
}

function getHandTileIds(
  state: GameState
): string[][] {
  return state.round.players.map(
    (player) =>
      player.hand.map((tile) => tile.id)
  );
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

describe("敵9 E-16のエンジン統合", () => {
  it("初期配牌で能力者CPUへ初期ドラの暗刻を保証する", () => {
    const state = createInitialGameState(
      createSeededRandom(E16_TEST_SEED),
      createSetup("enemy-9")
    );

    expect(
      countSelectedEnemyDora(state)
    ).toBeGreaterThanOrEqual(3);
  });

  it("初期配牌後も136枚を重複なく保持する", () => {
    const state = createInitialGameState(
      createSeededRandom(E16_TEST_SEED),
      createSetup("enemy-9")
    );

    expectStandardTileDistribution(state);
  });

  it("E-16を持たない敵では通常配牌を変更しない", () => {
    const normalState =
      createInitialGameState(
        createSeededRandom(E16_TEST_SEED)
      );
    const otherEnemyState =
      createInitialGameState(
        createSeededRandom(E16_TEST_SEED),
        createSetup("enemy-8")
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

  it("次局の配牌でもドラ暗刻を再び保証する", () => {
    const state = createInitialGameState(
      () => 0.5,
      createSetup("enemy-9")
    );
    const nextState = startNextRound(
      endRoundWithAbortiveDraw(state),
      createSeededRandom(E16_TEST_SEED)
    );

    expect(
      countSelectedEnemyDora(nextState)
    ).toBeGreaterThanOrEqual(3);
    expectStandardTileDistribution(nextState);
  });

  it("E-16が無効なら次局の配牌を変更しない", () => {
    const e16State = createInitialGameState(
      () => 0.5,
      createSetup("enemy-9")
    );
    const otherEnemyState =
      createInitialGameState(
        () => 0.5,
        createSetup("enemy-8")
      );

    if (!e16State.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...e16State,
      akuukan: disableAkuukanSource(
        e16State.akuukan,
        "enemy-ability:E-16"
      )
    };
    const disabledNextState = startNextRound(
      endRoundWithAbortiveDraw(disabledState),
      createSeededRandom(E16_TEST_SEED)
    );
    const otherEnemyNextState = startNextRound(
      endRoundWithAbortiveDraw(
        otherEnemyState
      ),
      createSeededRandom(E16_TEST_SEED)
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
  });
});
