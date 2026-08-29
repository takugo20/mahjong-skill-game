import type {
  AkuukanEffectInstance,
  AkuukanEffectSourceId,
  AkuukanGameState,
  AkuukanMatchSetup,
  AkuukanUsageState
} from "./types";

export type AkuukanUsageScope =
  keyof AkuukanUsageState;

export interface AkuukanSourceUseResult {
  state: AkuukanGameState;
  succeeded: boolean;
}

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

export function hasAkuukanEffectInstance(
  state: AkuukanGameState,
  instanceId: string
): boolean {
  return (
    state.activeEffects.some(
      (effect) =>
        effect.instanceId === instanceId
    ) ||
    state.nextRoundEffects.some(
      (effect) =>
        effect.instanceId === instanceId
    )
  );
}

export function activateAkuukanEffect(
  state: AkuukanGameState,
  effect: AkuukanEffectInstance
): AkuukanGameState {
  if (
    hasAkuukanEffectInstance(
      state,
      effect.instanceId
    )
  ) {
    return state;
  }

  return {
    ...state,
    activeEffects: [
      ...state.activeEffects,
      { ...effect }
    ]
  };
}

export function reserveAkuukanNextRoundEffect(
  state: AkuukanGameState,
  effect: AkuukanEffectInstance
): AkuukanGameState {
  if (
    hasAkuukanEffectInstance(
      state,
      effect.instanceId
    )
  ) {
    return state;
  }

  return {
    ...state,
    nextRoundEffects: [
      ...state.nextRoundEffects,
      { ...effect }
    ]
  };
}

export function endAkuukanEffect(
  state: AkuukanGameState,
  instanceId: string
): AkuukanGameState {
  const activeEffects =
    state.activeEffects.filter(
      (effect) =>
        effect.instanceId !== instanceId
    );
  const nextRoundEffects =
    state.nextRoundEffects.filter(
      (effect) =>
        effect.instanceId !== instanceId
    );

  if (
    activeEffects.length ===
      state.activeEffects.length &&
    nextRoundEffects.length ===
      state.nextRoundEffects.length
  ) {
    return state;
  }

  return {
    ...state,
    activeEffects,
    nextRoundEffects
  };
}

export function isAkuukanSourceDisabled(
  state: AkuukanGameState,
  sourceId: AkuukanEffectSourceId
): boolean {
  return state.disabledSources.includes(
    sourceId
  );
}

export function disableAkuukanSource(
  state: AkuukanGameState,
  sourceId: AkuukanEffectSourceId
): AkuukanGameState {
  if (
    isAkuukanSourceDisabled(
      state,
      sourceId
    )
  ) {
    return state;
  }

  return {
    ...state,
    disabledSources: [
      ...state.disabledSources,
      sourceId
    ]
  };
}

export function enableAkuukanSource(
  state: AkuukanGameState,
  sourceId: AkuukanEffectSourceId
): AkuukanGameState {
  if (
    !isAkuukanSourceDisabled(
      state,
      sourceId
    )
  ) {
    return state;
  }

  return {
    ...state,
    disabledSources:
      state.disabledSources.filter(
        (disabledSourceId) =>
          disabledSourceId !== sourceId
      )
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

export function canUseAkuukanSource(
  state: AkuukanGameState,
  scope: AkuukanUsageScope,
  sourceId: AkuukanEffectSourceId
): boolean {
  return (
    !isAkuukanSourceDisabled(
      state,
      sourceId
    ) &&
    !isAkuukanSourceUsed(
      state,
      scope,
      sourceId
    )
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

export function tryUseAkuukanSource(
  state: AkuukanGameState,
  scope: AkuukanUsageScope,
  sourceId: AkuukanEffectSourceId
): AkuukanSourceUseResult {
  if (
    !canUseAkuukanSource(
      state,
      scope,
      sourceId
    )
  ) {
    return {
      state,
      succeeded: false
    };
  }

  return {
    state: markAkuukanSourceUsed(
      state,
      scope,
      sourceId
    ),
    succeeded: true
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

export function beginAkuukanRound(
  state: AkuukanGameState
): AkuukanGameState {
  const reset = resetAkuukanRoundUsage(
    state
  );

  if (reset.nextRoundEffects.length === 0) {
    return reset;
  }

  return {
    ...reset,
    activeEffects: [
      ...reset.activeEffects,
      ...reset.nextRoundEffects
    ],
    nextRoundEffects: []
  };
}
