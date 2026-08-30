import {
  describe,
  expect,
  it
} from "vitest";
import type {
  NormalYakuId
} from "../mahjong/yaku";
import type {
  YakumanId
} from "../mahjong/yakuman";
import {
  createAkuukanNormalYakuCandidate,
  createAkuukanYakumanCandidate,
  getAkuukanNormalYakuFinalHan,
  getAkuukanYakumanMultiplier
} from "./winningEvaluation";
import {
  AKUUKAN_NORMAL_YAKU_OVERLAP_RULES,
  AKUUKAN_YAKUMAN_OVERLAP_RULES,
  resolveAkuukanNormalYakuOverlaps,
  resolveAkuukanYakumanOverlaps
} from "./winningEvaluationOverlap";
import {
  grantAkuukanNormalYaku,
  grantAkuukanYakuman,
  invalidateAkuukanNormalYaku,
  invalidateAkuukanYakuman
} from "./winningEvaluationUpdates";

function createNormalYakuCandidate(
  id: NormalYakuId,
  standardEligible = true
) {
  return createAkuukanNormalYakuCandidate({
    id,
    name: id,
    closedHan: 1,
    standardHan:
      standardEligible ? 1 : 0,
    standardEligible
  });
}

function createYakumanCandidate(
  id: YakumanId,
  standardEligible = true
) {
  return createAkuukanYakumanCandidate({
    id,
    name: id,
    standardMultiplier: 1,
    standardEligible
  });
}

describe("亜空間麻雀の通常役重複規則", () => {
  it("仕様書どおり7組を重複なく定義する", () => {
    expect(
      AKUUKAN_NORMAL_YAKU_OVERLAP_RULES
    ).toEqual([
      {
        retainedYakuId: "doubleRiichi",
        excludedYakuId: "riichi"
      },
      {
        retainedYakuId: "rinshan",
        excludedYakuId: "haitei"
      },
      {
        retainedYakuId: "chankan",
        excludedYakuId: "houtei"
      },
      {
        retainedYakuId: "ryanpeikou",
        excludedYakuId: "iipeikou"
      },
      {
        retainedYakuId: "ryanpeikou",
        excludedYakuId: "sevenPairs"
      },
      {
        retainedYakuId: "junchan",
        excludedYakuId: "chanta"
      },
      {
        retainedYakuId: "chinitsu",
        excludedYakuId: "honitsu"
      }
    ]);

    const pairs =
      AKUUKAN_NORMAL_YAKU_OVERLAP_RULES.map(
        (rule) =>
          `${rule.retainedYakuId}:${rule.excludedYakuId}`
      );

    expect(new Set(pairs).size).toBe(7);
  });

  it("有効な上位役がある全組で下位役だけを除外する", () => {
    for (
      const rule of
        AKUUKAN_NORMAL_YAKU_OVERLAP_RULES
    ) {
      const lower = createNormalYakuCandidate(
        rule.excludedYakuId
      );
      const higher = createNormalYakuCandidate(
        rule.retainedYakuId
      );
      const original = [lower, higher];
      const resolved =
        resolveAkuukanNormalYakuOverlaps(
          original
        );

      expect(resolved).not.toBe(original);
      expect(resolved[0]).not.toBe(lower);
      expect(resolved[0]?.excludedBy).toBe(
        rule.retainedYakuId
      );
      expect(resolved[1]).toBe(higher);
      expect(lower.excludedBy).toBeNull();
      expect(
        getAkuukanNormalYakuFinalHan(
          resolved[0]!
        )
      ).toBe(0);
      expect(
        resolveAkuukanNormalYakuOverlaps(
          resolved
        )
      ).toBe(resolved);
    }
  });

  it("成立していない上位役では下位役を除外しない", () => {
    const lower = createNormalYakuCandidate(
      "iipeikou"
    );
    const higher = createNormalYakuCandidate(
      "ryanpeikou",
      false
    );
    const original = [lower, higher];
    const resolved =
      resolveAkuukanNormalYakuOverlaps(
        original
      );

    expect(resolved).toBe(original);
    expect(lower.excludedBy).toBeNull();
    expect(
      getAkuukanNormalYakuFinalHan(lower)
    ).toBe(1);
  });

  it("能力成立した上位役を採用し無効化後は下位役を復活させる", () => {
    const higher = grantAkuukanNormalYaku(
      createNormalYakuCandidate(
        "ryanpeikou",
        false
      ),
      "player-skill:2-5",
      3
    );
    const iipeikou =
      createNormalYakuCandidate(
        "iipeikou"
      );
    const sevenPairs =
      createNormalYakuCandidate(
        "sevenPairs"
      );
    const first =
      resolveAkuukanNormalYakuOverlaps([
        higher,
        iipeikou,
        sevenPairs
      ]);

    expect(first[1]?.excludedBy).toBe(
      "ryanpeikou"
    );
    expect(first[2]?.excludedBy).toBe(
      "ryanpeikou"
    );

    const invalidatedHigher =
      invalidateAkuukanNormalYaku(
        first[0]!,
        "enemy-ability:E-17"
      );
    const second =
      resolveAkuukanNormalYakuOverlaps([
        invalidatedHigher,
        first[1]!,
        first[2]!
      ]);

    expect(second[1]?.excludedBy).toBeNull();
    expect(second[2]?.excludedBy).toBeNull();
    expect(
      getAkuukanNormalYakuFinalHan(
        second[1]!
      )
    ).toBe(1);
    expect(
      getAkuukanNormalYakuFinalHan(
        second[2]!
      )
    ).toBe(1);
    expect(first[1]?.excludedBy).toBe(
      "ryanpeikou"
    );
  });
});

describe("亜空間麻雀の役満重複規則", () => {
  it("仕様書どおり4組を重複なく定義する", () => {
    expect(
      AKUUKAN_YAKUMAN_OVERLAP_RULES
    ).toEqual([
      {
        retainedYakumanId:
          "thirteenOrphansThirteenSided",
        excludedYakumanId:
          "thirteenOrphans"
      },
      {
        retainedYakumanId:
          "fourConcealedTripletsSingleWait",
        excludedYakumanId:
          "fourConcealedTriplets"
      },
      {
        retainedYakumanId:
          "bigFourWinds",
        excludedYakumanId:
          "littleFourWinds"
      },
      {
        retainedYakumanId:
          "pureNineGates",
        excludedYakumanId:
          "nineGates"
      }
    ]);

    const pairs =
      AKUUKAN_YAKUMAN_OVERLAP_RULES.map(
        (rule) =>
          `${rule.retainedYakumanId}:${rule.excludedYakumanId}`
      );

    expect(new Set(pairs).size).toBe(4);
  });

  it("有効な上位役満がある全組で下位役満だけを除外する", () => {
    for (
      const rule of
        AKUUKAN_YAKUMAN_OVERLAP_RULES
    ) {
      const lower = createYakumanCandidate(
        rule.excludedYakumanId
      );
      const higher = createYakumanCandidate(
        rule.retainedYakumanId
      );
      const original = [lower, higher];
      const resolved =
        resolveAkuukanYakumanOverlaps(
          original
        );

      expect(resolved).not.toBe(original);
      expect(resolved[0]).not.toBe(lower);
      expect(resolved[0]?.excludedBy).toBe(
        rule.retainedYakumanId
      );
      expect(resolved[1]).toBe(higher);
      expect(lower.excludedBy).toBeNull();
      expect(
        getAkuukanYakumanMultiplier(
          resolved[0]!
        )
      ).toBe(0);
      expect(
        resolveAkuukanYakumanOverlaps(
          resolved
        )
      ).toBe(resolved);
    }
  });

  it("成立していない上位役満では下位役満を除外しない", () => {
    const lower = createYakumanCandidate(
      "nineGates"
    );
    const higher = createYakumanCandidate(
      "pureNineGates",
      false
    );
    const original = [lower, higher];
    const resolved =
      resolveAkuukanYakumanOverlaps(
        original
      );

    expect(resolved).toBe(original);
    expect(lower.excludedBy).toBeNull();
    expect(
      getAkuukanYakumanMultiplier(lower)
    ).toBe(1);
  });

  it("能力成立した上位役満を採用し無効化後は下位役満を復活させる", () => {
    const higher = grantAkuukanYakuman(
      createYakumanCandidate(
        "pureNineGates",
        false
      ),
      "player-skill:3-1",
      2
    );
    const lower = createYakumanCandidate(
      "nineGates"
    );
    const first =
      resolveAkuukanYakumanOverlaps([
        higher,
        lower
      ]);

    expect(first[1]?.excludedBy).toBe(
      "pureNineGates"
    );

    const invalidatedHigher =
      invalidateAkuukanYakuman(
        first[0]!,
        "enemy-ability:E-17"
      );
    const second =
      resolveAkuukanYakumanOverlaps([
        invalidatedHigher,
        first[1]!
      ]);

    expect(second[1]?.excludedBy).toBeNull();
    expect(
      getAkuukanYakumanMultiplier(
        second[1]!
      )
    ).toBe(1);
    expect(first[1]?.excludedBy).toBe(
      "pureNineGates"
    );
  });
});
