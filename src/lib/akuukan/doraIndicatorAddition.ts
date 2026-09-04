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
  AkuukanGameState
} from "./types";

export const AKUUKAN_MAX_DORA_INDICATOR_COUNT = 5;

export interface AkuukanPlayerSkill1_5Input {
  readonly akuukan: AkuukanGameState;
  readonly currentDoraIndicatorCount: number;
  readonly random: () => number;
}

interface AkuukanPlayerSkill1_5Effect {
  readonly chancePercent: number;
  readonly additionalDoraIndicators: number;
}

function getEnabledAkuukanPlayerSkill1_5Effect(
  akuukan: AkuukanGameState
): AkuukanPlayerSkill1_5Effect | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-5"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-5"
    )
  ) {
    return null;
  }

  const effectValues =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("1-5"),
      equippedSkill.level
    ).effectValues;
  const chancePercent =
    effectValues.chancePercent;
  const additionalDoraIndicators =
    effectValues.additionalDoraIndicators;

  if (
    typeof chancePercent !== "number" ||
    !Number.isFinite(chancePercent) ||
    chancePercent < 0 ||
    chancePercent > 100
  ) {
    throw new Error(
      "スキル1-5の発動確率が不正です。"
    );
  }

  if (
    typeof additionalDoraIndicators !==
      "number" ||
    !Number.isInteger(
      additionalDoraIndicators
    ) ||
    additionalDoraIndicators < 0
  ) {
    throw new Error(
      "スキル1-5の追加ドラ表示牌数が不正です。"
    );
  }

  return {
    chancePercent,
    additionalDoraIndicators
  };
}

export function getAkuukanPlayerSkill1_5DoraIndicatorCount(
  input: AkuukanPlayerSkill1_5Input
): number {
  if (
    !Number.isInteger(
      input.currentDoraIndicatorCount
    ) ||
    input.currentDoraIndicatorCount < 0 ||
    input.currentDoraIndicatorCount >
      AKUUKAN_MAX_DORA_INDICATOR_COUNT
  ) {
    throw new Error(
      "現在のドラ表示牌数が不正です。"
    );
  }

  if (
    input.currentDoraIndicatorCount >=
    AKUUKAN_MAX_DORA_INDICATOR_COUNT
  ) {
    return input.currentDoraIndicatorCount;
  }

  const effect =
    getEnabledAkuukanPlayerSkill1_5Effect(
      input.akuukan
    );

  if (
    !effect ||
    effect.additionalDoraIndicators === 0
  ) {
    return input.currentDoraIndicatorCount;
  }

  if (
    input.random() * 100 >=
    effect.chancePercent
  ) {
    return input.currentDoraIndicatorCount;
  }

  return Math.min(
    AKUUKAN_MAX_DORA_INDICATOR_COUNT,
    input.currentDoraIndicatorCount +
      effect.additionalDoraIndicators
  );
}
