import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialEnemyProgressState
} from "./enemyProgress";
import {
  ENEMY_IDS
} from "./types";

describe("敵の解放進捗データ", () => {
  it("全16体の初期データを作成する", () => {
    const state =
      createInitialEnemyProgressState();

    expect(
      Object.keys(state.enemies)
    ).toEqual(ENEMY_IDS);
  });

  it("敵1だけを初期解放する", () => {
    const state =
      createInitialEnemyProgressState();
    const initiallyUnlockedEnemyIds =
      ENEMY_IDS.filter(
        (enemyId) =>
          state.enemies[enemyId]
            .isUnlocked
      );

    expect(
      initiallyUnlockedEnemyIds
    ).toEqual(["enemy-1"]);
  });

  it("全敵の1位回数を0にする", () => {
    const state =
      createInitialEnemyProgressState();

    expect(
      ENEMY_IDS.every(
        (enemyId) =>
          state.enemies[enemyId]
            .firstPlaceCount === 0
      )
    ).toBe(true);
  });

  it("呼び出すたびに独立した初期データを作成する", () => {
    const first =
      createInitialEnemyProgressState();
    const second =
      createInitialEnemyProgressState();

    expect(second).not.toBe(first);
    expect(second.enemies).not.toBe(
      first.enemies
    );
    expect(
      second.enemies["enemy-1"]
    ).not.toBe(
      first.enemies["enemy-1"]
    );
  });
});
