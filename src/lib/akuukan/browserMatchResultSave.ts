import type { GameState } from "../mahjong/types";
import type { AkuukanSaveData } from "./saveData";
import type {
  AkuukanSaveDataSaveFailureReason
} from "./saveDataStorage";
import {
  applyAkuukanMatchResultToSaveData
} from "./saveDataMatchResult";
import {
  saveAkuukanSaveDataToBrowser
} from "./browserSaveData";

export type AkuukanBrowserMatchResultSave =
  | {
      readonly status: "notReady" | "saved";
      readonly saveData: AkuukanSaveData;
      readonly failureReason: null;
    }
  | {
      readonly status: "failed";
      // 保存失敗時も画面側で保持し、再試行できる。
      readonly saveData: AkuukanSaveData;
      readonly failureReason: AkuukanSaveDataSaveFailureReason;
    };

export function saveAkuukanMatchResultToBrowser(
  saveData: AkuukanSaveData,
  gameState: GameState
): AkuukanBrowserMatchResultSave {
  let updated: AkuukanSaveData;

  try {
    updated = applyAkuukanMatchResultToSaveData(
      saveData,
      gameState
    );
  } catch {
    return {
      status: "failed",
      saveData,
      failureReason: "invalidData"
    };
  }

  if (updated === saveData) {
    return {
      status: "notReady",
      saveData,
      failureReason: null
    };
  }

  const result = saveAkuukanSaveDataToBrowser(updated);

  if (!result.succeeded) {
    return {
      status: "failed",
      saveData: updated,
      failureReason: result.failureReason
    };
  }

  return {
    status: "saved",
    saveData: updated,
    failureReason: null
  };
}
