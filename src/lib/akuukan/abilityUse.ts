import {
  trySpendAkuukanMp
} from "./mp";
import {
  tryUseAkuukanSource
} from "./state";
import type {
  AkuukanUsageScope
} from "./state";
import type {
  AkuukanEffectSourceId,
  AkuukanGameState
} from "./types";

export interface AkuukanAbilityUseState {
  akuukan: AkuukanGameState;
  playerMp: number;
  maxMp: number;
}

export type AkuukanAbilityUseFailureReason =
  | "invalidCost"
  | "sourceUnavailable"
  | "insufficientMp";

export interface AkuukanAbilityUseResult<
  TState extends AkuukanAbilityUseState
> {
  state: TState;
  succeeded: boolean;
  failureReason:
    AkuukanAbilityUseFailureReason | null;
}

export function tryUseAkuukanAbility<
  TState extends AkuukanAbilityUseState
>(
  state: TState,
  scope: AkuukanUsageScope,
  sourceId: AkuukanEffectSourceId,
  cost: number
): AkuukanAbilityUseResult<TState> {
  if (
    !Number.isFinite(cost) ||
    cost < 0
  ) {
    return {
      state,
      succeeded: false,
      failureReason: "invalidCost"
    };
  }

  const sourceUse = tryUseAkuukanSource(
    state.akuukan,
    scope,
    sourceId
  );

  if (!sourceUse.succeeded) {
    return {
      state,
      succeeded: false,
      failureReason: "sourceUnavailable"
    };
  }

  const mpSpend = trySpendAkuukanMp(
    state.playerMp,
    cost,
    state.maxMp
  );

  if (!mpSpend.succeeded) {
    return {
      state,
      succeeded: false,
      failureReason: "insufficientMp"
    };
  }

  return {
    state: {
      ...state,
      akuukan: sourceUse.state,
      playerMp: mpSpend.mp
    },
    succeeded: true,
    failureReason: null
  };
}
