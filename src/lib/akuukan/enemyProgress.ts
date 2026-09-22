import {
  getEnemyDefinition
} from "./enemyCatalog";
import { ENEMY_IDS } from "./types";
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
    ENEMY_IDS.map((id) => {
      const enemy = getEnemyDefinition(id);
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
