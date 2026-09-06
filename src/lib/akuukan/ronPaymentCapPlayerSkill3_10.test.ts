import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID,
  advanceAkuukanPlayerSkill3_10BeforePlayerAction,
  applyAkuukanPlayerSkill3_10PaymentCap,
  tryActivateAkuukanPlayerSkill3_10
} from "./ronPaymentCap";
import {
  advanceAkuukanTurnEffects,
  beginAkuukanRound,
  createInitialAkuukanGameState,
  disableAkuukanSource,
  resetAkuukanTurnUsage
} from "./state";
import type {
  AkuukanGameState,
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
          : [{ id: "3-10", level }]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

function activate(
  level: SkillLevel = 1
): AkuukanGameState {
  const result =
    tryActivateAkuukanPlayerSkill3_10(
      createState(level)
    );

  if (!result.succeeded) {
    throw new Error(
      "スキル3-10を発動できませんでした。"
    );
  }

  return result.state.akuukan;
}

describe("プレイヤースキル3-10 防御結界【急】", () => {
  it("各レベルのMPと継続巡数を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      durationTurns: number;
    }[] = [
      { level: 1, mpCost: 140, durationTurns: 1 },
      { level: 2, mpCost: 130, durationTurns: 2 },
      { level: 3, mpCost: 120, durationTurns: 3 },
      { level: 4, mpCost: 110, durationTurns: 4 },
      { level: 5, mpCost: 90, durationTurns: 6 }
    ];

    for (const currentCase of cases) {
      const initial = createState(
        currentCase.level
      );
      const result =
        tryActivateAkuukanPlayerSkill3_10(
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
            AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID,
          sourceId: "player-skill:3-10",
          remainingTurns:
            currentCase.durationTurns
        }
      ]);
    }
  });

  it("子への満貫超のロン支払額を8000点に制限する", () => {
    expect(
      applyAkuukanPlayerSkill3_10PaymentCap({
        akuukan: activate(),
        winMethod: "ron",
        winnerIsDealer: false,
        payerIsPlayer: true,
        payerIsLoser: true,
        handBasePoints: 4000,
        paymentBasePoints: 16000
      })
    ).toBe(8000);
  });

  it("親への満貫超のロン支払額を12000点に制限する", () => {
    expect(
      applyAkuukanPlayerSkill3_10PaymentCap({
        akuukan: activate(),
        winMethod: "ron",
        winnerIsDealer: true,
        payerIsPlayer: true,
        payerIsLoser: true,
        handBasePoints: 8000,
        paymentBasePoints: 48000
      })
    ).toBe(12000);
  });

  it("満貫未満の和了とツモ支払いは変更しない", () => {
    const akuukan = activate();

    expect(
      applyAkuukanPlayerSkill3_10PaymentCap({
        akuukan,
        winMethod: "ron",
        winnerIsDealer: false,
        payerIsPlayer: true,
        payerIsLoser: true,
        handBasePoints: 1920,
        paymentBasePoints: 7700
      })
    ).toBe(7700);
    expect(
      applyAkuukanPlayerSkill3_10PaymentCap({
        akuukan,
        winMethod: "tsumo",
        winnerIsDealer: false,
        payerIsPlayer: true,
        payerIsLoser: false,
        handBasePoints: 4000,
        paymentBasePoints: 4000
      })
    ).toBe(4000);
  });

  it("プレイヤーが放銃者でない責任払いには適用しない", () => {
    expect(
      applyAkuukanPlayerSkill3_10PaymentCap({
        akuukan: activate(),
        winMethod: "ron",
        winnerIsDealer: false,
        payerIsPlayer: true,
        payerIsLoser: false,
        handBasePoints: 8000,
        paymentBasePoints: 16000
      })
    ).toBe(16000);
  });

  it("効果中でも無効化されていれば上限を適用しない", () => {
    const disabled = disableAkuukanSource(
      activate(),
      "player-skill:3-10"
    );

    expect(
      applyAkuukanPlayerSkill3_10PaymentCap({
        akuukan: disabled,
        winMethod: "ron",
        winnerIsDealer: false,
        payerIsPlayer: true,
        payerIsLoser: true,
        handBasePoints: 4000,
        paymentBasePoints: 16000
      })
    ).toBe(16000);
  });

  it("専用処理で巡数を進め、通常のCPU手番では減らさない", () => {
    const active = activate(2);
    const cpuTurn = advanceAkuukanTurnEffects(
      active
    );
    const nextPlayerAction =
      advanceAkuukanPlayerSkill3_10BeforePlayerAction(
        cpuTurn
      );
    const expired =
      advanceAkuukanPlayerSkill3_10BeforePlayerAction(
        nextPlayerAction
      );

    expect(
      cpuTurn.activeEffects[0]
        ?.remainingTurns
    ).toBe(2);
    expect(
      nextPlayerAction.activeEffects[0]
        ?.remainingTurns
    ).toBe(1);
    expect(expired.activeEffects).toEqual([]);
  });

  it("効果中は再発動せず、局終了時に効果を消す", () => {
    const first =
      tryActivateAkuukanPlayerSkill3_10(
        createState(5)
      );
    const nextTurnState = {
      ...first.state,
      akuukan: resetAkuukanTurnUsage(
        first.state.akuukan
      )
    };
    const second =
      tryActivateAkuukanPlayerSkill3_10(
        nextTurnState
      );
    const nextRound = beginAkuukanRound(
      first.state.akuukan
    );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(nextRound.activeEffects).toEqual([]);
  });

  it("MP不足・未装備・無効化中は発動しない", () => {
    const insufficient =
      tryActivateAkuukanPlayerSkill3_10(
        createState(1, 139)
      );
    const notEquipped =
      tryActivateAkuukanPlayerSkill3_10(
        createState(null)
      );
    const enabled = createState(1);
    const disabled =
      tryActivateAkuukanPlayerSkill3_10({
        ...enabled,
        akuukan: disableAkuukanSource(
          enabled.akuukan,
          "player-skill:3-10"
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
