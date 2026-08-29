import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_SAVE_DATA_VERSION,
  createInitialAkuukanSaveData
} from "./saveData";
import {
  ENEMY_IDS,
  PLAYER_SKILL_IDS
} from "./types";

describe("亜空間麻雀のセーブデータ", () => {
  it("現在のセーブデータバージョンを設定する", () => {
    const saveData =
      createInitialAkuukanSaveData();

    expect(
      AKUUKAN_SAVE_DATA_VERSION
    ).toBe(1);
    expect(saveData.version).toBe(1);
  });

  it("全スキルの初期成長状態と空の装備を作成する", () => {
    const saveData =
      createInitialAkuukanSaveData();

    expect(
      Object.keys(
        saveData.playerSkillGrowth.skills
      )
    ).toEqual(PLAYER_SKILL_IDS);
    expect(
      saveData.equippedSkills
    ).toEqual([]);
  });

  it("全敵の初期解放進捗を作成する", () => {
    const saveData =
      createInitialAkuukanSaveData();
    const initiallyUnlockedEnemyIds =
      ENEMY_IDS.filter(
        (enemyId) =>
          saveData.enemyProgress.enemies[
            enemyId
          ].isUnlocked
      );

    expect(
      Object.keys(
        saveData.enemyProgress.enemies
      )
    ).toEqual(ENEMY_IDS);
    expect(
      initiallyUnlockedEnemyIds
    ).toEqual(["enemy-1"]);
    expect(
      ENEMY_IDS.every(
        (enemyId) =>
          saveData.enemyProgress.enemies[
            enemyId
          ].firstPlaceCount === 0
      )
    ).toBe(true);
  });

  it("呼び出すたびに独立したセーブデータを作成する", () => {
    const first =
      createInitialAkuukanSaveData();
    const second =
      createInitialAkuukanSaveData();

    expect(second).not.toBe(first);
    expect(
      second.playerSkillGrowth
    ).not.toBe(first.playerSkillGrowth);
    expect(
      second.equippedSkills
    ).not.toBe(first.equippedSkills);
    expect(second.enemyProgress).not.toBe(
      first.enemyProgress
    );
  });
});
