import { describe, it, expect } from "vitest";
import { ENEMY_CATALOG } from "./enemyCatalog";
import { createInitialAkuukanSaveData } from "./saveData";
import { loadAkuukanSaveData, saveAkuukanSaveData } from "./saveDataStorage";
import { emptyStatistics } from "./matchStatistics";
import { unlockEligiblePlayerSkills } from "./playerSkillUnlock";
import { getPlayerSkillDefinition } from "./playerSkillCatalog";

describe("キャラクターを維持した挑戦順変更", () => {
  it("表示番号14〜16は玄晶、蝕天、翠玲になる", () => {
    expect(ENEMY_CATALOG.slice(-3).map(e => [e.catalogNumber, e.id, e.displayName]))
      .toEqual([[14, "enemy-15", "玄晶"], [15, "enemy-16", "蝕天"], [16, "enemy-14", "翠玲"]]);
  });

  it.each([0, 1, 3])("旧順序で翠玲に%s勝のセーブを失わず読み込む", wins => {
    const data = createInitialAkuukanSaveData();
    for (let n = 1; n <= 13; n++) {
      Object.assign(data.enemyProgress.enemies[("enemy-" + n) as keyof typeof data.enemyProgress.enemies],
        { isUnlocked: true, firstPlaceCount: 3 });
    }
    Object.assign(data.enemyProgress.enemies["enemy-14"], { isUnlocked: true, firstPlaceCount: wins });
    if (wins > 0) Object.assign(data.enemyProgress.enemies["enemy-15"], { isUnlocked: true });
    const withStats = { ...data, statistics: {
      "enemy-14": { ...emptyStatistics(), ranks: [wins, 2, 3, 4] as [number, number, number, number] },
      "enemy-15": { ...emptyStatistics(), ranks: [0, 5, 6, 7] as [number, number, number, number] }
    }};
    const storage = { getItem: () => JSON.stringify(withStats), setItem: () => {} };
    const loaded = loadAkuukanSaveData(storage);
    expect(loaded.source).toBe("storage");
    expect(loaded.saveData.statistics).toEqual(withStats.statistics);
    expect(loaded.saveData.enemyProgress.enemies["enemy-14"].firstPlaceCount).toBe(wins);
    expect(loaded.saveData.enemyProgress.enemies["enemy-14"].isUnlocked).toBe(true);
    expect(loaded.saveData.enemyProgress.enemies["enemy-15"].isUnlocked).toBe(true);
    expect(loaded.saveData.enemyProgress.enemies["enemy-16"].isUnlocked).toBe(false);
    expect(loaded.saveData.playerSkillGrowth.skills["3-14"].isUnlocked).toBe(wins >= 3);
    expect(saveAkuukanSaveData(storage, loaded.saveData).succeeded).toBe(true);
  });

  it.each([
    ["enemy-14-first-place-count", "3-14", "4-22"],
    ["enemy-16-first-place-count", "4-22", "3-14"]
  ] as const)("新スキル条件%sは3勝で対象スキルだけを解放する", (condition, target, other) => {
    const initial = createInitialAkuukanSaveData().playerSkillGrowth;
    expect(getPlayerSkillDefinition(target).unlockCondition?.conditionId).toBe(condition);
    for (const wins of [2, 3]) {
      const result = unlockEligiblePlayerSkills({ ...initial,
        unlockProgress: { ...initial.unlockProgress, [condition]: wins } }).state;
      expect(result.skills[target].isUnlocked).toBe(wins >= 3);
      expect(result.skills[other].isUnlocked).toBe(false);
    }
  });
});
