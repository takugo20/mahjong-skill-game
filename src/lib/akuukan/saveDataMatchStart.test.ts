import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  tryStartAkuukanMatchFromSaveData
} from "./saveDataMatchStart";

function createLeveledEquippedSaveData():
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
          level: 4,
          currentExp: 0
        }
      }
    },
    equippedSkills: [
      {
        id: "1-1",
        level: 1
      }
    ]
  };
}

describe("セーブデータからの亜空間対局開始", () => {
  it("検証済み設定で初期ゲーム状態を作成する", () => {
    const saveData =
      createLeveledEquippedSaveData();
    let randomCallCount = 0;

    const result =
      tryStartAkuukanMatchFromSaveData(
        saveData,
        "enemy-1",
        () => {
          randomCallCount += 1;
          return 0.5;
        }
      );

    expect(result.succeeded).toBe(true);

    if (!result.succeeded) {
      throw new Error(
        "亜空間対局を開始できませんでした。"
      );
    }

    expect(result.failureReason).toBeNull();
    expect(result.gameState.akuukan).toEqual({
      setup: {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-1",
            level: 4
          }
        ]
      },
      disabledSources: [],
      activeEffects: [],
      nextRoundEffects: [],
      usedSources: {
        match: [],
        round: [],
        turn: []
      }
    });
    expect(result.gameState.playerMp).toBe(
      420
    );
    expect(result.gameState.maxMp).toBe(
      900
    );
    expect(
      result.gameState.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([14, 13, 13, 13]);
    expect(
      result.gameState.round.liveWall
    ).toHaveLength(69);
    expect(
      result.gameState.round.deadWall
    ).toHaveLength(14);
    expect(randomCallCount).toBeGreaterThan(
      0
    );
    expect(
      saveData.equippedSkills[0].level
    ).toBe(1);
  });

  it("同じ固定乱数から同じ初期状態を再現する", () => {
    const saveData =
      createInitialAkuukanSaveData();
    const first =
      tryStartAkuukanMatchFromSaveData(
        saveData,
        "enemy-1",
        () => 0.75
      );
    const second =
      tryStartAkuukanMatchFromSaveData(
        saveData,
        "enemy-1",
        () => 0.75
      );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(true);

    if (
      !first.succeeded ||
      !second.succeeded
    ) {
      throw new Error(
        "固定乱数の対局を開始できませんでした。"
      );
    }

    expect(second.gameState).toEqual(
      first.gameState
    );
    expect(second.gameState).not.toBe(
      first.gameState
    );
  });

  it("未解放の敵では牌山を生成しない", () => {
    const saveData =
      createInitialAkuukanSaveData();
    let randomCallCount = 0;

    const result =
      tryStartAkuukanMatchFromSaveData(
        saveData,
        "enemy-2",
        () => {
          randomCallCount += 1;
          return 0.5;
        }
      );

    expect(result).toEqual({
      gameState: null,
      succeeded: false,
      failureReason: "enemyLocked"
    });
    expect(randomCallCount).toBe(0);
  });

  it("未解放スキルがあれば牌山を生成しない", () => {
    const initial =
      createInitialAkuukanSaveData();
    const saveData: AkuukanSaveData = {
      ...initial,
      equippedSkills: [
        {
          id: "2-1",
          level: 1
        }
      ]
    };
    let randomCallCount = 0;

    const result =
      tryStartAkuukanMatchFromSaveData(
        saveData,
        "enemy-1",
        () => {
          randomCallCount += 1;
          return 0.5;
        }
      );

    expect(result).toEqual({
      gameState: null,
      succeeded: false,
      failureReason: "skillLocked"
    });
    expect(randomCallCount).toBe(0);
  });
});
