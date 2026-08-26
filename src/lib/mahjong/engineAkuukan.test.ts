import {
  describe,
  expect,
  it
} from "vitest";
import type {
  AkuukanMatchSetup
} from "../akuukan/types";
import {
  createInitialGameState
} from "./engine";

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
