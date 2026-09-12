import { isDora } from "../mahjong/tiles";
import type { Meld, Tile } from "../mahjong/types";
import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_3IndicatorWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly kanOwnerIsPlayer: boolean;
  readonly kanEstablished: boolean;
  readonly addsNewIndicator: boolean;
  readonly kanMeld: Meld;
  readonly candidate: Tile;
}

export function getAkuukanPlayerSkill5_3IndicatorWeightMultiplier(
  input: AkuukanPlayerSkill5_3IndicatorWeightInput
): number {
  if (
    !input.kanOwnerIsPlayer ||
    !input.kanEstablished ||
    !input.addsNewIndicator
  ) {
    return 1;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-3"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-3"
    )
  ) {
    return 1;
  }

  const meld = input.kanMeld;

  if (
    !["openKan", "closedKan", "addedKan"].includes(
      meld.kind
    ) ||
    meld.tiles.length !== 4 ||
    !meld.tiles.every(tile =>
      tile.suit === meld.tiles[0].suit &&
      tile.rank === meld.tiles[0].rank
    ) ||
    !isDora(meld.tiles[0], input.candidate)
  ) {
    return 1;
  }

  const multiplier = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-3"),
    equipped.level
  ).effectValues.kanDoraIndicatorWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル5-3の槓ドラ表示牌倍率が不正です。"
    );
  }

  return multiplier;
}
