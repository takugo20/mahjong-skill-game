import { describe, expect, it } from "vitest";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type { SkillLevel } from "./types";
import {
  isAkuukanPlayerSkill5_4IppatsuAvailable as available
} from "./extendedIppatsu";

function input(level: SkillLevel = 5) {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-4", level }]
    }),
    winnerIsPlayer: true,
    riichiEstablished: true,
    completedTurnsAfterRiichi: 0,
    interruptedByCallOrKan: false
  };
}

describe("5-4 一発期間の延長", () => {
  it.each([
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6]
  ] as const)(
    "Lv.%sでは第%s巡の反応完了で終了する",
    (level, duration) => {
      expect(
        available({
          ...input(level),
          completedTurnsAfterRiichi: duration - 1
        })
      ).toBe(true);

      expect(
        available({
          ...input(level),
          completedTurnsAfterRiichi: duration
        })
      ).toBe(false);
    }
  );

  it("立直成立直後から有効になる", () => {
    expect(available(input())).toBe(true);
  });

  it("副露・槓で残り期間を失う", () => {
    expect(
      available({
        ...input(),
        interruptedByCallOrKan: true
      })
    ).toBe(false);
  });

  it.each([
    "winnerIsPlayer",
    "riichiEstablished"
  ] as const)("%sが偽なら適用しない", key => {
    expect(
      available({
        ...input(),
        [key]: false
      })
    ).toBe(false);
  });

  it("未装備と無効化中は適用しない", () => {
    const value = input();

    expect(
      available({
        ...value,
        akuukan: createInitialAkuukanGameState({
          enemyId: "enemy-1",
          equippedSkills: []
        })
      })
    ).toBe(false);

    expect(
      available({
        ...value,
        akuukan: disableAkuukanSource(
          value.akuukan,
          "player-skill:5-4"
        )
      })
    ).toBe(false);
  });

  it.each([
    -1,
    0.5,
    NaN
  ])("不正な完了巡数%sを受け付けない", count => {
    expect(() =>
      available({
        ...input(),
        completedTurnsAfterRiichi: count
      })
    ).toThrow("立直後の完了巡数が不正です。");
  });
});
