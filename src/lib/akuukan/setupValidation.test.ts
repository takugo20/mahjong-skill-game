import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_MAX_EQUIPPED_SKILLS,
  validateAkuukanMatchSetup
} from "./setupValidation";
import {
  createInitialAkuukanGameState
} from "./state";
import {
  PLAYER_SKILL_IDS
} from "./types";
import type {
  AkuukanMatchSetup
} from "./types";

function createSetup(
  equippedSkillCount: number
): AkuukanMatchSetup {
  return {
    enemyId: "enemy-1",
    equippedSkills: PLAYER_SKILL_IDS
      .slice(0, equippedSkillCount)
      .map((id) => ({
        id,
        level: 1
      }))
  };
}

describe("亜空間麻雀の装備構成検証", () => {
  it("スキルを装備しない構成を許可する", () => {
    expect(
      validateAkuukanMatchSetup(
        createSetup(0)
      )
    ).toEqual({
      isValid: true,
      failureReason: null,
      duplicateSkillId: null
    });
  });

  it("最大10個までの装備を許可する", () => {
    expect(
      validateAkuukanMatchSetup(
        createSetup(
          AKUUKAN_MAX_EQUIPPED_SKILLS
        )
      ).isValid
    ).toBe(true);
  });

  it("11個以上の装備を拒否する", () => {
    expect(
      validateAkuukanMatchSetup(
        createSetup(
          AKUUKAN_MAX_EQUIPPED_SKILLS + 1
        )
      )
    ).toEqual({
      isValid: false,
      failureReason:
        "tooManyEquippedSkills",
      duplicateSkillId: null
    });
  });

  it("同じスキルIDの重複装備を拒否する", () => {
    const setup = createSetup(2);

    setup.equippedSkills.push({
      id: "1-1",
      level: 5
    });

    expect(
      validateAkuukanMatchSetup(setup)
    ).toEqual({
      isValid: false,
      failureReason: "duplicateSkill",
      duplicateSkillId: "1-1"
    });
  });

  it("不正な装備構成では対局状態を生成しない", () => {
    const tooManySkills = createSetup(11);
    const duplicateSkill = createSetup(1);

    duplicateSkill.equippedSkills.push({
      id: "1-1",
      level: 2
    });

    expect(() =>
      createInitialAkuukanGameState(
        tooManySkills
      )
    ).toThrowError(
      "装備スキルは最大10個です。"
    );
    expect(() =>
      createInitialAkuukanGameState(
        duplicateSkill
      )
    ).toThrowError(
      "同じスキルを重複して装備できません: 1-1"
    );
  });
});
