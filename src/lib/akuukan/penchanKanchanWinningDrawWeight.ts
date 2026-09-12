import { getEquippedPlayerSkill } from "./equipment";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";
import { getPlayerSkillLevelDefinition } from "./playerSkillCatalogTypes";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export interface AkuukanPlayerSkill5_6DrawWeightInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly isNormalDraw: boolean;

  // この候補牌で成立する合法な和了構成に
  // 辺張待ちまたは嵌張待ちがあるか。
  readonly candidateHasLegalPenchanOrKanchanWin: boolean;
}

export function getAkuukanPlayerSkill5_6DrawWeightMultiplier(
  input: AkuukanPlayerSkill5_6DrawWeightInput
): number {
  if (
    !input.drawerIsPlayer ||
    !input.isNormalDraw ||
    !input.candidateHasLegalPenchanOrKanchanWin
  ) {
    return 1;
  }

  const equipped = getEquippedPlayerSkill(
    input.akuukan,
    "5-6"
  );

  if (
    !equipped ||
    isAkuukanSourceDisabled(
      input.akuukan,
      "player-skill:5-6"
    )
  ) {
    return 1;
  }

  const multiplier = getPlayerSkillLevelDefinition(
    getPlayerSkillDefinition("5-6"),
    equipped.level
  ).effectValues.winningTileDrawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル5-6の辺張・嵌張和了牌ツモ倍率が不正です。"
    );
  }

  return multiplier;
}
