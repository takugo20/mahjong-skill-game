import {
  describe,
  expect,
  it
} from "vitest";
import {
  getPlayerSkillDefinition,
  PLAYER_SKILL_CATALOG
} from "./playerSkillCatalog";
import {
  validatePlayerSkillCatalog
} from "./playerSkillCatalogValidation";
import {
  PLAYER_SKILL_IDS
} from "./types";

describe("プレイヤースキル図鑑", () => {
  it("全80スキルをID順に統合する", () => {
    expect(
      PLAYER_SKILL_CATALOG
    ).toHaveLength(80);
    expect(
      PLAYER_SKILL_CATALOG.map(
        (skill) => skill.id
      )
    ).toEqual(PLAYER_SKILL_IDS);
  });

  it("図鑑番号1から80を重複なく保持する", () => {
    expect(
      PLAYER_SKILL_CATALOG.map(
        (skill) => skill.catalogNumber
      )
    ).toEqual(
      Array.from(
        { length: 80 },
        (_, index) => index + 1
      )
    );
  });

  it("統合後の図鑑全体が検証を通過する", () => {
    expect(
      validatePlayerSkillCatalog(
        PLAYER_SKILL_CATALOG
      )
    ).toEqual({
      isValid: true,
      issues: []
    });
  });

  it("IDから対応する定義を取得する", () => {
    PLAYER_SKILL_IDS.forEach(
      (skillId, index) => {
        expect(
          getPlayerSkillDefinition(
            skillId
          )
        ).toBe(
          PLAYER_SKILL_CATALOG[index]
        );
      }
    );
  });
});
