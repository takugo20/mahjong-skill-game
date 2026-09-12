import type { GameState } from "../mahjong/types";
import type { AkuukanSaveData } from "./saveData";
import { isAkuukanSaveData } from "./saveDataValidation";

export function applyAkuukanMatchResultToSaveData(
  saveData: AkuukanSaveData,
  gameState: GameState
): AkuukanSaveData {
  const settlement = gameState.matchProgress?.settlement;

  if (
    gameState.round.phase !== "matchEnd" ||
    !gameState.matchResult ||
    !settlement
  ) {
    return saveData;
  }

  const equippedSkills = saveData.equippedSkills.map(skill => {
    const progress = settlement.growth.skills[skill.id];

    if (!progress.isUnlocked) {
      throw new Error(
        "装備スキルが解放済みではありません。"
      );
    }

    return {
      ...skill,
      level: progress.level
    };
  });

  // 経験値を再計算せず、確定済みの成長結果を反映する。
  const result: AkuukanSaveData = {
    ...saveData,
    playerSkillGrowth: settlement.growth,
    enemyProgress: settlement.enemyProgress,
    equippedSkills
  };

  if (!isAkuukanSaveData(result)) {
    throw new Error(
      "対局結果を反映したセーブデータが不正です。"
    );
  }

  return result;
}
