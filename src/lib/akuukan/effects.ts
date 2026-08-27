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
