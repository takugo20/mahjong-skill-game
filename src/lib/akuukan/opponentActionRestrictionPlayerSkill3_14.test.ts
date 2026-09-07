import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_3_14_INSTANCE_ID,
  advanceAkuukanPlayerSkill3_14AfterOpponentCycle,
  getAkuukanPlayerSkill3_14RemainingTurns,
  hasAkuukanPlayerSkill3_14Restriction,
  isAkuukanPlayerSkill3_14OpponentRestricted,
  tryActivateAkuukanPlayerSkill3_14
} from "./opponentActionRestrictionPlayerSkill3_14";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

function createState(
  level: SkillLevel | null = 1,
  playerMp = 700
) {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "3-14", level }]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

describe("プレイヤースキル3-14 色即是空", () => {
  it("各レベルのMPと継続巡数を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      durationTurns: number;
    }[] = [
      { level: 1, mpCost: 600, durationTurns: 1 },
      { level: 2, mpCost: 550, durationTurns: 2 },
      { level: 3, mpCost: 500, durationTurns: 3 },
      { level: 4, mpCost: 450, durationTurns: 4 },
      { level: 5, mpCost: 350, durationTurns: 6 }
    ];

    for (const currentCase of cases) {
      const initial = createState(
        currentCase.level
      );
      const result =
        tryActivateAkuukanPlayerSkill3_14(
          initial
        );

      expect(result.succeeded).toBe(true);
      expect(result.failureReason).toBeNull();
      expect(result.state.playerMp).toBe(
        700 - currentCase.mpCost
      );
      expect(result.state.marker).toBe(
        "preserved"
      );
      expect(
        result.state.akuukan.activeEffects
      ).toEqual([
        {
          instanceId:
            AKUUKAN_PLAYER_SKILL_3_14_INSTANCE_ID,
          sourceId: "player-skill:3-14",
          remainingTurns:
            currentCase.durationTurns
        }
      ]);
      expect(
        result.state.akuukan.usedSources.round
      ).toContain("player-skill:3-14");
      expect(
        getAkuukanPlayerSkill3_14RemainingTurns(
          result.state.akuukan
        )
      ).toBe(currentCase.durationTurns);
      expect(initial.playerMp).toBe(700);
    }
  });

  it("効果中は他家だけを行動制限の対象にする", () => {
    const result =
      tryActivateAkuukanPlayerSkill3_14(
        createState(1)
      );

    expect(
      hasAkuukanPlayerSkill3_14Restriction(
        result.state.akuukan
      )
    ).toBe(true);
    expect(
      isAkuukanPlayerSkill3_14OpponentRestricted(
        result.state.akuukan,
        0
      )
    ).toBe(false);

    for (const seat of [1, 2, 3]) {
      expect(
        isAkuukanPlayerSkill3_14OpponentRestricted(
          result.state.akuukan,
          seat
        )
      ).toBe(true);
    }
  });

    it("卓が一周するたびに残り巡数を減らして終了する", () => {
    const activated =
      tryActivateAkuukanPlayerSkill3_14(
        createState(2)
      );
    const afterFirstCycle =
      advanceAkuukanPlayerSkill3_14AfterOpponentCycle(
        activated.state.akuukan
      );
    const afterSecondCycle =
      advanceAkuukanPlayerSkill3_14AfterOpponentCycle(
        afterFirstCycle
      );

    expect(
      getAkuukanPlayerSkill3_14RemainingTurns(
        afterFirstCycle
      )
    ).toBe(1);
    expect(
      hasAkuukanPlayerSkill3_14Restriction(
        afterFirstCycle
      )
    ).toBe(true);
    expect(
      hasAkuukanPlayerSkill3_14Restriction(
        afterSecondCycle
      )
    ).toBe(false);
    expect(
      getAkuukanPlayerSkill3_14RemainingTurns(
        afterSecondCycle
      )
    ).toBeNull();
  });

  it("同じ局では再発動できない", () => {
    const first =
      tryActivateAkuukanPlayerSkill3_14(
        createState(5)
      );
    const second =
      tryActivateAkuukanPlayerSkill3_14({
        ...first.state,
        playerMp: 700
      });

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.playerMp).toBe(700);
  });

  it("MP不足では発動もMP消費もしない", () => {
    const initial = createState(1, 599);
    const result =
      tryActivateAkuukanPlayerSkill3_14(
        initial
      );

    expect(result.succeeded).toBe(false);
    expect(result.failureReason).toBe(
      "insufficientMp"
    );
    expect(result.state).toBe(initial);
    expect(result.state.playerMp).toBe(599);
    expect(
      result.state.akuukan.activeEffects
    ).toEqual([]);
    expect(
      result.state.akuukan.usedSources.round
    ).toEqual([]);
  });

  it("未装備または無効化中は発動しない", () => {
    const notEquipped = createState(null);
    const enabled = createState(5);
    const disabled = {
      ...enabled,
      akuukan: disableAkuukanSource(
        enabled.akuukan,
        "player-skill:3-14"
      )
    };
    const notEquippedResult =
      tryActivateAkuukanPlayerSkill3_14(
        notEquipped
      );
    const disabledResult =
      tryActivateAkuukanPlayerSkill3_14(
        disabled
      );

    expect(
      notEquippedResult.failureReason
    ).toBe("skillNotEquipped");
    expect(
      disabledResult.failureReason
    ).toBe("sourceUnavailable");
    expect(disabledResult.state.playerMp).toBe(700);
    expect(
      disabledResult.state.akuukan
        .activeEffects
    ).toEqual([]);
  });

    it("発動後に無効化された場合は他家を制限しない", () => {
    const activated =
      tryActivateAkuukanPlayerSkill3_14(
        createState(1)
      );
    const disabled = disableAkuukanSource(
      activated.state.akuukan,
      "player-skill:3-14"
    );

    expect(
      hasAkuukanPlayerSkill3_14Restriction(
        disabled
      )
    ).toBe(false);
    expect(
      isAkuukanPlayerSkill3_14OpponentRestricted(
        disabled,
        1
      )
    ).toBe(false);
  });
});
