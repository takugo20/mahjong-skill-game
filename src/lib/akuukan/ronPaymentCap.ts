import type {
  WinMethod
} from "../mahjong/yaku";
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

export const AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID =
  "player-skill:3-10:ron-payment-cap";

export interface AkuukanPlayerSkill3_10State
  extends AkuukanAbilityUseState {}

export interface ApplyAkuukanPlayerSkill3_10PaymentCapInput {
  readonly akuukan: AkuukanGameState;
  readonly winMethod: WinMethod;
  readonly winnerIsDealer: boolean;
  readonly payerIsPlayer: boolean;
  readonly payerIsLoser: boolean;
  readonly handBasePoints: number;
  readonly paymentBasePoints: number;
}

interface AkuukanPlayerSkill3_10Config {
  readonly mpCost: number;
  readonly durationTurns: number;
  readonly maximumHandBasePoints: number;
}

function getAkuukanPlayerSkill3_10Config(
  state: AkuukanPlayerSkill3_10State
): AkuukanPlayerSkill3_10Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "3-10"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("3-10");
  const levelDefinition =
    getPlayerSkillLevelDefinition(
      definition,
      equippedSkill.level
    );
  const durationTurns =
    levelDefinition.effectValues
      .durationTurns;
  const maximumHandBasePoints =
    levelDefinition.effectValues
      .maximumHandBasePoints;

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
      "スキル3-10の使用MPまたは使用範囲が不正です。"
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
      "スキル3-10の継続巡数が不正です。"
    );
  }

  if (
    typeof maximumHandBasePoints !==
      "number" ||
    !Number.isSafeInteger(
      maximumHandBasePoints
    ) ||
    maximumHandBasePoints < 1
  ) {
    throw new Error(
      "スキル3-10の基本点上限が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    durationTurns,
    maximumHandBasePoints
  };
}

function getActiveMaximumHandBasePoints(
  akuukan: AkuukanGameState
): number | null {
  if (
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-10"
    ) ||
    !hasAkuukanEffectInstance(
      akuukan,
      AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID
    )
  ) {
    return null;
  }

  const config =
    getAkuukanPlayerSkill3_10Config({
      akuukan,
      playerMp: 0,
      maxMp: 0
    });

  return config?.maximumHandBasePoints ?? null;
}

export function advanceAkuukanPlayerSkill3_10BeforePlayerAction(
  state: AkuukanGameState
): AkuukanGameState {
  const activeEffect =
    state.activeEffects.find(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID
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
      AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID
    );
  }

  return {
    ...state,
    activeEffects: state.activeEffects.map(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID
          ? {
              ...effect,
              remainingTurns:
                remainingTurns - 1
            }
          : effect
    )
  };
}

export function applyAkuukanPlayerSkill3_10PaymentCap(
  input: ApplyAkuukanPlayerSkill3_10PaymentCapInput
): number {
  if (
    !Number.isSafeInteger(
      input.handBasePoints
    ) ||
    input.handBasePoints < 0 ||
    !Number.isSafeInteger(
      input.paymentBasePoints
    ) ||
    input.paymentBasePoints < 0
  ) {
    throw new RangeError(
      "手牌基本点と支払基本額は0以上の安全な整数で指定してください。"
    );
  }

  const maximumHandBasePoints =
    getActiveMaximumHandBasePoints(
      input.akuukan
    );

  if (
    maximumHandBasePoints === null ||
    input.winMethod !== "ron" ||
    !input.payerIsPlayer ||
    !input.payerIsLoser ||
    input.handBasePoints <
      maximumHandBasePoints
  ) {
    return input.paymentBasePoints;
  }

  const paymentCap =
    maximumHandBasePoints *
    (input.winnerIsDealer ? 6 : 4);

  return Math.min(
    input.paymentBasePoints,
    paymentCap
  );
}

export function tryActivateAkuukanPlayerSkill3_10<
  TState extends AkuukanPlayerSkill3_10State
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill3_10Config(
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
      AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID
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
      "player-skill:3-10",
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
            AKUUKAN_PLAYER_SKILL_3_10_INSTANCE_ID,
          sourceId:
            "player-skill:3-10",
          remainingTurns:
            config.durationTurns
        }
      )
    }
  };
}
