import {
  describe,
  expect,
  it
} from "vitest";
import {
  EXPECTED_PLAYER_SKILL_COUNT,
  validatePlayerSkillCatalog
} from "./playerSkillCatalogValidation";
import type {
  ActivePlayerSkillDefinition,
  PassivePlayerSkillDefinition,
  PlayerSkillDefinition
} from "./playerSkillCatalogTypes";
import {
  PLAYER_SKILL_IDS
} from "./types";
import type {
  PlayerSkillId
} from "./types";

function createPassiveSkill(
  id: PlayerSkillId,
  catalogNumber: number
): PassivePlayerSkillDefinition {
  return {
    catalogNumber,
    id,
    name: `テストスキル${catalogNumber}`,
    evaluation: "A",
    kind: "passive",
    description: "カタログ検証用です。",
    activationHooks: ["dealCompleted"],
    usageScope: null,
    unlockCondition: null,
    levels: {
      1: {
        requiredExp: 0,
        mpCost: null,
        effectValues: {}
      },
      2: {
        requiredExp: 100,
        mpCost: null,
        effectValues: {}
      },
      3: {
        requiredExp: 200,
        mpCost: null,
        effectValues: {}
      },
      4: {
        requiredExp: 300,
        mpCost: null,
        effectValues: {}
      },
      5: {
        requiredExp: 400,
        mpCost: null,
        effectValues: {}
      }
    }
  };
}

function createActiveSkill(
  id: PlayerSkillId,
  catalogNumber: number
): ActivePlayerSkillDefinition {
  return {
    catalogNumber,
    id,
    name: `テストスキル${catalogNumber}`,
    evaluation: "A+",
    kind: "active",
    description: "カタログ検証用です。",
    activationHooks: ["actionOpportunity"],
    usageScope: "round",
    unlockCondition: null,
    levels: {
      1: {
        requiredExp: 0,
        mpCost: 300,
        effectValues: {}
      },
      2: {
        requiredExp: 100,
        mpCost: 280,
        effectValues: {}
      },
      3: {
        requiredExp: 200,
        mpCost: 260,
        effectValues: {}
      },
      4: {
        requiredExp: 300,
        mpCost: 240,
        effectValues: {}
      },
      5: {
        requiredExp: 400,
        mpCost: 220,
        effectValues: {}
      }
    }
  };
}

function createValidCatalog():
  PlayerSkillDefinition[] {
  return PLAYER_SKILL_IDS.map(
    (id, index) =>
      createPassiveSkill(id, index + 1)
  );
}

describe("プレイヤースキルカタログ検証", () => {
  it("80件の正常なカタログを許可する", () => {
    const result =
      validatePlayerSkillCatalog(
        createValidCatalog()
      );

    expect(
      EXPECTED_PLAYER_SKILL_COUNT
    ).toBe(80);
    expect(result).toEqual({
      isValid: true,
      issues: []
    });
  });

  it("件数不足と欠落IDを検出する", () => {
    const catalog = createValidCatalog();

    catalog.pop();

    const result =
      validatePlayerSkillCatalog(catalog);

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual([
      {
        type: "incorrectSkillCount",
        expected: 80,
        actual: 79
      },
      {
        type: "missingSkillId",
        skillId: "5-8"
      }
    ]);
  });

  it("重複IDと、その結果欠落したIDを検出する", () => {
    const catalog = createValidCatalog();
    const lastSkill = catalog[79];

    catalog[79] = {
      ...lastSkill,
      id: "1-1"
    };

    const result =
      validatePlayerSkillCatalog(catalog);

    expect(result.isValid).toBe(false);
    expect(result.issues).toEqual([
      {
        type: "duplicateSkillId",
        skillId: "1-1"
      },
      {
        type: "missingSkillId",
        skillId: "5-8"
      }
    ]);
  });

  it("図鑑番号の重複を検出する", () => {
    const catalog = createValidCatalog();

    catalog[79] = {
      ...catalog[79],
      catalogNumber: 1
    };

    const result =
      validatePlayerSkillCatalog(catalog);

    expect(result.issues).toEqual([
      {
        type: "duplicateCatalogNumber",
        catalogNumber: 1
      }
    ]);
  });

  it("1から80以外の図鑑番号を検出する", () => {
    const catalog = createValidCatalog();

    catalog[0] = {
      ...catalog[0],
      catalogNumber: 0
    };
    catalog[1] = {
      ...catalog[1],
      catalogNumber: 81
    };

    const result =
      validatePlayerSkillCatalog(catalog);

    expect(result.issues).toEqual([
      {
        type: "invalidCatalogNumber",
        skillId: "1-1",
        catalogNumber: 0
      },
      {
        type: "invalidCatalogNumber",
        skillId: "1-2",
        catalogNumber: 81
      }
    ]);
  });

  it("負数または小数の必要EXPを検出する", () => {
    const catalog = createValidCatalog();
    const skill = createPassiveSkill(
      "1-1",
      1
    );

    catalog[0] = {
      ...skill,
      levels: {
        ...skill.levels,
        2: {
          ...skill.levels[2],
          requiredExp: -1
        },
        4: {
          ...skill.levels[4],
          requiredExp: 12.5
        }
      }
    };

    const result =
      validatePlayerSkillCatalog(catalog);

    expect(result.issues).toEqual([
      {
        type: "invalidRequiredExp",
        skillId: "1-1",
        level: 2,
        value: -1
      },
      {
        type: "invalidRequiredExp",
        skillId: "1-1",
        level: 4,
        value: 12.5
      }
    ]);
  });

  it("アクティブスキルの不正なMPを検出する", () => {
    const catalog = createValidCatalog();
    const skill = createActiveSkill(
      "1-1",
      1
    );

    catalog[0] = {
      ...skill,
      levels: {
        ...skill.levels,
        3: {
          ...skill.levels[3],
          mpCost: -100
        }
      }
    };

    const result =
      validatePlayerSkillCatalog(catalog);

    expect(result.issues).toEqual([
      {
        type: "invalidMpCost",
        skillId: "1-1",
        level: 3,
        value: -100
      }
    ]);
  });
});
