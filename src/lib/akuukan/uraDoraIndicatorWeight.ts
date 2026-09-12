import { isDora } from "../mahjong/tiles";
import type { Meld, Tile } from "../mahjong/types";
import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_2IndicatorWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsPlayer: boolean;
  readonly riichiEstablished: boolean;
  readonly hand: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly candidate: Tile;
}

export function getAkuukanPlayerSkill5_2IndicatorWeightMultiplier(
  input: AkuukanPlayerSkill5_2IndicatorWeightInput
): number {
  if (!input.winnerIsPlayer || !input.riichiEstablished) {
    return 1;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-2"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-2"
    )
  ) {
    return 1;
  }

  const hasMatchingDora =
    input.hand.some((tile) =>
      isDora(tile, input.candidate)
    ) ||
    input.melds.some((meld) =>
      meld.tiles.some((tile) =>
        isDora(tile, input.candidate)
      )
    );

  if (!hasMatchingDora) {
    return 1;
  }

  const multiplier = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-2"),
    equipped.level
  ).effectValues.uraDoraIndicatorWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル5-2の裏ドラ表示牌倍率が不正です。"
    );
  }

  return multiplier;
}
