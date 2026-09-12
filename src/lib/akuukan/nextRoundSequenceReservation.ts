import { tryUseAkuukanAbility } from "./abilityUse";
import type {
  AkuukanAbilityUseResult,
  AkuukanAbilityUseState
} from "./abilityUse";
import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { reserveAkuukanNextRoundEffect } from "./state";

export const AKUUKAN_PLAYER_SKILL_4_22_RESERVATION_PREFIX =
  "player-skill:4-22:next-round-sequence:";

export function getAkuukanPlayerSkill4_22MpCost(
  state: AkuukanAbilityUseState
): number | null {
  const equipped = getEquippedPlayerSkill(
    state.akuukan,
    "4-22"
  );
  if (!equipped) return null;

  const definition = getPlayerSkillDefinition("4-22");
  const level = getPlayerSkillLevelDefinition(
    definition,
    equipped.level
  );
  if (
    definition.kind !== "active" ||
    definition.usageScope !== "turn" ||
    !definition.activationHooks.includes("actionOpportunity") ||
    level.mpCost === null ||
    !Number.isFinite(level.mpCost) ||
    level.mpCost < 0 ||
    level.effectValues.reservedSequenceCount !== 1
  ) {
    throw new Error("スキル4-22の使用MPまたは予約設定が不正です。");
  }
  return level.mpCost;
}

export function canActivateAkuukanPlayerSkill4_22(
  state: AkuukanAbilityUseState
): boolean {
  const cost = getAkuukanPlayerSkill4_22MpCost(state);
  return cost !== null && tryUseAkuukanAbility(
    state,
    "turn",
    "player-skill:4-22",
    cost
  ).succeeded;
}

export function tryActivateAkuukanPlayerSkill4_22<
  TState extends AkuukanAbilityUseState
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  const cost = getAkuukanPlayerSkill4_22MpCost(state);
  if (cost === null) {
    return {
      state,
      succeeded: false,
      failureReason: "skillNotEquipped"
    };
  }

  const use = tryUseAkuukanAbility(
    state,
    "turn",
    "player-skill:4-22",
    cost
  );
  if (!use.succeeded) return use;

  const occupiedIds = new Set([
    ...use.state.akuukan.activeEffects,
    ...use.state.akuukan.nextRoundEffects
  ].map((effect) => effect.instanceId));
  let serial = 1;
  while (occupiedIds.has(
    AKUUKAN_PLAYER_SKILL_4_22_RESERVATION_PREFIX + serial
  )) {
    serial += 1;
  }

  return {
    ...use,
    state: {
      ...use.state,
      akuukan: reserveAkuukanNextRoundEffect(
        use.state.akuukan,
        {
          instanceId:
            AKUUKAN_PLAYER_SKILL_4_22_RESERVATION_PREFIX + serial,
          sourceId: "player-skill:4-22",
          remainingTurns: null
        }
      )
    }
  };
}
