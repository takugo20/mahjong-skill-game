import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_DRAW_MP_RECOVERY,
  AKUUKAN_INITIAL_MP,
  AKUUKAN_MAX_MP,
  AKUUKAN_ROUND_MP_RECOVERY,
  clampAkuukanMp,
  recoverAkuukanMp,
  trySpendAkuukanMp
} from "./mp";

describe("亜空間麻雀のMP定数", () => {
  it("初期値・上限・回復量を定義する", () => {
    expect(AKUUKAN_INITIAL_MP).toBe(420);
    expect(AKUUKAN_MAX_MP).toBe(900);
    expect(AKUUKAN_DRAW_MP_RECOVERY).toBe(
      30
    );
    expect(AKUUKAN_ROUND_MP_RECOVERY).toBe(
      390
    );
  });
});

describe("亜空間麻雀のMP補正と回復", () => {
  it("MPを0から上限までの範囲へ補正する", () => {
    expect(clampAkuukanMp(-10)).toBe(0);
    expect(clampAkuukanMp(450)).toBe(450);
    expect(clampAkuukanMp(950)).toBe(900);
    expect(clampAkuukanMp(700, 600)).toBe(
      600
    );
  });

  it("指定量を回復する", () => {
    expect(
      recoverAkuukanMp(
        AKUUKAN_INITIAL_MP,
        AKUUKAN_DRAW_MP_RECOVERY
      )
    ).toBe(450);
  });

  it("回復後も上限を超えない", () => {
    expect(recoverAkuukanMp(890, 30)).toBe(
      900
    );
    expect(recoverAkuukanMp(700, 390, 800)).toBe(
      800
    );
  });

  it("負または不正な回復量でMPを減らさない", () => {
    expect(recoverAkuukanMp(420, -30)).toBe(
      420
    );
    expect(
      recoverAkuukanMp(420, Number.NaN)
    ).toBe(420);
  });
});

describe("亜空間麻雀のMP消費", () => {
  it("残量が足りればMPを消費する", () => {
    expect(trySpendAkuukanMp(420, 120)).toEqual({
      mp: 300,
      succeeded: true
    });
  });

  it("残量不足ならMPを変更しない", () => {
    expect(trySpendAkuukanMp(100, 120)).toEqual({
      mp: 100,
      succeeded: false
    });
  });

  it("負または不正な消費量を拒否する", () => {
    expect(trySpendAkuukanMp(420, -30)).toEqual({
      mp: 420,
      succeeded: false
    });
    expect(
      trySpendAkuukanMp(420, Number.NaN)
    ).toEqual({
      mp: 420,
      succeeded: false
    });
  });
});
