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
  doesDrawCandidateImproveShanten
} from "./shantenImprovementDrawWeight";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export interface AkuukanPlayerSkill4_6DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly hand: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly candidate: Tile;
}

export function getAkuukanPlayerSkill4_6DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_6DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !input.hand.some((tile) => tile.red)
  ) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-6"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-6"
    ) ||
    !doesDrawCandidateImproveShanten(
      input.hand,
      input.melds,
      input.candidate
    )
  ) {
    return 1;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("4-6"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-6のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
