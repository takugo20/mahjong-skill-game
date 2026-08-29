import {
  ENEMY_CATALOG
} from "./enemyCatalog";
import type {
  EnemyProgressState
} from "./enemyProgress";
import {
  PLAYER_SKILL_CATALOG,
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  PLAYER_SKILL_LEVELS,
  getPlayerSkillLevelDefinition,
  getPlayerSkillMaxLevel
} from "./playerSkillCatalogTypes";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  AKUUKAN_MAX_EQUIPPED_SKILLS
} from "./setupValidation";
import {
  AKUUKAN_SAVE_DATA_VERSION
} from "./saveData";
import type {
  AkuukanSaveData
} from "./saveData";
import {
  ENEMY_IDS,
  PLAYER_SKILL_IDS
} from "./types";
import type {
  EquippedPlayerSkill,
  PlayerSkillId,
  SkillLevel
} from "./types";

type UnknownRecord =
  Record<string, unknown>;

const PLAYER_SKILL_UNLOCK_CONDITION_IDS = [
  ...new Set(
    PLAYER_SKILL_CATALOG.flatMap(
      (skill) =>
        skill.unlockCondition === null
          ? []
          : [
              skill.unlockCondition
                .conditionId
            ]
    )
  )
];

function isRecord(
  value: unknown
): value is UnknownRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasExactKeys(
  value: UnknownRecord,
  expectedKeys: readonly string[]
): boolean {
  const actualKeys = Object.keys(value);

  return (
    actualKeys.length ===
      expectedKeys.length &&
    expectedKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(
        value,
        key
      )
    )
  );
}

function isNonNegativeSafeInteger(
  value: unknown
): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0
  );
}

function isPlayerSkillId(
  value: unknown
): value is PlayerSkillId {
  return (
    typeof value === "string" &&
    PLAYER_SKILL_IDS.includes(
      value as PlayerSkillId
    )
  );
}

function isSkillLevel(
  value: unknown
): value is SkillLevel {
  return (
    typeof value === "number" &&
    PLAYER_SKILL_LEVELS.includes(
      value as SkillLevel
    )
  );
}

function isPlayerSkillProgress(
  value: unknown,
  skillId: PlayerSkillId
): boolean {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "isUnlocked",
      "level",
      "currentExp"
    ])
  ) {
    return false;
  }

  const skill =
    getPlayerSkillDefinition(skillId);

  if (value.isUnlocked === false) {
    return (
      skill.unlockCondition !== null &&
      value.level === null &&
      value.currentExp === 0
    );
  }

  if (
    value.isUnlocked !== true ||
    !isSkillLevel(value.level) ||
    !isNonNegativeSafeInteger(
      value.currentExp
    )
  ) {
    return false;
  }

  const maximumLevel =
    getPlayerSkillMaxLevel(skill);

  if (value.level > maximumLevel) {
    return false;
  }

  if (value.level === maximumLevel) {
    return value.currentExp === 0;
  }

  const requiredExperience =
    getPlayerSkillLevelDefinition(
      skill,
      value.level
    ).requiredExp;

  return (
    value.currentExp < requiredExperience
  );
}

function isPlayerSkillGrowthState(
  value: unknown
): value is PlayerSkillGrowthState {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "skills",
      "unlockProgress"
    ])
  ) {
    return false;
  }

  const skills = value.skills;
  const unlockProgress =
    value.unlockProgress;

  if (
    !isRecord(skills) ||
    !hasExactKeys(
      skills,
      PLAYER_SKILL_IDS
    ) ||
    !PLAYER_SKILL_IDS.every((skillId) =>
      isPlayerSkillProgress(
        skills[skillId],
        skillId
      )
    ) ||
    !isRecord(unlockProgress) ||
    !hasExactKeys(
      unlockProgress,
      PLAYER_SKILL_UNLOCK_CONDITION_IDS
    )
  ) {
    return false;
  }

  return PLAYER_SKILL_UNLOCK_CONDITION_IDS
    .every((conditionId) =>
      isNonNegativeSafeInteger(
        unlockProgress[conditionId]
      )
    );
}

function isEquippedPlayerSkills(
  value: unknown,
  growthState: PlayerSkillGrowthState
): value is EquippedPlayerSkill[] {
  if (
    !Array.isArray(value) ||
    value.length >
      AKUUKAN_MAX_EQUIPPED_SKILLS
  ) {
    return false;
  }

  const equippedSkillIds =
    new Set<PlayerSkillId>();

  for (const equippedSkill of value) {
    if (
      !isRecord(equippedSkill) ||
      !hasExactKeys(equippedSkill, [
        "id",
        "level"
      ]) ||
      !isPlayerSkillId(equippedSkill.id) ||
      !isSkillLevel(equippedSkill.level) ||
      equippedSkillIds.has(equippedSkill.id)
    ) {
      return false;
    }

    const progress =
      growthState.skills[equippedSkill.id];

    if (
      !progress.isUnlocked ||
      progress.level !== equippedSkill.level
    ) {
      return false;
    }

    equippedSkillIds.add(equippedSkill.id);
  }

  return true;
}

function isEnemyProgressState(
  value: unknown
): value is EnemyProgressState {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["enemies"]) ||
    !isRecord(value.enemies) ||
    !hasExactKeys(value.enemies, ENEMY_IDS)
  ) {
    return false;
  }

  for (const enemyId of ENEMY_IDS) {
    const progress =
      value.enemies[enemyId];

    if (
      !isRecord(progress) ||
      !hasExactKeys(progress, [
        "isUnlocked",
        "firstPlaceCount"
      ]) ||
      typeof progress.isUnlocked !==
        "boolean" ||
      !isNonNegativeSafeInteger(
        progress.firstPlaceCount
      )
    ) {
      return false;
    }
  }

  const progressById =
    value.enemies as unknown as
      EnemyProgressState["enemies"];

  for (const enemy of ENEMY_CATALOG) {
    const progress =
      progressById[enemy.id];

    if (!progress.isUnlocked) {
      if (
        enemy.unlockCondition === null ||
        progress.firstPlaceCount !== 0
      ) {
        return false;
      }

      continue;
    }

    if (
      enemy.unlockCondition !== null &&
      progressById[
        enemy.unlockCondition.requiredEnemyId
      ].firstPlaceCount <
        enemy.unlockCondition
          .requiredFirstPlaceCount
    ) {
      return false;
    }
  }

  return true;
}

export function isAkuukanSaveData(
  value: unknown
): value is AkuukanSaveData {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "version",
      "playerSkillGrowth",
      "equippedSkills",
      "enemyProgress"
    ]) ||
    value.version !==
      AKUUKAN_SAVE_DATA_VERSION ||
    !isPlayerSkillGrowthState(
      value.playerSkillGrowth
    ) ||
    !isEquippedPlayerSkills(
      value.equippedSkills,
      value.playerSkillGrowth
    ) ||
    !isEnemyProgressState(
      value.enemyProgress
    )
  ) {
    return false;
  }

  return true;
}
