import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import {
  tryStartAkuukanMatchFromBrowserSaveData
} from "./browserMatchStart";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY
} from "./saveDataStorage";
import type {
  AkuukanSaveDataStorage
} from "./saveDataStorage";

class MemoryBrowserStorage
  implements AkuukanSaveDataStorage {
  value: string | null;
  shouldFailRead = false;
  lastReadKey: string | null = null;

  constructor(value: string | null = null) {
    this.value = value;
  }

  getItem(key: string): string | null {
    this.lastReadKey = key;

    if (this.shouldFailRead) {
      throw new Error("read failed");
    }

    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}

function useBrowserStorage(
  storage: AkuukanSaveDataStorage
): void {
  vi.stubGlobal("window", {
    localStorage: storage
  });
}

function createProgressedSaveData():
  AkuukanSaveData {
  const initial =
    createInitialAkuukanSaveData();

  return {
    ...initial,
    playerSkillGrowth: {
      ...initial.playerSkillGrowth,
      skills: {
        ...initial.playerSkillGrowth.skills,
        "1-1": {
          isUnlocked: true,
          level: 3,
          currentExp: 500
        }
      }
    },
    equippedSkills: [
      {
        id: "1-1",
        level: 3
      }
    ]
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ブラウザ保存からの亜空間対局開始", () => {
  it("保存がなければ初期データで開始する", () => {
    useBrowserStorage(
      new MemoryBrowserStorage()
    );

    const result =
      tryStartAkuukanMatchFromBrowserSaveData(
        "enemy-1",
        () => 0.5
      );

    expect(result.succeeded).toBe(true);

    if (!result.succeeded) {
      throw new Error(
        "初期データで対局を開始できませんでした。"
      );
    }

    expect(result.saveDataSource).toBe(
      "initial"
    );
    expect(result.saveData).toEqual(
      createInitialAkuukanSaveData()
    );
    expect(
      result.gameState.akuukan?.setup
    ).toEqual({
      enemyId: "enemy-1",
      equippedSkills: []
    });
  });

  it("保存済みの成長状態と最新レベルで開始する", () => {
    const saveData =
      createProgressedSaveData();
    const storage =
      new MemoryBrowserStorage(
        JSON.stringify(saveData)
      );

    useBrowserStorage(storage);

    const result =
      tryStartAkuukanMatchFromBrowserSaveData(
        "enemy-1",
        () => 0.5
      );

    expect(result.succeeded).toBe(true);

    if (!result.succeeded) {
      throw new Error(
        "保存データで対局を開始できませんでした。"
      );
    }

    expect(result.saveDataSource).toBe(
      "storage"
    );
    expect(result.saveData).toEqual(saveData);
    expect(
      result.gameState.akuukan?.setup
    ).toEqual({
      enemyId: "enemy-1",
      equippedSkills: [
        {
          id: "1-1",
          level: 3
        }
      ]
    });
    expect(result.gameState.playerMp).toBe(
      420
    );
  });

  it("壊れたJSONでは対局を開始しない", () => {
    useBrowserStorage(
      new MemoryBrowserStorage("{")
    );
    let randomCallCount = 0;

    const result =
      tryStartAkuukanMatchFromBrowserSaveData(
        "enemy-1",
        () => {
          randomCallCount += 1;
          return 0.5;
        }
      );

    expect(result).toEqual({
      gameState: null,
      saveData: null,
      saveDataSource: null,
      succeeded: false,
      failureStage: "saveDataLoad",
      failureReason: "invalidJson"
    });
    expect(randomCallCount).toBe(0);
  });

  it("現在の形式でない保存データでは開始しない", () => {
    const invalid = {
      ...createInitialAkuukanSaveData(),
      version: 2
    };

    useBrowserStorage(
      new MemoryBrowserStorage(
        JSON.stringify(invalid)
      )
    );

    const result =
      tryStartAkuukanMatchFromBrowserSaveData(
        "enemy-1",
        () => 0.5
      );

    expect(result).toEqual({
      gameState: null,
      saveData: null,
      saveDataSource: null,
      succeeded: false,
      failureStage: "saveDataLoad",
      failureReason: "invalidData"
    });
  });

  it("保存領域を読み取れなければ開始しない", () => {
    const storage =
      new MemoryBrowserStorage();
    storage.shouldFailRead = true;
    useBrowserStorage(storage);

    const result =
      tryStartAkuukanMatchFromBrowserSaveData(
        "enemy-1",
        () => 0.5
      );

    expect(result).toEqual({
      gameState: null,
      saveData: null,
      saveDataSource: null,
      succeeded: false,
      failureStage: "saveDataLoad",
      failureReason: "storageReadFailed"
    });
  });

  it("未解放敵では保存データを保持して開始しない", () => {
    const saveData =
      createInitialAkuukanSaveData();
    const storage =
      new MemoryBrowserStorage(
        JSON.stringify(saveData)
      );

    useBrowserStorage(storage);
    let randomCallCount = 0;

    const result =
      tryStartAkuukanMatchFromBrowserSaveData(
        "enemy-2",
        () => {
          randomCallCount += 1;
          return 0.5;
        }
      );

    expect(result).toEqual({
      gameState: null,
      saveData,
      saveDataSource: "storage",
      succeeded: false,
      failureStage: "matchSetup",
      failureReason: "enemyLocked"
    });
    expect(randomCallCount).toBe(0);
    expect(storage.value).toBe(
      JSON.stringify(saveData)
    );
    expect(storage.lastReadKey).toBe(
      AKUUKAN_SAVE_DATA_STORAGE_KEY
    );
  });
});
