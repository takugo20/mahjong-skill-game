import type {
  AkuukanSaveData
} from "./saveData";
import {
  loadAkuukanSaveData,
  saveAkuukanSaveData
} from "./saveDataStorage";
import type {
  AkuukanSaveDataLoadResult,
  AkuukanSaveDataSaveResult,
  AkuukanSaveDataStorage
} from "./saveDataStorage";

const UNAVAILABLE_BROWSER_STORAGE:
  AkuukanSaveDataStorage = {
    getItem(): string | null {
      throw new Error(
        "ブラウザの保存領域を利用できません。"
      );
    },
    setItem(): void {
      throw new Error(
        "ブラウザの保存領域を利用できません。"
      );
    }
  };

function getBrowserSaveDataStorage():
  AkuukanSaveDataStorage {
  if (typeof window === "undefined") {
    return UNAVAILABLE_BROWSER_STORAGE;
  }

  try {
    return window.localStorage;
  } catch {
    return UNAVAILABLE_BROWSER_STORAGE;
  }
}

export function loadAkuukanSaveDataFromBrowser():
  AkuukanSaveDataLoadResult {
  return loadAkuukanSaveData(
    getBrowserSaveDataStorage()
  );
}

export function saveAkuukanSaveDataToBrowser(
  saveData: AkuukanSaveData
): AkuukanSaveDataSaveResult {
  return saveAkuukanSaveData(
    getBrowserSaveDataStorage(),
    saveData
  );
}
