import type {
  YakumanContext
} from "../mahjong/yakuman";
import {
  applyAkuukanWinningYakuAdjustments
} from "./winningEvaluationAdjustments";
import type {
  AkuukanWinningYakuAdjustments
} from "./winningEvaluationAdjustments";
import {
  createAkuukanEnemyAbilityWinningYakuAdjustments
} from "./winningEvaluationEnemyAbilityAdjustments";
import type {
  AkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import {
  createAkuukanWinningYakuCandidatesFromContext
} from "./winningEvaluationExtraction";
import {
  createAkuukanPlayerSkillWinningYakuAdjustments
} from "./winningEvaluationPlayerSkillAdjustments";
import {
  resolveAkuukanWinningYaku
} from "./winningEvaluationResolution";
import type {
  AkuukanWinningYakuResolution
} from "./winningEvaluationResolution";
import type {
  AkuukanGameState
} from "./types";

function resolveAkuukanWinningYakuCandidatesWithAdjustments(
  candidates:
    AkuukanWinningYakuCandidates,
  adjustments?:
    AkuukanWinningYakuAdjustments
): AkuukanWinningYakuResolution {
  const adjustedCandidates = adjustments
    ? applyAkuukanWinningYakuAdjustments(
        candidates,
        adjustments
      )
    : candidates;

  return resolveAkuukanWinningYaku(
    adjustedCandidates
  );
}

function mergeAkuukanWinningYakuAdjustments(
  first:
    AkuukanWinningYakuAdjustments,
  second:
    AkuukanWinningYakuAdjustments
): AkuukanWinningYakuAdjustments {
  return {
    normalYakuGrants: [
      ...(first.normalYakuGrants ?? []),
      ...(second.normalYakuGrants ?? [])
    ],
    yakumanGrants: [
      ...(first.yakumanGrants ?? []),
      ...(second.yakumanGrants ?? [])
    ],
    normalYakuInvalidations: [
      ...(first.normalYakuInvalidations ??
        []),
      ...(second.normalYakuInvalidations ??
        [])
    ],
    yakumanInvalidations: [
      ...(first.yakumanInvalidations ?? []),
      ...(second.yakumanInvalidations ?? [])
    ],
    openReductionCancellations: [
      ...(first.openReductionCancellations ??
        []),
      ...(second.openReductionCancellations ??
        [])
    ],
    fixedHanChanges: [
      ...(first.fixedHanChanges ?? []),
      ...(second.fixedHanChanges ?? [])
    ],
    hanAdditions: [
      ...(first.hanAdditions ?? []),
      ...(second.hanAdditions ?? [])
    ]
  };
}

interface ResolveAkuukanWinningYakuWithGameEffectsInput {
  readonly context: YakumanContext;
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
  readonly playerSkillAdjustments:
    AkuukanWinningYakuAdjustments;
}

function resolveAkuukanWinningYakuWithGameEffects(
  input:
    ResolveAkuukanWinningYakuWithGameEffectsInput
): AkuukanWinningYakuResolution {
  const candidates =
    createAkuukanWinningYakuCandidatesFromContext(
      input.context
    );
  const candidatesAfterPlayerGrants =
    applyAkuukanWinningYakuAdjustments(
      candidates,
      {
        normalYakuGrants:
          input.playerSkillAdjustments
            .normalYakuGrants ?? [],
        yakumanGrants:
          input.playerSkillAdjustments
            .yakumanGrants ?? []
      }
    );
  const enemyAbilityAdjustments =
    createAkuukanEnemyAbilityWinningYakuAdjustments(
      {
        akuukan: input.akuukan,
        candidates:
          candidatesAfterPlayerGrants,
        winnerIsSelectedEnemy:
          input.winnerIsSelectedEnemy
      }
    );

  return resolveAkuukanWinningYakuCandidatesWithAdjustments(
    candidates,
    mergeAkuukanWinningYakuAdjustments(
      input.playerSkillAdjustments,
      enemyAbilityAdjustments
    )
  );
}

export interface ResolveAkuukanWinningYakuWithAdjustmentsInput {
  readonly context: YakumanContext;
  readonly adjustments?:
    AkuukanWinningYakuAdjustments;
}

export function resolveAkuukanWinningYakuWithAdjustments(
  input:
    ResolveAkuukanWinningYakuWithAdjustmentsInput
): AkuukanWinningYakuResolution {
  const candidates =
    createAkuukanWinningYakuCandidatesFromContext(
      input.context
    );
  return resolveAkuukanWinningYakuCandidatesWithAdjustments(
    candidates,
    input.adjustments
  );
}

export interface ResolveAkuukanPlayerWinningYakuInput {
  readonly context: YakumanContext;
  readonly akuukan: AkuukanGameState;
}

export function resolveAkuukanPlayerWinningYaku(
  input:
    ResolveAkuukanPlayerWinningYakuInput
): AkuukanWinningYakuResolution {
  return resolveAkuukanWinningYakuWithGameEffects({
    context: input.context,
    akuukan: input.akuukan,
    winnerIsSelectedEnemy: false,
    playerSkillAdjustments:
      createAkuukanPlayerSkillWinningYakuAdjustments(
        input.akuukan
      )
  });
}

export interface ResolveAkuukanOpponentWinningYakuInput {
  readonly context: YakumanContext;
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
}

export function resolveAkuukanOpponentWinningYaku(
  input:
    ResolveAkuukanOpponentWinningYakuInput
): AkuukanWinningYakuResolution {
  return resolveAkuukanWinningYakuWithGameEffects({
    context: input.context,
    akuukan: input.akuukan,
    winnerIsSelectedEnemy:
      input.winnerIsSelectedEnemy,
    playerSkillAdjustments: {}
  });
}

export function resolveAkuukanStandardWinningYaku(
  context: YakumanContext
): AkuukanWinningYakuResolution {
  return resolveAkuukanWinningYakuWithAdjustments({
    context
  });
}
