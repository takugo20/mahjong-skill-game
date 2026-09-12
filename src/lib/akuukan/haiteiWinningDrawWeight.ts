import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_8DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly isNormalLiveWallDraw: boolean;
  readonly isLastLiveWallTile: boolean;
  readonly tenpaiBeforeDraw: boolean;
  readonly candidateHasLegalTsumoWin: boolean;
}

export function getAkuukanPlayerSkill5_8DrawWeightMultiplier(
  input: AkuukanPlayerSkill5_8DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !input.isNormalLiveWallDraw ||
    !input.isLastLiveWallTile ||
    !input.tenpaiBeforeDraw ||
    !input.candidateHasLegalTsumoWin
  ) {
    return 1;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-8"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-8"
    )
  ) {
    return 1;
  }

  const multiplier = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-8"),
    equipped.level
  ).effectValues.haiteiWinningTileWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル5-8の海底和了牌ツモ倍率が不正です。"
    );
  }

  return multiplier;
}
