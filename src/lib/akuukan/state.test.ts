import {
  describe,
  expect,
  it
} from "vitest";
import {
  activateAkuukanEffect,
  advanceAkuukanTurnEffects,
  beginAkuukanRound,
  beginAkuukanTurn,
  canUseAkuukanSource,
  createInitialAkuukanGameState,
  disableAkuukanSource,
  enableAkuukanSource,
  endAkuukanEffect,
  hasAkuukanEffectInstance,
  isAkuukanSourceDisabled,
  isAkuukanSourceUsed,
  markAkuukanSourceUsed,
  reserveAkuukanNextRoundEffect,
  resetAkuukanRoundUsage,
  resetAkuukanTurnUsage,
  tryUseAkuukanSource
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

function createE18Setup(): AkuukanMatchSetup {
  return {
    enemyId: "enemy-6",
    equippedSkills: [
      {
        id: "1-1",
        level: 3
      },
      {
        id: "2-7",
        level: 1
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

describe("敵6 E-18の対局状態初期化", () => {
  it("装備スキルを保持したまま無効化状態で開始する", () => {
    const setup = createE18Setup();
    const state =
      createInitialAkuukanGameState(
        setup
      );

    expect(state.setup).toEqual(setup);
    expect(state.disabledSources).toEqual([
      "player-skill:1-1",
      "player-skill:2-7"
    ]);
    expect(
      isAkuukanSourceDisabled(
        state,
        "player-skill:1-1"
      )
    ).toBe(true);
    expect(
      isAkuukanSourceDisabled(
        state,
        "player-skill:2-7"
      )
    ).toBe(true);
  });

  it("敵6自身のE-10とE-18は有効なまま開始する", () => {
    const state =
      createInitialAkuukanGameState(
        createE18Setup()
      );

    expect(
      isAkuukanSourceDisabled(
        state,
        "enemy-ability:E-10"
      )
    ).toBe(false);
    expect(
      isAkuukanSourceDisabled(
        state,
        "enemy-ability:E-18"
      )
    ).toBe(false);
  });

  it("E-18を持たない敵なら装備スキルを無効化しない", () => {
    const setup = {
      ...createE18Setup(),
      enemyId: "enemy-5" as const
    };
    const state =
      createInitialAkuukanGameState(
        setup
      );

    expect(state.disabledSources).toEqual(
      []
    );
    expect(
      isAkuukanSourceDisabled(
        state,
        "player-skill:1-1"
      )
    ).toBe(false);
  });

  it("無効化されたスキルは使用できない", () => {
    const state =
      createInitialAkuukanGameState(
        createE18Setup()
      );
    const result = tryUseAkuukanSource(
      state,
      "round",
      "player-skill:1-1"
    );

    expect(
      canUseAkuukanSource(
        state,
        "round",
        "player-skill:1-1"
      )
    ).toBe(false);
    expect(result.succeeded).toBe(false);
    expect(result.state).toBe(state);
  });

  it("局が変わってもE-18の無効化を維持する", () => {
    const initial =
      createInitialAkuukanGameState(
        createE18Setup()
      );
    const nextRound =
      beginAkuukanRound(initial);

    expect(
      nextRound.disabledSources
    ).toEqual([
      "player-skill:1-1",
      "player-skill:2-7"
    ]);
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

describe("亜空間麻雀の能力無効化", () => {
  it("効果を残したまま能力元を無効化する", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const activated = activateAkuukanEffect(
      initial,
      createEffect("active-while-disabled")
    );

    const disabled = disableAkuukanSource(
      activated,
      "player-skill:1-1"
    );

    expect(disabled.disabledSources).toEqual([
      "player-skill:1-1"
    ]);
    expect(disabled.activeEffects).toEqual(
      activated.activeEffects
    );
    expect(activated.disabledSources).toEqual(
      []
    );
  });

  it("同じ能力元を重複して無効化しない", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const disabled = disableAkuukanSource(
      initial,
      "enemy-ability:E-1"
    );
    const duplicate = disableAkuukanSource(
      disabled,
      "enemy-ability:E-1"
    );

    expect(duplicate).toBe(disabled);
    expect(
      isAkuukanSourceDisabled(
        duplicate,
        "enemy-ability:E-1"
      )
    ).toBe(true);
  });

  it("指定した能力元だけを再有効化する", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const first = disableAkuukanSource(
      initial,
      "player-skill:1-1"
    );
    const second = disableAkuukanSource(
      first,
      "enemy-ability:E-1"
    );
    const enabled = enableAkuukanSource(
      second,
      "player-skill:1-1"
    );

    expect(enabled.disabledSources).toEqual([
      "enemy-ability:E-1"
    ]);
    expect(
      isAkuukanSourceDisabled(
        enabled,
        "player-skill:1-1"
      )
    ).toBe(false);
    expect(second.disabledSources).toEqual([
      "player-skill:1-1",
      "enemy-ability:E-1"
    ]);
    expect(
      enableAkuukanSource(
        enabled,
        "player-skill:1-1"
      )
    ).toBe(enabled);
  });
});

describe("亜空間麻雀の能力使用可否", () => {
  it("有効かつ未使用なら各範囲で使用できる", () => {
    const state =
      createInitialAkuukanGameState(
        createSetup()
      );

    expect(
      canUseAkuukanSource(
        state,
        "match",
        "player-skill:1-1"
      )
    ).toBe(true);
    expect(
      canUseAkuukanSource(
        state,
        "round",
        "player-skill:1-1"
      )
    ).toBe(true);
    expect(
      canUseAkuukanSource(
        state,
        "turn",
        "player-skill:1-1"
      )
    ).toBe(true);
  });

  it("未使用でも能力元が無効なら使用できない", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const disabled = disableAkuukanSource(
      initial,
      "enemy-ability:E-1"
    );

    expect(
      canUseAkuukanSource(
        disabled,
        "round",
        "enemy-ability:E-1"
      )
    ).toBe(false);
    expect(
      isAkuukanSourceUsed(
        disabled,
        "round",
        "enemy-ability:E-1"
      )
    ).toBe(false);
  });

  it("使用済みの範囲だけ使用できない", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const used = markAkuukanSourceUsed(
      initial,
      "round",
      "player-skill:1-1"
    );

    expect(
      canUseAkuukanSource(
        used,
        "round",
        "player-skill:1-1"
      )
    ).toBe(false);
    expect(
      canUseAkuukanSource(
        used,
        "match",
        "player-skill:1-1"
      )
    ).toBe(true);
    expect(
      canUseAkuukanSource(
        used,
        "turn",
        "player-skill:1-1"
      )
    ).toBe(true);
  });
});

describe("亜空間麻雀の能力使用", () => {
  it("使用可能なら指定範囲へ使用済み記録を追加する", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );

    const result = tryUseAkuukanSource(
      initial,
      "round",
      "player-skill:1-1"
    );

    expect(result.succeeded).toBe(true);
    expect(result.state.usedSources).toEqual({
      match: [],
      round: ["player-skill:1-1"],
      turn: []
    });
    expect(initial.usedSources.round).toEqual(
      []
    );
  });

  it("無効化中なら使用済みにせず元の状態を返す", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const disabled = disableAkuukanSource(
      initial,
      "enemy-ability:E-1"
    );

    const result = tryUseAkuukanSource(
      disabled,
      "turn",
      "enemy-ability:E-1"
    );

    expect(result.succeeded).toBe(false);
    expect(result.state).toBe(disabled);
    expect(
      result.state.usedSources.turn
    ).toEqual([]);
  });

  it("使用済みなら重複記録せず元の状態を返す", () => {
    const initial =
      createInitialAkuukanGameState(
        createSetup()
      );
    const first = tryUseAkuukanSource(
      initial,
      "match",
      "player-skill:1-1"
    );
    const second = tryUseAkuukanSource(
      first.state,
      "match",
      "player-skill:1-1"
    );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.state).toBe(first.state);
    expect(
      second.state.usedSources.match
    ).toEqual(["player-skill:1-1"]);
  });
});
