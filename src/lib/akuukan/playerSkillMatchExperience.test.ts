import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculatePlayerSkillMatchExperience,
  grantPlayerSkillMatchExperience
} from "./playerSkillMatchExperience";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import type {
  AkuukanMatchSetup,
  EquippedPlayerSkill
} from "./types";

function createSetup(
  equippedSkills:
    EquippedPlayerSkill[]
): AkuukanMatchSetup {
  return {
    enemyId: "enemy-1",
    equippedSkills
  };
}

describe("対局終了時のスキルEXP", () => {
  it("順位ごとの倍率を適用する", () => {
    expect([
      calculatePlayerSkillMatchExperience(
        100,
        1
      ),
      calculatePlayerSkillMatchExperience(
        100,
        2
      ),
      calculatePlayerSkillMatchExperience(
        100,
        3
      ),
      calculatePlayerSkillMatchExperience(
        100,
        4
      )
    ]).toEqual([500, 100, 50, 10]);
    expect(
      calculatePlayerSkillMatchExperience(
        530,
        3
      )
    ).toBe(265);
    expect(
      calculatePlayerSkillMatchExperience(
        530,
        4
      )
    ).toBe(53);
  });

  it("不正または整数にならない基本EXPを拒否する", () => {
    expect(() =>
      calculatePlayerSkillMatchExperience(
        -1,
        1
      )
    ).toThrow(RangeError);
    expect(() =>
      calculatePlayerSkillMatchExperience(
        1.5,
        2
      )
    ).toThrow(RangeError);
    expect(() =>
      calculatePlayerSkillMatchExperience(
        1,
        4
      )
    ).toThrow(RangeError);
    expect(() =>
      calculatePlayerSkillMatchExperience(
        Number.MAX_SAFE_INTEGER,
        1
      )
    ).toThrow(RangeError);
  });

  it("装備スキルへ分割せず満額を付与する", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const setup = createSetup([
      { id: "1-1", level: 1 },
      { id: "1-12", level: 1 }
    ]);
    const result =
      grantPlayerSkillMatchExperience(
        state,
        setup,
        2000,
        1
      );

    expect(result.experiencePerSkill).toBe(
      10000
    );
    expect(result.state.skills["1-1"])
      .toEqual({
        isUnlocked: true,
        level: 2,
        currentExp: 4000
      });
    expect(result.state.skills["1-12"])
      .toEqual({
        isUnlocked: true,
        level: 4,
        currentExp: 2000
      });
    expect(
      result.awards.map(
        (award) => award.experience
      )
    ).toEqual([10000, 10000]);
    expect(
      result.awards.map(
        (award) => award.levelsGained
      )
    ).toEqual([1, 3]);
    expect(state.skills["1-1"])
      .toEqual({
        isUnlocked: true,
        level: 1,
        currentExp: 0
      });
  });

  it("最大Lv.を飛ばして他の装備スキルへ付与する", () => {
    const initial =
      createInitialPlayerSkillGrowthState();
    const state: PlayerSkillGrowthState = {
      ...initial,
      skills: {
        ...initial.skills,
        "1-1": {
          isUnlocked: true,
          level: 5,
          currentExp: 0
        }
      }
    };
    const result =
      grantPlayerSkillMatchExperience(
        state,
        createSetup([
          { id: "1-1", level: 5 },
          { id: "1-12", level: 1 }
        ]),
        100,
        1
      );

    expect(result.awards[0]).toMatchObject({
      skillId: "1-1",
      succeeded: false,
      failureReason: "maximumLevel"
    });
    expect(result.awards[1]).toMatchObject({
      skillId: "1-12",
      succeeded: true,
      experienceApplied: 500
    });
    expect(result.state.skills["1-12"])
      .toEqual({
        isUnlocked: true,
        level: 1,
        currentExp: 500
      });
  });

  it("装備なしでは状態を変更しない", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const result =
      grantPlayerSkillMatchExperience(
        state,
        createSetup([]),
        100,
        2
      );

    expect(result).toEqual({
      state,
      experiencePerSkill: 100,
      awards: []
    });
  });

  it("重複した装備データを拒否する", () => {
    const state =
      createInitialPlayerSkillGrowthState();

    expect(() =>
      grantPlayerSkillMatchExperience(
        state,
        createSetup([
          { id: "1-1", level: 1 },
          { id: "1-1", level: 1 }
        ]),
        100,
        1
      )
    ).toThrow(
      "同じスキルを重複して装備できません"
    );
  });
});
