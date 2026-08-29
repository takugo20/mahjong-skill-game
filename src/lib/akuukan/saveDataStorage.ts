import {
  createInitialAkuukanSaveData
} from "./saveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  isAkuukanSaveData
} from "./saveDataValidation";

export const AKUUKAN_SAVE_DATA_STORAGE_KEY =
  "mahjong-skill-game:akuukan-save-data";

export interface AkuukanSaveDataStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type AkuukanSaveDataLoadFailureReason =
  | "storageReadFailed"
  | "invalidJson"
  | "invalidData";

export type AkuukanSaveDataLoadResult =
  | {
      readonly saveData: AkuukanSaveData;
      readonly source: "storage";
      readonly failureReason: null;
    }
  | {
      readonly saveData: AkuukanSaveData;
      readonly source: "initial";
      readonly failureReason:
        AkuukanSaveDataLoadFailureReason | null;
    };

export type AkuukanSaveDataSaveFailureReason =
  | "invalidData"
  | "serializationFailed"
  | "storageWriteFailed";

export type AkuukanSaveDataSaveResult =
  | {
      readonly succeeded: true;
      readonly failureReason: null;
    }
  | {
      readonly succeeded: false;
      readonly failureReason:
        AkuukanSaveDataSaveFailureReason;
    };

function createInitialLoadResult(
  failureReason:
    AkuukanSaveDataLoadFailureReason | null
): AkuukanSaveDataLoadResult {
  return {
    saveData:
      createInitialAkuukanSaveData(),
    source: "initial",
    failureReason
  };
}

export function loadAkuukanSaveData(
  storage: AkuukanSaveDataStorage
): AkuukanSaveDataLoadResult {
  let serialized: string | null;

  try {
    serialized = storage.getItem(
      AKUUKAN_SAVE_DATA_STORAGE_KEY
    );
  } catch {
    return createInitialLoadResult(
      "storageReadFailed"
    );
  }

  if (serialized === null) {
    return createInitialLoadResult(null);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized);
  } catch {
    return createInitialLoadResult(
      "invalidJson"
    );
  }

  if (!isAkuukanSaveData(parsed)) {
    return createInitialLoadResult(
      "invalidData"
    );
  }

  return {
    saveData: parsed,
    source: "storage",
    failureReason: null
  };
}

export function saveAkuukanSaveData(
  storage: AkuukanSaveDataStorage,
  saveData: AkuukanSaveData
): AkuukanSaveDataSaveResult {
  if (!isAkuukanSaveData(saveData)) {
    return {
      succeeded: false,
      failureReason: "invalidData"
    };
  }

  let serialized: string;

  try {
    serialized = JSON.stringify(saveData);
  } catch {
    return {
      succeeded: false,
      failureReason:
        "serializationFailed"
    };
  }

  try {
    storage.setItem(
      AKUUKAN_SAVE_DATA_STORAGE_KEY,
      serialized
    );
  } catch {
    return {
      succeeded: false,
      failureReason: "storageWriteFailed"
    };
  }

  return {
    succeeded: true,
    failureReason: null
  };
}
