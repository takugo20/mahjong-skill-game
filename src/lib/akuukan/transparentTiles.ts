import type {
  PlayerState
} from "../mahjong/types";
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
  AkuukanGameState
} from "./types";

export type TransparentTilePlayer = Pick<
  PlayerState,
  "id" | "seat" | "hand"
>;

export interface SynchronizePlayerSkill3_4Input {
  readonly akuukan: AkuukanGameState;
  readonly players:
    readonly TransparentTilePlayer[];
  readonly random?: () => number;
}

function getVisibleTilesPerOpponent(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "3-4"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-4"
    )
  ) {
    return null;
  }

  const visibleTileCount =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("3-4"),
      equippedSkill.level
    ).effectValues
      .visibleTilesPerOpponent;

  if (
    typeof visibleTileCount !== "number" ||
    !Number.isSafeInteger(visibleTileCount) ||
    visibleTileCount < 0
  ) {
    throw new Error(
      "スキル3-4の公開牌数が不正です。"
    );
  }

  return visibleTileCount;
}

function takeRandomTileId(
  tileIds: string[],
  random: () => number
): string {
  const randomValue = random();

  if (
    !Number.isFinite(randomValue) ||
    randomValue < 0 ||
    randomValue >= 1
  ) {
    throw new RangeError(
      "乱数は0以上1未満で指定してください。"
    );
  }

  const selectedIndex = Math.floor(
    randomValue * tileIds.length
  );
  const [selectedTileId] = tileIds.splice(
    selectedIndex,
    1
  );

  if (!selectedTileId) {
    throw new Error(
      "公開する手牌を選択できません。"
    );
  }

  return selectedTileId;
}

export function synchronizePlayerSkill3_4VisibleTiles(
  input: SynchronizePlayerSkill3_4Input
): AkuukanGameState {
  const visibleTileCount =
    getVisibleTilesPerOpponent(
      input.akuukan
    );

  if (visibleTileCount === null) {
    return input.akuukan;
  }

  const previousByPlayerId =
    input.akuukan
      .playerSkill3_4VisibleTileIdsByPlayerId ??
      {};
  const nextByPlayerId:
    Record<string, string[]> = {};
  const random = input.random ?? Math.random;

  for (const player of input.players) {
    if (player.seat === 0) {
      continue;
    }

    const handTileIdSet = new Set(
      player.hand.map((tile) => tile.id)
    );
    const retainedTileIds = (
      previousByPlayerId[player.id] ?? []
    ).filter((tileId) =>
      handTileIdSet.has(tileId)
    ).slice(0, visibleTileCount);
    const retainedTileIdSet = new Set(
      retainedTileIds
    );
    const candidateTileIds = player.hand
      .map((tile) => tile.id)
      .filter(
        (tileId) =>
          !retainedTileIdSet.has(tileId)
      );
    const selectedTileIds = [
      ...retainedTileIds
    ];

    while (
      selectedTileIds.length <
        visibleTileCount &&
      candidateTileIds.length > 0
    ) {
      selectedTileIds.push(
        takeRandomTileId(
          candidateTileIds,
          random
        )
      );
    }

    nextByPlayerId[player.id] =
      selectedTileIds;
  }

  return {
    ...input.akuukan,
    playerSkill3_4VisibleTileIdsByPlayerId:
      nextByPlayerId
  };
}

export function getPlayerSkill3_4VisibleTileIds(
  akuukan: AkuukanGameState,
  playerId: string
): readonly string[] {
  if (
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-4"
    )
  ) {
    return [];
  }

  return (
    akuukan
      .playerSkill3_4VisibleTileIdsByPlayerId?.[
        playerId
      ] ?? []
  );
}

export function isPlayerSkill3_4TileVisible(
  akuukan: AkuukanGameState,
  playerId: string,
  tileId: string
): boolean {
  return getPlayerSkill3_4VisibleTileIds(
    akuukan,
    playerId
  ).includes(tileId);
}
