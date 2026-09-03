import type {
  Tile
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
  AkuukanGameState,
  PlayerSkillId
} from "./types";

export const AKUUKAN_RED_TILE_SKILL_IDS = [
  "1-1",
  "1-2",
  "1-3",
  "1-6"
] as const satisfies readonly PlayerSkillId[];

export type AkuukanRedTileSkillId =
  (typeof AKUUKAN_RED_TILE_SKILL_IDS)[number];

export interface ApplyAkuukanRedTileTransformationInput {
  readonly akuukan: AkuukanGameState;
  readonly skillId: AkuukanRedTileSkillId;
  readonly tiles: readonly Tile[];
  readonly random: () => number;
}

export interface AkuukanRedTileTransformationResult {
  readonly tiles: Tile[];
  readonly transformedTileId: string | null;
}

function createUnchangedResult(
  tiles: readonly Tile[]
): AkuukanRedTileTransformationResult {
  return {
    tiles: [...tiles],
    transformedTileId: null
  };
}

function getEnabledChancePercent(
  akuukan: AkuukanGameState,
  skillId: AkuukanRedTileSkillId
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      skillId
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      `player-skill:${skillId}`
    )
  ) {
    return null;
  }

  const levelDefinition =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition(skillId),
      equippedSkill.level
    );
  const chancePercent =
    levelDefinition.effectValues
      .chancePercent;

  if (
    typeof chancePercent !== "number" ||
    !Number.isFinite(chancePercent) ||
    chancePercent < 0 ||
    chancePercent > 100
  ) {
    throw new Error(
      `スキル${skillId}の赤ドラ化確率が不正です。`
    );
  }

  return chancePercent;
}

export function applyAkuukanRedTileTransformation(
  input: ApplyAkuukanRedTileTransformationInput
): AkuukanRedTileTransformationResult {
  const chancePercent =
    getEnabledChancePercent(
      input.akuukan,
      input.skillId
    );
  const candidates = input.tiles.filter(
    (tile) => !tile.red
  );

  if (
    chancePercent === null ||
    candidates.length === 0 ||
    input.random() * 100 >=
      chancePercent
  ) {
    return createUnchangedResult(
      input.tiles
    );
  }

  const selectedTile = candidates[
    Math.floor(
      input.random() * candidates.length
    )
  ];

  if (!selectedTile) {
    return createUnchangedResult(
      input.tiles
    );
  }

  return {
    tiles: input.tiles.map((tile) =>
      tile.id === selectedTile.id
        ? {
            ...tile,
            red: true
          }
        : tile
    ),
    transformedTileId: selectedTile.id
  };
}
