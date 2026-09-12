import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import { startNextRound } from "../mahjong/engine";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import {
  tryStartAkuukanMatchFromSaveData
} from "./saveDataMatchStart";
import {
  saveAkuukanMatchResultToBrowser as saveResult
} from "./browserMatchResultSave";
import {
  loadAkuukanSaveDataFromBrowser
} from "./browserSaveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY
} from "./saveDataStorage";

function prepare() {
  const save = {
    ...createInitialAkuukanSaveData(),
    equippedSkills: [{
      id: "1-1" as const,
      level: 1 as const
    }]
  };

  const started = tryStartAkuukanMatchFromSaveData(
    save,
    "enemy-1",
    () => 0.5
  );

  if (!started.succeeded) {
    throw new Error("テストの対局開始に失敗しました。");
  }

  const state = started.gameState;
  state.round.phase = "roundEnd";

  state.round.players.forEach((player, index) => {
    player.score = [40000, 30000, 30100, -100][index];
  });

  return {
    save,
    state,
    finished: startNextRound(state, () => 0.5)
  };
}

function storage() {
  const values = new Map<string, string>();

  const setItem = vi.fn(
    (key: string, value: string) => {
      values.set(key, value);
    }
  );

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem
    }
  });

  return { values, setItem };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("対局結果のブラウザ保存", () => {
  it("成長と解放を保存し、読み直して復元できる", () => {
    const local = storage();
    const { save, finished } = prepare();

    const result = saveResult(save, finished);

    expect(result.status).toBe("saved");
    expect(local.setItem).toHaveBeenCalledTimes(1);

    const loaded = loadAkuukanSaveDataFromBrowser();

    expect(loaded.source).toBe("storage");
    expect(loaded.saveData).toEqual(result.saveData);
    expect(
      loaded.saveData.playerSkillGrowth.skills["1-1"].currentExp
    ).toBe(500);
  });

  it("失敗時は旧セーブを保ち、結果を保持して再試行できる", () => {
    const local = storage();
    const { save, finished } = prepare();
    const previous = JSON.stringify(save);

    local.values.set(
      AKUUKAN_SAVE_DATA_STORAGE_KEY,
      previous
    );
    local.setItem.mockImplementationOnce(() => {
      throw new Error("保存失敗");
    });

    const failed = saveResult(save, finished);

    expect(failed.status).toBe("failed");
    expect(failed.failureReason).toBe("storageWriteFailed");
    expect(
      failed.saveData.playerSkillGrowth.skills["1-1"].currentExp
    ).toBe(500);
    expect(
      local.values.get(AKUUKAN_SAVE_DATA_STORAGE_KEY)
    ).toBe(previous);

    const retried = saveResult(failed.saveData, finished);

    expect(retried.status).toBe("saved");
    expect(
      retried.saveData.playerSkillGrowth.skills["1-1"].currentExp
    ).toBe(500);
    expect(
      retried.saveData.enemyProgress.enemies["enemy-1"]
        .firstPlaceCount
    ).toBe(1);
  });

  it("対局終了前には保存しない", () => {
    const local = storage();
    const { save, state } = prepare();

    expect(
      saveResult(save, state).status
    ).toBe("notReady");
    expect(local.setItem).not.toHaveBeenCalled();
  });

  it("ブラウザ保存領域が使えなくても成長結果を返す", () => {
    vi.stubGlobal("window", undefined);

    const { save, finished } = prepare();
    const result = saveResult(save, finished);

    expect(result.status).toBe("failed");
    expect(result.failureReason).toBe("storageWriteFailed");
    expect(
      result.saveData.playerSkillGrowth.skills["1-1"].currentExp
    ).toBe(500);
  });
});
