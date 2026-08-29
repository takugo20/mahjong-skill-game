import {
  describe,
  expect,
  it
} from "vitest";
import {
  ENEMY_CATALOG,
  getEnemyDefinition
} from "./enemyCatalog";
import {
  validateEnemyCatalog
} from "./enemyCatalogValidation";
import {
  ENEMY_IDS
} from "./types";

describe("敵図鑑", () => {
  it("全16体をID順に統合する", () => {
    expect(ENEMY_CATALOG).toHaveLength(16);
    expect(
      ENEMY_CATALOG.map(
        (enemy) => enemy.id
      )
    ).toEqual(ENEMY_IDS);
  });

  it("図鑑番号1から16を重複なく保持する", () => {
    expect(
      ENEMY_CATALOG.map(
        (enemy) => enemy.catalogNumber
      )
    ).toEqual(
      Array.from(
        { length: 16 },
        (_, index) => index + 1
      )
    );
  });

  it("統合後の図鑑全体が検証を通過する", () => {
    expect(
      validateEnemyCatalog(
        ENEMY_CATALOG
      )
    ).toEqual({
      isValid: true,
      issues: []
    });
  });

  it("IDから対応する定義を取得する", () => {
    ENEMY_IDS.forEach(
      (enemyId, index) => {
        expect(
          getEnemyDefinition(enemyId)
        ).toBe(ENEMY_CATALOG[index]);
      }
    );
  });
});
