import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID,
  advanceAkuukanPlayerSkill3_11BeforePlayerAction,
  hasAkuukanPlayerSkill3_11DiscardProtection,
  tryActivateAkuukanPlayerSkill3_11
} from "./faceDownDiscard";
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
  playerMp = 700
) {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "3-11", level }]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

describe("プレイヤースキル3-11 防御結界【改】", () => {
  it("各レベルのMPと継続巡数を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      durationTurns: number;
    }[] = [
      { level: 1, mpCost: 500, durationTurns: 1 },
      { level: 2, mpCost: 450, durationTurns: 2 },
      { level: 3, mpCost: 400, durationTurns: 3 },
      { level: 4, mpCost: 350, durationTurns: 4 },
      { level: 5, mpCost: 300, durationTurns: 6 }
    ];

    for (const currentCase of cases) {
      const initial = createState(
        currentCase.level
      );
      const result =
        tryActivateAkuukanPlayerSkill3_11(
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
      ).toEqual([{
        instanceId:
          AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID,
        sourceId: "player-skill:3-11",
        remainingTurns:
          currentCase.durationTurns
      }]);
      expect(
        hasAkuukanPlayerSkill3_11DiscardProtection(
          result.state.akuukan
        )
      ).toBe(true);
    }
  });

  it("次のプレイヤー行動前に巡数を進め、終了時に効果を除く", () => {
    const activated =
      tryActivateAkuukanPlayerSkill3_11(
        createState(2)
      );
    const afterFirstTurn =
      advanceAkuukanPlayerSkill3_11BeforePlayerAction(
        resetAkuukanTurnUsage(
          activated.state.akuukan
        )
      );
    const afterSecondTurn =
      advanceAkuukanPlayerSkill3_11BeforePlayerAction(
        resetAkuukanTurnUsage(
          afterFirstTurn
        )
      );

    expect(
      afterFirstTurn.activeEffects[0]
        ?.remainingTurns
    ).toBe(1);
    expect(
      hasAkuukanPlayerSkill3_11DiscardProtection(
        afterFirstTurn
      )
    ).toBe(true);
    expect(
      hasAkuukanPlayerSkill3_11DiscardProtection(
        afterSecondTurn
      )
    ).toBe(false);
  });

  it("効果中は手番使用状況が戻っても再発動しない", () => {
    const first =
      tryActivateAkuukanPlayerSkill3_11(
        createState(2)
      );
    const second =
      tryActivateAkuukanPlayerSkill3_11({
        ...first.state,
        akuukan: resetAkuukanTurnUsage(
          first.state.akuukan
        )
      });

    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.playerMp).toBe(250);
  });

  it("MP不足、未装備、E-18無効化中は発動しない", () => {
    const insufficient =
      tryActivateAkuukanPlayerSkill3_11(
        createState(1, 499)
      );
    const notEquipped =
      tryActivateAkuukanPlayerSkill3_11(
        createState(null)
      );
    const enabled = createState(5);
    const disabled =
      tryActivateAkuukanPlayerSkill3_11({
        ...enabled,
        akuukan: disableAkuukanSource(
          enabled.akuukan,
          "player-skill:3-11"
        )
      });

    expect(insufficient.failureReason).toBe(
      "insufficientMp"
    );
    expect(notEquipped.failureReason).toBe(
      "skillNotEquipped"
    );
    expect(disabled.failureReason).toBe(
      "sourceUnavailable"
    );
  });
});
