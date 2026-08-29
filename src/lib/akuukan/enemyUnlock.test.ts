import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialEnemyProgressState
} from "./enemyProgress";
import type {
  EnemyProgressState
} from "./enemyProgress";
import {
  recordEnemyMatchResult,
  unlockNextEnemyAfterMatch
} from "./enemyUnlock";

describe("敵別1位回数の記録", () => {
  it("1位なら対戦した敵の回数だけを加算する", () => {
    const initial =
      createInitialEnemyProgressState();
    const result = recordEnemyMatchResult(
      initial,
      "enemy-1",
      1
    );

    expect(result).toMatchObject({
      firstPlaceAdded: true,
      currentFirstPlaceCount: 1
    });
    expect(result.state).not.toBe(initial);
    expect(
      result.state.enemies["enemy-1"]
        .firstPlaceCount
    ).toBe(1);
    expect(
      result.state.enemies["enemy-2"]
        .firstPlaceCount
    ).toBe(0);
    expect(
      initial.enemies["enemy-1"]
        .firstPlaceCount
    ).toBe(0);
  });

  it("2位から4位なら回数を加算しない", () => {
    const initial =
      createInitialEnemyProgressState();

    for (const rank of [2, 3, 4] as const) {
      const result =
        recordEnemyMatchResult(
          initial,
          "enemy-1",
          rank
        );

      expect(result).toEqual({
        state: initial,
        firstPlaceAdded: false,
        currentFirstPlaceCount: 0
      });
    }
  });

  it("未解放の敵との対局結果を拒否する", () => {
    const initial =
      createInitialEnemyProgressState();

    expect(() =>
      recordEnemyMatchResult(
        initial,
        "enemy-2",
        1
      )
    ).toThrow(
      "未解放の敵との対局結果は記録できません"
    );
    expect(() =>
      unlockNextEnemyAfterMatch(
        initial,
        "enemy-2",
        1
      )
    ).toThrow(
      "未解放の敵との対局結果は記録できません"
    );
  });

  it("安全な整数を超える1位回数を拒否する", () => {
    const initial =
      createInitialEnemyProgressState();
    const atLimit: EnemyProgressState = {
      ...initial,
      enemies: {
        ...initial.enemies,
        "enemy-1": {
          ...initial.enemies["enemy-1"],
          firstPlaceCount:
            Number.MAX_SAFE_INTEGER
        }
      }
    };

    expect(() =>
      recordEnemyMatchResult(
        atLimit,
        "enemy-1",
        1
      )
    ).toThrow(RangeError);
  });
});

describe("敵の解放", () => {
  it("必要回数未満では次の敵を解放しない", () => {
    let state =
      createInitialEnemyProgressState();

    for (let count = 0; count < 2; count += 1) {
      state = recordEnemyMatchResult(
        state,
        "enemy-1",
        1
      ).state;
    }

    const result =
      unlockNextEnemyAfterMatch(
        state,
        "enemy-1",
        1
      );

    expect(result).toEqual({
      state,
      unlockedEnemyId: null
    });
    expect(
      result.state.enemies["enemy-2"]
        .isUnlocked
    ).toBe(false);
  });

  it("必要回数達成時に直接次の敵だけを解放する", () => {
    const initial =
      createInitialEnemyProgressState();
    const prepared: EnemyProgressState = {
      ...initial,
      enemies: {
        ...initial.enemies,
        "enemy-1": {
          ...initial.enemies["enemy-1"],
          firstPlaceCount: 3
        },
        "enemy-2": {
          ...initial.enemies["enemy-2"],
          firstPlaceCount: 3
        }
      }
    };
    const result =
      unlockNextEnemyAfterMatch(
        prepared,
        "enemy-1",
        1
      );

    expect(result.unlockedEnemyId).toBe(
      "enemy-2"
    );
    expect(
      result.state.enemies["enemy-2"]
        .isUnlocked
    ).toBe(true);
    expect(
      result.state.enemies["enemy-3"]
        .isUnlocked
    ).toBe(false);

    const repeated =
      unlockNextEnemyAfterMatch(
        result.state,
        "enemy-1",
        1
      );

    expect(repeated).toEqual({
      state: result.state,
      unlockedEnemyId: null
    });
  });

  it("1位以外では条件達成済みでも解放しない", () => {
    const initial =
      createInitialEnemyProgressState();
    const prepared: EnemyProgressState = {
      ...initial,
      enemies: {
        ...initial.enemies,
        "enemy-1": {
          ...initial.enemies["enemy-1"],
          firstPlaceCount: 3
        }
      }
    };
    const result =
      unlockNextEnemyAfterMatch(
        prepared,
        "enemy-1",
        2
      );

    expect(result).toEqual({
      state: prepared,
      unlockedEnemyId: null
    });
  });

  it("敵15と敵16をそれぞれ1勝で順番に解放する", () => {
    const initial =
      createInitialEnemyProgressState();
    const enemy14Ready: EnemyProgressState = {
      ...initial,
      enemies: {
        ...initial.enemies,
        "enemy-14": {
          ...initial.enemies["enemy-14"],
          isUnlocked: true
        }
      }
    };
    const recorded14 =
      recordEnemyMatchResult(
        enemy14Ready,
        "enemy-14",
        1
      );
    const unlocked15 =
      unlockNextEnemyAfterMatch(
        recorded14.state,
        "enemy-14",
        1
      );

    expect(unlocked15.unlockedEnemyId).toBe(
      "enemy-15"
    );

    const recorded15 =
      recordEnemyMatchResult(
        unlocked15.state,
        "enemy-15",
        1
      );
    const unlocked16 =
      unlockNextEnemyAfterMatch(
        recorded15.state,
        "enemy-15",
        1
      );

    expect(unlocked16.unlockedEnemyId).toBe(
      "enemy-16"
    );
    expect(
      unlocked16.state.enemies["enemy-16"]
        .isUnlocked
    ).toBe(true);
  });
});
