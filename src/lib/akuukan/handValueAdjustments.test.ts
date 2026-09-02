import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateScore
} from "../mahjong/score";
import {
  AKUUKAN_E21_MINIMUM_BASE_POINTS,
  applyAkuukanE21MinimumMangan,
  isAkuukanE21MinimumManganEnabled
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
  enemyId: EnemyId = "enemy-11"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("敵11 E-21の最低満貫保証", () => {
  it("最低基本点を満貫の2000点として定義する", () => {
    expect(
      AKUUKAN_E21_MINIMUM_BASE_POINTS
    ).toBe(2000);
  });

  it("敵11本人の和了にだけE-21を有効化する", () => {
    expect(
      isAkuukanE21MinimumManganEnabled(
        createState(),
        true
      )
    ).toBe(true);
    expect(
      isAkuukanE21MinimumManganEnabled(
        createState(),
        false
      )
    ).toBe(false);
    expect(
      isAkuukanE21MinimumManganEnabled(
        createState("enemy-10"),
        true
      )
    ).toBe(false);
  });

  it("子の満貫未満のロンを満貫にする", () => {
    const original = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    const adjusted =
      applyAkuukanE21MinimumMangan({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        score: original,
        winMethod: "ron",
        dealer: false
      });

    expect(adjusted).not.toBe(original);
    expect(adjusted).toEqual({
      han: 1,
      fu: 30,
      basePoints: 2000,
      limit: "mangan",
      limitName: "満貫",
      yakumanMultiplier: 0,
      handPoints: 8000,
      honbaPoints: 0,
      riichiPoints: 0,
      totalPoints: 8000,
      ronPayment: 8000,
      tsumoPayments: null
    });
    expect(original.basePoints).toBe(240);
    expect(original.ronPayment).toBe(1000);
  });

  it("親ロンの本場と供託を維持して手牌価値だけを満貫にする", () => {
    const original = calculateScore({
      han: 2,
      fu: 30,
      winMethod: "ron",
      dealer: true,
      honba: 2,
      riichiSticks: 3
    });

    const adjusted =
      applyAkuukanE21MinimumMangan({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        score: original,
        winMethod: "ron",
        dealer: true
      });

    expect(adjusted).toMatchObject({
      han: 2,
      fu: 30,
      basePoints: 2000,
      limit: "mangan",
      handPoints: 12000,
      honbaPoints: 600,
      riichiPoints: 3000,
      ronPayment: 12600,
      totalPoints: 15600
    });
  });

  it("子ツモの各支払額を満貫として計算する", () => {
    const original = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "tsumo",
      dealer: false,
      honba: 2,
      riichiSticks: 1
    });

    const adjusted =
      applyAkuukanE21MinimumMangan({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        score: original,
        winMethod: "tsumo",
        dealer: false
      });

    expect(adjusted).toMatchObject({
      han: 1,
      fu: 30,
      basePoints: 2000,
      limit: "mangan",
      handPoints: 8000,
      honbaPoints: 600,
      riichiPoints: 1000,
      totalPoints: 9600,
      ronPayment: null,
      tsumoPayments: {
        dealerPays: 4200,
        nonDealerPays: 2200,
        nonDealerPayerCount: 2
      }
    });
  });

  it("親ツモの各支払額を満貫として計算する", () => {
    const original = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "tsumo",
      dealer: true,
      honba: 1,
      riichiSticks: 2
    });

    const adjusted =
      applyAkuukanE21MinimumMangan({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        score: original,
        winMethod: "tsumo",
        dealer: true
      });

    expect(adjusted).toMatchObject({
      han: 1,
      fu: 30,
      basePoints: 2000,
      limit: "mangan",
      handPoints: 12000,
      honbaPoints: 300,
      riichiPoints: 2000,
      totalPoints: 14300,
      ronPayment: null,
      tsumoPayments: {
        dealerPays: 0,
        nonDealerPays: 4100,
        nonDealerPayerCount: 3
      }
    });
  });

  it("切り上げ満貫と満貫以上の手牌価値を変更しない", () => {
    const scores = [
      calculateScore({
        han: 4,
        fu: 30,
        winMethod: "ron",
        dealer: false,
        kiriageMangan: true
      }),
      calculateScore({
        han: 6,
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
      expect(
        applyAkuukanE21MinimumMangan({
          akuukan: createState(),
          winnerIsSelectedEnemy: true,
          score,
          winMethod: "ron",
          dealer: false
        })
      ).toBe(score);
    }
  });

  it("敵11戦でも本人以外の和了には適用しない", () => {
    const original = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(
      applyAkuukanE21MinimumMangan({
        akuukan: createState(),
        winnerIsSelectedEnemy: false,
        score: original,
        winMethod: "ron",
        dealer: false
      })
    ).toBe(original);
  });

  it("E-21を持たない敵との対局では適用しない", () => {
    const original = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(
      applyAkuukanE21MinimumMangan({
        akuukan: createState("enemy-10"),
        winnerIsSelectedEnemy: true,
        score: original,
        winMethod: "ron",
        dealer: false
      })
    ).toBe(original);
  });

  it("E-21が無効化されていれば適用しない", () => {
    const disabled = disableAkuukanSource(
      createState(),
      "enemy-ability:E-21"
    );
    const original = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(
      isAkuukanE21MinimumManganEnabled(
        disabled,
        true
      )
    ).toBe(false);
    expect(
      applyAkuukanE21MinimumMangan({
        akuukan: disabled,
        winnerIsSelectedEnemy: true,
        score: original,
        winMethod: "ron",
        dealer: false
      })
    ).toBe(original);
  });

  it("本場点と供託点の不正な単位を拒否する", () => {
    const original = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(() =>
      applyAkuukanE21MinimumMangan({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        score: {
          ...original,
          honbaPoints: 100
        },
        winMethod: "ron",
        dealer: false
      })
    ).toThrow(RangeError);
    expect(() =>
      applyAkuukanE21MinimumMangan({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        score: {
          ...original,
          riichiPoints: 500
        },
        winMethod: "ron",
        dealer: false
      })
    ).toThrow(RangeError);
  });
});
