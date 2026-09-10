import type {
  Tile
} from "../mahjong/types";
import {
  tryUseAkuukanAbility
} from "./abilityUse";
import type {
  AkuukanAbilityUseFailureReason,
  AkuukanAbilityUseState
} from "./abilityUse";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  exchangeAkuukanHandTilesWithWall,
  getAkuukanHandExchangeWallCandidates
} from "./handExchange";
import type {
  AkuukanHandExchangeRecord
} from "./handExchange";
import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";

export interface AkuukanPlayerSkill4_17Config {
  readonly mpCost: number;
  readonly maximumExchangeTileCount: number;
}

export interface AkuukanPlayerSkill4_17State
  extends AkuukanAbilityUseState {
  readonly hand: readonly Tile[];
  readonly liveWall: readonly Tile[];
  readonly deadWall: readonly Tile[];
  readonly doraIndicatorCount: number;
  readonly rinshanDrawCount: number;
}

export type AkuukanPlayerSkill4_17FailureReason =
  | AkuukanAbilityUseFailureReason
  | "invalidSelection"
  | "noExchangeCandidate";

export interface AkuukanPlayerSkill4_17Result {
  readonly state:
    AkuukanPlayerSkill4_17State;
  readonly succeeded: boolean;
  readonly failureReason:
    AkuukanPlayerSkill4_17FailureReason | null;
  readonly exchanges:
    readonly AkuukanHandExchangeRecord[];
}

export function getAkuukanPlayerSkill4_17Config(
  state: AkuukanPlayerSkill4_17State
): AkuukanPlayerSkill4_17Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "4-17"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("4-17");
  const levelDefinition =
    getPlayerSkillLevelDefinition(
      definition,
      equippedSkill.level
    );
  const maximumExchangeTileCount =
    levelDefinition.effectValues
      .maximumExchangeTileCount;

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
    levelDefinition.mpCost < 0 ||
    typeof maximumExchangeTileCount !==
      "number" ||
    !Number.isSafeInteger(
      maximumExchangeTileCount
    ) ||
    maximumExchangeTileCount < 1
  ) {
    throw new Error(
      "スキル4-17の使用MPまたは交換枚数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    maximumExchangeTileCount
  };
}

function isValidSelection(
  state: AkuukanPlayerSkill4_17State,
  selectedTileIds: readonly string[],
  maximumExchangeTileCount: number
): boolean {
  return (
    selectedTileIds.length >= 1 &&
    selectedTileIds.length <=
      maximumExchangeTileCount &&
    new Set(selectedTileIds).size ===
      selectedTileIds.length &&
    selectedTileIds.every((tileId) =>
      state.hand.some(
        (tile) => tile.id === tileId
      )
    )
  );
}

export function canActivateAkuukanPlayerSkill4_17(
  state: AkuukanPlayerSkill4_17State
): boolean {
  const config =
    getAkuukanPlayerSkill4_17Config(
      state
    );

  if (!config) {
    return false;
  }

  if (
    getAkuukanHandExchangeWallCandidates({
      liveWall: state.liveWall,
      deadWall: state.deadWall,
      doraIndicatorCount:
        state.doraIndicatorCount,
      rinshanDrawCount:
        state.rinshanDrawCount
    }).length === 0
  ) {
    return false;
  }

  return tryUseAkuukanAbility(
    state,
    "round",
    "player-skill:4-17",
    config.mpCost
  ).succeeded;
}

export function tryActivateAkuukanPlayerSkill4_17(
  state: AkuukanPlayerSkill4_17State,
  selectedTileIds: readonly string[],
  random: () => number
): AkuukanPlayerSkill4_17Result {
  const config =
    getAkuukanPlayerSkill4_17Config(
      state
    );

  if (!config) {
    return {
      state,
      succeeded: false,
      failureReason: "skillNotEquipped",
      exchanges: []
    };
  }

  if (
    !isValidSelection(
      state,
      selectedTileIds,
      config.maximumExchangeTileCount
    )
  ) {
    return {
      state,
      succeeded: false,
      failureReason: "invalidSelection",
      exchanges: []
    };
  }

  if (
    getAkuukanHandExchangeWallCandidates({
      liveWall: state.liveWall,
      deadWall: state.deadWall,
      doraIndicatorCount:
        state.doraIndicatorCount,
      rinshanDrawCount:
        state.rinshanDrawCount
    }).length === 0
  ) {
    return {
      state,
      succeeded: false,
      failureReason: "noExchangeCandidate",
      exchanges: []
    };
  }

  const abilityUse = tryUseAkuukanAbility(
    state,
    "round",
    "player-skill:4-17",
    config.mpCost
  );

  if (!abilityUse.succeeded) {
    return {
      state,
      succeeded: false,
      failureReason:
        abilityUse.failureReason,
      exchanges: []
    };
  }

  const exchange =
    exchangeAkuukanHandTilesWithWall({
      hand: state.hand,
      selectedTileIds,
      maximumExchangeTileCount:
        config.maximumExchangeTileCount,
      liveWall: state.liveWall,
      deadWall: state.deadWall,
      doraIndicatorCount:
        state.doraIndicatorCount,
      rinshanDrawCount:
        state.rinshanDrawCount,
      random
    });

  return {
    state: {
      ...abilityUse.state,
      hand: exchange.hand,
      liveWall: exchange.liveWall,
      deadWall: exchange.deadWall
    },
    succeeded: true,
    failureReason: null,
    exchanges: exchange.exchanges
  };
}
