import type {
  FuCalculationResult
} from "../mahjong/fu";
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

export interface AkuukanPlayerSkill1_13HanFuInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsPlayer: boolean;
  readonly hasValidYaku: boolean;
  readonly fu: FuCalculationResult;
}

export interface AkuukanPlayerSkill1_13HanFuResult {
  readonly fu: FuCalculationResult;
  readonly bonusHan: number;
}

interface AkuukanPlayerSkill1_13Effect {
  readonly fuFrom20: number;
  readonly fuFrom25: number;
  readonly fuFrom30: number;
  readonly bonusHanAt40OrMore: number;
}

function getPositiveIntegerEffectValue(
  effectValues: Readonly<
    Record<string, unknown>
  >,
  key: string
): number {
  const value = effectValues[key];

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      `スキル1-13の${key}が不正です。`
    );
  }

  return value;
}

function getEnabledAkuukanPlayerSkill1_13Effect(
  akuukan: AkuukanGameState
): AkuukanPlayerSkill1_13Effect | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-13"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-13"
    )
  ) {
    return null;
  }

  const effectValues =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("1-13"),
      equippedSkill.level
    ).effectValues;

  return {
    fuFrom20:
      getPositiveIntegerEffectValue(
        effectValues,
        "fuFrom20"
      ),
    fuFrom25:
      getPositiveIntegerEffectValue(
        effectValues,
        "fuFrom25"
      ),
    fuFrom30:
      getPositiveIntegerEffectValue(
        effectValues,
        "fuFrom30"
      ),
    bonusHanAt40OrMore:
      getPositiveIntegerEffectValue(
        effectValues,
        "bonusHanAt40OrMore"
      )
  };
}

export function adjustAkuukanPlayerSkill1_13HanFu(
  input: AkuukanPlayerSkill1_13HanFuInput
): AkuukanPlayerSkill1_13HanFuResult {
  if (
    !input.winnerIsPlayer ||
    !input.hasValidYaku
  ) {
    return {
      fu: input.fu,
      bonusHan: 0
    };
  }

  const effect =
    getEnabledAkuukanPlayerSkill1_13Effect(
      input.akuukan
    );

  if (!effect) {
    return {
      fu: input.fu,
      bonusHan: 0
    };
  }

  const adjustedFu =
    input.fu.fu === 20
      ? effect.fuFrom20
      : input.fu.fu === 25
        ? effect.fuFrom25
        : input.fu.fu === 30
          ? effect.fuFrom30
          : input.fu.fu;

  if (adjustedFu !== input.fu.fu) {
    return {
      fu: {
        ...input.fu,
        fu: adjustedFu
      },
      bonusHan: 0
    };
  }

  return {
    fu: input.fu,
    bonusHan:
      input.fu.fu >= 40
        ? effect.bonusHanAt40OrMore
        : 0
  };
}
