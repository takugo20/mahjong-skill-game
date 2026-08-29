import {
  createInitialEnemyProgressState
} from "./enemyProgress";
import type {
  EnemyProgressState
} from "./enemyProgress";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import type {
  PlayerSkillGrowthState
} from "./playerSkillProgress";
import type {
  EquippedPlayerSkill
} from "./types";

export const AKUUKAN_SAVE_DATA_VERSION =
  1 as const;

export interface AkuukanSaveData {
  readonly version:
    typeof AKUUKAN_SAVE_DATA_VERSION;
  readonly playerSkillGrowth:
    PlayerSkillGrowthState;
  readonly equippedSkills:
    readonly EquippedPlayerSkill[];
  readonly enemyProgress:
    EnemyProgressState;
}

export function createInitialAkuukanSaveData():
  AkuukanSaveData {
  return {
    version: AKUUKAN_SAVE_DATA_VERSION,
    playerSkillGrowth:
      createInitialPlayerSkillGrowthState(),
    equippedSkills: [],
    enemyProgress:
      createInitialEnemyProgressState()
  };
}
