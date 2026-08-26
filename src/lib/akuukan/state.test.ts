import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanGameState
} from "./state";
import type {
  AkuukanMatchSetup
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

describe("亜空間麻雀の対局状態初期化", () => {
  it("対局中の効果と使用履歴を空で初期化する", () => {
    const setup = createSetup();

    expect(
      createInitialAkuukanGameState(setup)
    ).toEqual({
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

  it("入力された装備情報を複製して保持する", () => {
    const setup = createSetup();
    const state =
      createInitialAkuukanGameState(setup);

    setup.equippedSkills[0].level = 5;
    setup.equippedSkills.push({
      id: "2-1",
      level: 1
    });

    expect(state.setup).not.toBe(setup);
    expect(
      state.setup.equippedSkills
    ).toEqual([
      {
        id: "1-1",
        level: 3
      }
    ]);
  });

  it("対局ごとに独立した配列を生成する", () => {
    const first =
      createInitialAkuukanGameState(
        createSetup()
      );
    const second =
      createInitialAkuukanGameState(
        createSetup()
      );

    first.disabledSources.push(
      "player-skill:1-1"
    );
    first.usedSources.turn.push(
      "player-skill:1-1"
    );

    expect(second.disabledSources).toEqual([]);
    expect(second.usedSources.turn).toEqual([]);
  });
});
