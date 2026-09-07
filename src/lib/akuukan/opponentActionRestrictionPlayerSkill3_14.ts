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
import type {
  AkuukanGameState
} from "./types";

export const AKUUKAN_PLAYER_SKILL_3_14_INSTANCE_ID =
  "player-skill:3-14:opponent-action-restriction";

export interface AkuukanPlayerSkill3_14State
  extends AkuukanAbilityUseState {}

interface AkuukanPlayerSkill3_14Config {
  readonly mpCost: number;
  readonly durationTurns: number;
}

function getAkuukanPlayerSkill3_14Config(
  state: AkuukanPlayerSkill3_14State
): AkuukanPlayerSkill3_14Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "3-14"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("3-14");
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
    definition.usageScope !== "round" ||
    !definition.activationHooks.includes(
      "dealCompleted"
    ) ||
    levelDefinition.mpCost === null ||
    !Number.isFinite(
      levelDefinition.mpCost
    ) ||
    levelDefinition.mpCost < 0
  ) {
    throw new Error(
      "スキル3-14の使用MPまたは発動条件が不正です。"
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
      "スキル3-14の継続巡数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    durationTurns
  };
}

export function hasAkuukanPlayerSkill3_14Restriction(
  state: AkuukanGameState
): boolean {
  return hasAkuukanEffectInstance(
    state,
    AKUUKAN_PLAYER_SKILL_3_14_INSTANCE_ID
  );
}

export function getAkuukanPlayerSkill3_14RemainingTurns(
  state: AkuukanGameState
): number | null {
  return state.activeEffects.find(
    (effect) =>
      effect.instanceId ===
      AKUUKAN_PLAYER_SKILL_3_14_INSTANCE_ID
  )?.remainingTurns ?? null;
}

export function isAkuukanPlayerSkill3_14OpponentRestricted(
  state: AkuukanGameState,
  seat: number
): boolean {
  return (
    seat !== 0 &&
    hasAkuukanPlayerSkill3_14Restriction(
      state
    )
  );
}

export function tryActivateAkuukanPlayerSkill3_14<
  TState extends AkuukanPlayerSkill3_14State
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill3_14Config(
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
    hasAkuukanPlayerSkill3_14Restriction(
      state.akuukan
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
      "round",
      "player-skill:3-14",
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
            AKUUKAN_PLAYER_SKILL_3_14_INSTANCE_ID,
          sourceId:
            "player-skill:3-14",
          remainingTurns:
            config.durationTurns
        }
      )
    }
  };
}
