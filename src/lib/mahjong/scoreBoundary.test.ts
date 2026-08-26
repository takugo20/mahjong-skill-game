import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateScore
} from "./score";

describe("満貫以上の翻数上限", () => {
  it("7翻を跳満の上限として扱う", () => {
    const result = calculateScore({
      han: 7,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(result.limit).toBe("haneman");
    expect(result.ronPayment).toBe(12000);
  });

  it("10翻を倍満の上限として扱う", () => {
    const result = calculateScore({
      han: 10,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(result.limit).toBe("baiman");
    expect(result.ronPayment).toBe(16000);
  });

  it("12翻を三倍満の上限として扱う", () => {
    const result = calculateScore({
      han: 12,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(result.limit).toBe("sanbaiman");
    expect(result.ronPayment).toBe(24000);
  });

  it("26翻以上でも数え役満だけではダブル役満にしない", () => {
    const result = calculateScore({
      han: 26,
      fu: 30,
      winMethod: "ron",
      dealer: false
    });

    expect(result.limit).toBe(
      "kazoeYakuman"
    );
    expect(result.limitName).toBe(
      "数え役満"
    );
    expect(result.yakumanMultiplier).toBe(0);
    expect(result.ronPayment).toBe(32000);
  });
});
