import type {
  AkuukanEffectSourceId,
  AkuukanGameState,
  AkuukanMatchSetup,
  AkuukanUsageState
} from "./types";

export type AkuukanUsageScope =
  keyof AkuukanUsageState;

export function createInitialAkuukanGameState(
  setup: AkuukanMatchSetup
): AkuukanGameState {
  return {
    setup: {
      enemyId: setup.enemyId,
      equippedSkills:
        setup.equippedSkills.map(
          ({ id, level }) => ({
            id,
            level
          })
        )
    },
    disabledSources: [],
    activeEffects: [],
    nextRoundEffects: [],
    usedSources: {
      match: [],
      round: [],
      turn: []
    }
  };
}

export function isAkuukanSourceUsed(
  state: AkuukanGameState,
  scope: AkuukanUsageScope,
  sourceId: AkuukanEffectSourceId
): boolean {
  return state.usedSources[scope].includes(
    sourceId
  );
}

export function markAkuukanSourceUsed(
  state: AkuukanGameState,
  scope: AkuukanUsageScope,
  sourceId: AkuukanEffectSourceId
): AkuukanGameState {
  if (
    isAkuukanSourceUsed(
      state,
      scope,
      sourceId
    )
  ) {
    return state;
  }

  return {
    ...state,
    usedSources: {
      ...state.usedSources,
      [scope]: [
        ...state.usedSources[scope],
        sourceId
      ]
    }
  };
}

export function resetAkuukanTurnUsage(
  state: AkuukanGameState
): AkuukanGameState {
  if (state.usedSources.turn.length === 0) {
    return state;
  }

  return {
    ...state,
    usedSources: {
      ...state.usedSources,
      turn: []
    }
  };
}

export function advanceAkuukanTurnEffects(
  state: AkuukanGameState
): AkuukanGameState {
  let changed = false;

  const activeEffects =
    state.activeEffects.flatMap((effect) => {
      if (effect.remainingTurns === null) {
        return [effect];
      }

      changed = true;

      if (effect.remainingTurns <= 1) {
        return [];
      }

      return [
        {
          ...effect,
          remainingTurns:
            effect.remainingTurns - 1
        }
      ];
    });

  if (!changed) {
    return state;
  }

  return {
    ...state,
    activeEffects
  };
}

export function beginAkuukanTurn(
  state: AkuukanGameState
): AkuukanGameState {
  return advanceAkuukanTurnEffects(
    resetAkuukanTurnUsage(state)
  );
}

export function resetAkuukanRoundUsage(
  state: AkuukanGameState
): AkuukanGameState {
  if (
    state.usedSources.round.length === 0 &&
    state.usedSources.turn.length === 0
  ) {
    return state;
  }

  return {
    ...state,
    usedSources: {
      ...state.usedSources,
      round: [],
      turn: []
    }
  };
}
