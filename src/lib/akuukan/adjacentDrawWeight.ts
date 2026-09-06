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

export interface AkuukanPlayerSkill4_1DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly hand: readonly Tile[];
  readonly candidate: Tile;
}

function isNumberTile(tile: Tile): boolean {
  return tile.suit !== "honor";
}

function isAdjacentNumberTile(
  handTile: Tile,
  candidate: Tile
): boolean {
  return (
    isNumberTile(handTile) &&
    isNumberTile(candidate) &&
    handTile.suit === candidate.suit &&
    Math.abs(
      handTile.rank - candidate.rank
    ) === 1
  );
}

export function getAkuukanPlayerSkill4_1DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_1DrawWeightInput
): number {
  if (!input.drawerIsPlayer) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-1"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-1"
    ) ||
    !input.hand.some((handTile) =>
      isAdjacentNumberTile(
        handTile,
        input.candidate
      )
    )
  ) {
    return 1;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("4-1"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-1のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
