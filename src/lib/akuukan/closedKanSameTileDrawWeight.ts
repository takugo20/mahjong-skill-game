import type {
  Meld,
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

export interface AkuukanPlayerSkill4_7DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly hand: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly candidate: Tile;
}

function hasSameTileType(
  hand: readonly Tile[],
  candidate: Tile
): boolean {
  return hand.some(
    (tile) =>
      tile.suit === candidate.suit &&
      tile.rank === candidate.rank
  );
}

export function getAkuukanPlayerSkill4_7DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_7DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !input.melds.some(
      (meld) =>
        meld.kind === "closedKan"
    )
  ) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-7"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-7"
    ) ||
    !hasSameTileType(
      input.hand,
      input.candidate
    )
  ) {
    return 1;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("4-7"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-7のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
