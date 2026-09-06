import {
  describe,
  expect,
  it
} from "vitest";
import {
  recoverPlayerSkill2_18Mp
} from "./afterWinMpRecovery";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

function createAkuukan(
  level: SkillLevel = 1
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: [
      {
        id: "2-18",
        level
      }
    ]
  });
}

describe("恩恵享受【横】の和了後MP回復", () => {
  it.each([
    [1, 10],
    [2, 20],
    [3, 40],
    [4, 60],
    [5, 90]
  ] as const)(
    "Lv.%iでは対象役1種類につき%iMP回復する",
    (level, expected) => {
      expect(
        recoverPlayerSkill2_18Mp({
          akuukan: createAkuukan(level),
          playerMp: 100,
          maxMp: 900,
          normalYakuIds: ["pinfu"]
        })
      ).toBe(100 + expected);
    }
  );

  it("成立した対象役の種類数を掛けて回復する", () => {
    expect(
      recoverPlayerSkill2_18Mp({
        akuukan: createAkuukan(5),
        playerMp: 100,
        maxMp: 900,
        normalYakuIds: [
          "pinfu",
          "iipeikou",
          "sanshokuDoujun"
        ]
      })
    ).toBe(370);
  });

  it("同じ役IDが重複しても1種類として数える", () => {
    expect(
      recoverPlayerSkill2_18Mp({
        akuukan: createAkuukan(5),
        playerMp: 100,
        maxMp: 900,
        normalYakuIds: [
          "pinfu",
          "pinfu"
        ]
      })
    ).toBe(190);
  });

  it("対象外の役では回復しない", () => {
    expect(
      recoverPlayerSkill2_18Mp({
        akuukan: createAkuukan(5),
        playerMp: 100,
        maxMp: 900,
        normalYakuIds: ["tanyao"]
      })
    ).toBe(100);
  });

  it("最大MPを超えて回復しない", () => {
    expect(
      recoverPlayerSkill2_18Mp({
        akuukan: createAkuukan(5),
        playerMp: 850,
        maxMp: 900,
        normalYakuIds: ["ittsuu"]
      })
    ).toBe(900);
  });

  it("スキルが無効なら回復しない", () => {
    const akuukan = disableAkuukanSource(
      createAkuukan(5),
      "player-skill:2-18"
    );

    expect(
      recoverPlayerSkill2_18Mp({
        akuukan,
        playerMp: 100,
        maxMp: 900,
        normalYakuIds: ["pinfu"]
      })
    ).toBe(100);
  });
});
