import {
  describe,
  expect,
  it
} from "vitest";
import {
  tryActivateAkuukanPlayerSkill1_14
} from "./honbaIncrease";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource,
  resetAkuukanTurnUsage
} from "./state";
import type {
  SkillLevel
} from "./types";

function createState(
  level: SkillLevel | null = 1,
  playerMp = 420,
  honba = 2
) {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "1-14", level }]
      }),
    playerMp,
    maxMp: 900,
    honba,
    marker: "preserved"
  };
}

describe("プレイヤースキル1-14の本場増加", () => {
  it("各レベルのMPを消費して本場を1増やす", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
    }[] = [
      { level: 1, mpCost: 80 },
      { level: 2, mpCost: 70 },
      { level: 3, mpCost: 60 },
      { level: 4, mpCost: 50 },
      { level: 5, mpCost: 30 }
    ];

    for (const currentCase of cases) {
      const initial = createState(
        currentCase.level
      );
      const result =
        tryActivateAkuukanPlayerSkill1_14(
          initial
        );

      expect(result.succeeded).toBe(true);
      expect(result.failureReason).toBeNull();
      expect(result.state.honba).toBe(3);
      expect(result.state.playerMp).toBe(
        420 - currentCase.mpCost
      );
      expect(result.state.marker).toBe(
        "preserved"
      );
      expect(
        result.state.akuukan.usedSources.turn
      ).toContain("player-skill:1-14");
      expect(initial.honba).toBe(2);
      expect(initial.playerMp).toBe(420);
    }
  });

  it("同じ手番では2回発動しない", () => {
    const first =
      tryActivateAkuukanPlayerSkill1_14(
        createState(5)
      );
    const second =
      tryActivateAkuukanPlayerSkill1_14(
        first.state
      );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.honba).toBe(3);
    expect(second.state.playerMp).toBe(390);
  });

  it("次の手番では再び発動できる", () => {
    const first =
      tryActivateAkuukanPlayerSkill1_14(
        createState(5)
      );
    const nextTurnState = {
      ...first.state,
      akuukan: resetAkuukanTurnUsage(
        first.state.akuukan
      )
    };
    const second =
      tryActivateAkuukanPlayerSkill1_14(
        nextTurnState
      );

    expect(second.succeeded).toBe(true);
    expect(second.state.honba).toBe(4);
    expect(second.state.playerMp).toBe(360);
  });

  it("MP不足では本場を増やさず使用済みにしない", () => {
    const initial = createState(1, 79);
    const result =
      tryActivateAkuukanPlayerSkill1_14(
        initial
      );

    expect(result.succeeded).toBe(false);
    expect(result.failureReason).toBe(
      "insufficientMp"
    );
    expect(result.state).toBe(initial);
    expect(result.state.honba).toBe(2);
    expect(result.state.playerMp).toBe(79);
    expect(
      result.state.akuukan.usedSources.turn
    ).toEqual([]);
  });

  it("未装備またはE-18による無効化中は発動しない", () => {
    const notEquipped = createState(null);
    const enabled = createState(5);
    const disabled = {
      ...enabled,
      akuukan: disableAkuukanSource(
        enabled.akuukan,
        "player-skill:1-14"
      )
    };
    const notEquippedResult =
      tryActivateAkuukanPlayerSkill1_14(
        notEquipped
      );
    const disabledResult =
      tryActivateAkuukanPlayerSkill1_14(
        disabled
      );

    expect(
      notEquippedResult.failureReason
    ).toBe("skillNotEquipped");
    expect(disabledResult.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(notEquippedResult.state.honba).toBe(2);
    expect(disabledResult.state.honba).toBe(2);
    expect(disabledResult.state.playerMp).toBe(420);
  });

  it("不正な本場を拒否する", () => {
    for (const honba of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY
    ]) {
      expect(() =>
        tryActivateAkuukanPlayerSkill1_14(
          createState(1, 420, honba)
        )
      ).toThrow(
        "本場は0以上の安全な整数で指定してください。"
      );
    }
  });
});
