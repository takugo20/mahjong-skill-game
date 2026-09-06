import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID,
  advanceAkuukanPlayerSkill3_9BeforePlayerAction,
  hasAkuukanPlayerSkill3_9RonImmunity,
  tryActivateAkuukanPlayerSkill3_9
} from "./ronImmunity";
import {
  advanceAkuukanTurnEffects,
  beginAkuukanRound,
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
          : [{ id: "3-9", level }]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

describe("プレイヤースキル3-9 防御結界【破】", () => {
  it("各レベルのMPと継続巡数を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      durationTurns: number;
    }[] = [
      { level: 1, mpCost: 360, durationTurns: 1 },
      { level: 2, mpCost: 320, durationTurns: 2 },
      { level: 3, mpCost: 280, durationTurns: 3 },
      { level: 4, mpCost: 240, durationTurns: 4 },
      { level: 5, mpCost: 200, durationTurns: 6 }
    ];

    for (const currentCase of cases) {
      const initial = createState(
        currentCase.level
      );
      const result =
        tryActivateAkuukanPlayerSkill3_9(
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
            AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID,
          sourceId: "player-skill:3-9",
          remainingTurns:
            currentCase.durationTurns
        }
      ]);
      expect(
        result.state.akuukan.usedSources.turn
      ).toContain("player-skill:3-9");
      expect(
        hasAkuukanPlayerSkill3_9RonImmunity(
          result.state.akuukan
        )
      ).toBe(true);
      expect(initial.playerMp).toBe(500);
      expect(
        initial.akuukan.activeEffects
      ).toEqual([]);
    }
  });

  it("効果中は手番使用状況がリセットされても再発動しない", () => {
    const first =
      tryActivateAkuukanPlayerSkill3_9(
        createState(2)
      );
    const nextTurnState = {
      ...first.state,
      akuukan: resetAkuukanTurnUsage(
        first.state.akuukan
      )
    };
    const second =
      tryActivateAkuukanPlayerSkill3_9(
        nextTurnState
      );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.playerMp).toBe(180);
  });

  it("次のプレイヤー行動前に巡数を進め、終了後は再発動できる", () => {
    const activated =
      tryActivateAkuukanPlayerSkill3_9(
        createState(2)
      );
    const afterFirstProtectedDiscard =
      advanceAkuukanPlayerSkill3_9BeforePlayerAction(
        resetAkuukanTurnUsage(
          activated.state.akuukan
        )
      );
    const afterSecondProtectedDiscard =
      advanceAkuukanPlayerSkill3_9BeforePlayerAction(
        resetAkuukanTurnUsage(
          afterFirstProtectedDiscard
        )
      );
    const reactivation =
      tryActivateAkuukanPlayerSkill3_9({
        ...activated.state,
        playerMp: 500,
        akuukan:
          afterSecondProtectedDiscard
      });

    expect(
      afterFirstProtectedDiscard
        .activeEffects[0]?.remainingTurns
    ).toBe(1);
    expect(
      hasAkuukanPlayerSkill3_9RonImmunity(
        afterFirstProtectedDiscard
      )
    ).toBe(true);
    expect(
      hasAkuukanPlayerSkill3_9RonImmunity(
        afterSecondProtectedDiscard
      )
    ).toBe(false);
    expect(reactivation.succeeded).toBe(true);
    expect(reactivation.state.playerMp).toBe(180);
  });

  it("CPUの手番開始では継続巡数を減らさない", () => {
    const activated =
      tryActivateAkuukanPlayerSkill3_9(
        createState(3)
      );
    const advanced = advanceAkuukanTurnEffects(
      activated.state.akuukan
    );

    expect(
      advanced.activeEffects[0]
        ?.remainingTurns
    ).toBe(3);
  });

  it("局が終了したら残り巡数にかかわらず効果を終了する", () => {
    const activated =
      tryActivateAkuukanPlayerSkill3_9(
        createState(5)
      );
    const nextRound = beginAkuukanRound(
      activated.state.akuukan
    );

    expect(
      hasAkuukanPlayerSkill3_9RonImmunity(
        nextRound
      )
    ).toBe(false);
    expect(nextRound.activeEffects).toEqual([]);
  });

  it("MP不足では発動せず使用済みにしない", () => {
    const initial = createState(1, 359);
    const result =
      tryActivateAkuukanPlayerSkill3_9(
        initial
      );

    expect(result.succeeded).toBe(false);
    expect(result.failureReason).toBe(
      "insufficientMp"
    );
    expect(result.state).toBe(initial);
    expect(result.state.playerMp).toBe(359);
    expect(
      result.state.akuukan.activeEffects
    ).toEqual([]);
    expect(
      result.state.akuukan.usedSources.turn
    ).toEqual([]);
  });

  it("未装備または無効化中は発動しない", () => {
    const notEquipped = createState(null);
    const enabled = createState(5);
    const disabled = {
      ...enabled,
      akuukan: disableAkuukanSource(
        enabled.akuukan,
        "player-skill:3-9"
      )
    };
    const notEquippedResult =
      tryActivateAkuukanPlayerSkill3_9(
        notEquipped
      );
    const disabledResult =
      tryActivateAkuukanPlayerSkill3_9(
        disabled
      );

    expect(
      notEquippedResult.failureReason
    ).toBe("skillNotEquipped");
    expect(
      disabledResult.failureReason
    ).toBe("sourceUnavailable");
    expect(
      disabledResult.state.akuukan
        .activeEffects
    ).toEqual([]);
    expect(disabledResult.state.playerMp).toBe(500);
  });

  it("効果中でも発生源が無効ならロン無効を適用しない", () => {
    const activated =
      tryActivateAkuukanPlayerSkill3_9(
        createState(1)
      );
    const disabled = disableAkuukanSource(
      activated.state.akuukan,
      "player-skill:3-9"
    );

    expect(
      hasAkuukanPlayerSkill3_9RonImmunity(
        disabled
      )
    ).toBe(false);
  });
});
