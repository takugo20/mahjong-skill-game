import type {
  EffectHook,
  EnemyAbilityId,
  EnemyId
} from "./types";

export const ENEMY_AI_TENDENCY_LEVELS = [
  1,
  2,
  3,
  4,
  5
] as const;

export type EnemyAiTendencyLevel =
  (typeof ENEMY_AI_TENDENCY_LEVELS)[number];

export interface EnemyUnlockCondition {
  readonly requiredEnemyId: EnemyId;
  readonly requiredFirstPlaceCount: number;
  readonly description: string;
}

export interface EnemyAbilityDefinition {
  readonly id: EnemyAbilityId;
  readonly description: string;
  readonly activationHooks:
    readonly EffectHook[];
}

export interface EnemyAiTendencies {
  readonly closedHand:
    EnemyAiTendencyLevel;
  readonly calls: EnemyAiTendencyLevel;
  readonly riichi: EnemyAiTendencyLevel;
  readonly defense: EnemyAiTendencyLevel;
  readonly handValue:
    EnemyAiTendencyLevel;
}

export interface EnemyStrategyDefinition {
  readonly archetype: string;
  readonly description: string;
  readonly priorities: readonly string[];
}

export interface EnemyDefinition {
  readonly catalogNumber: number;
  readonly id: EnemyId;
  readonly displayName: string;
  readonly unlockCondition:
    EnemyUnlockCondition | null;
  readonly baseExperience: number;
  readonly abilities:
    readonly EnemyAbilityDefinition[];
  readonly aiTendencies:
    EnemyAiTendencies;
  readonly strategy:
    EnemyStrategyDefinition;
}

export function getEnemyAbilityDefinition(
  enemy: EnemyDefinition,
  abilityId: EnemyAbilityId
): EnemyAbilityDefinition {
  const ability = enemy.abilities.find(
    (candidate) =>
      candidate.id === abilityId
  );

  if (!ability) {
    throw new Error(
      `${enemy.displayName}の能力が見つかりません: ${abilityId}`
    );
  }

  return ability;
}
