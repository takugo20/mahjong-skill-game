import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import {
  applyPlayerSkill3_2ToPayment
} from "./parentTsumoPaymentReduction";

function createAkuukan(
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{
          id: "3-2",
          level: 1
        }]
      : []
  });
}

function applyPayment(
  overrides: Partial<
    Parameters<
      typeof applyPlayerSkill3_2ToPayment
    >[0]
  > = {}
): number {
  return applyPlayerSkill3_2ToPayment({
    akuukan: createAkuukan(),
    winMethod: "tsumo",
    winnerIsDealer: false,
    payerIsPlayer: true,
    payerIsDealer: true,
    paymentPoints: 3900,
    ...overrides
  });
}

describe("プレイヤースキル3-2 親被軽減", () => {
  it("子のツモ和了時にプレイヤーの親支払を半減する", () => {
    expect(applyPayment()).toBe(2000);
  });

  it("本場と固定点を含む支払総額を半減する", () => {
    expect(applyPayment({
      paymentPoints: 4200
    })).toBe(2100);
  });

  it("責任払い部分を半減対象から除外する", () => {
    expect(applyPayment({
      paymentPoints: 8000,
      responsibilityPaymentPoints: 6400
    })).toBe(7200);
  });

  it("支払全額が責任払いなら軽減しない", () => {
    expect(applyPayment({
      paymentPoints: 32000,
      responsibilityPaymentPoints: 32000
    })).toBe(32000);
  });

  it("ロン和了には適用しない", () => {
    expect(applyPayment({
      winMethod: "ron"
    })).toBe(3900);
  });

  it("親のツモ和了には適用しない", () => {
    expect(applyPayment({
      winnerIsDealer: true
    })).toBe(3900);
  });

  it("プレイヤーが支払者でなければ適用しない", () => {
    expect(applyPayment({
      payerIsPlayer: false
    })).toBe(3900);
  });

  it("プレイヤーが子なら適用しない", () => {
    expect(applyPayment({
      payerIsDealer: false
    })).toBe(3900);
  });

  it("未装備または無効化中なら適用しない", () => {
    expect(applyPayment({
      akuukan: createAkuukan(false)
    })).toBe(3900);

    expect(applyPayment({
      akuukan: disableAkuukanSource(
        createAkuukan(),
        "player-skill:3-2"
      )
    })).toBe(3900);
  });

  it("不正な支払額と責任払い額を拒否する", () => {
    expect(() => applyPayment({
      paymentPoints: -1
    })).toThrow(
      "支払額は0以上の安全な整数で指定してください。"
    );
    expect(() => applyPayment({
      paymentPoints: 1000,
      responsibilityPaymentPoints: 1100
    })).toThrow(
      "責任払い額は支払総額以下の0以上の安全な整数で指定してください。"
    );
  });
});
