import type {
  Meld,
  Tile
} from "../mahjong/types";
import {
  isClosedHand
} from "../mahjong/yaku";
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

export interface AkuukanPlayerSkill4_4DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly hand: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly candidate: Tile;
}

export function getAkuukanPlayerSkill4_4DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_4DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !isClosedHand(input.melds)
  ) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-4"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-4"
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
      getPlayerSkillDefinition("4-4"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-4のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
