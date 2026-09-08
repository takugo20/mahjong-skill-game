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

export interface AkuukanPlayerSkill4_2DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly hand: readonly Tile[];
  readonly candidate: Tile;
}

function isSameTileType(
  handTile: Tile,
  candidate: Tile
): boolean {
  return (
    handTile.suit === candidate.suit &&
    handTile.rank === candidate.rank
  );
}

export function getAkuukanPlayerSkill4_2DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_2DrawWeightInput
): number {
  if (!input.drawerIsPlayer) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-2"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-2"
    ) ||
    !input.hand.some((handTile) =>
      isSameTileType(
        handTile,
        input.candidate
      )
    )
  ) {
    return 1;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("4-2"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-2のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
