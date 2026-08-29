import {
  describe,
  expect,
  it
} from "vitest";
import {
  markAkuukanSourceUsed
} from "../akuukan/state";
import type {
  AkuukanEffectInstance,
  AkuukanMatchSetup
} from "../akuukan/types";
import {
  createInitialGameState,
  startNextRound
} from "./engine";
import type {
  GameState
} from "./types";

function createSetup(): AkuukanMatchSetup {
  return {
    enemyId: "enemy-1",
    equippedSkills: [
      {
        id: "1-1",
        level: 3
      }
    ]
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

describe("通常麻雀と亜空間麻雀の初期化", () => {
  it("設定がなければ亜空間状態を生成しない", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    expect("akuukan" in state).toBe(false);
    expect(state.akuukan).toBeUndefined();
  });

  it("設定があれば亜空間状態を初期化する", () => {
    const setup = createSetup();
    const state = createInitialGameState(
      () => 0.5,
      setup
    );

    expect(state.akuukan).toEqual({
      setup,
      disabledSources: [],
      activeEffects: [],
      nextRoundEffects: [],
      usedSources: {
        match: [],
        round: [],
        turn: []
      }
    });
  });
});

describe("次局開始時の亜空間状態", () => {
  it("対局履歴を残して局と手番の履歴を消去する", () => {
    let state = createInitialGameState(
      () => 0.5,
      createSetup()
    );

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    state = {
      ...state,
      akuukan: markAkuukanSourceUsed(
        markAkuukanSourceUsed(
          markAkuukanSourceUsed(
            state.akuukan,
            "match",
            "player-skill:1-1"
          ),
          "round",
          "player-skill:1-2"
        ),
        "turn",
        "enemy-ability:E-1"
      )
    };

    const nextState = startNextRound(
      endRoundWithAbortiveDraw(state),
      () => 0.5
    );

    expect(
      nextState.akuukan?.usedSources
    ).toEqual({
      match: ["player-skill:1-1"],
      round: [],
      turn: []
    });
  });

it("予約効果を既存効果の後ろへ移して予約一覧を空にする", () => {
  let state = createInitialGameState(
    () => 0.5,
    createSetup()
  );

  if (!state.akuukan) {
    throw new Error(
      "亜空間状態が初期化されていません。"
    );
  }

  const activeEffect:
    AkuukanEffectInstance = {
      instanceId: "active-effect",
      sourceId: "player-skill:1-1",
      remainingTurns: null
    };
  const reservedEffect:
    AkuukanEffectInstance = {
      instanceId: "reserved-effect",
      sourceId: "player-skill:2-19",
      remainingTurns: null
    };

  state = {
    ...state,
    akuukan: {
      ...state.akuukan,
      activeEffects: [activeEffect],
      nextRoundEffects: [reservedEffect]
    }
  };

  const nextState = startNextRound(
    endRoundWithAbortiveDraw(state),
    () => 0.5
  );

  expect(
    nextState.akuukan?.activeEffects
  ).toEqual([
    activeEffect,
    reservedEffect
  ]);
  expect(
    nextState.akuukan?.nextRoundEffects
  ).toEqual([]);
  expect(
    state.akuukan?.activeEffects
  ).toEqual([activeEffect]);
  expect(
    state.akuukan?.nextRoundEffects
  ).toEqual([reservedEffect]);
});
  
  it("通常麻雀には亜空間状態を追加しない", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    const nextState = startNextRound(
      endRoundWithAbortiveDraw(state),
      () => 0.5
    );

    expect("akuukan" in nextState).toBe(false);
    expect(nextState.akuukan).toBeUndefined();
  });
});
