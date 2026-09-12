import {
  createAkuukanGameMatchProgress
} from "./gameMatchProgress";
import {
  createPlayerSkillMatchDrawProgress
} from "./playerSkillMatchDrawProgress";
import {
  createInitialGameState
} from "../mahjong/engine";
import type {
  GameState
} from "../mahjong/types";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  tryCreateAkuukanMatchSetupFromSaveData
} from "./saveDataMatchSetup";
import type {
  AkuukanSaveDataMatchSetupFailureReason
} from "./saveDataMatchSetup";
import type {
  EnemyId
} from "./types";

export type AkuukanSaveDataMatchStartResult =
  | {
      readonly gameState: GameState;
      readonly succeeded: true;
      readonly failureReason: null;
    }
  | {
      readonly gameState: null;
      readonly succeeded: false;
      readonly failureReason:
        AkuukanSaveDataMatchSetupFailureReason;
    };

export function tryStartAkuukanMatchFromSaveData(
  saveData: AkuukanSaveData,
  enemyId: EnemyId,
  random: () => number = Math.random
): AkuukanSaveDataMatchStartResult {
  const setupResult =
    tryCreateAkuukanMatchSetupFromSaveData(
      saveData,
      enemyId
    );

  if (!setupResult.succeeded) {
    return {
      gameState: null,
      succeeded: false,
      failureReason:
        setupResult.failureReason
    };
  }

  return {
    gameState: {
      ...createInitialGameState(
        random,
        setupResult.setup
      ),
      matchProgress: createAkuukanGameMatchProgress(
        setupResult.setup,
        saveData.enemyProgress
      ),      
      roundSequence: 1,
      playerSkillDrawProgress: createPlayerSkillMatchDrawProgress(
        saveData.playerSkillGrowth
      )
    },
    succeeded: true,
    failureReason: null
  };
}
