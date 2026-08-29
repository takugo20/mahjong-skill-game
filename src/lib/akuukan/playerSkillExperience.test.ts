import {
  describe,
  expect,
  it
} from "vitest";
import {
  tryGrantPlayerSkillExperience
} from "./playerSkillExperience";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import type {
  PlayerSkillGrowthState,
  UnlockedPlayerSkillProgress
} from "./playerSkillProgress";
import type {
  PlayerSkillId
} from "./types";

function getUnlockedProgress(
  state: PlayerSkillGrowthState,
  skillId: PlayerSkillId
): UnlockedPlayerSkillProgress {
  const progress = state.skills[skillId];

  if (!progress.isUnlocked) {
    throw new Error(
      `スキルが未解放です: ${skillId}`
    );
  }

  return progress;
}

describe("プレイヤースキルEXP", () => {
  it("負数・小数・非有限値を拒否する", () => {
    const state =
      createInitialPlayerSkillGrowthState();

    for (
      const experience of
        [-1, 1.5, Number.NaN, Infinity]
    ) {
      const result =
        tryGrantPlayerSkillExperience(
          state,
          "1-1",
          experience
        );

      expect(result).toMatchObject({
        state,
        succeeded: false,
        failureReason:
          "invalidExperience",
        levelsGained: 0,
        experienceApplied: 0,
        experienceDiscarded: 0
      });
    }
  });

  it("未解放・最大Lv.のスキルには付与しない", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const maximumLevelState:
      PlayerSkillGrowthState = {
        ...state,
        skills: {
          ...state.skills,
          "1-1": {
            isUnlocked: true,
            level: 5,
            currentExp: 0
          }
        }
      };
    const locked =
      tryGrantPlayerSkillExperience(
        state,
        "1-2",
        100
      );
    const maximum =
      tryGrantPlayerSkillExperience(
        maximumLevelState,
        "1-1",
        100
      );

    expect(locked.failureReason).toBe(
      "skillLocked"
    );
    expect(maximum.failureReason).toBe(
      "maximumLevel"
    );
    expect(locked.state).toBe(state);
    expect(maximum.state).toBe(
      maximumLevelState
    );
  });

  it("EXP 0は成功扱いで状態を変更しない", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const result =
      tryGrantPlayerSkillExperience(
        state,
        "1-1",
        0
      );

    expect(result).toEqual({
      state,
      succeeded: true,
      failureReason: null,
      levelsGained: 0,
      experienceApplied: 0,
      experienceDiscarded: 0
    });
  });

  it("必要量未満のEXPを現在レベルへ蓄積する", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const result =
      tryGrantPlayerSkillExperience(
        state,
        "1-1",
        5999
      );

    expect(
      getUnlockedProgress(
        result.state,
        "1-1"
      )
    ).toEqual({
      isUnlocked: true,
      level: 1,
      currentExp: 5999
    });
    expect(result.levelsGained).toBe(0);
    expect(result.experienceApplied).toBe(
      5999
    );
    expect(state.skills["1-1"]).toEqual({
      isUnlocked: true,
      level: 1,
      currentExp: 0
    });
  });

  it("レベルアップ後の余剰EXPを繰り越す", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const result =
      tryGrantPlayerSkillExperience(
        state,
        "1-1",
        7000
      );

    expect(
      getUnlockedProgress(
        result.state,
        "1-1"
      )
    ).toEqual({
      isUnlocked: true,
      level: 2,
      currentExp: 1000
    });
    expect(result.levelsGained).toBe(1);
    expect(result.experienceDiscarded).toBe(
      0
    );
  });

  it("1回の付与で複数レベル上昇する", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const result =
      tryGrantPlayerSkillExperience(
        state,
        "1-1",
        50000
      );

    expect(
      getUnlockedProgress(
        result.state,
        "1-1"
      )
    ).toEqual({
      isUnlocked: true,
      level: 4,
      currentExp: 2000
    });
    expect(result.levelsGained).toBe(3);
  });

  it("Lv.5到達後の余剰EXPを切り捨てる", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const result =
      tryGrantPlayerSkillExperience(
        state,
        "1-1",
        200000
      );

    expect(
      getUnlockedProgress(
        result.state,
        "1-1"
      )
    ).toEqual({
      isUnlocked: true,
      level: 5,
      currentExp: 0
    });
    expect(result.levelsGained).toBe(4);
    expect(result.experienceApplied).toBe(
      138000
    );
    expect(result.experienceDiscarded).toBe(
      62000
    );
  });
});
