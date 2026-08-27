import {
  describe,
  expect,
  it
} from "vitest";
import {
  getOrderedAkuukanEffects,
  runAkuukanEffects
} from "./effects";
import type {
  AkuukanEffectDescriptor,
  AkuukanEffectHandler
} from "./effects";
import {
  EFFECT_PRIORITY
} from "./types";
import type {
  AkuukanEffectSourceId,
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

interface TestEffectContext {
  log: string[];
  disabledSources:
    AkuukanEffectSourceId[];
}

function createHandler(
  effectId: string,
  sourceId: AkuukanEffectSourceId,
  hook: EffectHook,
  priority: EffectPriority,
  apply: (
    context: TestEffectContext
  ) => TestEffectContext
): AkuukanEffectHandler<TestEffectContext> {
  return {
    effectId,
    sourceId,
    hook,
    priority,
    apply
  };
}

describe("亜空間麻雀の効果実行", () => {
  it("優先順位どおりに状態を受け渡す", () => {
    const initialContext: TestEffectContext = {
      log: [],
      disabledSources: []
    };
    const effects = [
      createHandler(
        "after-event",
        "player-skill:1-2",
        "afterDraw",
        EFFECT_PRIORITY.afterEvent,
        (context) => ({
          ...context,
          log: [
            ...context.log,
            "after-event"
          ]
        })
      ),
      createHandler(
        "other-hook",
        "player-skill:1-3",
        "roundSetup",
        EFFECT_PRIORITY.effectInvalidation,
        (context) => ({
          ...context,
          log: [
            ...context.log,
            "other-hook"
          ]
        })
      ),
      createHandler(
        "replacement",
        "player-skill:1-1",
        "afterDraw",
        EFFECT_PRIORITY.replacement,
        (context) => ({
          ...context,
          log: [
            ...context.log,
            "replacement"
          ]
        })
      )
    ];

    const result = runAkuukanEffects(
      initialContext,
      effects,
      "afterDraw"
    );

    expect(result.log).toEqual([
      "replacement",
      "after-event"
    ]);
    expect(initialContext.log).toEqual([]);
  });

  it("各効果の直前に有効性を再判定する", () => {
    const blockedSource:
      AkuukanEffectSourceId =
      "enemy-ability:E-1";
    const effects = [
      createHandler(
        "disable-enemy",
        "player-skill:3-5",
        "afterDraw",
        EFFECT_PRIORITY.effectInvalidation,
        (context) => ({
          ...context,
          log: [
            ...context.log,
            "disable-enemy"
          ],
          disabledSources: [
            ...context.disabledSources,
            blockedSource
          ]
        })
      ),
      createHandler(
        "blocked-effect",
        blockedSource,
        "afterDraw",
        EFFECT_PRIORITY.numericModification,
        (context) => ({
          ...context,
          log: [
            ...context.log,
            "blocked-effect"
          ]
        })
      ),
      createHandler(
        "allowed-effect",
        "player-skill:1-1",
        "afterDraw",
        EFFECT_PRIORITY.numericModification,
        (context) => ({
          ...context,
          log: [
            ...context.log,
            "allowed-effect"
          ]
        })
      )
    ];

    const result = runAkuukanEffects(
      {
        log: [],
        disabledSources: []
      },
      effects,
      "afterDraw",
      (effect, context) =>
        !context.disabledSources.includes(
          effect.sourceId
        )
    );

    expect(result.log).toEqual([
      "disable-enemy",
      "allowed-effect"
    ]);
  });
});
