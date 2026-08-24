import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateScore
} from "./score";

describe("通常点", () => {
  it("子の30符1翻ロンを1000点とする", () => {
    const result = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(result.basePoints).toBe(240);
    expect(result.ronPayment).toBe(1000);
    expect(result.limit).toBe("none");
  });

  it("親の30符1翻ロンを1500点とする", () => {
    const result = calculateScore({
      han: 1,
      fu: 30,
      winMethod: "ron",
      dealer: true
    });

    expect(result.ronPayment).toBe(1500);
  });

  it("子の30符2翻ツモを500・1000とする", () => {
    const result = calculateScore({
      han: 2,
      fu: 30,
      winMethod: "tsumo",
      dealer: false
    });

    expect(
      result.tsumoPayments
    ).toEqual({
      dealerPays: 1000,
      nonDealerPays: 500,
      nonDealerPayerCount: 2
    });

    expect(result.handPoints).toBe(2000);
  });

  it("親の30符2翻ツモを1000点ずつとする", () => {
    const result = calculateScore({
      han: 2,
      fu: 30,
      winMethod: "tsumo",
      dealer: true
    });

    expect(
      result.tsumoPayments
    ).toEqual({
      dealerPays: 0,
      nonDealerPays: 1000,
      nonDealerPayerCount: 3
    });

    expect(result.handPoints).toBe(3000);
  });

  it("七対子の25符を計算する", () => {
    const result = calculateScore({
      han: 2,
      fu: 25,
      winMethod: "ron",
      dealer: false
    });

    expect(result.ronPayment).toBe(1600);
  });
});

describe("満貫以上", () => {
  for (
    const [han, limit, points] of [
      [5, "mangan", 8000],
      [6, "haneman", 12000],
      [8, "baiman", 16000],
      [11, "sanbaiman", 24000],
      [13, "kazoeYakuman", 32000]
    ] as const
  ) {
    it(
      `${han}翻を所定の上限点にする`,
      () => {
        const result = calculateScore({
          han,
          fu: 30,
          winMethod: "ron",
          dealer: false
        });

        expect(result.limit).toBe(limit);
        expect(result.ronPayment).toBe(
          points
        );
      }
    );
  }

  it("符計算で2000基本点以上なら満貫とする", () => {
    const result = calculateScore({
      han: 4,
      fu: 40,
      winMethod: "ron",
      dealer: false
    });

    expect(result.limit).toBe("mangan");
    expect(result.ronPayment).toBe(8000);
  });

  it("切り上げ満貫を切り替えられる", () => {
    const normal = calculateScore({
      han: 4,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    const kiriage = calculateScore({
      han: 4,
      fu: 30,
      winMethod: "ron",
      dealer: false,
      kiriageMangan: true
    });

    const threeHanNormal =
      calculateScore({
        han: 3,
        fu: 60,
        winMethod: "ron",
        dealer: false
      });

    const threeHanKiriage =
      calculateScore({
        han: 3,
        fu: 60,
        winMethod: "ron",
        dealer: false,
        kiriageMangan: true
      });

    expect(normal.ronPayment).toBe(7700);
    expect(kiriage.ronPayment).toBe(8000);
    expect(kiriage.limit).toBe("mangan");

    expect(
      threeHanNormal.ronPayment
    ).toBe(7700);

    expect(
      threeHanKiriage.ronPayment
    ).toBe(8000);

    expect(
      threeHanKiriage.limit
    ).toBe("mangan");
  });

  it("数え役満なしでは三倍満に制限する", () => {
    const result = calculateScore({
      han: 13,
      fu: 30,
      winMethod: "ron",
      dealer: false,
      kazoeYakuman: false
    });

    expect(result.limit).toBe(
      "sanbaiman"
    );

    expect(result.ronPayment).toBe(
      24000
    );
  });
});

describe("役満", () => {
  it("子の役満ロンを32000点とする", () => {
    const result = calculateScore({
      han: 0,
      fu: 0,
      winMethod: "ron",
      dealer: false,
      yakumanMultiplier: 1
    });

    expect(result.limit).toBe("yakuman");
    expect(result.ronPayment).toBe(32000);
  });

  it("親の役満ロンを48000点とする", () => {
    const result = calculateScore({
      han: 0,
      fu: 0,
      winMethod: "ron",
      dealer: true,
      yakumanMultiplier: 1
    });

    expect(result.ronPayment).toBe(48000);
  });

  it("ダブル役満を2倍にする", () => {
    const result = calculateScore({
      han: 0,
      fu: 0,
      winMethod: "ron",
      dealer: false,
      yakumanMultiplier: 2
    });

    expect(result.limit).toBe(
      "multipleYakuman"
    );

    expect(result.limitName).toBe(
      "ダブル役満"
    );

    expect(result.ronPayment).toBe(64000);
  });

  it("子の役満ツモを8000・16000とする", () => {
    const result = calculateScore({
      han: 0,
      fu: 0,
      winMethod: "tsumo",
      dealer: false,
      yakumanMultiplier: 1
    });

    expect(
      result.tsumoPayments
    ).toEqual({
      dealerPays: 16000,
      nonDealerPays: 8000,
      nonDealerPayerCount: 2
    });
  });

  it("親の役満ツモを16000点ずつとする", () => {
    const result = calculateScore({
      han: 0,
      fu: 0,
      winMethod: "tsumo",
      dealer: true,
      yakumanMultiplier: 1
    });

    expect(
      result.tsumoPayments
    ).toEqual({
      dealerPays: 0,
      nonDealerPays: 16000,
      nonDealerPayerCount: 3
    });
  });
});

describe("本場と供託", () => {
  it("ロンに本場と供託を加える", () => {
    const result = calculateScore({
      han: 3,
      fu: 40,
      winMethod: "ron",
      dealer: false,
      honba: 2,
      riichiSticks: 3
    });

    expect(result.handPoints).toBe(5200);
    expect(result.honbaPoints).toBe(600);
    expect(result.riichiPoints).toBe(
      3000
    );
    expect(result.ronPayment).toBe(5800);
    expect(result.totalPoints).toBe(8800);
  });

  it("ツモでは各支払者に本場100点を加える", () => {
    const result = calculateScore({
      han: 2,
      fu: 30,
      winMethod: "tsumo",
      dealer: false,
      honba: 2,
      riichiSticks: 1
    });

    expect(
      result.tsumoPayments
    ).toEqual({
      dealerPays: 1200,
      nonDealerPays: 700,
      nonDealerPayerCount: 2
    });

    expect(result.honbaPoints).toBe(600);
    expect(result.totalPoints).toBe(3600);
  });
});

describe("入力検証", () => {
  it("役なしの通常和了を拒否する", () => {
    expect(() =>
      calculateScore({
        han: 0,
        fu: 30,
        winMethod: "ron",
        dealer: false
      })
    ).toThrow();
  });

  it("不正な符を拒否する", () => {
    expect(() =>
      calculateScore({
        han: 1,
        fu: 26,
        winMethod: "ron",
        dealer: false
      })
    ).toThrow();
  });
});
