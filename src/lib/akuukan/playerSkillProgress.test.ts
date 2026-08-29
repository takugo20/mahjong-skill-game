import {
  describe,
  expect,
  it
} from "vitest";
import {
  PLAYER_SKILL_CATALOG
} from "./playerSkillCatalog";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  PLAYER_SKILL_IDS
} from "./types";

describe("プレイヤースキル成長データ", () => {
  it("全80スキルの初期データを作成する", () => {
    const state =
      createInitialPlayerSkillGrowthState();

    expect(
      Object.keys(state.skills)
    ).toEqual(PLAYER_SKILL_IDS);
  });

  it("初期解放スキルをLv.1・EXP 0にする", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const initiallyUnlockedSkillIds =
      PLAYER_SKILL_IDS.filter(
        (skillId) =>
          state.skills[skillId]
            .isUnlocked
      );

    expect(
      initiallyUnlockedSkillIds
    ).toEqual([
      "1-1",
      "1-12",
      "3-1",
      "3-3",
      "3-5",
      "4-3",
      "4-10",
      "4-11",
      "4-12"
    ]);

    PLAYER_SKILL_IDS.forEach(
      (skillId) => {
        const progress =
          state.skills[skillId];

        if (progress.isUnlocked) {
          expect(progress.level).toBe(1);
          expect(progress.currentExp).toBe(0);
        } else {
          expect(progress.level).toBeNull();
          expect(progress.currentExp).toBe(0);
        }
      }
    );
  });

  it("未解放スキルの全条件進捗を0にする", () => {
    const state =
      createInitialPlayerSkillGrowthState();
    const expectedConditionIds = [
      ...new Set(
        PLAYER_SKILL_CATALOG.flatMap(
          (skill) =>
            skill.unlockCondition === null
              ? []
              : [
                  skill.unlockCondition
                    .conditionId
                ]
        )
      )
    ];

    expect(
      Object.keys(state.unlockProgress)
    ).toEqual(expectedConditionIds);
    expect(
      Object.values(
        state.unlockProgress
      ).every((value) => value === 0)
    ).toBe(true);
  });

  it("呼び出すたびに独立した初期データを作成する", () => {
    const first =
      createInitialPlayerSkillGrowthState();
    const second =
      createInitialPlayerSkillGrowthState();

    expect(second).not.toBe(first);
    expect(second.skills).not.toBe(
      first.skills
    );
    expect(second.unlockProgress).not.toBe(
      first.unlockProgress
    );
    expect(second.skills["1-1"]).not.toBe(
      first.skills["1-1"]
    );
  });
});
