import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateScore
} from "../mahjong/score";
import {
  AKUUKAN_MANGAN_BASE_POINTS,
  isAkuukanE27WinInvalidated
} from "./handValueAdjustments";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  AkuukanGameState,
  EnemyId
} from "./types";

function createState(
  enemyId: EnemyId = "enemy-15"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("敵15 E-27の満貫未満和了無効化", () => {
  it("満貫の基本点を2000点として判定する", () => {
    expect(
      AKUUKAN_MANGAN_BASE_POINTS
    ).toBe(2000);
  });

  it("他家の満貫未満の和了を無効化する", () => {
    const score = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(score.basePoints).toBeLessThan(
      AKUUKAN_MANGAN_BASE_POINTS
    );
    expect(
      isAkuukanE27WinInvalidated({
        akuukan: createState(),
        winnerIsSelectedEnemy: false,
        score
      })
    ).toBe(true);
  });

  it("敵15本人の満貫未満の和了は無効化しない", () => {
    const score = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "tsumo",
      dealer: false
    });

    expect(
      isAkuukanE27WinInvalidated({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        score
      })
    ).toBe(false);
  });

  it("切り上げ満貫と満貫以上の和了を無効化しない", () => {
    const scores = [
      calculateScore({
        han: 4,
        fu: 30,
        winMethod: "ron",
        dealer: false,
        kiriageMangan: true
      }),
      calculateScore({
        han: 5,
        fu: 30,
        winMethod: "ron",
        dealer: false
      }),
      calculateScore({
        han: 0,
        fu: 0,
        winMethod: "ron",
        dealer: false,
        yakumanMultiplier: 1
      })
    ];

    for (const score of scores) {
      expect(score.basePoints).toBeGreaterThanOrEqual(
        AKUUKAN_MANGAN_BASE_POINTS
      );
      expect(
        isAkuukanE27WinInvalidated({
          akuukan: createState(),
          winnerIsSelectedEnemy: false,
          score
        })
      ).toBe(false);
    }
  });

  it("本場点と供託点を満貫判定に含めない", () => {
    const score = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false,
      honba: 10,
      riichiSticks: 4
    });

    expect(score.totalPoints).toBe(8000);
    expect(score.basePoints).toBeLessThan(
      AKUUKAN_MANGAN_BASE_POINTS
    );
    expect(
      isAkuukanE27WinInvalidated({
        akuukan: createState(),
        winnerIsSelectedEnemy: false,
        score
      })
    ).toBe(true);
  });

  it("敵15以外との対局では無効化しない", () => {
    const score = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(
      isAkuukanE27WinInvalidated({
        akuukan: createState("enemy-14"),
        winnerIsSelectedEnemy: false,
        score
      })
    ).toBe(false);
  });

  it("E-27が無効なら満貫未満でも無効化しない", () => {
    const akuukan = disableAkuukanSource(
      createState(),
      "enemy-ability:E-27"
    );
    const score = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(
      isAkuukanE27WinInvalidated({
        akuukan,
        winnerIsSelectedEnemy: false,
        score
      })
    ).toBe(false);
  });
});
