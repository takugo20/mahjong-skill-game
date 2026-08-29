import type {
  AkuukanUsageState,
  EffectHook,
  PlayerSkillId,
  SkillLevel
} from "./types";

export const PLAYER_SKILL_KINDS = [
  "passive",
  "active"
] as const;

export type PlayerSkillKind =
  (typeof PLAYER_SKILL_KINDS)[number];

export const PLAYER_SKILL_LEVELS = [
  1,
  2,
  3,
  4,
  5
] as const satisfies readonly SkillLevel[];

export type PlayerSkillUsageScope =
  keyof AkuukanUsageState;

export interface PlayerSkillUnlockCondition {
  readonly conditionId: string;
  readonly description: string;
  readonly targetValue: number;
}

export type PlayerSkillEffectValues =
  Readonly<Record<string, number>>;

export interface PassivePlayerSkillLevelDefinition {
  readonly requiredExp: number;
  readonly mpCost: null;
  readonly effectValues:
    PlayerSkillEffectValues;
}

export interface ActivePlayerSkillLevelDefinition {
  readonly requiredExp: number;
  readonly mpCost: number;
  readonly effectValues:
    PlayerSkillEffectValues;
}

export type PlayerSkillLevelDefinition =
  | PassivePlayerSkillLevelDefinition
  | ActivePlayerSkillLevelDefinition;

export type PlayerSkillLevelTable<
  TLevel extends PlayerSkillLevelDefinition
> = {
  readonly [level in SkillLevel]: TLevel;
};

export interface PlayerSkillBaseDefinition<
  TLevel extends PlayerSkillLevelDefinition
> {
  readonly catalogNumber: number;
  readonly id: PlayerSkillId;
  readonly name: string;
  readonly evaluation: string;
  readonly maxLevel?: SkillLevel;
  readonly description: string;
  readonly activationHooks:
    readonly EffectHook[];
  readonly unlockCondition:
    PlayerSkillUnlockCondition | null;
  readonly levels:
    PlayerSkillLevelTable<TLevel>;
}

export interface PassivePlayerSkillDefinition
  extends PlayerSkillBaseDefinition<
    PassivePlayerSkillLevelDefinition
  > {
  readonly kind: "passive";
  readonly usageScope: null;
}

export interface ActivePlayerSkillDefinition
  extends PlayerSkillBaseDefinition<
    ActivePlayerSkillLevelDefinition
  > {
  readonly kind: "active";
  readonly usageScope: PlayerSkillUsageScope;
}

export type PlayerSkillDefinition =
  | PassivePlayerSkillDefinition
  | ActivePlayerSkillDefinition;

export function getPlayerSkillMaxLevel(
  skill: PlayerSkillDefinition
): SkillLevel {
  return skill.maxLevel ?? 5;
}

export function getPlayerSkillLevelDefinition(
  skill: PlayerSkillDefinition,
  level: SkillLevel
): PlayerSkillLevelDefinition {
  const maxLevel =
    getPlayerSkillMaxLevel(skill);

  if (level > maxLevel) {
    throw new RangeError(
      `スキル${skill.id}のレベル${level}は最大レベル${maxLevel}を超えています。`
    );
  }

  return skill.levels[level];
}
