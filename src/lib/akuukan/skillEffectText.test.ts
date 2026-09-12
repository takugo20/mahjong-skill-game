import { expect, it } from "vitest";
import {
  PLAYER_SKILL_CATALOG
} from "./playerSkillCatalog";
import {
  PLAYER_SKILL_LEVELS,
  getPlayerSkillMaxLevel
} from "./playerSkillCatalogTypes";
import {
  formatSkillEffectValues as format
} from "./skillEffectText";

it("全80スキルの有効な全レベルに日本語の表示名がある", () => {
  for (const skill of PLAYER_SKILL_CATALOG) {
    for (const level of PLAYER_SKILL_LEVELS) {
      if (level > getPlayerSkillMaxLevel(skill)) {
        continue;
      }

      const values = skill.levels[level].effectValues;

      expect(format(values)).toHaveLength(
        Object.keys(values).length
      );

      expect(
        format(values).every(
          text => !text.includes("undefined")
        )
      ).toBe(true);
    }
  }
});

it("確率・抽選重み・固定効果を区別する", () => {
  expect(
    format({
      chancePercent: 5,
      doraDrawWeightMultiplier: 1.1,
      openRiichiAllowed: 1
    })
  ).toEqual([
    "発動確率：5%",
    "ドラの抽選重み：1.1倍",
    "副露時の立直：あり"
  ]);
});
