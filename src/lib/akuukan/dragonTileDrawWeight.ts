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

export interface AkuukanPlayerSkill4_15DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly candidate: Tile;
}

function isDragonTile(
  tile: Tile
): boolean {
  return (
    tile.suit === "honor" &&
    tile.rank >= 5 &&
    tile.rank <= 7
  );
}

export function getAkuukanPlayerSkill4_15DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_15DrawWeightInput
): number {
  if (!input.drawerIsPlayer) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-15"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-15"
    ) ||
    !isDragonTile(input.candidate)
  ) {
    return 1;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("4-15"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-15のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
