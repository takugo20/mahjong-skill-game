import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_5DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly isNormalDraw: boolean;

  // この候補牌で成立する合法な和了構成に単騎待ちがあるか。
  readonly candidateHasLegalTankiWin: boolean;
}

export function getAkuukanPlayerSkill5_5DrawWeightMultiplier(
  input: AkuukanPlayerSkill5_5DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !input.isNormalDraw ||
    !input.candidateHasLegalTankiWin
  ) {
    return 1;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-5"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-5"
    )
  ) {
    return 1;
  }

  const multiplier = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-5"),
    equipped.level
  ).effectValues.winningTileDrawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル5-5の単騎和了牌ツモ倍率が不正です。"
    );
  }

  return multiplier;
}
