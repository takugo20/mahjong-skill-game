import {
  EFFECT_HOOKS,
  EFFECT_PRIORITY,
  ENEMY_ABILITY_IDS,
  ENEMY_IDS,
  PLAYER_SKILL_IDS
} from "./types";
import {
  describe,
  expect,
  it
} from "vitest";

describe("亜空間麻雀の共通ID", () => {
  it("80個のプレイヤースキルIDを重複なく定義する", () => {
    expect(
      PLAYER_SKILL_IDS
    ).toHaveLength(80);
    expect(
      new Set(PLAYER_SKILL_IDS).size
    ).toBe(80);
    expect(
      PLAYER_SKILL_IDS[0]
    ).toBe("1-1");
    expect(
      PLAYER_SKILL_IDS[
        PLAYER_SKILL_IDS.length - 1
      ]
    ).toBe("5-8");
  });

  it("16人の敵IDを重複なく定義する", () => {
    expect(ENEMY_IDS).toHaveLength(16);
    expect(
      new Set(ENEMY_IDS).size
    ).toBe(16);
  });

  it("29個の敵能力IDを重複なく定義する", () => {
    expect(
      ENEMY_ABILITY_IDS
    ).toHaveLength(29);
    expect(
      new Set(ENEMY_ABILITY_IDS).size
    ).toBe(29);
    expect(
      ENEMY_ABILITY_IDS[0]
    ).toBe("E-1");
    expect(
      ENEMY_ABILITY_IDS[
        ENEMY_ABILITY_IDS.length - 1
      ]
    ).toBe("E-29");
  });
});

describe("亜空間麻雀の効果処理", () => {
  it("効果フックを重複なく定義する", () => {
    expect(
      new Set(EFFECT_HOOKS).size
    ).toBe(EFFECT_HOOKS.length);
  });

  it("仕様書どおり7段階の優先順位を定義する", () => {
    expect(
      Object.values(EFFECT_PRIORITY)
    ).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ]);
  });
});
