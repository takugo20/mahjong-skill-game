import {
  describe,
  expect,
  it
} from "vitest";
import {
  addAkuukanPlayerSkill1_11PaymentPoints,
  getAkuukanPlayerSkill1_11AdditionalPaymentPoints
} from "./paymentAdjustments";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

function createAkuukan(
  level: SkillLevel = 1,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{
          id: "1-11",
          level
        }]
      : []
  });
}

describe("プレイヤースキル1-11の固定点加算", () => {
  it("各レベルの固定加算点を取得する", () => {
    const cases: readonly {
      level: SkillLevel;
      expectedPoints: number;
    }[] = [
      { level: 1, expectedPoints: 300 },
      { level: 2, expectedPoints: 500 },
      { level: 3, expectedPoints: 800 },
      { level: 4, expectedPoints: 1000 },
      { level: 5, expectedPoints: 1500 }
    ];

    for (const currentCase of cases) {
      expect(
        getAkuukanPlayerSkill1_11AdditionalPaymentPoints({
          akuukan: createAkuukan(
            currentCase.level
          ),
          winnerIsPlayer: true
        })
      ).toBe(currentCase.expectedPoints);
    }
  });

  it("プレイヤー和了時の支払額へ固定点を加算する", () => {
    expect(
      addAkuukanPlayerSkill1_11PaymentPoints({
        akuukan: createAkuukan(5),
        winnerIsPlayer: true,
        paymentPoints: 3900
      })
    ).toBe(5400);
  });

  it("CPUの和了には適用しない", () => {
    expect(
      addAkuukanPlayerSkill1_11PaymentPoints({
        akuukan: createAkuukan(5),
        winnerIsPlayer: false,
        paymentPoints: 3900
      })
    ).toBe(3900);
  });

  it("未装備またはE-18による無効化中は適用しない", () => {
    const notEquipped =
      addAkuukanPlayerSkill1_11PaymentPoints({
        akuukan: createAkuukan(5, false),
        winnerIsPlayer: true,
        paymentPoints: 3900
      });
    const disabled =
      addAkuukanPlayerSkill1_11PaymentPoints({
        akuukan: disableAkuukanSource(
          createAkuukan(5),
          "player-skill:1-11"
        ),
        winnerIsPlayer: true,
        paymentPoints: 3900
      });

    expect(notEquipped).toBe(3900);
    expect(disabled).toBe(3900);
  });

  it("不正な支払額を拒否する", () => {
    for (const paymentPoints of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY
    ]) {
      expect(() =>
        addAkuukanPlayerSkill1_11PaymentPoints({
          akuukan: createAkuukan(),
          winnerIsPlayer: true,
          paymentPoints
        })
      ).toThrow(
        "支払額は0以上の安全な整数で指定してください。"
      );
    }
  });

  it("固定点加算後に安全な整数を超える支払額を拒否する", () => {
    expect(() =>
      addAkuukanPlayerSkill1_11PaymentPoints({
        akuukan: createAkuukan(),
        winnerIsPlayer: true,
        paymentPoints:
          Number.MAX_SAFE_INTEGER
      })
    ).toThrow(
      "固定点加算後の支払額が安全な整数になりません。"
    );
  });
});
