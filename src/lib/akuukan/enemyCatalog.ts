import {
  ENEMY_CATALOG_GROUP_1
} from "./enemyCatalogGroup1";
import {
  ENEMY_CATALOG_GROUP_2
} from "./enemyCatalogGroup2";
import {
  ENEMY_CATALOG_GROUP_3
} from "./enemyCatalogGroup3";
import {
  ENEMY_CATALOG_GROUP_4
} from "./enemyCatalogGroup4";
import type {
  EnemyDefinition
} from "./enemyCatalogTypes";
import {
  validateEnemyCatalog
} from "./enemyCatalogValidation";
import type {
  EnemyId
} from "./types";

export const ENEMY_CATALOG = [
  ...ENEMY_CATALOG_GROUP_1,
  ...ENEMY_CATALOG_GROUP_2,
  ...ENEMY_CATALOG_GROUP_3,
  ...ENEMY_CATALOG_GROUP_4
] as const satisfies readonly EnemyDefinition[];

const catalogValidation =
  validateEnemyCatalog(ENEMY_CATALOG);

if (!catalogValidation.isValid) {
  throw new Error(
    `敵図鑑の定義が不正です: ${JSON.stringify(
      catalogValidation.issues
    )}`
  );
}

const ENEMY_CATALOG_BY_ID:
  ReadonlyMap<
    EnemyId,
    EnemyDefinition
  > = new Map(
    ENEMY_CATALOG.map(
      (enemy) => [enemy.id, enemy] as const
    )
  );

export function getEnemyDefinition(
  enemyId: EnemyId
): EnemyDefinition {
  const enemy =
    ENEMY_CATALOG_BY_ID.get(enemyId);

  if (!enemy) {
    throw new Error(
      `敵が見つかりません: ${enemyId}`
    );
  }

  return enemy;
}
