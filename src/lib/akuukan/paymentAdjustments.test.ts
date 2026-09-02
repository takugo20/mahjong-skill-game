import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_E20_PAYMENT_MULTIPLIER,
  applyAkuukanE20PaymentMultiplier,
  isAkuukanE20PaymentMultiplierEnabled
} from "./paymentAdjustments";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  AkuukanGameState,
  EnemyId
} from "./types";

function createState(
  enemyId: EnemyId = "enemy-10"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("敵10 E-20の支払倍率", () => {
  it("支払倍率を2倍として定義する", () => {
    expect(
      AKUUKAN_E20_PAYMENT_MULTIPLIER
    ).toBe(2);
  });

  it("敵10本人の和了にだけE-20を有効化する", () => {
    const state = createState();

    expect(
      isAkuukanE20PaymentMultiplierEnabled(
        state,
        true
      )
    ).toBe(true);
    expect(
      isAkuukanE20PaymentMultiplierEnabled(
        state,
        false
      )
    ).toBe(false);
  });

  it("敵10本人の和了に伴う支払額を2倍にする", () => {
    const state = createState();

    expect(
      applyAkuukanE20PaymentMultiplier({
        akuukan: state,
        winnerIsSelectedEnemy: true,
        paymentPoints: 3900
      })
    ).toBe(7800);
    expect(
      applyAkuukanE20PaymentMultiplier({
        akuukan: state,
        winnerIsSelectedEnemy: true,
        paymentPoints: 0
      })
    ).toBe(0);
  });

  it("倍率適用後に100点単位へ切り上げる", () => {
    expect(
      applyAkuukanE20PaymentMultiplier({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        paymentPoints: 1251
      })
    ).toBe(2600);
  });

  it("敵10戦でも他家の和了には倍率を適用しない", () => {
    expect(
      applyAkuukanE20PaymentMultiplier({
        akuukan: createState(),
        winnerIsSelectedEnemy: false,
        paymentPoints: 3900
      })
    ).toBe(3900);
  });

  it("E-20を持たない敵との対局では倍率を適用しない", () => {
    expect(
      applyAkuukanE20PaymentMultiplier({
        akuukan: createState("enemy-9"),
        winnerIsSelectedEnemy: true,
        paymentPoints: 3900
      })
    ).toBe(3900);
  });

  it("E-20が無効化されていれば倍率を適用しない", () => {
    const disabled = disableAkuukanSource(
      createState(),
      "enemy-ability:E-20"
    );

    expect(
      isAkuukanE20PaymentMultiplierEnabled(
        disabled,
        true
      )
    ).toBe(false);
    expect(
      applyAkuukanE20PaymentMultiplier({
        akuukan: disabled,
        winnerIsSelectedEnemy: true,
        paymentPoints: 3900
      })
    ).toBe(3900);
  });

  it("不正な支払額を拒否する", () => {
    const state = createState();

    for (const paymentPoints of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY
    ]) {
      expect(() =>
        applyAkuukanE20PaymentMultiplier({
          akuukan: state,
          winnerIsSelectedEnemy: true,
          paymentPoints
        })
      ).toThrow(
        "支払額は0以上の安全な整数で指定してください。"
      );
    }
  });

  it("倍率適用後に安全な整数を超える支払額を拒否する", () => {
    expect(() =>
      applyAkuukanE20PaymentMultiplier({
        akuukan: createState(),
        winnerIsSelectedEnemy: true,
        paymentPoints:
          Number.MAX_SAFE_INTEGER
      })
    ).toThrow(
      "倍率適用後の支払額が安全な整数になりません。"
    );
  });
});
