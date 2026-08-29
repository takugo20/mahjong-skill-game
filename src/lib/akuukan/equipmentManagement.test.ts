import {
  describe,
  expect,
  it
} from "vitest";
import {
  tryEquipAkuukanPlayerSkill,
  tryUnequipAkuukanPlayerSkill,
  tryUpdateAkuukanPlayerSkillLevel
} from "./equipmentManagement";
import {
  PLAYER_SKILL_IDS
} from "./types";
import type {
  AkuukanMatchSetup,
  PlayerSkillId
} from "./types";

function createSetup(
  skillIds: PlayerSkillId[] = ["1-1"]
): AkuukanMatchSetup {
  return {
    enemyId: "enemy-1",
    equippedSkills: skillIds.map((id) => ({
      id,
      level: 1
    }))
  };
}

describe("亜空間麻雀のスキル装備", () => {
  it("空き枠へ新しいスキルを追加する", () => {
    const initial = createSetup();

    const result =
      tryEquipAkuukanPlayerSkill(
        initial,
        "2-1",
        4
      );

    expect(result).toEqual({
      setup: {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-1",
            level: 1
          },
          {
            id: "2-1",
            level: 4
          }
        ]
      },
      succeeded: true,
      failureReason: null
    });
    expect(result.setup).not.toBe(initial);
    expect(initial.equippedSkills).toEqual([
      {
        id: "1-1",
        level: 1
      }
    ]);
  });

  it("同じスキルの重複追加を拒否する", () => {
    const initial = createSetup();

    const result =
      tryEquipAkuukanPlayerSkill(
        initial,
        "1-1",
        5
      );

    expect(result).toEqual({
      setup: initial,
      succeeded: false,
      failureReason: "skillAlreadyEquipped"
    });
    expect(result.setup).toBe(initial);
  });

  it("10個装備中は新しいスキルを追加できない", () => {
    const initial = createSetup(
      PLAYER_SKILL_IDS.slice(0, 10)
    );

    const result =
      tryEquipAkuukanPlayerSkill(
        initial,
        "1-11",
        1
      );

    expect(result).toEqual({
      setup: initial,
      succeeded: false,
      failureReason: "equipmentFull"
    });
    expect(result.setup).toBe(initial);
    expect(initial.equippedSkills).toHaveLength(
      10
    );
  });
});

describe("亜空間麻雀のスキル装備解除", () => {
  it("指定したスキルだけを装備から外す", () => {
    const initial = createSetup([
      "1-1",
      "2-1"
    ]);

    const result =
      tryUnequipAkuukanPlayerSkill(
        initial,
        "1-1"
      );

    expect(result).toEqual({
      setup: {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "2-1",
            level: 1
          }
        ]
      },
      succeeded: true,
      failureReason: null
    });
    expect(result.setup).not.toBe(initial);
    expect(initial.equippedSkills).toHaveLength(
      2
    );
  });

  it("未装備のスキルは解除できない", () => {
    const initial = createSetup();

    const result =
      tryUnequipAkuukanPlayerSkill(
        initial,
        "2-1"
      );

    expect(result).toEqual({
      setup: initial,
      succeeded: false,
      failureReason: "skillNotEquipped"
    });
    expect(result.setup).toBe(initial);
  });
});

describe("亜空間麻雀の装備レベル更新", () => {
  it("指定した装備スキルのレベルだけを更新する", () => {
    const initial = createSetup([
      "1-1",
      "2-1"
    ]);

    const result =
      tryUpdateAkuukanPlayerSkillLevel(
        initial,
        "2-1",
        5
      );

    expect(result).toEqual({
      setup: {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-1",
            level: 1
          },
          {
            id: "2-1",
            level: 5
          }
        ]
      },
      succeeded: true,
      failureReason: null
    });
    expect(result.setup).not.toBe(initial);
    expect(
      initial.equippedSkills[1].level
    ).toBe(1);
  });

  it("同じレベルへの更新では元の設定を再利用する", () => {
    const initial = createSetup();

    const result =
      tryUpdateAkuukanPlayerSkillLevel(
        initial,
        "1-1",
        1
      );

    expect(result).toEqual({
      setup: initial,
      succeeded: true,
      failureReason: null
    });
    expect(result.setup).toBe(initial);
  });

  it("未装備のスキルレベルは更新できない", () => {
    const initial = createSetup();

    const result =
      tryUpdateAkuukanPlayerSkillLevel(
        initial,
        "2-1",
        3
      );

    expect(result).toEqual({
      setup: initial,
      succeeded: false,
      failureReason: "skillNotEquipped"
    });
    expect(result.setup).toBe(initial);
  });
});
