import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_1_15_INSTANCE_ID,
  tryActivateAkuukanPlayerSkill1_15
} from "./closedHandRestoration";
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
  playerMp = 500
) {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "1-15", level }]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

describe("プレイヤースキル1-15の門前回帰", () => {
  it("各レベルのMPを消費して指定巡数の効果を開始する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      durationTurns: number;
    }[] = [
      {
        level: 1,
        mpCost: 250,
        durationTurns: 1
      },
      {
        level: 2,
        mpCost: 230,
        durationTurns: 2
      },
      {
        level: 3,
        mpCost: 210,
        durationTurns: 3
      },
      {
        level: 4,
        mpCost: 180,
        durationTurns: 4
      },
      {
        level: 5,
        mpCost: 150,
        durationTurns: 6
      }
    ];

    for (const currentCase of cases) {
      const initial = createState(
        currentCase.level
      );
      const result =
        tryActivateAkuukanPlayerSkill1_15(
          initial
        );

      expect(result.succeeded).toBe(true);
      expect(result.failureReason).toBeNull();
      expect(result.state.playerMp).toBe(
        500 - currentCase.mpCost
      );
      expect(result.state.marker).toBe(
        "preserved"
      );
      expect(
        result.state.akuukan.activeEffects
      ).toEqual([
        {
          instanceId:
            AKUUKAN_PLAYER_SKILL_1_15_INSTANCE_ID,
          sourceId:
            "player-skill:1-15",
          remainingTurns:
            currentCase.durationTurns
        }
      ]);
      expect(
        result.state.akuukan.usedSources.turn
      ).toContain("player-skill:1-15");
      expect(initial.playerMp).toBe(500);
      expect(
        initial.akuukan.activeEffects
      ).toEqual([]);
    }
  });

  it("同じ手番では2回発動しない", () => {
    const first =
      tryActivateAkuukanPlayerSkill1_15(
        createState(5)
      );
    const second =
      tryActivateAkuukanPlayerSkill1_15(
        first.state
      );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.playerMp).toBe(350);
    expect(
      second.state.akuukan.activeEffects
    ).toHaveLength(1);
  });

  it("効果中は次の手番でも重ねて発動しない", () => {
    const first =
      tryActivateAkuukanPlayerSkill1_15(
        createState(5)
      );
    const nextTurnState = {
      ...first.state,
      akuukan: resetAkuukanTurnUsage(
        first.state.akuukan
      )
    };
    const second =
      tryActivateAkuukanPlayerSkill1_15(
        nextTurnState
      );

    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.playerMp).toBe(350);
  });

  it("MP不足では効果を開始せず使用済みにしない", () => {
    const initial = createState(1, 249);
    const result =
      tryActivateAkuukanPlayerSkill1_15(
        initial
      );

    expect(result.succeeded).toBe(false);
    expect(result.failureReason).toBe(
      "insufficientMp"
    );
    expect(result.state).toBe(initial);
    expect(result.state.playerMp).toBe(249);
    expect(
      result.state.akuukan.activeEffects
    ).toEqual([]);
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
        "player-skill:1-15"
      )
    };
    const notEquippedResult =
      tryActivateAkuukanPlayerSkill1_15(
        notEquipped
      );
    const disabledResult =
      tryActivateAkuukanPlayerSkill1_15(
        disabled
      );

    expect(
      notEquippedResult.failureReason
    ).toBe("skillNotEquipped");
    expect(disabledResult.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(
      notEquippedResult.state.akuukan
        .activeEffects
    ).toEqual([]);
    expect(
      disabledResult.state.akuukan
        .activeEffects
    ).toEqual([]);
    expect(disabledResult.state.playerMp).toBe(
      500
    );
  });
});
