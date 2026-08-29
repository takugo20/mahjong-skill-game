import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  tryAddPlayerSkillUnlockProgress,
  unlockEligiblePlayerSkills
} from "./playerSkillUnlock";

describe("プレイヤースキルの解放進捗", () => {
  it("指定した条件の進捗だけを加算する", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const first =
      tryAddPlayerSkillUnlockProgress(
        state,
        "tanki-win-count",
        4
      );
    const second =
      tryAddPlayerSkillUnlockProgress(
        first.state,
        "tanki-win-count",
        6
      );

    expect(first).toMatchObject({
      succeeded: true,
      failureReason: null,
      progressAdded: 4,
      currentProgress: 4
    });
    expect(second).toMatchObject({
      succeeded: true,
      currentProgress: 10
    });
    expect(
      second.state.unlockProgress[
        "tanki-win-count"
      ]
    ).toBe(10);
    expect(
      state.unlockProgress[
        "tanki-win-count"
      ]
    ).toBe(0);
  });

  it("進捗0は成功扱いで状態を変更しない", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const result =
      tryAddPlayerSkillUnlockProgress(
        state,
        "tanki-win-count",
        0
      );

    expect(result).toEqual({
      state,
      succeeded: true,
      failureReason: null,
      progressAdded: 0,
      currentProgress: 0
    });
  });

  it("不正な進捗量と安全な整数を超える加算を拒否する", () => {
    const initial =
      createInitialPlayerSkillGrowthState();

    for (
      const amount of
        [-1, 1.5, Number.NaN, Infinity]
    ) {
      const result =
        tryAddPlayerSkillUnlockProgress(
          initial,
          "tanki-win-count",
          amount
        );

      expect(result).toMatchObject({
        state: initial,
        succeeded: false,
        failureReason:
          "invalidProgressAmount",
        progressAdded: 0,
        currentProgress: 0
      });
    }

    const nearLimit: PlayerSkillGrowthState = {
      ...initial,
      unlockProgress: {
        ...initial.unlockProgress,
        "tanki-win-count":
          Number.MAX_SAFE_INTEGER
      }
    };
    const overflow =
      tryAddPlayerSkillUnlockProgress(
        nearLimit,
        "tanki-win-count",
        1
      );

    expect(overflow.succeeded).toBe(false);
    expect(overflow.state).toBe(nearLimit);
  });
});

describe("プレイヤースキルの解放", () => {
  it("条件未達では解放しない", () => {
    const initial =
      createInitialPlayerSkillGrowthState();
    const progressed =
      tryAddPlayerSkillUnlockProgress(
        initial,
        "tanki-win-count",
        9
      ).state;
    const result =
      unlockEligiblePlayerSkills(
        progressed
      );

    expect(result.state).toBe(progressed);
    expect(result.unlockedSkillIds).toEqual(
      []
    );
    expect(
      result.state.skills["1-8"]
        .isUnlocked
    ).toBe(false);
  });

  it("条件達成スキルをLv.1・EXP 0で解放する", () => {
    const initial =
      createInitialPlayerSkillGrowthState();
    const progressed =
      tryAddPlayerSkillUnlockProgress(
        initial,
        "tanki-win-count",
        10
      ).state;
    const result =
      unlockEligiblePlayerSkills(
        progressed
      );

    expect(result.unlockedSkillIds).toEqual([
      "1-8"
    ]);
    expect(result.state.skills["1-8"])
      .toEqual({
        isUnlocked: true,
        level: 1,
        currentExp: 0
      });
    expect(
      progressed.skills["1-8"]
        .isUnlocked
    ).toBe(false);
  });

  it("同じ進捗を使う複数スキルをまとめて解放する", () => {
    const initial =
      createInitialPlayerSkillGrowthState();
    const progressed =
      tryAddPlayerSkillUnlockProgress(
        initial,
        "tanki-win-count",
        30
      ).state;
    const result =
      unlockEligiblePlayerSkills(
        progressed
      );

    expect(result.unlockedSkillIds).toEqual([
      "1-8",
      "5-5"
    ]);
    expect(
      result.state.skills["1-8"]
        .isUnlocked
    ).toBe(true);
    expect(
      result.state.skills["5-5"]
        .isUnlocked
    ).toBe(true);
  });

  it("解放済みスキルのレベルとEXPを維持する", () => {
    const initial =
      createInitialPlayerSkillGrowthState();
    const progressed: PlayerSkillGrowthState = {
      ...initial,
      skills: {
        ...initial.skills,
        "1-8": {
          isUnlocked: true,
          level: 3,
          currentExp: 125
        }
      },
      unlockProgress: {
        ...initial.unlockProgress,
        "tanki-win-count": 30
      }
    };
    const result =
      unlockEligiblePlayerSkills(
        progressed
      );

    expect(result.unlockedSkillIds).toEqual([
      "5-5"
    ]);
    expect(result.state.skills["1-8"])
      .toEqual({
        isUnlocked: true,
        level: 3,
        currentExp: 125
      });
  });
});
