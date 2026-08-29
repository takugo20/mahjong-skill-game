import type {
  MatchRank
} from "../mahjong/matchSettlement";
import {
  ENEMY_CATALOG
} from "./enemyCatalog";
import type {
  EnemyProgressState
} from "./enemyProgress";
import type {
  EnemyId
} from "./types";

export interface EnemyMatchProgressResult {
  readonly state: EnemyProgressState;
  readonly firstPlaceAdded: boolean;
  readonly currentFirstPlaceCount: number;
}

export interface EnemyUnlockResult {
  readonly state: EnemyProgressState;
  readonly unlockedEnemyId:
    EnemyId | null;
}

function assertEnemyIsUnlocked(
  state: EnemyProgressState,
  enemyId: EnemyId
): void {
  if (!state.enemies[enemyId].isUnlocked) {
    throw new Error(
      `未解放の敵との対局結果は記録できません: ${enemyId}`
    );
  }
}

export function recordEnemyMatchResult(
  state: EnemyProgressState,
  enemyId: EnemyId,
  finalRank: MatchRank
): EnemyMatchProgressResult {
  assertEnemyIsUnlocked(state, enemyId);

  const currentProgress =
    state.enemies[enemyId];

  if (finalRank !== 1) {
    return {
      state,
      firstPlaceAdded: false,
      currentFirstPlaceCount:
        currentProgress.firstPlaceCount
    };
  }

  const nextFirstPlaceCount =
    currentProgress.firstPlaceCount + 1;

  if (
    !Number.isSafeInteger(
      nextFirstPlaceCount
    )
  ) {
    throw new RangeError(
      "敵別1位回数が安全な整数の範囲を超えます。"
    );
  }

  return {
    state: {
      ...state,
      enemies: {
        ...state.enemies,
        [enemyId]: {
          ...currentProgress,
          firstPlaceCount:
            nextFirstPlaceCount
        }
      }
    },
    firstPlaceAdded: true,
    currentFirstPlaceCount:
      nextFirstPlaceCount
  };
}

export function unlockNextEnemyAfterMatch(
  state: EnemyProgressState,
  enemyId: EnemyId,
  finalRank: MatchRank
): EnemyUnlockResult {
  assertEnemyIsUnlocked(state, enemyId);

  if (finalRank !== 1) {
    return {
      state,
      unlockedEnemyId: null
    };
  }

  const nextEnemy = ENEMY_CATALOG.find(
    (enemy) =>
      enemy.unlockCondition
        ?.requiredEnemyId === enemyId
  );

  if (
    !nextEnemy ||
    nextEnemy.unlockCondition === null ||
    state.enemies[nextEnemy.id]
      .isUnlocked ||
    state.enemies[enemyId]
      .firstPlaceCount <
      nextEnemy.unlockCondition
        .requiredFirstPlaceCount
  ) {
    return {
      state,
      unlockedEnemyId: null
    };
  }

  return {
    state: {
      ...state,
      enemies: {
        ...state.enemies,
        [nextEnemy.id]: {
          ...state.enemies[nextEnemy.id],
          isUnlocked: true
        }
      }
    },
    unlockedEnemyId: nextEnemy.id
  };
}
