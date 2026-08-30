import {
  getEnemyDefinition
} from "./enemyCatalog";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanEffectSourceId,
  AkuukanGameState,
  EnemyAbilityId
} from "./types";
import {
  getAkuukanNormalYakuReferenceHan
} from "./winningEvaluation";
import type {
  AkuukanNormalYakuHanAdjustment,
  AkuukanNormalYakuSourceAdjustment,
  AkuukanWinningYakuAdjustments,
  AkuukanYakumanMultiplierAdjustment,
  AkuukanYakumanSourceAdjustment
} from "./winningEvaluationAdjustments";
import type {
  AkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import {
  AKUUKAN_NORMAL_YAKU_DEFINITIONS,
  AKUUKAN_YAKUMAN_DEFINITIONS
} from "./winningEvaluationDefinitions";
import {
  getAkuukanE6LastWinningNormalYakuIds
} from "./winningEvaluationEnemyAbilityHistory";

const CLOSED_ONLY_NORMAL_YAKU =
  AKUUKAN_NORMAL_YAKU_DEFINITIONS.filter(
    (definition) =>
      definition.openHan === null
  );

const OPEN_REDUCED_NORMAL_YAKU =
  AKUUKAN_NORMAL_YAKU_DEFINITIONS.filter(
    (definition) =>
      definition.openHan !== null &&
      definition.openHan <
        definition.closedHan
  );

const CLOSED_ONLY_YAKUMAN =
  AKUUKAN_YAKUMAN_DEFINITIONS.filter(
    (definition) =>
      definition.closedOnly
  );

function getEnemyAbilitySourceId(
  abilityId: EnemyAbilityId
): AkuukanEffectSourceId {
  return `enemy-ability:${abilityId}`;
}

function isEnemyAbilityEnabled(
  state: AkuukanGameState,
  abilityId: EnemyAbilityId
): boolean {
  const enemy = getEnemyDefinition(
    state.setup.enemyId
  );
  const sourceId =
    getEnemyAbilitySourceId(abilityId);

  return (
    enemy.abilities.some(
      (ability) =>
        ability.id === abilityId
    ) &&
    !isAkuukanSourceDisabled(
      state,
      sourceId
    )
  );
}

export interface CreateAkuukanEnemyAbilityWinningYakuAdjustmentsInput {
  readonly akuukan: AkuukanGameState;
  readonly candidates:
    AkuukanWinningYakuCandidates;
  readonly winnerIsSelectedEnemy: boolean;
}

export function createAkuukanEnemyAbilityWinningYakuAdjustments(
  input:
    CreateAkuukanEnemyAbilityWinningYakuAdjustmentsInput
): AkuukanWinningYakuAdjustments {
  const normalYakuGrants:
    AkuukanNormalYakuHanAdjustment[] = [];
  const yakumanGrants:
    AkuukanYakumanMultiplierAdjustment[] =
      [];
  const normalYakuInvalidations:
    AkuukanNormalYakuSourceAdjustment[] =
      [];
  const yakumanInvalidations:
    AkuukanYakumanSourceAdjustment[] = [];
  const openReductionCancellations:
    AkuukanNormalYakuSourceAdjustment[] =
      [];
  const fixedHanChanges:
    AkuukanNormalYakuHanAdjustment[] = [];

  if (
    input.winnerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-6"
    )
  ) {
    const sourceId =
      getEnemyAbilitySourceId("E-6");
    const previousYakuIds = new Set(
      getAkuukanE6LastWinningNormalYakuIds(
        input.akuukan
      )
    );

    for (
      const candidate of
        input.candidates
          .normalYakuCandidates
    ) {
      const referenceHan =
        getAkuukanNormalYakuReferenceHan(
          candidate
        );

      if (
        previousYakuIds.has(candidate.id) &&
        referenceHan > 0
      ) {
        fixedHanChanges.push({
          yakuId: candidate.id,
          sourceId,
          han: referenceHan * 2
        });
      }
    }
  }

  if (
    input.winnerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-14"
    )
  ) {
    const sourceId =
      getEnemyAbilitySourceId("E-14");

    for (
      const definition of
        CLOSED_ONLY_NORMAL_YAKU
    ) {
      normalYakuGrants.push({
        yakuId: definition.id,
        sourceId,
        han: definition.closedHan
      });
    }

    for (
      const definition of
        CLOSED_ONLY_YAKUMAN
    ) {
      yakumanGrants.push({
        yakumanId: definition.id,
        sourceId,
        multiplier:
          definition.multiplier
      });
    }

    for (
      const definition of
        OPEN_REDUCED_NORMAL_YAKU
    ) {
      openReductionCancellations.push({
        yakuId: definition.id,
        sourceId
      });
    }
  }

  if (
    !input.winnerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-7"
    )
  ) {
    const sourceId =
      getEnemyAbilitySourceId("E-7");

    for (
      const candidate of
        input.candidates
          .normalYakuCandidates
    ) {
      if (
        getAkuukanNormalYakuReferenceHan(
          candidate
        ) >= 2
      ) {
        normalYakuInvalidations.push({
          yakuId: candidate.id,
          sourceId
        });
      }
    }

    for (
      const candidate of
        input.candidates
          .yakumanCandidates
    ) {
      yakumanInvalidations.push({
        yakumanId: candidate.id,
        sourceId
      });
    }
  }

  if (
    !input.winnerIsSelectedEnemy &&
    isEnemyAbilityEnabled(
      input.akuukan,
      "E-17"
    )
  ) {
    const sourceId =
      getEnemyAbilitySourceId("E-17");

    for (
      const candidate of
        input.candidates
          .normalYakuCandidates
    ) {
      if (
        candidate.id !== "riichi" &&
        getAkuukanNormalYakuReferenceHan(
          candidate
        ) === 1
      ) {
        normalYakuInvalidations.push({
          yakuId: candidate.id,
          sourceId
        });
      }
    }
  }

  return {
    ...(normalYakuGrants.length > 0
      ? { normalYakuGrants }
      : {}),
    ...(yakumanGrants.length > 0
      ? { yakumanGrants }
      : {}),
    ...(normalYakuInvalidations.length > 0
      ? { normalYakuInvalidations }
      : {}),
    ...(yakumanInvalidations.length > 0
      ? { yakumanInvalidations }
      : {}),
    ...(openReductionCancellations.length > 0
      ? { openReductionCancellations }
      : {}),
    ...(fixedHanChanges.length > 0
      ? { fixedHanChanges }
      : {})
  };
}
