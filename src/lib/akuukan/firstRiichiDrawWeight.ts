import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_1DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly riichiEstablished: boolean;
  readonly isFirstNormalDrawAfterRiichi: boolean;
  readonly normalIppatsuAvailable: boolean;
  readonly candidateIsWinningTile: boolean;
}

export function getAkuukanPlayerSkill5_1DrawWeightMultiplier(
  input: AkuukanPlayerSkill5_1DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !input.riichiEstablished ||
    !input.isFirstNormalDrawAfterRiichi ||
    !input.normalIppatsuAvailable ||
    !input.candidateIsWinningTile
  ) {
    return 1;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-1"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-1"
    )
  ) {
    return 1;
  }

  const multiplier = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-1"),
    equipped.level
  ).effectValues.winningTileDrawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error("スキル5-1の和了牌ツモ倍率が不正です。");
  }

  return multiplier;
}
