import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_7DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly isRinshanDraw: boolean;
  readonly tenpaiBeforeDraw: boolean;
  readonly candidateHasLegalTsumoWin: boolean;
}

export function getAkuukanPlayerSkill5_7DrawWeightMultiplier(
  input: AkuukanPlayerSkill5_7DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !input.isRinshanDraw ||
    !input.tenpaiBeforeDraw ||
    !input.candidateHasLegalTsumoWin
  ) {
    return 1;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-7"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-7"
    )
  ) {
    return 1;
  }

  const multiplier = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-7"),
    equipped.level
  ).effectValues.rinshanWinningTileWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル5-7の嶺上和了牌ツモ倍率が不正です。"
    );
  }

  return multiplier;
}
