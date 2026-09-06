import type {
  NumberSuit,
  Tile
} from "../mahjong/types";
import {
  getTileTypeIndex
} from "../mahjong/hand";
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

export const AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID =
  "player-skill:2-19:next-round-pairs";

const PLAYER_SKILL_2_19_TARGET_YAKU =
  new Set<NormalYakuId>([
    "sevenPairs",
    "toitoi",
    "sanshokuDoukou",
    "sanankou",
    "sankantsu"
  ]);

const PLAYER_SKILL_2_19_MINIMUM_PAIR_COUNTS =
  [2, 2, 3, 3, 4] as const;

export interface ReservePlayerSkill2_19Input {
  readonly akuukan: AkuukanGameState;
  readonly normalYakuIds:
    readonly NormalYakuId[];
}

export interface ApplyPlayerSkill2_19AtDealInput {
  readonly akuukan: AkuukanGameState;
  readonly availableTiles: readonly Tile[];
  readonly preferredSuit?: NumberSuit;
}

export interface PlayerSkill2_19DealResult {
  readonly akuukan: AkuukanGameState;
  readonly reservedTiles: Tile[];
  readonly remainingTiles: Tile[];
  readonly minimumPairCount: number;
  readonly guaranteedPairCount: number;
  readonly consumed: boolean;
}

function selectPairTileTypeIndices(
  availableTiles: readonly Tile[],
  minimumPairCount: number,
  preferredSuit?: NumberSuit
): number[] {
  const counts = new Map<number, number>();
  const suits = new Map<
    number,
    Tile["suit"]
  >();
  const encounterOrder: number[] = [];

  for (const tile of availableTiles) {
    const tileTypeIndex =
      getTileTypeIndex(tile);

    if (!counts.has(tileTypeIndex)) {
      encounterOrder.push(tileTypeIndex);
      suits.set(tileTypeIndex, tile.suit);
    }

    counts.set(
      tileTypeIndex,
      (counts.get(tileTypeIndex) ?? 0) + 1
    );
  }

  const candidates = encounterOrder.filter(
    (tileTypeIndex) =>
      (counts.get(tileTypeIndex) ?? 0) >= 2
  );
  const prioritizedCandidates =
    preferredSuit
      ? [
          ...candidates.filter(
            (tileTypeIndex) =>
              suits.get(tileTypeIndex) ===
              preferredSuit
          ),
          ...candidates.filter(
            (tileTypeIndex) =>
              suits.get(tileTypeIndex) !==
              preferredSuit
          )
        ]
      : candidates;

  return prioritizedCandidates.slice(
    0,
    minimumPairCount
  );
}

export function applyPlayerSkill2_19AtDeal(
  input: ApplyPlayerSkill2_19AtDealInput
): PlayerSkill2_19DealResult {
  const pending =
    input.akuukan.activeEffects.some(
      (effect) =>
        effect.instanceId ===
        AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID
    );

  if (!pending) {
    return {
      akuukan: input.akuukan,
      reservedTiles: [],
      remainingTiles: [
        ...input.availableTiles
      ],
      minimumPairCount: 0,
      guaranteedPairCount: 0,
      consumed: false
    };
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "2-19"
    );
  const enabled =
    equippedSkill !== null &&
    !isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:2-19"
    );
  const minimumPairCount =
    enabled && equippedSkill
      ? PLAYER_SKILL_2_19_MINIMUM_PAIR_COUNTS[
          equippedSkill.level - 1
        ]
      : 0;
  const selectedTileTypeIndices =
    selectPairTileTypeIndices(
      input.availableTiles,
      minimumPairCount,
      input.preferredSuit
    );
  const remainingRequiredCounts = new Map(
    selectedTileTypeIndices.map(
      (tileTypeIndex) => [
        tileTypeIndex,
        2
      ]
    )
  );
  const reservedTiles: Tile[] = [];
  const remainingTiles: Tile[] = [];

  for (const tile of input.availableTiles) {
    const tileTypeIndex =
      getTileTypeIndex(tile);
    const requiredCount =
      remainingRequiredCounts.get(
        tileTypeIndex
      ) ?? 0;

    if (requiredCount > 0) {
      reservedTiles.push(tile);
      remainingRequiredCounts.set(
        tileTypeIndex,
        requiredCount - 1
      );
    } else {
      remainingTiles.push(tile);
    }
  }

  return {
    akuukan: endAkuukanEffect(
      input.akuukan,
      AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID
    ),
    reservedTiles,
    remainingTiles,
    minimumPairCount,
    guaranteedPairCount:
      selectedTileTypeIndices.length,
    consumed: true
  };
}

export function reservePlayerSkill2_19AfterWin(
  input: ReservePlayerSkill2_19Input
): AkuukanGameState {
  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "2-19"
    );
  const hasTargetYaku =
    input.normalYakuIds.some(
      (yakuId) =>
        PLAYER_SKILL_2_19_TARGET_YAKU.has(
          yakuId
        )
    );

  if (
    !equippedSkill ||
    !hasTargetYaku ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:2-19"
    )
  ) {
    return input.akuukan;
  }

  return reserveAkuukanNextRoundEffect(
    input.akuukan,
    {
      instanceId:
        AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
      sourceId: "player-skill:2-19",
      remainingTurns: null
    }
  );
}
