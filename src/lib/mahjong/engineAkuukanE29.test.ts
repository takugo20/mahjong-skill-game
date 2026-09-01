import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_E29_OTHER_PLAYER_MIN_SHANTEN,
  AKUUKAN_E29_SELECTED_ENEMY_MAX_SHANTEN
} from "../akuukan/shantenDealComposition";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  AkuukanMatchSetup,
  EnemyId
} from "../akuukan/types";
import {
  createInitialGameState,
  createNextRoundProgression,
  startNextRound
} from "./engine";
import {
  calculateShanten
} from "./hand";
import type {
  GameState,
  SeatIndex,
  Tile
} from "./types";

const E29_TEST_SEED = 123456789;

const ALL_SEATS = [0, 1, 2, 3] as const;

const OTHER_PLAYER_SEATS = [
  0,
  1,
  3
] as const;

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

function setSelectedEnemyAsDealer(
  state: GameState
): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      players: state.round.players.map(
        (player) => ({
          ...player,
          isDealer: player.seat === 2
        })
      )
    }
  };
}

function getInitialThirteenTiles(
  state: GameState,
  seat: SeatIndex
): Tile[] {
  const player =
    state.round.players[seat];

  if (!player.drawnTileId) {
    return [...player.hand];
  }

  return player.hand.filter(
    (tile) =>
      tile.id !== player.drawnTileId
  );
}

function getHandTileIds(
  state: GameState
): string[][] {
  return state.round.players.map(
    (player) =>
      player.hand.map((tile) => tile.id)
  );
}

function expectE29ShantenConstraints(
  state: GameState
): void {
  const initialHands = ALL_SEATS.map(
    (seat) =>
      getInitialThirteenTiles(
        state,
        seat
      )
  );
  const shantenBySeat =
    initialHands.map(
      (hand) =>
        calculateShanten(hand).minimum
    );

  expect(
    initialHands.map(
      (hand) => hand.length
    )
  ).toEqual([13, 13, 13, 13]);
  expect(
    shantenBySeat[2]
  ).toBeLessThanOrEqual(
    AKUUKAN_E29_SELECTED_ENEMY_MAX_SHANTEN
  );

  for (const seat of
    OTHER_PLAYER_SEATS) {
    expect(
      shantenBySeat[seat]
    ).toBeGreaterThanOrEqual(
      AKUUKAN_E29_OTHER_PLAYER_MIN_SHANTEN
    );
  }
}

function expectStandardTileDistribution(
  state: GameState
): void {
  expect(
    state.round.players.reduce(
      (total, player) =>
        total + player.hand.length,
      0
    )
  ).toBe(53);
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

describe("敵16 E-29のエンジン統合", () => {
  it("初期配牌で敵16を1向聴以下、他家を4向聴以上にする", () => {
    const state = createInitialGameState(
      createSeededRandom(E29_TEST_SEED),
      createSetup("enemy-16")
    );

    expectE29ShantenConstraints(state);
  });

  it("初期配牌後も136枚を重複なく保持する", () => {
    const state = createInitialGameState(
      createSeededRandom(E29_TEST_SEED),
      createSetup("enemy-16")
    );

    expect(
      state.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([14, 13, 13, 13]);
    expectStandardTileDistribution(state);
  });

  it("E-29を持たない敵では通常配牌を変更しない", () => {
    const normalState =
      createInitialGameState(
        createSeededRandom(E29_TEST_SEED)
      );
    const otherEnemyState =
      createInitialGameState(
        createSeededRandom(E29_TEST_SEED),
        createSetup("enemy-15")
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

  it("次局の配牌でも向聴数の条件を再び満たす", () => {
    const state = createInitialGameState(
      () => 0.5,
      createSetup("enemy-16")
    );
    const nextState = startNextRound(
      endRoundWithAbortiveDraw(state),
      createSeededRandom(E29_TEST_SEED)
    );

    expect(
      nextState.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([14, 13, 13, 13]);
    expectE29ShantenConstraints(nextState);
    expectStandardTileDistribution(nextState);
  });

  it("敵16が親でも第1ツモを除く13枚で条件を満たす", () => {
    const state = createInitialGameState(
      () => 0.5,
      createSetup("enemy-16")
    );
    const progression =
      createNextRoundProgression(
        endRoundWithAbortiveDraw(
          setSelectedEnemyAsDealer(state)
        ),
        createSeededRandom(E29_TEST_SEED)
      );
    const selectedEnemyDrawStep =
      progression.cpuSteps.find(
        (step) =>
          step.phase === "draw" &&
          step.seat === 2
      );

    if (!selectedEnemyDrawStep) {
      throw new Error(
        "敵16の親第1ツモ状態がありません。"
      );
    }

    const stateAfterDraw =
      selectedEnemyDrawStep.state;

    expect(
      stateAfterDraw.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([13, 13, 14, 13]);
    expect(
      stateAfterDraw.round.players[2]
        .drawnTileId
    ).not.toBeNull();
    expectE29ShantenConstraints(
      stateAfterDraw
    );
    expectStandardTileDistribution(
      stateAfterDraw
    );
  });

  it("E-29が無効なら次局の配牌を変更しない", () => {
    const e29State = createInitialGameState(
      () => 0.5,
      createSetup("enemy-16")
    );
    const normalState =
      createInitialGameState(() => 0.5);

    if (!e29State.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...e29State,
      akuukan: disableAkuukanSource(
        e29State.akuukan,
        "enemy-ability:E-29"
      )
    };
    const disabledNextState = startNextRound(
      endRoundWithAbortiveDraw(
        disabledState
      ),
      createSeededRandom(E29_TEST_SEED)
    );
    const normalNextState = startNextRound(
      endRoundWithAbortiveDraw(
        normalState
      ),
      createSeededRandom(E29_TEST_SEED)
    );

    expect(
      getHandTileIds(disabledNextState)
    ).toEqual(
      getHandTileIds(normalNextState)
    );
    expect(
      disabledNextState.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalNextState.round.liveWall.map(
        (tile) => tile.id
      )
    );
    expect(
      disabledNextState.round.deadWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalNextState.round.deadWall.map(
        (tile) => tile.id
      )
    );
  });
});
