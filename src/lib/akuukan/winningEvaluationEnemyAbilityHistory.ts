import type {
  NormalYakuId
} from "../mahjong/yaku";
import {
  getEnemyDefinition
} from "./enemyCatalog";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";
import type {
  AkuukanWinningYakuResolution
} from "./winningEvaluationResolution";

const E6_SOURCE_ID =
  "enemy-ability:E-6" as const;

export function isAkuukanE6Enabled(
  state: AkuukanGameState
): boolean {
  const enemy = getEnemyDefinition(
    state.setup.enemyId
  );

  return (
    enemy.abilities.some(
      (ability) => ability.id === "E-6"
    ) &&
    !isAkuukanSourceDisabled(
      state,
      E6_SOURCE_ID
    )
  );
}

export function getAkuukanE6LastWinningNormalYakuIds(
  state: AkuukanGameState
): readonly NormalYakuId[] {
  return (
    state.e6LastWinningNormalYakuIds ?? []
  );
}

function uniqueNormalYakuIds(
  yakuIds: readonly NormalYakuId[]
): NormalYakuId[] {
  return [...new Set(yakuIds)];
}

function areSameNormalYakuIds(
  first: readonly NormalYakuId[],
  second: readonly NormalYakuId[]
): boolean {
  return (
    first.length === second.length &&
    first.every(
      (yakuId, index) =>
        yakuId === second[index]
    )
  );
}

export interface RecordAkuukanE6WinningYakuInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
  readonly normalYakuIds:
    readonly NormalYakuId[];
}

export function recordAkuukanE6WinningYaku(
  input:
    RecordAkuukanE6WinningYakuInput
): AkuukanGameState {
  if (
    !input.winnerIsSelectedEnemy ||
    !isAkuukanE6Enabled(input.akuukan)
  ) {
    return input.akuukan;
  }

  const nextYakuIds = uniqueNormalYakuIds(
    input.normalYakuIds
  );
  const currentYakuIds =
    getAkuukanE6LastWinningNormalYakuIds(
      input.akuukan
    );

  if (
    areSameNormalYakuIds(
      currentYakuIds,
      nextYakuIds
    )
  ) {
    return input.akuukan;
  }

  return {
    ...input.akuukan,
    e6LastWinningNormalYakuIds:
      nextYakuIds
  };
}

export interface RecordAkuukanE6WinningYakuAfterWinInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
  readonly winIsValid: boolean;
  readonly resolution:
    AkuukanWinningYakuResolution;
}

export function recordAkuukanE6WinningYakuAfterWin(
  input:
    RecordAkuukanE6WinningYakuAfterWinInput
): AkuukanGameState {
  if (
    !input.winIsValid ||
    !input.resolution.hasValidYaku
  ) {
    return input.akuukan;
  }

  return recordAkuukanE6WinningYaku({
    akuukan: input.akuukan,
    winnerIsSelectedEnemy:
      input.winnerIsSelectedEnemy,
    normalYakuIds:
      input.resolution
        .activeNormalYakuCandidates.map(
          (candidate) => candidate.id
        )
  });
}

export interface ClearAkuukanE6WinningYakuAfterNagashiManganInput {
  readonly akuukan: AkuukanGameState;
  readonly winnerIsSelectedEnemy: boolean;
}

export function clearAkuukanE6WinningYakuAfterNagashiMangan(
  input:
    ClearAkuukanE6WinningYakuAfterNagashiManganInput
): AkuukanGameState {
  return recordAkuukanE6WinningYaku({
    akuukan: input.akuukan,
    winnerIsSelectedEnemy:
      input.winnerIsSelectedEnemy,
    normalYakuIds: []
  });
}
