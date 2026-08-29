import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY,
  loadAkuukanSaveData,
  saveAkuukanSaveData
} from "./saveDataStorage";
import type {
  AkuukanSaveDataStorage
} from "./saveDataStorage";

class MemorySaveDataStorage
  implements AkuukanSaveDataStorage {
  value: string | null;
  lastReadKey: string | null = null;
  lastWrittenKey: string | null = null;

  constructor(value: string | null = null) {
    this.value = value;
  }

  getItem(key: string): string | null {
    this.lastReadKey = key;
    return this.value;
  }

  setItem(key: string, value: string): void {
    this.lastWrittenKey = key;
    this.value = value;
  }
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
          level: 2,
          currentExp: 100
        }
      }
    },
    equippedSkills: [
      {
        id: "1-1",
        level: 2
      }
    ],
    enemyProgress: {
      enemies: {
        ...initial.enemyProgress.enemies,
        "enemy-1": {
          isUnlocked: true,
          firstPlaceCount: 3
        }
      }
    }
  };
}

function expectInitialLoadResult(
  result: ReturnType<
    typeof loadAkuukanSaveData
  >,
  failureReason:
    ReturnType<
      typeof loadAkuukanSaveData
    >["failureReason"]
): void {
  expect(result).toEqual({
    saveData:
      createInitialAkuukanSaveData(),
    source: "initial",
    failureReason
  });
}

describe("亜空間麻雀のセーブデータ読み込み", () => {
  it("保存データがなければ独立した初期データを返す", () => {
    const storage =
      new MemorySaveDataStorage();
    const first =
      loadAkuukanSaveData(storage);
    const second =
      loadAkuukanSaveData(storage);

    expectInitialLoadResult(first, null);
    expectInitialLoadResult(second, null);
    expect(storage.lastReadKey).toBe(
      AKUUKAN_SAVE_DATA_STORAGE_KEY
    );
    expect(second.saveData).not.toBe(
      first.saveData
    );
  });

  it("保存した成長データを同じ内容で復元する", () => {
    const storage =
      new MemorySaveDataStorage();
    const saveData =
      createProgressedSaveData();

    expect(
      saveAkuukanSaveData(
        storage,
        saveData
      )
    ).toEqual({
      succeeded: true,
      failureReason: null
    });
    expect(storage.lastWrittenKey).toBe(
      AKUUKAN_SAVE_DATA_STORAGE_KEY
    );
    expect(
      loadAkuukanSaveData(storage)
    ).toEqual({
      saveData,
      source: "storage",
      failureReason: null
    });
  });

  it("壊れたJSONなら初期データへ戻す", () => {
    const storage =
      new MemorySaveDataStorage("{");

    expectInitialLoadResult(
      loadAkuukanSaveData(storage),
      "invalidJson"
    );
  });

  it("JSONでも現在の形式でなければ初期データへ戻す", () => {
    const invalid = {
      ...createInitialAkuukanSaveData(),
      version: 2
    };
    const storage =
      new MemorySaveDataStorage(
        JSON.stringify(invalid)
      );

    expectInitialLoadResult(
      loadAkuukanSaveData(storage),
      "invalidData"
    );
  });

  it("保存領域を読み取れなくても初期データへ戻す", () => {
    const storage:
      AkuukanSaveDataStorage = {
        getItem(): string | null {
          throw new Error("read failed");
        },
        setItem(): void {}
      };

    expectInitialLoadResult(
      loadAkuukanSaveData(storage),
      "storageReadFailed"
    );
  });
});

describe("亜空間麻雀のセーブデータ保存", () => {
  it("不正なデータを書き込まない", () => {
    const storage =
      new MemorySaveDataStorage();
    const invalid = {
      ...createInitialAkuukanSaveData(),
      version: 2
    } as unknown as AkuukanSaveData;

    expect(
      saveAkuukanSaveData(
        storage,
        invalid
      )
    ).toEqual({
      succeeded: false,
      failureReason: "invalidData"
    });
    expect(storage.value).toBeNull();
    expect(storage.lastWrittenKey).toBeNull();
  });

  it("JSON変換に失敗した場合は書き込まない", () => {
    const storage =
      new MemorySaveDataStorage();
    const stringifySpy = vi
      .spyOn(JSON, "stringify")
      .mockImplementationOnce(() => {
        throw new Error(
          "serialization failed"
        );
      });

    const result = saveAkuukanSaveData(
      storage,
      createInitialAkuukanSaveData()
    );

    stringifySpy.mockRestore();
    expect(result).toEqual({
      succeeded: false,
      failureReason:
        "serializationFailed"
    });
    expect(storage.lastWrittenKey).toBeNull();
  });

  it("保存領域へ書き込めない場合は失敗を返す", () => {
    const storage:
      AkuukanSaveDataStorage = {
        getItem(): string | null {
          return null;
        },
        setItem(): void {
          throw new Error("write failed");
        }
      };

    expect(
      saveAkuukanSaveData(
        storage,
        createInitialAkuukanSaveData()
      )
    ).toEqual({
      succeeded: false,
      failureReason: "storageWriteFailed"
    });
  });
});
