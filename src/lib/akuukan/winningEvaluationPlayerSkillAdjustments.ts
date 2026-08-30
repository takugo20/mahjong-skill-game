import type {
  NormalYakuId
} from "../mahjong/yaku";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanEffectSourceId,
  AkuukanGameState,
  PlayerSkillId
} from "./types";
import type {
  AkuukanNormalYakuHanAdjustment,
  AkuukanWinningYakuAdjustments
} from "./winningEvaluationAdjustments";

interface PlayerSkillHanAdditionRule {
  readonly skillId: PlayerSkillId;
  readonly yakuIds:
    readonly NormalYakuId[];
}

const PLAYER_SKILL_HAN_ADDITION_RULES:
  readonly PlayerSkillHanAdditionRule[] = [
    {
      skillId: "2-8",
      yakuIds: ["sanshokuDoujun"]
    },
    {
      skillId: "2-9",
      yakuIds: ["ittsuu"]
    },
    {
      skillId: "2-10",
      yakuIds: ["chanta"]
    },
    {
      skillId: "2-11",
      yakuIds: ["junchan"]
    },
    {
      skillId: "2-12",
      yakuIds: ["honitsu"]
    },
    {
      skillId: "2-13",
      yakuIds: ["chinitsu"]
    },
    {
      skillId: "2-14",
      yakuIds: ["sevenPairs"]
    },
    {
      skillId: "2-15",
      yakuIds: [
        "iipeikou",
        "ryanpeikou"
      ]
    },
    {
      skillId: "2-16",
      yakuIds: [
        "toitoi",
        "sanshokuDoukou",
        "sanankou",
        "sankantsu"
      ]
    },
    {
      skillId: "2-17",
      yakuIds: [
        "rinshan",
        "haitei",
        "houtei"
      ]
    }
  ];

function getPlayerSkillSourceId(
  skillId: PlayerSkillId
): AkuukanEffectSourceId {
  return `player-skill:${skillId}`;
}

function getEquippedAdditionalYakuHan(
  state: AkuukanGameState,
  rule: PlayerSkillHanAdditionRule
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state,
      rule.skillId
    );

  if (!equippedSkill) {
    return null;
  }

  const sourceId =
    getPlayerSkillSourceId(
      rule.skillId
    );

  if (
    isAkuukanSourceDisabled(
      state,
      sourceId
    )
  ) {
    return null;
  }

  const skillDefinition =
    getPlayerSkillDefinition(
      rule.skillId
    );
  const levelDefinition =
    getPlayerSkillLevelDefinition(
      skillDefinition,
      equippedSkill.level
    );
  const additionalHan =
    levelDefinition.effectValues
      .additionalYakuHan;

  if (
    typeof additionalHan !== "number" ||
    !Number.isInteger(additionalHan) ||
    additionalHan < 1
  ) {
    throw new Error(
      `スキル${rule.skillId}の役別加算翻が不正です。`
    );
  }

  return additionalHan;
}

export function createAkuukanPlayerSkillWinningYakuAdjustments(
  state: AkuukanGameState
): AkuukanWinningYakuAdjustments {
  const hanAdditions:
    AkuukanNormalYakuHanAdjustment[] = [];

  for (
    const rule of
      PLAYER_SKILL_HAN_ADDITION_RULES
  ) {
    const han =
      getEquippedAdditionalYakuHan(
        state,
        rule
      );

    if (han === null) {
      continue;
    }

    const sourceId =
      getPlayerSkillSourceId(
        rule.skillId
      );

    for (const yakuId of rule.yakuIds) {
      hanAdditions.push({
        yakuId,
        sourceId,
        han
      });
    }
  }

  return hanAdditions.length === 0
    ? {}
    : { hanAdditions };
}
