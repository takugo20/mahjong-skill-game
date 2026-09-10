import type {
  Tile,
  Wind
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

const WIND_RANKS: Record<Wind, number> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4
};

export interface AkuukanPlayerSkill4_16DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly seatWind: Wind;
  readonly candidate: Tile;
}

function isSeatWindTile(
  tile: Tile,
  seatWind: Wind
): boolean {
  return (
    tile.suit === "honor" &&
    tile.rank === WIND_RANKS[seatWind]
  );
}

export function getAkuukanPlayerSkill4_16DrawWeightMultiplier(
  input: AkuukanPlayerSkill4_16DrawWeightInput
): number {
  if (!input.drawerIsPlayer) {
    return 1;
  }

  const equippedSkill =
    getEquippedPlayerSkill(
      input.akuukan,
      "4-16"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:4-16"
    ) ||
    !isSeatWindTile(
      input.candidate,
      input.seatWind
    )
  ) {
    return 1;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("4-16"),
      equippedSkill.level
    ).effectValues.drawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル4-16のツモ倍率が不正です。"
    );
  }

  return multiplier;
}
