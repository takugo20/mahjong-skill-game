import { describe, expect, it } from "vitest";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillRankProgress as record
} from "./playerSkillRankProgress";
import {
  unlockEligiblePlayerSkills
} from "./playerSkillUnlock";

describe("最終順位によるスキル解放進捗", () => {
  it("敵1の1位を共有条件へ1回だけ記録する", () => {
    const initial = createInitialPlayerSkillGrowthState();

    const result = record(initial, {
      matchIsFinalized: true,
      enemyId: "enemy-1",
      finalRank: 1
    });

    expect(
      result.unlockProgress["enemy-1-first-place-count"]
    ).toBe(1);
    expect(
      result.unlockProgress["enemy-2-first-place-count"]
    ).toBe(0);
    expect(
      initial.unlockProgress["enemy-1-first-place-count"]
    ).toBe(0);
    expect(result.skills).toBe(initial.skills);
    expect(result.skills["1-5"].isUnlocked).toBe(false);
    expect(
      unlockEligiblePlayerSkills(result)
        .state.skills["1-5"].isUnlocked
    ).toBe(true);
  });

  it("4位回数を加算し、敵別1位回数は増やさない", () => {
    const result = record(
      createInitialPlayerSkillGrowthState(),
      {
        matchIsFinalized: true,
        enemyId: "enemy-1",
        finalRank: 4
      }
    );

    expect(
      result.unlockProgress["fourth-place-count"]
    ).toBe(1);
    expect(
      result.unlockProgress["enemy-1-first-place-count"]
    ).toBe(0);
  });

  it.each([2, 3] as const)(
    "%s位では順位の解放進捗を増やさない",
    finalRank => {
      const initial = createInitialPlayerSkillGrowthState();

      expect(
        record(initial, {
          matchIsFinalized: true,
          enemyId: "enemy-1",
          finalRank
        })
      ).toBe(initial);
    }
  );

  it("結果が正式に確定していなければ記録しない", () => {
    const initial = createInitialPlayerSkillGrowthState();

    expect(
      record(initial, {
        matchIsFinalized: false,
        enemyId: "enemy-1",
        finalRank: 1
      })
    ).toBe(initial);
  });

  it("複数対局の1位回数を累積して5回条件を満たす", () => {
    let state = createInitialPlayerSkillGrowthState();

    for (let count = 0; count < 5; count++) {
      state = record(state, {
        matchIsFinalized: true,
        enemyId: "enemy-1",
        finalRank: 1
      });
    }

    expect(
      state.unlockProgress["enemy-1-first-place-count"]
    ).toBe(5);
    expect(state.skills["3-2"].isUnlocked).toBe(false);
    expect(
      unlockEligiblePlayerSkills(state)
        .state.skills["3-2"].isUnlocked
    ).toBe(true);
  });

  it("安全な整数の上限を超える場合は元の進捗を変更せず拒否する", () => {
    const initial = createInitialPlayerSkillGrowthState();

    const state = {
      ...initial,
      unlockProgress: {
        ...initial.unlockProgress,
        "fourth-place-count": Number.MAX_SAFE_INTEGER
      }
    };

    expect(() =>
      record(state, {
        matchIsFinalized: true,
        enemyId: "enemy-1",
        finalRank: 4
      })
    ).toThrow(RangeError);

    expect(
      state.unlockProgress["fourth-place-count"]
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
});
