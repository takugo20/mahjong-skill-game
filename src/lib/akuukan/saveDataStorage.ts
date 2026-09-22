import {
  createInitialAkuukanSaveData
} from "./saveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  isAkuukanSaveData
} from "./saveDataValidation";
import { ENEMY_CATALOG } from "./enemyCatalog";
import { unlockEligiblePlayerSkills } from "./playerSkillUnlock";

function reconcileChallengeUnlocks(data: AkuukanSaveData): AkuukanSaveData {
  const enemies = { ...data.enemyProgress.enemies };
  for (const enemy of ENEMY_CATALOG) {
    if (enemy.catalogNumber < 14) continue;
    const condition = enemy.unlockCondition;
    if (!enemies[enemy.id].isUnlocked && condition &&
        enemies[condition.requiredEnemyId].firstPlaceCount >= condition.requiredFirstPlaceCount) {
      enemies[enemy.id] = { ...enemies[enemy.id], isUnlocked: true };
    }
  }
  // Skill progress IDs also remain attached to their original character.
  const unlockProgress = { ...data.playerSkillGrowth.unlockProgress };
  for (const id of ["enemy-14", "enemy-16"] as const) {
    const conditionId = `${id}-first-place-count` as const;
    unlockProgress[conditionId] = Math.max(unlockProgress[conditionId], enemies[id].firstPlaceCount);
  }
  const growth = unlockEligiblePlayerSkills({ ...data.playerSkillGrowth, unlockProgress }).state;
  return { ...data, enemyProgress: { enemies }, playerSkillGrowth: growth };
}

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
    saveData: reconcileChallengeUnlocks(parsed),
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
