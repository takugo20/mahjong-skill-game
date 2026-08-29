import {
  PLAYER_SKILL_CATALOG_GROUP_1
} from "./playerSkillCatalogGroup1";
import {
  PLAYER_SKILL_CATALOG_GROUP_2
} from "./playerSkillCatalogGroup2";
import {
  PLAYER_SKILL_CATALOG_GROUP_3
} from "./playerSkillCatalogGroup3";
import {
  PLAYER_SKILL_CATALOG_GROUP_4
} from "./playerSkillCatalogGroup4";
import {
  PLAYER_SKILL_CATALOG_GROUP_5
} from "./playerSkillCatalogGroup5";
import type {
  PlayerSkillDefinition
} from "./playerSkillCatalogTypes";
import {
  validatePlayerSkillCatalog
} from "./playerSkillCatalogValidation";
import type {
  PlayerSkillId
} from "./types";

export const PLAYER_SKILL_CATALOG = [
  ...PLAYER_SKILL_CATALOG_GROUP_1,
  ...PLAYER_SKILL_CATALOG_GROUP_2,
  ...PLAYER_SKILL_CATALOG_GROUP_3,
  ...PLAYER_SKILL_CATALOG_GROUP_4,
  ...PLAYER_SKILL_CATALOG_GROUP_5
] as const satisfies readonly PlayerSkillDefinition[];

const catalogValidation =
  validatePlayerSkillCatalog(
    PLAYER_SKILL_CATALOG
  );

if (!catalogValidation.isValid) {
  throw new Error(
    `プレイヤースキル図鑑の定義が不正です: ${JSON.stringify(
      catalogValidation.issues
    )}`
  );
}

const PLAYER_SKILL_CATALOG_BY_ID:
  ReadonlyMap<
    PlayerSkillId,
    PlayerSkillDefinition
  > = new Map(
    PLAYER_SKILL_CATALOG.map(
      (skill) => [skill.id, skill] as const
    )
  );

export function getPlayerSkillDefinition(
  skillId: PlayerSkillId
): PlayerSkillDefinition {
  const skill =
    PLAYER_SKILL_CATALOG_BY_ID.get(
      skillId
    );

  if (!skill) {
    throw new Error(
      `スキルが見つかりません: ${skillId}`
    );
  }

  return skill;
}
