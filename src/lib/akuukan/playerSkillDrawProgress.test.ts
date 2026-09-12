import { describe, expect, it } from "vitest";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillDrawProgress as record
} from "./playerSkillDrawProgress";
import {
  unlockEligiblePlayerSkills
} from "./playerSkillUnlock";

describe("流局によるスキル解放進捗", () => {
  it.each([
    "exhaustiveDraw",
    "abortiveDraw",
    "specialAbortiveDraw"
  ] as const)("%sを1回として記録する", kind => {
    const state = createInitialPlayerSkillGrowthState();
    const result = record(state, kind);

    expect(
      result.unlockProgress["round-draw-count"]
    ).toBe(1);
    expect(
      state.unlockProgress["round-draw-count"]
    ).toBe(0);
    expect(result.skills).toBe(state.skills);
  });

  it.each([
    "nagashiMangan",
    "win"
  ] as const)("%sは流局回数に含めない", kind => {
    const state = createInitialPlayerSkillGrowthState();

    expect(record(state, kind)).toBe(state);
  });

  it("25回・50回で条件を満たしても解放判定までは未解放のままにする", () => {
    let state = createInitialPlayerSkillGrowthState();

    for (let count = 1; count <= 50; count++) {
      state = record(state, "exhaustiveDraw");

      if (count === 25) {
        expect(
          state.skills["3-8"].isUnlocked
        ).toBe(false);

        const unlocked = unlockEligiblePlayerSkills(state);

        expect(
          unlocked.state.skills["3-8"].isUnlocked
        ).toBe(true);
        expect(
          unlocked.state.skills["3-9"].isUnlocked
        ).toBe(false);

        state = unlocked.state;
      }
    }

    expect(
      state.unlockProgress["round-draw-count"]
    ).toBe(50);
    expect(
      state.skills["3-9"].isUnlocked
    ).toBe(false);
    expect(
      unlockEligiblePlayerSkills(state)
        .state.skills["3-9"].isUnlocked
    ).toBe(true);
  });

  it("安全な整数の上限を超える進捗を拒否する", () => {
    const initial = createInitialPlayerSkillGrowthState();

    const state = {
      ...initial,
      unlockProgress: {
        ...initial.unlockProgress,
        "round-draw-count": Number.MAX_SAFE_INTEGER
      }
    };

    expect(() =>
      record(state, "exhaustiveDraw")
    ).toThrow(RangeError);

    expect(
      state.unlockProgress["round-draw-count"]
    ).toBe(Number.MAX_SAFE_INTEGER);
  });
});
