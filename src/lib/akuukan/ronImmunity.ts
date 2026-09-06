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
  endAkuukanEffect,
  hasAkuukanEffectInstance,
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export const AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID =
  "player-skill:3-9:ron-immunity";

export interface AkuukanPlayerSkill3_9State
  extends AkuukanAbilityUseState {}

export function advanceAkuukanPlayerSkill3_9BeforePlayerAction(
  state: AkuukanGameState
): AkuukanGameState {
  const activeEffect =
    state.activeEffects.find(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID
    );

  if (
    !activeEffect ||
    activeEffect.remainingTurns === null
  ) {
    return state;
  }

  const remainingTurns =
    activeEffect.remainingTurns;

  if (remainingTurns <= 1) {
    return endAkuukanEffect(
      state,
      AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID
    );
  }

  return {
    ...state,
    activeEffects: state.activeEffects.map(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID
          ? {
              ...effect,
              remainingTurns:
                remainingTurns - 1
            }
          : effect
    )
  };
}

export function hasAkuukanPlayerSkill3_9RonImmunity(
  state: AkuukanGameState
): boolean {
  return (
    !isAkuukanSourceDisabled(
      state,
      "player-skill:3-9"
    ) &&
    hasAkuukanEffectInstance(
      state,
      AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID
    )
  );
}

interface AkuukanPlayerSkill3_9Config {
  readonly mpCost: number;
  readonly durationTurns: number;
}

function getAkuukanPlayerSkill3_9Config(
  state: AkuukanPlayerSkill3_9State
): AkuukanPlayerSkill3_9Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "3-9"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("3-9");
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
      "スキル3-9の使用MPまたは使用範囲が不正です。"
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
      "スキル3-9の継続巡数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    durationTurns
  };
}

export function tryActivateAkuukanPlayerSkill3_9<
  TState extends AkuukanPlayerSkill3_9State
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill3_9Config(
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
      AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID
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
      "player-skill:3-9",
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
            AKUUKAN_PLAYER_SKILL_3_9_INSTANCE_ID,
          sourceId:
            "player-skill:3-9",
          remainingTurns:
            config.durationTurns
        }
      )
    }
  };
}
