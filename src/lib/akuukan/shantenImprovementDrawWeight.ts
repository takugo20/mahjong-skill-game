import {
  calculateShanten
} from "../mahjong/hand";
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

export interface AkuukanPlayerSkill4_3DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly hand: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly candidate: Tile;
}

export function doesDrawCandidateImproveShanten(
  hand: readonly Tile[],
  melds: readonly Meld[],
  candidate: Tile
): boolean {
  const currentShanten =
    calculateShanten(
      hand,
      melds
    ).minimum;
  const shantenAfterDraw =
    calculateShanten(
      [...hand, candidate],
      melds
    ).minimum;

  return (
    Number.isFinite(currentShanten) &&
    shantenAfterDraw < currentShanten
  );
}

export function getAkuukanPlayerSkill4_3DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_3DrawWeightInput
): number {
  if (!input.drawerIsPlayer) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-3"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-3"
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
      getPlayerSkillDefinition("4-3"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-3のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
