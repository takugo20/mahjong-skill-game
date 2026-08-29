import {
  describe,
  expect,
  it
} from "vitest";
import {
  tryUseAkuukanAbility
} from "./abilityUse";
import type {
  AkuukanAbilityUseState
} from "./abilityUse";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource,
  markAkuukanSourceUsed
} from "./state";

interface TestAbilityUseState
  extends AkuukanAbilityUseState {
  marker: string;
}

function createState(
  playerMp = 420
): TestAbilityUseState {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-1",
            level: 3
          }
        ]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

describe("亜空間麻雀の能力使用取引", () => {
  it("成功時だけMP消費と使用済み記録を同時に行う", () => {
    const initial = createState();

    const result = tryUseAkuukanAbility(
      initial,
      "round",
      "player-skill:1-1",
      120
    );

    expect(result.succeeded).toBe(true);
    expect(result.failureReason).toBeNull();
    expect(result.state.playerMp).toBe(300);
    expect(result.state.marker).toBe(
      "preserved"
    );
    expect(
      result.state.akuukan.usedSources.round
    ).toEqual(["player-skill:1-1"]);
    expect(initial.playerMp).toBe(420);
    expect(
      initial.akuukan.usedSources.round
    ).toEqual([]);
  });

  it("消費0の能力も使用済みとして記録する", () => {
    const initial = createState();

    const result = tryUseAkuukanAbility(
      initial,
      "turn",
      "player-skill:1-1",
      0
    );

    expect(result.succeeded).toBe(true);
    expect(result.state.playerMp).toBe(420);
    expect(
      result.state.akuukan.usedSources.turn
    ).toEqual(["player-skill:1-1"]);
  });

  it("無効化中または使用済みならMPを消費しない", () => {
    const initial = createState();
    const disabled = {
      ...initial,
      akuukan: disableAkuukanSource(
        initial.akuukan,
        "player-skill:1-1"
      )
    };
    const used = {
      ...initial,
      akuukan: markAkuukanSourceUsed(
        initial.akuukan,
        "round",
        "player-skill:1-1"
      )
    };

    const disabledResult =
      tryUseAkuukanAbility(
        disabled,
        "round",
        "player-skill:1-1",
        120
      );
    const usedResult = tryUseAkuukanAbility(
      used,
      "round",
      "player-skill:1-1",
      120
    );

    expect(disabledResult).toEqual({
      state: disabled,
      succeeded: false,
      failureReason: "sourceUnavailable"
    });
    expect(usedResult).toEqual({
      state: used,
      succeeded: false,
      failureReason: "sourceUnavailable"
    });
    expect(disabledResult.state).toBe(disabled);
    expect(usedResult.state).toBe(used);
  });

  it("MP不足なら使用済み記録を追加しない", () => {
    const initial = createState(100);

    const result = tryUseAkuukanAbility(
      initial,
      "match",
      "player-skill:1-1",
      120
    );

    expect(result).toEqual({
      state: initial,
      succeeded: false,
      failureReason: "insufficientMp"
    });
    expect(result.state).toBe(initial);
    expect(
      initial.akuukan.usedSources.match
    ).toEqual([]);
  });

  it("負または不正な消費量を拒否する", () => {
    const initial = createState();

    const negative = tryUseAkuukanAbility(
      initial,
      "round",
      "player-skill:1-1",
      -1
    );
    const invalid = tryUseAkuukanAbility(
      initial,
      "round",
      "player-skill:1-1",
      Number.NaN
    );

    expect(negative.failureReason).toBe(
      "invalidCost"
    );
    expect(invalid.failureReason).toBe(
      "invalidCost"
    );
    expect(negative.state).toBe(initial);
    expect(invalid.state).toBe(initial);
    expect(
      initial.akuukan.usedSources.round
    ).toEqual([]);
  });
});
