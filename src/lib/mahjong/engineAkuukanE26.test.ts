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
  startNextRound
} from "./engine";
import {
  calculateShanten
} from "./hand";
import type {
  GameState
} from "./types";

const E26_TEST_SEED = 123456789;

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

function getSelectedEnemyShanten(
  state: GameState
): number {
  return calculateShanten(
    state.round.players[2].hand
  ).minimum;
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

describe("敵14 E-26のエンジン統合", () => {
  it("初期配牌で能力者CPUの13枚を聴牌形にする", () => {
    const state = createInitialGameState(
      createSeededRandom(E26_TEST_SEED),
      createSetup("enemy-14")
    );

    expect(
      state.round.players[2].hand
    ).toHaveLength(13);
    expect(
      getSelectedEnemyShanten(state)
    ).toBe(0);
  });

  it("初期配牌後も136枚を重複なく保持する", () => {
    const state = createInitialGameState(
      createSeededRandom(E26_TEST_SEED),
      createSetup("enemy-14")
    );

    expectStandardTileDistribution(state);
  });

  it("E-26を持たない敵では通常配牌を変更しない", () => {
    const normalState =
      createInitialGameState(
        createSeededRandom(E26_TEST_SEED)
      );
    const otherEnemyState =
      createInitialGameState(
        createSeededRandom(E26_TEST_SEED),
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

  it("次局の配牌でも能力者CPUを再び聴牌形にする", () => {
    const state = createInitialGameState(
      () => 0.5,
      createSetup("enemy-14")
    );
    const nextState = startNextRound(
      endRoundWithAbortiveDraw(state),
      createSeededRandom(E26_TEST_SEED)
    );

    expect(
      nextState.round.players[2].hand
    ).toHaveLength(13);
    expect(
      getSelectedEnemyShanten(nextState)
    ).toBe(0);
    expectStandardTileDistribution(nextState);
  });

  it("E-26が無効なら次局の配牌を変更しない", () => {
    const e26State = createInitialGameState(
      () => 0.5,
      createSetup("enemy-14")
    );
    const otherEnemyState =
      createInitialGameState(
        () => 0.5,
        createSetup("enemy-8")
      );

    if (!e26State.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...e26State,
      akuukan: disableAkuukanSource(
        e26State.akuukan,
        "enemy-ability:E-26"
      )
    };
    const disabledNextState = startNextRound(
      endRoundWithAbortiveDraw(disabledState),
      createSeededRandom(E26_TEST_SEED)
    );
    const otherEnemyNextState = startNextRound(
      endRoundWithAbortiveDraw(
        otherEnemyState
      ),
      createSeededRandom(E26_TEST_SEED)
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
