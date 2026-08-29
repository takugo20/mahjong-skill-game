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
  synchronizeEquippedPlayerSkillLevels,
  tryEquipPlayerSkillInSaveData,
  tryUnequipPlayerSkillFromSaveData
} from "./saveDataEquipment";
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

function createEquippedSaveData(
  skillIds: readonly PlayerSkillId[]
): AkuukanSaveData {
  const saveData = unlockPlayerSkills(
    createInitialAkuukanSaveData(),
    skillIds
  );

  return {
    ...saveData,
    equippedSkills: skillIds.map(
      (id) => ({
        id,
        level: 1
      })
    )
  };
}

describe("セーブデータのスキル装備", () => {
  it("解放済みスキルを現在レベルで装備する", () => {
    const initial = unlockPlayerSkills(
      createInitialAkuukanSaveData(),
      ["1-1"],
      3
    );

    const result =
      tryEquipPlayerSkillInSaveData(
        initial,
        "1-1"
      );

    expect(result).toEqual({
      saveData: {
        ...initial,
        equippedSkills: [
          {
            id: "1-1",
            level: 3
          }
        ]
      },
      succeeded: true,
      failureReason: null
    });
    expect(result.saveData).not.toBe(
      initial
    );
    expect(initial.equippedSkills).toEqual(
      []
    );
  });

  it("未解放スキルを装備できない", () => {
    const initial =
      createInitialAkuukanSaveData();

    const result =
      tryEquipPlayerSkillInSaveData(
        initial,
        "2-1"
      );

    expect(result).toEqual({
      saveData: initial,
      succeeded: false,
      failureReason: "skillLocked"
    });
    expect(result.saveData).toBe(initial);
  });

  it("同じスキルを重複装備できない", () => {
    const initial =
      createEquippedSaveData(["1-1"]);

    const result =
      tryEquipPlayerSkillInSaveData(
        initial,
        "1-1"
      );

    expect(result).toEqual({
      saveData: initial,
      succeeded: false,
      failureReason:
        "skillAlreadyEquipped"
    });
    expect(result.saveData).toBe(initial);
  });

  it("10枠埋まっている場合は追加装備できない", () => {
    const unlockedSkillIds =
      PLAYER_SKILL_IDS.slice(0, 11);
    const saveData = unlockPlayerSkills(
      createInitialAkuukanSaveData(),
      unlockedSkillIds
    );
    const fullSaveData: AkuukanSaveData = {
      ...saveData,
      equippedSkills:
        unlockedSkillIds
          .slice(0, 10)
          .map((id) => ({
            id,
            level: 1
          }))
    };

    const result =
      tryEquipPlayerSkillInSaveData(
        fullSaveData,
        unlockedSkillIds[10]
      );

    expect(result).toEqual({
      saveData: fullSaveData,
      succeeded: false,
      failureReason: "equipmentFull"
    });
    expect(result.saveData).toBe(
      fullSaveData
    );
  });
});

describe("セーブデータのスキル装備解除", () => {
  it("指定したスキルだけを装備から外す", () => {
    const initial =
      createEquippedSaveData([
        "1-1",
        "1-12"
      ]);

    const result =
      tryUnequipPlayerSkillFromSaveData(
        initial,
        "1-1"
      );

    expect(result).toEqual({
      saveData: {
        ...initial,
        equippedSkills: [
          {
            id: "1-12",
            level: 1
          }
        ]
      },
      succeeded: true,
      failureReason: null
    });
    expect(result.saveData).not.toBe(
      initial
    );
    expect(initial.equippedSkills).toHaveLength(
      2
    );
  });

  it("未装備スキルの解除は失敗する", () => {
    const initial =
      createInitialAkuukanSaveData();

    const result =
      tryUnequipPlayerSkillFromSaveData(
        initial,
        "1-1"
      );

    expect(result).toEqual({
      saveData: initial,
      succeeded: false,
      failureReason: "skillNotEquipped"
    });
    expect(result.saveData).toBe(initial);
  });
});

describe("装備スキルのレベル同期", () => {
  it("成長状態の現在レベルへ装備レベルを更新する", () => {
    const equipped =
      createEquippedSaveData([
        "1-1",
        "1-12"
      ]);
    const grown = unlockPlayerSkills(
      equipped,
      ["1-1"],
      2
    );

    const synchronized =
      synchronizeEquippedPlayerSkillLevels(
        grown
      );

    expect(
      synchronized.equippedSkills
    ).toEqual([
      {
        id: "1-1",
        level: 2
      },
      {
        id: "1-12",
        level: 1
      }
    ]);
    expect(synchronized).not.toBe(grown);
    expect(
      grown.equippedSkills[0].level
    ).toBe(1);
  });

  it("全レベルが一致していれば元データを再利用する", () => {
    const saveData =
      createEquippedSaveData(["1-1"]);

    expect(
      synchronizeEquippedPlayerSkillLevels(
        saveData
      )
    ).toBe(saveData);
  });

  it("未解放スキルが装備されている破損状態を拒否する", () => {
    const initial =
      createInitialAkuukanSaveData();
    const invalid: AkuukanSaveData = {
      ...initial,
      equippedSkills: [
        {
          id: "2-1",
          level: 1
        }
      ]
    };

    expect(() =>
      synchronizeEquippedPlayerSkillLevels(
        invalid
      )
    ).toThrow(
      "未解放スキルの装備レベルは同期できません: 2-1"
    );
  });
});
