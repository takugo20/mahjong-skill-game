import { describe, expect, it } from "vitest";
import { startNextRound } from "../mahjong/engine";
import {
  createInitialAkuukanSaveData,
  type AkuukanSaveData
} from "./saveData";
import {
  tryStartAkuukanMatchFromSaveData
} from "./saveDataMatchStart";
import {
  applyAkuukanMatchResultToSaveData as apply
} from "./saveDataMatchResult";
import { isAkuukanSaveData } from "./saveDataValidation";

function prepare() {
  const initial = createInitialAkuukanSaveData();

  const save: AkuukanSaveData = {
    ...initial,
    equippedSkills: [{ id: "1-1", level: 1 }],
    playerSkillGrowth: {
      ...initial.playerSkillGrowth,
      skills: {
        ...initial.playerSkillGrowth.skills,
        "1-1": {
          isUnlocked: true,
          level: 1,
          currentExp: 5900
        }
      }
    },
    enemyProgress: {
      enemies: {
        ...initial.enemyProgress.enemies,
        "enemy-1": {
          isUnlocked: true,
          firstPlaceCount: 2
        }
      }
    }
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

describe("対局結果のセーブデータへの反映", () => {
  it("レベル・余剰経験値・解放結果・装備レベルを反映する", () => {
    const { save, finished } = prepare();
    const before = JSON.stringify(save);
    const result = apply(save, finished);

    expect(result.playerSkillGrowth.skills["1-1"]).toEqual({
      isUnlocked: true,
      level: 2,
      currentExp: 400
    });
    expect(result.equippedSkills).toEqual([
      { id: "1-1", level: 2 }
    ]);
    expect(result.playerSkillGrowth.skills["1-5"]).toEqual({
      isUnlocked: true,
      level: 1,
      currentExp: 0
    });
    expect(
      result.enemyProgress.enemies["enemy-1"].firstPlaceCount
    ).toBe(3);
    expect(
      result.enemyProgress.enemies["enemy-2"].isUnlocked
    ).toBe(true);
    expect(isAkuukanSaveData(result)).toBe(true);
    expect(JSON.stringify(save)).toBe(before);
  });

  it("同じ結果を再反映しても経験値や回数が増えない", () => {
    const { save, finished } = prepare();
    const first = apply(save, finished);

    expect(apply(first, finished)).toEqual(first);
  });

  it("対局終了前や成長結果がない状態では変更しない", () => {
    const { save, state, finished } = prepare();

    expect(apply(save, state)).toBe(save);
    expect(
      apply(save, {
        ...finished,
        matchProgress: undefined
      })
    ).toBe(save);
  });

  it("JSONへの変換・復元後も検証に通り、次の対局へ引き継げる", () => {
    const { save, finished } = prepare();

    const restored: unknown = JSON.parse(
      JSON.stringify(apply(save, finished))
    );

    expect(isAkuukanSaveData(restored)).toBe(true);

    if (!isAkuukanSaveData(restored)) {
      throw new Error("復元に失敗しました。");
    }

    const next = tryStartAkuukanMatchFromSaveData(
      restored,
      "enemy-2",
      () => 0.5
    );

    expect(next.succeeded).toBe(true);
    expect(
      next.gameState?.akuukan?.setup.equippedSkills
    ).toEqual([{ id: "1-1", level: 2 }]);
    expect(
      next.gameState?.playerSkillDrawProgress?.growth
        .skills["1-1"].currentExp
    ).toBe(400);
    expect(
      next.gameState?.matchProgress?.settlement
    ).toBeNull();
  });
});
