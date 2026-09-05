import {
  describe,
  expect,
  it
} from "vitest";
import {
  applyAkuukanPlayerSkill1_10PaymentMultiplier,
  getAkuukanPlayerSkill1_10PaymentMultiplier
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
          id: "1-10",
          level
        }]
      : []
  });
}

describe("プレイヤースキル1-10の支払倍率", () => {
  it("各レベルの支払倍率を取得する", () => {
    const cases: readonly {
      level: SkillLevel;
      expectedMultiplier: number;
    }[] = [
      { level: 1, expectedMultiplier: 1.1 },
      { level: 2, expectedMultiplier: 1.2 },
      { level: 3, expectedMultiplier: 1.3 },
      { level: 4, expectedMultiplier: 1.4 },
      { level: 5, expectedMultiplier: 1.5 }
    ];

    for (const currentCase of cases) {
      expect(
        getAkuukanPlayerSkill1_10PaymentMultiplier({
          akuukan: createAkuukan(
            currentCase.level
          ),
          winnerIsPlayer: true,
          payerIsPlayer: false
        })
      ).toBe(currentCase.expectedMultiplier);
    }
  });

  it("他家がプレイヤーへ支払う点数を増加させる", () => {
    expect(
      applyAkuukanPlayerSkill1_10PaymentMultiplier({
        akuukan: createAkuukan(5),
        winnerIsPlayer: true,
        payerIsPlayer: false,
        paymentPoints: 3900
      })
    ).toBe(5900);
  });

  it("プレイヤーが他家へ支払う点数も増加させる", () => {
    expect(
      applyAkuukanPlayerSkill1_10PaymentMultiplier({
        akuukan: createAkuukan(3),
        winnerIsPlayer: false,
        payerIsPlayer: true,
        paymentPoints: 2000
      })
    ).toBe(2600);
  });

  it("倍率適用後の端数を100点単位へ切り上げる", () => {
    expect(
      applyAkuukanPlayerSkill1_10PaymentMultiplier({
        akuukan: createAkuukan(1),
        winnerIsPlayer: true,
        payerIsPlayer: false,
        paymentPoints: 1300
      })
    ).toBe(1500);
  });

  it("プレイヤーが関係しないCPU間の支払いには適用しない", () => {
    expect(
      applyAkuukanPlayerSkill1_10PaymentMultiplier({
        akuukan: createAkuukan(5),
        winnerIsPlayer: false,
        payerIsPlayer: false,
        paymentPoints: 3900
      })
    ).toBe(3900);
  });

  it("未装備またはE-18による無効化中は適用しない", () => {
    const notEquipped =
      applyAkuukanPlayerSkill1_10PaymentMultiplier({
        akuukan: createAkuukan(5, false),
        winnerIsPlayer: true,
        payerIsPlayer: false,
        paymentPoints: 3900
      });
    const disabled =
      applyAkuukanPlayerSkill1_10PaymentMultiplier({
        akuukan: disableAkuukanSource(
          createAkuukan(5),
          "player-skill:1-10"
        ),
        winnerIsPlayer: false,
        payerIsPlayer: true,
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
        applyAkuukanPlayerSkill1_10PaymentMultiplier({
          akuukan: createAkuukan(),
          winnerIsPlayer: true,
          payerIsPlayer: false,
          paymentPoints
        })
      ).toThrow(
        "支払額は0以上の安全な整数で指定してください。"
      );
    }
  });
});
