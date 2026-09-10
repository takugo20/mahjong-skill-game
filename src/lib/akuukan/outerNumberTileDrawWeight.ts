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
  AkuukanGameState
} from "./types";

const OUTER_NUMBER_RANKS = new Set([
  1,
  2,
  3,
  7,
  8,
  9
]);

export interface AkuukanPlayerSkill4_13DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly candidate: Tile;
}

function isOuterNumberTile(
  tile: Tile
): boolean {
  return (
    tile.suit !== "honor" &&
    OUTER_NUMBER_RANKS.has(tile.rank)
  );
}

export function getAkuukanPlayerSkill4_13DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_13DrawWeightInput
): number {
  if (!input.drawerIsPlayer) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-13"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-13"
    ) ||
    !isOuterNumberTile(input.candidate)
  ) {
    return 1;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("4-13"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-13のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
