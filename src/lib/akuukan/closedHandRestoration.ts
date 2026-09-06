import {
  tryUseAkuukanAbility
} from "./abilityUse";
import type {
  AkuukanAbilityUseResult,
  AkuukanAbilityUseState
} from "./abilityUse";
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
  activateAkuukanEffect,
  hasAkuukanEffectInstance
} from "./state";

export const AKUUKAN_PLAYER_SKILL_1_15_INSTANCE_ID =
  "player-skill:1-15:closed-hand-restoration";

export interface AkuukanPlayerSkill1_15State
  extends AkuukanAbilityUseState {}

interface AkuukanPlayerSkill1_15Config {
  readonly mpCost: number;
  readonly durationTurns: number;
}

function getAkuukanPlayerSkill1_15Config(
  state: AkuukanPlayerSkill1_15State
): AkuukanPlayerSkill1_15Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "1-15"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("1-15");
  const levelDefinition =
    getPlayerSkillLevelDefinition(
      definition,
      equippedSkill.level
    );

  if (
    definition.kind !== "active" ||
    definition.usageScope !== "turn" ||
    levelDefinition.mpCost === null ||
    !Number.isFinite(
      levelDefinition.mpCost
    ) ||
    levelDefinition.mpCost < 0
  ) {
    throw new Error(
      "スキル1-15の使用MPまたは使用範囲が不正です。"
    );
  }

  const durationTurns =
    levelDefinition.effectValues
      .durationTurns;

  if (
    typeof durationTurns !== "number" ||
    !Number.isSafeInteger(
      durationTurns
    ) ||
    durationTurns < 1
  ) {
    throw new Error(
      "スキル1-15の継続巡数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    durationTurns
  };
}

export function tryActivateAkuukanPlayerSkill1_15<
  TState extends AkuukanPlayerSkill1_15State
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill1_15Config(
      state
    );

  if (!config) {
    return {
      state,
      succeeded: false,
      failureReason: "skillNotEquipped"
    };
  }

  if (
    hasAkuukanEffectInstance(
      state.akuukan,
      AKUUKAN_PLAYER_SKILL_1_15_INSTANCE_ID
    )
  ) {
    return {
      state,
      succeeded: false,
      failureReason: "sourceUnavailable"
    };
  }

  const abilityUse =
    tryUseAkuukanAbility(
      state,
      "turn",
      "player-skill:1-15",
      config.mpCost
    );

  if (!abilityUse.succeeded) {
    return abilityUse;
  }

  return {
    ...abilityUse,
    state: {
      ...abilityUse.state,
      akuukan: activateAkuukanEffect(
        abilityUse.state.akuukan,
        {
          instanceId:
            AKUUKAN_PLAYER_SKILL_1_15_INSTANCE_ID,
          sourceId:
            "player-skill:1-15",
          remainingTurns:
            config.durationTurns
        }
      )
    }
  };
}
