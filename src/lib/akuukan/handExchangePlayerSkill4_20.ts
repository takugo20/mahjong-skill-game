import type { Tile } from "../mahjong/types";
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

export interface AkuukanPlayerSkill4_20Config {
  readonly mpCost: number;
  readonly maximumExchangeTileCount: number;
}

export interface AkuukanPlayerSkill4_20State
  extends AkuukanAbilityUseState {
  readonly hand: readonly Tile[];
  readonly liveWall: readonly Tile[];
  readonly deadWall: readonly Tile[];
  readonly doraIndicatorCount: number;
  readonly rinshanDrawCount: number;
  readonly riichi: boolean;
}

export type AkuukanPlayerSkill4_20FailureReason =
  | AkuukanAbilityUseFailureReason
  | "riichi"
  | "invalidSelection"
  | "noExchangeCandidate";

export interface AkuukanPlayerSkill4_20Result {
  readonly state: AkuukanPlayerSkill4_20State;
  readonly succeeded: boolean;
  readonly failureReason:
    AkuukanPlayerSkill4_20FailureReason | null;
  readonly exchanges:
    readonly AkuukanHandExchangeRecord[];
}

function isSelectableTile(tile: Tile): boolean {
  return (
    tile.suit === "pin" ||
    tile.suit === "sou"
  );
}

function isIncomingTile(tile: Tile): boolean {
  return tile.suit === "man";
}

export function getAkuukanPlayerSkill4_20Config(
  state: AkuukanPlayerSkill4_20State
): AkuukanPlayerSkill4_20Config | null {
  const equippedSkill = getEquippedPlayerSkill(
    state.akuukan,
    "4-20"
  );

  if (!equippedSkill) {
    return null;
  }

  const definition = getPlayerSkillDefinition(
    "4-20"
  );
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
    definition.usageScope !== "turn" ||
    !definition.activationHooks.includes(
      "actionOpportunity"
    ) ||
    levelDefinition.mpCost === null ||
    !Number.isFinite(levelDefinition.mpCost) ||
    levelDefinition.mpCost < 0 ||
    typeof maximumExchangeTileCount !== "number" ||
    !Number.isSafeInteger(maximumExchangeTileCount) ||
    maximumExchangeTileCount < 1
  ) {
    throw new Error(
      "スキル4-20の使用MPまたは交換枚数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    maximumExchangeTileCount
  };
}

function isValidSelection(
  state: AkuukanPlayerSkill4_20State,
  selectedTileIds: readonly string[],
  maximumExchangeTileCount: number
): boolean {
  return (
    selectedTileIds.length >= 1 &&
    selectedTileIds.length <= maximumExchangeTileCount &&
    new Set(selectedTileIds).size ===
      selectedTileIds.length &&
    selectedTileIds.every((tileId) =>
      state.hand.some(
        (tile) =>
          tile.id === tileId &&
          isSelectableTile(tile)
      )
    )
  );
}

function hasExchangeCandidate(
  state: AkuukanPlayerSkill4_20State
): boolean {
  return getAkuukanHandExchangeWallCandidates({
    liveWall: state.liveWall,
    deadWall: state.deadWall,
    doraIndicatorCount: state.doraIndicatorCount,
    rinshanDrawCount: state.rinshanDrawCount,
    acceptsTile: isIncomingTile
  }).length > 0;
}

export function canActivateAkuukanPlayerSkill4_20(
  state: AkuukanPlayerSkill4_20State
): boolean {
  const config =
    getAkuukanPlayerSkill4_20Config(state);

  if (
    !config ||
    state.riichi ||
    !state.hand.some(isSelectableTile) ||
    !hasExchangeCandidate(state)
  ) {
    return false;
  }

  return tryUseAkuukanAbility(
    state,
    "turn",
    "player-skill:4-20",
    config.mpCost
  ).succeeded;
}

export function tryActivateAkuukanPlayerSkill4_20(
  state: AkuukanPlayerSkill4_20State,
  selectedTileIds: readonly string[],
  random: () => number
): AkuukanPlayerSkill4_20Result {
  const config =
    getAkuukanPlayerSkill4_20Config(state);

  if (!config) {
    return {
      state,
      succeeded: false,
      failureReason: "skillNotEquipped",
      exchanges: []
    };
  }

  if (state.riichi) {
    return {
      state,
      succeeded: false,
      failureReason: "riichi",
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

  if (!hasExchangeCandidate(state)) {
    return {
      state,
      succeeded: false,
      failureReason: "noExchangeCandidate",
      exchanges: []
    };
  }

  const abilityUse = tryUseAkuukanAbility(
    state,
    "turn",
    "player-skill:4-20",
    config.mpCost
  );

  if (!abilityUse.succeeded) {
    return {
      state,
      succeeded: false,
      failureReason: abilityUse.failureReason,
      exchanges: []
    };
  }

  const exchange = exchangeAkuukanHandTilesWithWall({
    hand: state.hand,
    selectedTileIds,
    maximumExchangeTileCount:
      config.maximumExchangeTileCount,
    liveWall: state.liveWall,
    deadWall: state.deadWall,
    doraIndicatorCount: state.doraIndicatorCount,
    rinshanDrawCount: state.rinshanDrawCount,
    acceptsTile: isIncomingTile,
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
