import {
  describe,
  expect,
  it
} from "vitest";
import {
  getOrderedAkuukanEffects
} from "./effects";
import type {
  AkuukanEffectDescriptor
} from "./effects";
import {
  EFFECT_PRIORITY
} from "./types";
import type {
  EffectHook,
  EffectPriority
} from "./types";

function createEffect(
  effectId: string,
  hook: EffectHook,
  priority: EffectPriority
): AkuukanEffectDescriptor {
  return {
    effectId,
    sourceId: "player-skill:1-1",
    hook,
    priority
  };
}

describe("亜空間麻雀の効果優先順位", () => {
  it("指定されたフックの効果だけを抽出する", () => {
    const effects = [
      createEffect(
        "round-setup",
        "roundSetup",
        EFFECT_PRIORITY.effectInvalidation
      ),
      createEffect(
        "after-draw",
        "afterDraw",
        EFFECT_PRIORITY.numericModification
      )
    ];

    expect(
      getOrderedAkuukanEffects(
        effects,
        "afterDraw"
      ).map((effect) => effect.effectId)
    ).toEqual(["after-draw"]);
  });

  it("仕様書どおり優先度1から7の順に並べる", () => {
    const effects = [
      createEffect(
        "priority-7",
        "afterDraw",
        EFFECT_PRIORITY.afterEvent
      ),
      createEffect(
        "priority-3",
        "afterDraw",
        EFFECT_PRIORITY.replacement
      ),
      createEffect(
        "priority-1",
        "afterDraw",
        EFFECT_PRIORITY.effectInvalidation
      ),
      createEffect(
        "priority-6",
        "afterDraw",
        EFFECT_PRIORITY.numericModification
      ),
      createEffect(
        "priority-2",
        "afterDraw",
        EFFECT_PRIORITY.eventInvalidation
      ),
      createEffect(
        "priority-5",
        "afterDraw",
        EFFECT_PRIORITY.probabilityWeight
      ),
      createEffect(
        "priority-4",
        "afterDraw",
        EFFECT_PRIORITY.forceOrRestriction
      )
    ];

    expect(
      getOrderedAkuukanEffects(
        effects,
        "afterDraw"
      ).map((effect) => effect.effectId)
    ).toEqual([
      "priority-1",
      "priority-2",
      "priority-3",
      "priority-4",
      "priority-5",
      "priority-6",
      "priority-7"
    ]);
  });

  it("同じ優先度では登録順を維持する", () => {
    const effects = [
      createEffect(
        "first",
        "afterDraw",
        EFFECT_PRIORITY.numericModification
      ),
      createEffect(
        "second",
        "afterDraw",
        EFFECT_PRIORITY.numericModification
      ),
      createEffect(
        "third",
        "afterDraw",
        EFFECT_PRIORITY.numericModification
      )
    ];

    const ordered = getOrderedAkuukanEffects(
      effects,
      "afterDraw"
    );

    expect(
      ordered.map((effect) => effect.effectId)
    ).toEqual([
      "first",
      "second",
      "third"
    ]);
    expect(
      effects.map((effect) => effect.effectId)
    ).toEqual([
      "first",
      "second",
      "third"
    ]);
    expect(ordered).not.toBe(effects);
  });
});
