import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  tryCreateAkuukanMatchSetupFromSaveData
} from "./saveDataMatchSetup";
import type {
  PlayerSkillProgressById
} from "./playerSkillProgress";
import {
  PLAYER_SKILL_IDS
} from "./types";
import type {
  PlayerSkillId,
  SkillLevel
} from "./types";

function unlockPlayerSkills(
  saveData: AkuukanSaveData,
  skillIds: readonly PlayerSkillId[],
  level: SkillLevel = 1
): AkuukanSaveData {
  const unlockedEntries =
    skillIds.map(
      (skillId) =>
        [
          skillId,
          {
            isUnlocked: true,
            level,
            currentExp: 0
          }
        ] as const
    );

  return {
    ...saveData,
    playerSkillGrowth: {
      ...saveData.playerSkillGrowth,
      skills: {
        ...saveData.playerSkillGrowth.skills,
        ...Object.fromEntries(
          unlockedEntries
        )
      } as PlayerSkillProgressById
    }
  };
}

describe("セーブデータからの亜空間対局設定作成", () => {
  it("解放済みの敵で空の装備設定を作成する", () => {
    const initial =
      createInitialAkuukanSaveData();

    const result =
      tryCreateAkuukanMatchSetupFromSaveData(
        initial,
        "enemy-1"
      );

    expect(result).toEqual({
      setup: {
        enemyId: "enemy-1",
        equippedSkills: []
      },
      succeeded: true,
      failureReason: null
    });
  });

  it("装備スキルへ現在の成長レベルを反映する", () => {
    const unlocked = unlockPlayerSkills(
      createInitialAkuukanSaveData(),
      ["1-1"],
      4
    );
    const initial: AkuukanSaveData = {
      ...unlocked,
      equippedSkills: [
        {
          id: "1-1",
          level: 1
        }
      ]
    };

    const result =
      tryCreateAkuukanMatchSetupFromSaveData(
        initial,
        "enemy-1"
      );

    expect(result).toEqual({
      setup: {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-1",
            level: 4
          }
        ]
      },
      succeeded: true,
      failureReason: null
    });
    expect(
      initial.equippedSkills[0].level
    ).toBe(1);
  });

  it("未解放の敵では対局設定を作成しない", () => {
    const initial =
      createInitialAkuukanSaveData();

    const result =
      tryCreateAkuukanMatchSetupFromSaveData(
        initial,
        "enemy-2"
      );

    expect(result).toEqual({
      setup: null,
      succeeded: false,
      failureReason: "enemyLocked"
    });
  });

  it("未解放スキルが装備されている場合は作成しない", () => {
    const initial: AkuukanSaveData = {
      ...createInitialAkuukanSaveData(),
      equippedSkills: [
        {
          id: "2-1",
          level: 1
        }
      ]
    };

    const result =
      tryCreateAkuukanMatchSetupFromSaveData(
        initial,
        "enemy-1"
      );

    expect(result).toEqual({
      setup: null,
      succeeded: false,
      failureReason: "skillLocked"
    });
  });

  it("同じスキルの重複装備を拒否する", () => {
    const unlocked = unlockPlayerSkills(
      createInitialAkuukanSaveData(),
      ["1-1"]
    );
    const initial: AkuukanSaveData = {
      ...unlocked,
      equippedSkills: [
        {
          id: "1-1",
          level: 1
        },
        {
          id: "1-1",
          level: 1
        }
      ]
    };

    const result =
      tryCreateAkuukanMatchSetupFromSaveData(
        initial,
        "enemy-1"
      );

    expect(result).toEqual({
      setup: null,
      succeeded: false,
      failureReason: "duplicateSkill"
    });
  });

  it("11個以上のスキル装備を拒否する", () => {
    const skillIds =
      PLAYER_SKILL_IDS.slice(0, 11);
    const unlocked = unlockPlayerSkills(
      createInitialAkuukanSaveData(),
      skillIds
    );
    const initial: AkuukanSaveData = {
      ...unlocked,
      equippedSkills: skillIds.map(
        (id) => ({
          id,
          level: 1
        })
      )
    };

    const result =
      tryCreateAkuukanMatchSetupFromSaveData(
        initial,
        "enemy-1"
      );

    expect(result).toEqual({
      setup: null,
      succeeded: false,
      failureReason:
        "tooManyEquippedSkills"
    });
  });
});
