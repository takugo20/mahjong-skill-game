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

export const AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID =
  "player-skill:3-11:face-down-discard";

export interface AkuukanPlayerSkill3_11State
  extends AkuukanAbilityUseState {}

interface AkuukanPlayerSkill3_11Config {
  readonly mpCost: number;
  readonly durationTurns: number;
}

function getAkuukanPlayerSkill3_11Config(
  state: AkuukanPlayerSkill3_11State
): AkuukanPlayerSkill3_11Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "3-11"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("3-11");
  const levelDefinition =
    getPlayerSkillLevelDefinition(
      definition,
      equippedSkill.level
    );
  const durationTurns =
    levelDefinition.effectValues
      .durationTurns;

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
      "スキル3-11の使用MPまたは使用範囲が不正です。"
    );
  }

  if (
    typeof durationTurns !== "number" ||
    !Number.isSafeInteger(
      durationTurns
    ) ||
    durationTurns < 1
  ) {
    throw new Error(
      "スキル3-11の継続巡数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    durationTurns
  };
}

export function hasAkuukanPlayerSkill3_11DiscardProtection(
  state: AkuukanGameState
): boolean {
  return (
    !isAkuukanSourceDisabled(
      state,
      "player-skill:3-11"
    ) &&
    hasAkuukanEffectInstance(
      state,
      AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID
    )
  );
}

export function advanceAkuukanPlayerSkill3_11BeforePlayerAction(
  state: AkuukanGameState
): AkuukanGameState {
  const activeEffect =
    state.activeEffects.find(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID
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
      AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID
    );
  }

  return {
    ...state,
    activeEffects: state.activeEffects.map(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID
          ? {
              ...effect,
              remainingTurns:
                remainingTurns - 1
            }
          : effect
    )
  };
}

export function tryActivateAkuukanPlayerSkill3_11<
  TState extends AkuukanPlayerSkill3_11State
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill3_11Config(
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
      AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID
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
      "player-skill:3-11",
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
            AKUUKAN_PLAYER_SKILL_3_11_INSTANCE_ID,
          sourceId:
            "player-skill:3-11",
          remainingTurns:
            config.durationTurns
        }
      )
    }
  };
}
