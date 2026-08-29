import {
  describe,
  expect,
  it
} from "vitest";
import {
  PLAYER_SKILL_KINDS,
  PLAYER_SKILL_LEVELS,
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";
import type {
  ActivePlayerSkillDefinition,
  PassivePlayerSkillDefinition,
  PlayerSkillDefinition
} from "./playerSkillCatalogTypes";

const PASSIVE_SKILL = {
  catalogNumber: 1,
  id: "1-1",
  name: "紅牌錬成【序】",
  evaluation: "A",
  kind: "passive",
  description:
    "配牌時に手牌を赤ドラへ変化させる。",
  activationHooks: ["dealCompleted"],
  usageScope: null,
  unlockCondition: null,
  levels: {
    1: {
      requiredExp: 0,
      mpCost: null,
      effectValues: {
        chancePercent: 5
      }
    },
    2: {
      requiredExp: 100,
      mpCost: null,
      effectValues: {
        chancePercent: 10
      }
    },
    3: {
      requiredExp: 200,
      mpCost: null,
      effectValues: {
        chancePercent: 20
      }
    },
    4: {
      requiredExp: 300,
      mpCost: null,
      effectValues: {
        chancePercent: 30
      }
    },
    5: {
      requiredExp: 400,
      mpCost: null,
      effectValues: {
        chancePercent: 50
      }
    }
  }
} satisfies PassivePlayerSkillDefinition;

const ACTIVE_SKILL = {
  catalogNumber: 36,
  id: "3-1",
  name: "テスト用アクティブスキル",
  evaluation: "A+",
  kind: "active",
  description:
    "レベルに応じた数値効果を発動する。",
  activationHooks: ["actionOpportunity"],
  usageScope: "round",
  unlockCondition: {
    conditionId: "test-progress",
    description: "進捗を10回達成する。",
    targetValue: 10
  },
  levels: {
    1: {
      requiredExp: 0,
      mpCost: 300,
      effectValues: {
        durationTurns: 1,
        powerPercent: 10
      }
    },
    2: {
      requiredExp: 100,
      mpCost: 280,
      effectValues: {
        durationTurns: 1,
        powerPercent: 15
      }
    },
    3: {
      requiredExp: 200,
      mpCost: 260,
      effectValues: {
        durationTurns: 2,
        powerPercent: 20
      }
    },
    4: {
      requiredExp: 300,
      mpCost: 240,
      effectValues: {
        durationTurns: 2,
        powerPercent: 25
      }
    },
    5: {
      requiredExp: 400,
      mpCost: 220,
      effectValues: {
        durationTurns: 3,
        powerPercent: 30
      }
    }
  }
} satisfies ActivePlayerSkillDefinition;

describe("プレイヤースキルカタログの共通型", () => {
  it("パッシブとアクティブを区別する", () => {
    expect(PLAYER_SKILL_KINDS).toEqual([
      "passive",
      "active"
    ]);
    expect(PASSIVE_SKILL.kind).toBe(
      "passive"
    );
    expect(ACTIVE_SKILL.kind).toBe(
      "active"
    );
  });

  it("レベル1から5までを定義する", () => {
    expect(PLAYER_SKILL_LEVELS).toEqual([
      1,
      2,
      3,
      4,
      5
    ]);
    expect(
      Object.keys(PASSIVE_SKILL.levels)
    ).toHaveLength(5);
  });

  it("パッシブはMPを消費せず発動段階を保持する", () => {
    expect(
      PASSIVE_SKILL.levels[3].mpCost
    ).toBeNull();
    expect(
      PASSIVE_SKILL.activationHooks
    ).toEqual(["dealCompleted"]);
    expect(PASSIVE_SKILL.usageScope).toBeNull();
  });

  it("アクティブはMPと使用範囲を保持する", () => {
    expect(
      ACTIVE_SKILL.levels[3].mpCost
    ).toBe(260);
    expect(ACTIVE_SKILL.usageScope).toBe(
      "round"
    );
    expect(
      ACTIVE_SKILL.unlockCondition
    ).toEqual({
      conditionId: "test-progress",
      description: "進捗を10回達成する。",
      targetValue: 10
    });
  });

  it("指定レベルのEXPと効果値を取得する", () => {
    const skills: PlayerSkillDefinition[] = [
      PASSIVE_SKILL,
      ACTIVE_SKILL
    ];

    expect(
      getPlayerSkillLevelDefinition(
        skills[0],
        5
      )
    ).toEqual({
      requiredExp: 400,
      mpCost: null,
      effectValues: {
        chancePercent: 50
      }
    });
    expect(
      getPlayerSkillLevelDefinition(
        skills[1],
        3
      ).effectValues
    ).toEqual({
      durationTurns: 2,
      powerPercent: 20
    });
  });
});
