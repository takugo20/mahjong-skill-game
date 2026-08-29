import {
  ENEMY_CATALOG
} from "./enemyCatalog";
import type {
  EnemyId
} from "./types";

export interface EnemyProgress {
  readonly isUnlocked: boolean;
  readonly firstPlaceCount: number;
}

export type EnemyProgressById = {
  readonly [enemyId in EnemyId]:
    EnemyProgress;
};

export interface EnemyProgressState {
  readonly enemies: EnemyProgressById;
}

export function createInitialEnemyProgressState():
  EnemyProgressState {
  const enemyEntries =
    ENEMY_CATALOG.map((enemy) => {
      const progress: EnemyProgress = {
        isUnlocked:
          enemy.unlockCondition === null,
        firstPlaceCount: 0
      };

      return [enemy.id, progress] as const;
    });

  return {
    enemies: Object.fromEntries(
      enemyEntries
    ) as EnemyProgressById
  };
}
