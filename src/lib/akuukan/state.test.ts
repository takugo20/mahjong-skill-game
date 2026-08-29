import {
  describe,
  expect,
  it
} from "vitest";
import {
  activateAkuukanEffect,
  advanceAkuukanTurnEffects,
  beginAkuukanTurn,
  createInitialAkuukanGameState,
  endAkuukanEffect,
  hasAkuukanEffectInstance,
  isAkuukanSourceUsed,
  markAkuukanSourceUsed,
  reserveAkuukanNextRoundEffect,
  resetAkuukanRoundUsage,
  resetAkuukanTurnUsage
} from "./state";
import type {
  AkuukanEffectInstance,
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

function createEffect(
  instanceId: string
): AkuukanEffectInstance {
  return {
    instanceId,
    sourceId: "player-skill:1-1",
    remainingTurns: 3
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

describe("亜空間麻雀の継続効果", () => {
  it("有効効果を入力から独立した状態で登録する", () => {
  const state =
    createInitialAkuukanGameState(
      createSetup()
    );
  const effect = createEffect("active-1");

  const activated = activateAkuukanEffect(
    state,
    effect
  );

  effect.remainingTurns = 1;

  expect(activated.activeEffects).toEqual([
    {
      instanceId: "active-1",
      sourceId: "player-skill:1-1",
      remainingTurns: 3
    }
  ]);
  expect(activated.activeEffects[0]).not.toBe(
    effect
  );
  expect(state.activeEffects).toEqual([]);
});

it("次局効果を入力から独立した状態で予約する", () => {
  const state =
    createInitialAkuukanGameState(
      createSetup()
    );
  const effect = createEffect("reserved-1");

  const reserved =
    reserveAkuukanNextRoundEffect(
      state,
      effect
    );

  effect.remainingTurns = 1;

  expect(reserved.nextRoundEffects).toEqual([
    {
      instanceId: "reserved-1",
      sourceId: "player-skill:1-1",
      remainingTurns: 3
    }
  ]);
  expect(
    reserved.nextRoundEffects[0]
  ).not.toBe(effect);
  expect(state.nextRoundEffects).toEqual([]);
});

it("有効中と予約中をまたいで同じインスタンスIDを重複登録しない", () => {
  const initial =
    createInitialAkuukanGameState(
      createSetup()
    );
  const activated = activateAkuukanEffect(
    initial,
    createEffect("shared-id")
  );
  const duplicateActive =
    activateAkuukanEffect(
      activated,
      createEffect("shared-id")
    );
  const duplicateReservation =
    reserveAkuukanNextRoundEffect(
      activated,
      createEffect("shared-id")
    );

  expect(duplicateActive).toBe(activated);
  expect(duplicateReservation).toBe(
    activated
  );
  expect(
    hasAkuukanEffectInstance(
      activated,
      "shared-id"
    )
  ).toBe(true);
});

it("同じ能力元でも異なるインスタンスIDなら登録する", () => {
  const initial =
    createInitialAkuukanGameState(
      createSetup()
    );
  const first = activateAkuukanEffect(
    initial,
    createEffect("stack-1")
  );
  const second = activateAkuukanEffect(
    first,
    createEffect("stack-2")
  );

  expect(
    second.activeEffects.map(
      (effect) => effect.instanceId
    )
  ).toEqual(["stack-1", "stack-2"]);
});

it("指定したインスタンスだけを有効中または予約中から終了する", () => {
  const initial =
    createInitialAkuukanGameState(
      createSetup()
    );
  const activated = activateAkuukanEffect(
    initial,
    createEffect("active-target")
  );
  const reserved =
    reserveAkuukanNextRoundEffect(
      activated,
      createEffect("reserved-target")
    );
  const withoutActive = endAkuukanEffect(
    reserved,
    "active-target"
  );
  const withoutReserved = endAkuukanEffect(
    withoutActive,
    "reserved-target"
  );

  expect(withoutActive.activeEffects).toEqual(
    []
  );
  expect(
    withoutActive.nextRoundEffects.map(
      (effect) => effect.instanceId
    )
  ).toEqual(["reserved-target"]);
  expect(withoutReserved.nextRoundEffects).toEqual(
    []
  );
  expect(
    endAkuukanEffect(
      withoutReserved,
      "missing"
    )
  ).toBe(withoutReserved);
  expect(reserved.activeEffects).toHaveLength(1);
  expect(reserved.nextRoundEffects).toHaveLength(
    1
  );
});
  
  it("手番開始時に残り手番数を減らし、0になる効果を終了する", () => {
    const state =
      createInitialAkuukanGameState(
        createSetup()
      );

    state.activeEffects = [
      {
        instanceId: "three-turns",
        sourceId: "player-skill:1-1",
        remainingTurns: 3
      },
      {
        instanceId: "last-turn",
        sourceId: "enemy-ability:E-1",
        remainingTurns: 1
      },
      {
        instanceId: "unlimited",
        sourceId: "player-skill:1-2",
        remainingTurns: null
      }
    ];

    const advanced =
      advanceAkuukanTurnEffects(state);

    expect(advanced.activeEffects).toEqual([
      {
        instanceId: "three-turns",
        sourceId: "player-skill:1-1",
        remainingTurns: 2
      },
      {
        instanceId: "unlimited",
        sourceId: "player-skill:1-2",
        remainingTurns: null
      }
    ]);
    expect(state.activeEffects).toHaveLength(3);
    expect(
      state.activeEffects[0].remainingTurns
    ).toBe(3);
  });

  it("手番履歴の消去と効果期限の更新を同時に行う", () => {
    let state =
      createInitialAkuukanGameState(
        createSetup()
      );

    state = markAkuukanSourceUsed(
      state,
      "turn",
      "enemy-ability:E-1"
    );
    state.activeEffects = [
      {
        instanceId: "two-turns",
        sourceId: "player-skill:1-1",
        remainingTurns: 2
      }
    ];

    const started = beginAkuukanTurn(state);

    expect(started.usedSources.turn).toEqual([]);
    expect(started.activeEffects).toEqual([
      {
        instanceId: "two-turns",
        sourceId: "player-skill:1-1",
        remainingTurns: 1
      }
    ]);
  });
});
