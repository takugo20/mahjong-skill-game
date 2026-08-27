import type {
  AkuukanEffectSourceId,
  EffectHook,
  EffectPriority
} from "./types";

export interface AkuukanEffectDescriptor {
  effectId: string;
  sourceId: AkuukanEffectSourceId;
  hook: EffectHook;
  priority: EffectPriority;
}

export interface AkuukanEffectHandler<TContext>
  extends AkuukanEffectDescriptor {
  apply: (context: TContext) => TContext;
}

export type AkuukanEffectEligibility<TContext> = (
  effect: AkuukanEffectHandler<TContext>,
  context: TContext
) => boolean;

export function getOrderedAkuukanEffects<
  TEffect extends AkuukanEffectDescriptor
>(
  effects: readonly TEffect[],
  hook: EffectHook
): TEffect[] {
  return effects
    .map((effect, index) => ({
      effect,
      index
    }))
    .filter(
      ({ effect }) => effect.hook === hook
    )
    .sort(
      (left, right) =>
        left.effect.priority -
          right.effect.priority ||
        left.index - right.index
    )
    .map(({ effect }) => effect);
}

export function runAkuukanEffects<TContext>(
  context: TContext,
  effects: readonly AkuukanEffectHandler<TContext>[],
  hook: EffectHook,
  canApply: AkuukanEffectEligibility<TContext> =
    () => true
): TContext {
  let currentContext = context;

  for (
    const effect of getOrderedAkuukanEffects(
      effects,
      hook
    )
  ) {
    if (!canApply(effect, currentContext)) {
      continue;
    }

    currentContext = effect.apply(
      currentContext
    );
  }

  return currentContext;
}
