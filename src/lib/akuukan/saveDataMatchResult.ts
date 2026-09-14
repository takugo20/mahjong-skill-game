import type { GameState } from "../mahjong/types";
import type { AkuukanSaveData } from "./saveData";
import { isAkuukanSaveData } from "./saveDataValidation";
import { completedStatistics } from "./matchStatistics";

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

  const equippedSkills = saveData.equippedSkills.map(
    skill => {
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
    }
  );

  const statistics = completedStatistics(gameState);

  const result: AkuukanSaveData = {
    ...saveData,
    ...(
      statistics && gameState.matchProgress
        ? {
            statistics: {
              ...saveData.statistics,
              [gameState.matchProgress.initialSetup.enemyId]:
                statistics
            }
          }
        : {}
    ),
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
