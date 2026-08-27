import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanGameState,
  isAkuukanSourceUsed,
  markAkuukanSourceUsed,
  resetAkuukanRoundUsage,
  resetAkuukanTurnUsage
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

describe("亜空間麻雀の能力使用履歴", () => {
  it("指定した範囲へ使用済み状態を記録する", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const marked = markAkuukanSourceUsed(
      initial,
      "round",
      "player-skill:1-1"
    );

    expect(
      isAkuukanSourceUsed(
        initial,
        "round",
        "player-skill:1-1"
      )
    ).toBe(false);
    expect(
      isAkuukanSourceUsed(
        marked,
        "round",
        "player-skill:1-1"
      )
    ).toBe(true);
    expect(initial.usedSources.round).toEqual([]);
  });

  it("同じ範囲へ同じ効果元を重複記録しない", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const first = markAkuukanSourceUsed(
      initial,
      "turn",
      "enemy-ability:E-1"
    );
    const second = markAkuukanSourceUsed(
      first,
      "turn",
      "enemy-ability:E-1"
    );

    expect(second).toBe(first);
    expect(second.usedSources.turn).toEqual([
      "enemy-ability:E-1"
    ]);
  });

  it("手番開始時は手番の履歴だけを消去する", () => {
    let state =
      createInitialAkuukanGameState(
        createSetup()
      );

    state = markAkuukanSourceUsed(
      state,
      "match",
      "player-skill:1-1"
    );
    state = markAkuukanSourceUsed(
      state,
      "round",
      "player-skill:1-2"
    );
    state = markAkuukanSourceUsed(
      state,
      "turn",
      "enemy-ability:E-1"
    );

    const reset = resetAkuukanTurnUsage(
      state
    );

    expect(reset.usedSources).toEqual({
      match: ["player-skill:1-1"],
      round: ["player-skill:1-2"],
      turn: []
    });
    expect(state.usedSources.turn).toEqual([
      "enemy-ability:E-1"
    ]);
  });

  it("局開始時は局と手番の履歴を消去する", () => {
    let state =
      createInitialAkuukanGameState(
        createSetup()
      );

    state = markAkuukanSourceUsed(
      state,
      "match",
      "player-skill:1-1"
    );
    state = markAkuukanSourceUsed(
      state,
      "round",
      "player-skill:1-2"
    );
    state = markAkuukanSourceUsed(
      state,
      "turn",
      "enemy-ability:E-1"
    );

    const reset = resetAkuukanRoundUsage(
      state
    );

    expect(reset.usedSources).toEqual({
      match: ["player-skill:1-1"],
      round: [],
      turn: []
    });
    expect(state.usedSources.round).toEqual([
      "player-skill:1-2"
    ]);
    expect(state.usedSources.turn).toEqual([
      "enemy-ability:E-1"
    ]);
  });
});
