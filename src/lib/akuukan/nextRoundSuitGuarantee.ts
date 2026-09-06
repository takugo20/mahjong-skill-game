import type {
  NumberSuit,
  Tile
} from "../mahjong/types";
import type {
  NormalYakuId
} from "../mahjong/yaku";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  endAkuukanEffect,
  isAkuukanSourceDisabled,
  reserveAkuukanNextRoundEffect
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export const AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID =
  "player-skill:2-20:next-round-suit";

const PLAYER_SKILL_2_20_TARGET_YAKU =
  new Set<NormalYakuId>([
    "honitsu",
    "chinitsu"
  ]);

const PLAYER_SKILL_2_20_MINIMUM_SUIT_TILE_COUNTS =
  [4, 5, 6, 7, 9] as const;

export interface ReservePlayerSkill2_20Input {
  readonly akuukan: AkuukanGameState;
  readonly normalYakuIds:
    readonly NormalYakuId[];
  readonly winningTiles: readonly Tile[];
}

export interface ApplyPlayerSkill2_20AtDealInput {
  readonly akuukan: AkuukanGameState;
  readonly availableTiles: readonly Tile[];
  readonly alreadyReservedTiles:
    readonly Tile[];
}

export interface PlayerSkill2_20DealResult {
  readonly akuukan: AkuukanGameState;
  readonly reservedTiles: Tile[];
  readonly remainingTiles: Tile[];
  readonly minimumSuitTileCount: number;
  readonly guaranteedSuitTileCount: number;
  readonly consumed: boolean;
}

function getWinningNumberSuit(
  tiles: readonly Tile[]
): NumberSuit | null {
  const suits = new Set<NumberSuit>();

  for (const tile of tiles) {
    if (tile.suit !== "honor") {
      suits.add(tile.suit);
    }
  }

  if (suits.size !== 1) {
    return null;
  }

  return [...suits][0] ?? null;
}

export function applyPlayerSkill2_20AtDeal(
  input: ApplyPlayerSkill2_20AtDealInput
): PlayerSkill2_20DealResult {
  const pending =
    input.akuukan.activeEffects.some(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID
    );

  if (!pending) {
    return {
      akuukan: input.akuukan,
      reservedTiles: [],
      remainingTiles: [
        ...input.availableTiles
      ],
      minimumSuitTileCount: 0,
      guaranteedSuitTileCount: 0,
      consumed: false
    };
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "2-20"
    );
  const reservedSuit =
    input.akuukan
      .playerSkill2_20ReservedSuit;
  const enabled =
    equippedSkill !== null &&
    reservedSuit !== undefined &&
    !isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:2-20"
    );
  const minimumSuitTileCount =
    enabled && equippedSkill
      ? PLAYER_SKILL_2_20_MINIMUM_SUIT_TILE_COUNTS[
          equippedSkill.level - 1
        ]
      : 0;
  const alreadyReservedSuitTileCount =
    reservedSuit
      ? input.alreadyReservedTiles.filter(
          (tile) =>
            tile.suit === reservedSuit
        ).length
      : 0;
  const additionalTileCount = Math.max(
    0,
    minimumSuitTileCount -
      alreadyReservedSuitTileCount
  );
  const reservedTiles = reservedSuit
    ? input.availableTiles
        .filter(
          (tile) =>
            tile.suit === reservedSuit
        )
        .slice(0, additionalTileCount)
    : [];
  const reservedTileIds = new Set(
    reservedTiles.map((tile) => tile.id)
  );
  const remainingTiles =
    input.availableTiles.filter(
      (tile) =>
        !reservedTileIds.has(tile.id)
    );
  const endedAkuukan = endAkuukanEffect(
    input.akuukan,
    AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID
  );

  return {
    akuukan: {
      ...endedAkuukan,
      playerSkill2_20ReservedSuit:
        undefined
    },
    reservedTiles,
    remainingTiles,
    minimumSuitTileCount,
    guaranteedSuitTileCount:
      alreadyReservedSuitTileCount +
      reservedTiles.length,
    consumed: true
  };
}

export function reservePlayerSkill2_20AfterWin(
  input: ReservePlayerSkill2_20Input
): AkuukanGameState {
  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "2-20"
    );
  const hasTargetYaku =
    input.normalYakuIds.some(
      (yakuId) =>
        PLAYER_SKILL_2_20_TARGET_YAKU.has(
          yakuId
        )
    );
  const winningSuit =
    getWinningNumberSuit(
      input.winningTiles
    );

  if (
    !equippedSkill ||
    !hasTargetYaku ||
    winningSuit === null ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:2-20"
    )
  ) {
    return input.akuukan;
  }

  const reserved =
    reserveAkuukanNextRoundEffect(
      input.akuukan,
      {
        instanceId:
          AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID,
        sourceId: "player-skill:2-20",
        remainingTurns: null
      }
    );

  if (
    reserved.playerSkill2_20ReservedSuit ===
    winningSuit
  ) {
    return reserved;
  }

  return {
    ...reserved,
    playerSkill2_20ReservedSuit:
      winningSuit
  };
}
