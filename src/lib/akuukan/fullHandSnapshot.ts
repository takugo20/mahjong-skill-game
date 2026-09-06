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
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState,
  AkuukanPlayerSkill3_12Snapshot,
  AkuukanPlayerSkill3_12SnapshotTile
} from "./types";

export interface AkuukanPlayerSkill3_12State
  extends AkuukanAbilityUseState {}

interface AkuukanPlayerSkill3_12Config {
  readonly mpCost: number;
  readonly snapshotOpponentCount: number;
}

function getAkuukanPlayerSkill3_12Config(
  state: AkuukanPlayerSkill3_12State
): AkuukanPlayerSkill3_12Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "3-12"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("3-12");
  const levelDefinition =
    getPlayerSkillLevelDefinition(
      definition,
      equippedSkill.level
    );
  const snapshotOpponentCount =
    levelDefinition.effectValues
      .snapshotOpponentCount;

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
      "スキル3-12の使用MPまたは使用範囲が不正です。"
    );
  }

  if (
    typeof snapshotOpponentCount !==
      "number" ||
    !Number.isSafeInteger(
      snapshotOpponentCount
    ) ||
    snapshotOpponentCount !== 1
  ) {
    throw new Error(
      "スキル3-12の対象人数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    snapshotOpponentCount
  };
}

export function getAkuukanPlayerSkill3_12Snapshot(
  state: AkuukanGameState
): AkuukanPlayerSkill3_12Snapshot | null {
  if (
    isAkuukanSourceDisabled(
      state,
      "player-skill:3-12"
    )
  ) {
    return null;
  }

  return state.playerSkill3_12Snapshot ?? null;
}

export function clearAkuukanPlayerSkill3_12Snapshot(
  state: AkuukanGameState
): AkuukanGameState {
  if (!state.playerSkill3_12Snapshot) {
    return state;
  }

  const {
    playerSkill3_12Snapshot: _snapshot,
    ...rest
  } = state;

  return rest;
}

export function tryActivateAkuukanPlayerSkill3_12<
  TState extends AkuukanPlayerSkill3_12State
>(
  state: TState,
  targetPlayerId: string,
  targetTiles:
    readonly AkuukanPlayerSkill3_12SnapshotTile[]
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill3_12Config(
      state
    );

  if (!config) {
    return {
      state,
      succeeded: false,
      failureReason: "skillNotEquipped"
    };
  }

  const abilityUse =
    tryUseAkuukanAbility(
      state,
      "turn",
      "player-skill:3-12",
      config.mpCost
    );

  if (!abilityUse.succeeded) {
    return abilityUse;
  }

  return {
    ...abilityUse,
    state: {
      ...abilityUse.state,
      akuukan: {
        ...abilityUse.state.akuukan,
        playerSkill3_12Snapshot: {
          playerId: targetPlayerId,
          tiles: targetTiles.map(
            (tile) => ({ ...tile })
          )
        }
      }
    }
  };
}
