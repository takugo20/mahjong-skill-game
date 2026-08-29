import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import {
  loadAkuukanSaveDataFromBrowser,
  saveAkuukanSaveDataToBrowser
} from "./browserSaveData";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY
} from "./saveDataStorage";
import type {
  AkuukanSaveDataStorage
} from "./saveDataStorage";

class MemoryBrowserStorage
  implements AkuukanSaveDataStorage {
  private readonly values =
    new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function expectBrowserStorageUnavailable():
  void {
  expect(
    loadAkuukanSaveDataFromBrowser()
  ).toEqual({
    saveData:
      createInitialAkuukanSaveData(),
    source: "initial",
    failureReason: "storageReadFailed"
  });
  expect(
    saveAkuukanSaveDataToBrowser(
      createInitialAkuukanSaveData()
    )
  ).toEqual({
    succeeded: false,
    failureReason: "storageWriteFailed"
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ブラウザの亜空間麻雀セーブデータ", () => {
  it("windowが存在しない環境では安全な失敗を返す", () => {
    vi.stubGlobal("window", undefined);

    expectBrowserStorageUnavailable();
  });

  it("localStorageへ保存したデータを復元する", () => {
    const storage =
      new MemoryBrowserStorage();
    const saveData =
      createInitialAkuukanSaveData();

    vi.stubGlobal("window", {
      localStorage: storage
    });

    expect(
      saveAkuukanSaveDataToBrowser(
        saveData
      )
    ).toEqual({
      succeeded: true,
      failureReason: null
    });
    expect(
      storage.getItem(
        AKUUKAN_SAVE_DATA_STORAGE_KEY
      )
    ).toBe(JSON.stringify(saveData));
    expect(
      loadAkuukanSaveDataFromBrowser()
    ).toEqual({
      saveData,
      source: "storage",
      failureReason: null
    });
  });

  it("localStorageの取得を拒否されても安全な失敗を返す", () => {
    const browser = {};

    Object.defineProperty(
      browser,
      "localStorage",
      {
        get(): never {
          throw new Error(
            "localStorage unavailable"
          );
        }
      }
    );
    vi.stubGlobal("window", browser);

    expectBrowserStorageUnavailable();
  });
});
