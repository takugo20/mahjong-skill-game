import type {
  GameState
} from "../mahjong/types";
import {
  loadAkuukanSaveDataFromBrowser
} from "./browserSaveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  tryStartAkuukanMatchFromSaveData
} from "./saveDataMatchStart";
import type {
  AkuukanSaveDataLoadFailureReason,
  AkuukanSaveDataLoadResult
} from "./saveDataStorage";
import type {
  AkuukanSaveDataMatchSetupFailureReason
} from "./saveDataMatchSetup";
import type {
  EnemyId
} from "./types";

export type AkuukanBrowserSaveDataSource =
  AkuukanSaveDataLoadResult["source"];

export type AkuukanBrowserMatchStartResult =
  | {
      readonly gameState: GameState;
      readonly saveData: AkuukanSaveData;
      readonly saveDataSource:
        AkuukanBrowserSaveDataSource;
      readonly succeeded: true;
      readonly failureStage: null;
      readonly failureReason: null;
    }
  | {
      readonly gameState: null;
      readonly saveData: null;
      readonly saveDataSource: null;
      readonly succeeded: false;
      readonly failureStage:
        "saveDataLoad";
      readonly failureReason:
        AkuukanSaveDataLoadFailureReason;
    }
  | {
      readonly gameState: null;
      readonly saveData: AkuukanSaveData;
      readonly saveDataSource:
        AkuukanBrowserSaveDataSource;
      readonly succeeded: false;
      readonly failureStage: "matchSetup";
      readonly failureReason:
        AkuukanSaveDataMatchSetupFailureReason;
    };

export function tryStartAkuukanMatchFromBrowserSaveData(
  enemyId: EnemyId,
  random: () => number = Math.random
): AkuukanBrowserMatchStartResult {
  const loadResult =
    loadAkuukanSaveDataFromBrowser();

  if (loadResult.failureReason !== null) {
    return {
      gameState: null,
      saveData: null,
      saveDataSource: null,
      succeeded: false,
      failureStage: "saveDataLoad",
      failureReason:
        loadResult.failureReason
    };
  }

  const startResult =
    tryStartAkuukanMatchFromSaveData(
      loadResult.saveData,
      enemyId,
      random
    );

  if (!startResult.succeeded) {
    return {
      gameState: null,
      saveData: loadResult.saveData,
      saveDataSource: loadResult.source,
      succeeded: false,
      failureStage: "matchSetup",
      failureReason:
        startResult.failureReason
    };
  }

  return {
    gameState: startResult.gameState,
    saveData: loadResult.saveData,
    saveDataSource: loadResult.source,
    succeeded: true,
    failureStage: null,
    failureReason: null
  };
}
