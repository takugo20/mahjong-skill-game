import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  getDoraIndicators,
  startNextRound
} from "./engine";
import {
  isDora
} from "./tiles";
import type {
  GameState
} from "./types";

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

function endRound(
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

describe("プレイヤースキル1-5のエンジン統合", () => {
  it("レベル1の発動時は初局のドラ表示牌を1枚追加する", () => {
    const state = createInitialGameState(
      () => 0,
      {
        enemyId: "enemy-1",
        equippedSkills: [{
          id: "1-5",
          level: 1
        }]
      }
    );

    expect(
      state.round.doraIndicatorCount
    ).toBe(2);
    expect(
      getDoraIndicators(state.round)
    ).toHaveLength(2);
  });

  it("レベル4の発動時は初局のドラ表示牌を2枚追加する", () => {
    const state = createInitialGameState(
      () => 0,
      {
        enemyId: "enemy-1",
        equippedSkills: [{
          id: "1-5",
          level: 4
        }]
      }
    );

    expect(
      state.round.doraIndicatorCount
    ).toBe(3);
    expect(
      getDoraIndicators(state.round)
    ).toHaveLength(3);
  });

  it("確率判定に失敗した場合は初期表示牌1枚のままにする", () => {
    const state = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [{
          id: "1-5",
          level: 5
        }]
      }
    );

    expect(
      state.round.doraIndicatorCount
    ).toBe(1);
  });

  it("敵6のE-18で無効化されていれば追加しない", () => {
    const state = createInitialGameState(
      () => 0,
      {
        enemyId: "enemy-6",
        equippedSkills: [{
          id: "1-5",
          level: 5
        }]
      }
    );

    expect(
      state.round.doraIndicatorCount
    ).toBe(1);
    expect(
      state.akuukan?.disabledSources
    ).toContain("player-skill:1-5");
  });

  it("次局開始時にも改めて発動判定する", () => {
    const firstRound =
      createInitialGameState(
        () => 0,
        {
          enemyId: "enemy-1",
          equippedSkills: [{
            id: "1-5",
            level: 1
          }]
        }
      );
    const nextRound = startNextRound(
      endRound(firstRound),
      () => 0
    );

    expect(
      firstRound.round.doraIndicatorCount
    ).toBe(2);
    expect(
      nextRound.round.doraIndicatorCount
    ).toBe(2);
  });

  it("敵9のE-16は追加前の初期ドラだけを暗刻配牌へ使用する", () => {
    const state = createInitialGameState(
      createSeededRandom(123456789),
      {
        enemyId: "enemy-9",
        equippedSkills: [{
          id: "1-5",
          level: 5
        }]
      }
    );
    const indicators =
      getDoraIndicators(state.round);
    const selectedEnemyHand =
      state.round.players[2].hand;

    expect(indicators).toHaveLength(3);
    expect(
      selectedEnemyHand.filter((tile) =>
        isDora(tile, indicators[0])
      )
    ).toHaveLength(3);
    expect(
      selectedEnemyHand.filter((tile) =>
        isDora(tile, indicators[1])
      ).length
    ).toBeLessThan(3);
  });
});
