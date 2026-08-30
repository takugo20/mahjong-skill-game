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
  AkuukanNormalYakuSourceAdjustment,
  AkuukanWinningYakuAdjustments,
  AkuukanYakumanMultiplierAdjustment
} from "./winningEvaluationAdjustments";
import {
  AKUUKAN_NORMAL_YAKU_DEFINITIONS,
  AKUUKAN_YAKUMAN_DEFINITIONS,
  getAkuukanNormalYakuDefinition
} from "./winningEvaluationDefinitions";
import type {
  AkuukanNormalYakuDefinition,
  AkuukanYakumanDefinition
} from "./winningEvaluationDefinitions";

interface PlayerSkillYakuRule {
  readonly skillId: PlayerSkillId;
  readonly yakuIds:
    readonly NormalYakuId[];
}

interface PlayerSkillHanAdditionRule {
  readonly skillId: PlayerSkillId;
  readonly yakuIds:
    readonly NormalYakuId[];
}

const MENZEN_KAIKI_SKILL_ID:
  PlayerSkillId = "1-15";

const MENZEN_KAIKI_CLOSED_ONLY_YAKU:
  readonly AkuukanNormalYakuDefinition[] =
    AKUUKAN_NORMAL_YAKU_DEFINITIONS.filter(
      (definition) =>
        definition.openHan === null
    );

const MENZEN_KAIKI_OPEN_REDUCED_YAKU:
  readonly AkuukanNormalYakuDefinition[] =
    AKUUKAN_NORMAL_YAKU_DEFINITIONS.filter(
      (definition) =>
        definition.openHan !== null &&
        definition.openHan <
          definition.closedHan
    );

const MENZEN_KAIKI_CLOSED_ONLY_YAKUMAN:
  readonly AkuukanYakumanDefinition[] =
    AKUUKAN_YAKUMAN_DEFINITIONS.filter(
      (definition) =>
        definition.closedOnly
    );

const PLAYER_SKILL_YAKU_GRANT_RULES:
  readonly PlayerSkillYakuRule[] = [
    {
      skillId: "2-5",
      yakuIds: [
        "iipeikou",
        "ryanpeikou"
      ]
    },
    {
      skillId: "2-6",
      yakuIds: ["pinfu"]
    },
    {
      skillId: "2-7",
      yakuIds: [
        "riichi",
        "ippatsu",
        "menzenTsumo"
      ]
    }
  ];

const PLAYER_SKILL_OPEN_REDUCTION_RULES:
  readonly PlayerSkillYakuRule[] = [
    {
      skillId: "2-1",
      yakuIds: ["sanshokuDoujun"]
    },
    {
      skillId: "2-2",
      yakuIds: ["ittsuu"]
    },
    {
      skillId: "2-3",
      yakuIds: [
        "chanta",
        "junchan"
      ]
    },
    {
      skillId: "2-4",
      yakuIds: [
        "honitsu",
        "chinitsu"
      ]
    }
  ];

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

function isEquippedPlayerSkillEnabled(
  state: AkuukanGameState,
  skillId: PlayerSkillId
): boolean {
  const sourceId =
    getPlayerSkillSourceId(skillId);

  return (
    getEquippedPlayerSkill(
      state,
      skillId
    ) !== null &&
    !isAkuukanSourceDisabled(
      state,
      sourceId
    )
  );
}

function isActivePlayerSkillEffectEnabled(
  state: AkuukanGameState,
  skillId: PlayerSkillId
): boolean {
  const sourceId =
    getPlayerSkillSourceId(skillId);

  return (
    isEquippedPlayerSkillEnabled(
      state,
      skillId
    ) &&
    state.activeEffects.some(
      (effect) =>
        effect.sourceId === sourceId
    )
  );
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

  if (
    !isEquippedPlayerSkillEnabled(
      state,
      rule.skillId
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
  const normalYakuGrants:
    AkuukanNormalYakuHanAdjustment[] = [];
  const yakumanGrants:
    AkuukanYakumanMultiplierAdjustment[] =
      [];
  const openReductionCancellations:
    AkuukanNormalYakuSourceAdjustment[] =
      [];
  const hanAdditions:
    AkuukanNormalYakuHanAdjustment[] = [];

  if (
    isActivePlayerSkillEffectEnabled(
      state,
      MENZEN_KAIKI_SKILL_ID
    )
  ) {
    const sourceId =
      getPlayerSkillSourceId(
        MENZEN_KAIKI_SKILL_ID
      );

    for (
      const definition of
        MENZEN_KAIKI_CLOSED_ONLY_YAKU
    ) {
      normalYakuGrants.push({
        yakuId: definition.id,
        sourceId,
        han: definition.closedHan
      });
    }

    for (
      const definition of
        MENZEN_KAIKI_CLOSED_ONLY_YAKUMAN
    ) {
      yakumanGrants.push({
        yakumanId: definition.id,
        sourceId,
        multiplier:
          definition.multiplier
      });
    }

    for (
      const definition of
        MENZEN_KAIKI_OPEN_REDUCED_YAKU
    ) {
      openReductionCancellations.push({
        yakuId: definition.id,
        sourceId
      });
    }
  }

  for (
    const rule of
      PLAYER_SKILL_YAKU_GRANT_RULES
  ) {
    if (
      !isEquippedPlayerSkillEnabled(
        state,
        rule.skillId
      )
    ) {
      continue;
    }

    const sourceId =
      getPlayerSkillSourceId(
        rule.skillId
      );

    for (const yakuId of rule.yakuIds) {
      normalYakuGrants.push({
        yakuId,
        sourceId,
        han:
          getAkuukanNormalYakuDefinition(
            yakuId
          ).closedHan
      });
    }
  }

  for (
    const rule of
      PLAYER_SKILL_OPEN_REDUCTION_RULES
  ) {
    if (
      !isEquippedPlayerSkillEnabled(
        state,
        rule.skillId
      )
    ) {
      continue;
    }

    const sourceId =
      getPlayerSkillSourceId(
        rule.skillId
      );

    for (const yakuId of rule.yakuIds) {
      openReductionCancellations.push({
        yakuId,
        sourceId
      });
    }
  }

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

  return {
    ...(normalYakuGrants.length > 0
      ? { normalYakuGrants }
      : {}),
    ...(yakumanGrants.length > 0
      ? { yakumanGrants }
      : {}),
    ...(openReductionCancellations.length > 0
      ? { openReductionCancellations }
      : {}),
    ...(hanAdditions.length > 0
      ? { hanAdditions }
      : {})
  };
}
