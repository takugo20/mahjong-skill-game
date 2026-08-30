import type {
  NormalYakuId
} from "../mahjong/yaku";

export const PLAYER_SKILL_IDS = [
  "1-1",
  "1-2",
  "1-3",
  "1-4",
  "1-5",
  "1-6",
  "1-7",
  "1-8",
  "1-9",
  "1-10",
  "1-11",
  "1-12",
  "1-13",
  "1-14",
  "1-15",
  "2-1",
  "2-2",
  "2-3",
  "2-4",
  "2-5",
  "2-6",
  "2-7",
  "2-8",
  "2-9",
  "2-10",
  "2-11",
  "2-12",
  "2-13",
  "2-14",
  "2-15",
  "2-16",
  "2-17",
  "2-18",
  "2-19",
  "2-20",
  "3-1",
  "3-2",
  "3-3",
  "3-4",
  "3-5",
  "3-6",
  "3-7",
  "3-8",
  "3-9",
  "3-10",
  "3-11",
  "3-12",
  "3-13",
  "3-14",
  "4-1",
  "4-2",
  "4-3",
  "4-4",
  "4-5",
  "4-6",
  "4-7",
  "4-8",
  "4-9",
  "4-10",
  "4-11",
  "4-12",
  "4-13",
  "4-14",
  "4-15",
  "4-16",
  "4-17",
  "4-18",
  "4-19",
  "4-20",
  "4-21",
  "4-22",
  "4-23",
  "5-1",
  "5-2",
  "5-3",
  "5-4",
  "5-5",
  "5-6",
  "5-7",
  "5-8"
] as const;

export type PlayerSkillId =
  (typeof PLAYER_SKILL_IDS)[number];

export type SkillLevel =
  | 1
  | 2
  | 3
  | 4
  | 5;

export const ENEMY_IDS = [
  "enemy-1",
  "enemy-2",
  "enemy-3",
  "enemy-4",
  "enemy-5",
  "enemy-6",
  "enemy-7",
  "enemy-8",
  "enemy-9",
  "enemy-10",
  "enemy-11",
  "enemy-12",
  "enemy-13",
  "enemy-14",
  "enemy-15",
  "enemy-16"
] as const;

export type EnemyId =
  (typeof ENEMY_IDS)[number];

export const ENEMY_ABILITY_IDS = [
  "E-1",
  "E-2",
  "E-3",
  "E-4",
  "E-5",
  "E-6",
  "E-7",
  "E-8",
  "E-9",
  "E-10",
  "E-11",
  "E-12",
  "E-13",
  "E-14",
  "E-15",
  "E-16",
  "E-17",
  "E-18",
  "E-19",
  "E-20",
  "E-21",
  "E-22",
  "E-23",
  "E-24",
  "E-25",
  "E-26",
  "E-27",
  "E-28",
  "E-29"
] as const;

export type EnemyAbilityId =
  (typeof ENEMY_ABILITY_IDS)[number];

export const EFFECT_HOOKS = [
  "matchSetup",
  "roundSetup",
  "doraIndicatorSelection",
  "dealComposition",
  "dealCompleted",
  "informationVisibility",
  "drawTileSelection",
  "afterDraw",
  "turnCountChange",
  "actionOpportunity",
  "riichiLegality",
  "callLegality",
  "kanLegality",
  "ronLegality",
  "afterCall",
  "discardLegality",
  "discardVisibility",
  "discardHistory",
  "afterDiscard",
  "yakuEvaluation",
  "hanFuCalculation",
  "handValueEvaluation",
  "paymentCalculation",
  "afterWin",
  "drawSettlement",
  "roundEnd",
  "matchEnd"
] as const;

export type EffectHook =
  (typeof EFFECT_HOOKS)[number];

export const EFFECT_PRIORITY = {
  effectInvalidation: 1,
  eventInvalidation: 2,
  replacement: 3,
  forceOrRestriction: 4,
  probabilityWeight: 5,
  numericModification: 6,
  afterEvent: 7
} as const;

export type EffectPriorityName =
  keyof typeof EFFECT_PRIORITY;

export type EffectPriority =
  (typeof EFFECT_PRIORITY)[
    EffectPriorityName
  ];

export interface EquippedPlayerSkill {
  id: PlayerSkillId;
  level: SkillLevel;
}

export interface AkuukanMatchSetup {
  enemyId: EnemyId;
  equippedSkills:
    EquippedPlayerSkill[];
}

export type AkuukanEffectSourceId =
  | `player-skill:${PlayerSkillId}`
  | `enemy-ability:${EnemyAbilityId}`;

export interface AkuukanEffectInstance {
  instanceId: string;
  sourceId: AkuukanEffectSourceId;
  remainingTurns: number | null;
}

export interface AkuukanUsageState {
  match: AkuukanEffectSourceId[];
  round: AkuukanEffectSourceId[];
  turn: AkuukanEffectSourceId[];
}

export interface AkuukanGameState {
  setup: AkuukanMatchSetup;
  e6LastWinningNormalYakuIds?:
    NormalYakuId[];
  disabledSources:
    AkuukanEffectSourceId[];
  activeEffects:
    AkuukanEffectInstance[];
  nextRoundEffects:
    AkuukanEffectInstance[];
  usedSources: AkuukanUsageState;
}
