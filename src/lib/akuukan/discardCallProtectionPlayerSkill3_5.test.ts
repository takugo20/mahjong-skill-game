import {
  describe,
  expect,
  it
} from "vitest";
import {
  isPlayerSkill3_5CallBlocked
} from "./discardCallProtection";
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
    equippedSkills: [{
      id: "3-5",
      level
    }]
  });
}

describe("プレイヤースキル3-5 防御結界【序】", () => {
  it.each([
    [1, 3],
    [2, 5],
    [3, 7],
    [4, 9],
    [5, 12]
  ] as const)(
    "Lv.%sでは第%s打まで副露を禁止する",
    (level, protectedCount) => {
      const akuukan = createAkuukan(level);

      expect(
        isPlayerSkill3_5CallBlocked({
          akuukan,
          discardOwnerIsPlayer: true,
          discardNumber: protectedCount,
          kind: "pon"
        })
      ).toBe(true);
      expect(
        isPlayerSkill3_5CallBlocked({
          akuukan,
          discardOwnerIsPlayer: true,
          discardNumber:
            protectedCount + 1,
          kind: "pon"
        })
      ).toBe(false);
    }
  );

  it.each([
    "chi",
    "pon",
    "openKan"
  ] as const)(
    "%sを禁止する",
    (kind) => {
      expect(
        isPlayerSkill3_5CallBlocked({
          akuukan: createAkuukan(),
          discardOwnerIsPlayer: true,
          discardNumber: 1,
          kind
        })
      ).toBe(true);
    }
  );

  it.each([
    "closedKan",
    "addedKan"
  ] as const)(
    "%sは対象外にする",
    (kind) => {
      expect(
        isPlayerSkill3_5CallBlocked({
          akuukan: createAkuukan(),
          discardOwnerIsPlayer: true,
          discardNumber: 1,
          kind
        })
      ).toBe(false);
    }
  );

  it("他家の捨て牌は保護しない", () => {
    expect(
      isPlayerSkill3_5CallBlocked({
        akuukan: createAkuukan(),
        discardOwnerIsPlayer: false,
        discardNumber: 1,
        kind: "pon"
      })
    ).toBe(false);
  });

  it("未装備または無効化中なら保護しない", () => {
    const unequipped =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:3-5"
    );

    for (const akuukan of [
      unequipped,
      disabled
    ]) {
      expect(
        isPlayerSkill3_5CallBlocked({
          akuukan,
          discardOwnerIsPlayer: true,
          discardNumber: 1,
          kind: "pon"
        })
      ).toBe(false);
    }
  });

  it("不正な打牌回数を拒否する", () => {
    expect(() =>
      isPlayerSkill3_5CallBlocked({
        akuukan: createAkuukan(),
        discardOwnerIsPlayer: true,
        discardNumber: 0,
        kind: "pon"
      })
    ).toThrow(
      "打牌回数は1以上の整数で指定してください。"
    );
  });
});
