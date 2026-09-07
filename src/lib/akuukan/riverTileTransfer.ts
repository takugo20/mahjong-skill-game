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
import type {
  AkuukanGameState,
  AkuukanPlayerSkill3_13ReservedTile
} from "./types";

export interface AkuukanPlayerSkill3_13State
  extends AkuukanAbilityUseState {}

interface AkuukanPlayerSkill3_13Config {
  readonly mpCost: number;
  readonly durationTurns: number;
}

export interface AkuukanPlayerSkill3_13DrawResult {
  readonly akuukan: AkuukanGameState;
  readonly tile:
    AkuukanPlayerSkill3_13ReservedTile;
}

function getAkuukanPlayerSkill3_13Config(
  state: AkuukanPlayerSkill3_13State
): AkuukanPlayerSkill3_13Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "3-13"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("3-13");
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
      "スキル3-13の使用MPまたは使用範囲が不正です。"
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
      "スキル3-13の継続巡数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    durationTurns
  };
}

function removeAkuukanPlayerSkill3_13Transfer(
  state: AkuukanGameState
): AkuukanGameState {
  const {
    playerSkill3_13Transfer: _transfer,
    ...rest
  } = state;

  return rest;
}

export function hasAkuukanPlayerSkill3_13Transfer(
  state: AkuukanGameState
): boolean {
  return state.playerSkill3_13Transfer !==
    undefined;
}

export function clearAkuukanPlayerSkill3_13Transfer(
  state: AkuukanGameState
): AkuukanGameState {
  return state.playerSkill3_13Transfer
    ? removeAkuukanPlayerSkill3_13Transfer(
        state
      )
    : state;
}

export function completeAkuukanPlayerSkill3_13Discard(
  state: AkuukanGameState,
  reservedTile:
    AkuukanPlayerSkill3_13ReservedTile | null
): AkuukanGameState {
  const transfer =
    state.playerSkill3_13Transfer;

  if (
    !transfer ||
    transfer.remainingCollectionTurns <= 0
  ) {
    return state;
  }

  const remainingCollectionTurns =
    transfer.remainingCollectionTurns - 1;
  const reservedTiles = reservedTile
    ? [
        ...transfer.reservedTiles,
        { ...reservedTile }
      ]
    : transfer.reservedTiles;

  if (
    remainingCollectionTurns === 0 &&
    reservedTiles.length === 0
  ) {
    return removeAkuukanPlayerSkill3_13Transfer(
      state
    );
  }

  return {
    ...state,
    playerSkill3_13Transfer: {
      ...transfer,
      remainingCollectionTurns,
      reservedTiles
    }
  };
}

export function takeAkuukanPlayerSkill3_13ReservedTile(
  state: AkuukanGameState,
  playerId: string
): AkuukanPlayerSkill3_13DrawResult | null {
  const transfer =
    state.playerSkill3_13Transfer;
  const tile = transfer?.reservedTiles[0];

  if (
    !transfer ||
    transfer.targetPlayerId !== playerId ||
    !tile
  ) {
    return null;
  }

  const reservedTiles =
    transfer.reservedTiles.slice(1);
  const akuukan =
    transfer.remainingCollectionTurns === 0 &&
    reservedTiles.length === 0
      ? removeAkuukanPlayerSkill3_13Transfer(
          state
        )
      : {
          ...state,
          playerSkill3_13Transfer: {
            ...transfer,
            reservedTiles
          }
        };

  return {
    akuukan,
    tile: { ...tile }
  };
}

export function tryActivateAkuukanPlayerSkill3_13<
  TState extends AkuukanPlayerSkill3_13State
>(
  state: TState,
  targetPlayerId: string
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill3_13Config(
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
    hasAkuukanPlayerSkill3_13Transfer(
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
      "turn",
      "player-skill:3-13",
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
        playerSkill3_13Transfer: {
          targetPlayerId,
          remainingCollectionTurns:
            config.durationTurns,
          reservedTiles: []
        }
      }
    }
  };
}
