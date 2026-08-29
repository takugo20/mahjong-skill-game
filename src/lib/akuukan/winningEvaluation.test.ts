import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_WINNING_EVALUATION_STAGES,
  createAkuukanNormalYakuCandidate,
  createAkuukanYakumanCandidate,
  getAkuukanNormalYakuFinalHan,
  getAkuukanNormalYakuReferenceHan,
  getAkuukanYakumanMultiplier,
  isAkuukanNormalYakuCandidateActive,
  isAkuukanYakumanCandidateActive
} from "./winningEvaluation";

function createOpenSanshokuCandidate() {
  return createAkuukanNormalYakuCandidate({
    id: "sanshokuDoujun",
    name: "三色同順",
    closedHan: 2,
    standardHan: 1,
    standardEligible: true
  });
}

describe("亜空間麻雀の和了評価段階", () => {
  it("仕様書どおり14段階を重複なく定義する", () => {
    expect(
      AKUUKAN_WINNING_EVALUATION_STAGES
    ).toEqual([
      "structuralYakuExtraction",
      "standardEligibility",
      "abilityEligibility",
      "enemyInvalidation",
      "overlapResolution",
      "standardHan",
      "openReductionCancellation",
      "fixedHan",
      "yakuHanAddition",
      "standardFu",
      "fuModification",
      "bonusHan",
      "dora",
      "handValue"
    ]);
    expect(
      new Set(
        AKUUKAN_WINNING_EVALUATION_STAGES
      ).size
    ).toBe(14);
  });
});

describe("亜空間麻雀の通常役候補", () => {
  it("標準成立する役候補を初期化する", () => {
    const candidate =
      createOpenSanshokuCandidate();

    expect(candidate).toEqual({
      id: "sanshokuDoujun",
      name: "三色同順",
      closedHan: 2,
      standardHan: 1,
      standardEligible: true,
      abilityGrants: [],
      invalidatedBy: [],
      excludedBy: null,
      openReductionCancelledBy: [],
      fixedHanChanges: [],
      hanAdditions: []
    });
    expect(
      getAkuukanNormalYakuReferenceHan(
        candidate
      )
    ).toBe(1);
    expect(
      isAkuukanNormalYakuCandidateActive(
        candidate
      )
    ).toBe(true);
    expect(
      getAkuukanNormalYakuFinalHan(
        candidate
      )
    ).toBe(1);
  });

  it("不正な標準翻数を拒否する", () => {
    expect(() =>
      createAkuukanNormalYakuCandidate({
        id: "riichi",
        name: "立直",
        closedHan: 0,
        standardHan: 1,
        standardEligible: true
      })
    ).toThrow(
      "門前時翻数は1以上の整数で指定してください。"
    );
    expect(() =>
      createAkuukanNormalYakuCandidate({
        id: "riichi",
        name: "立直",
        closedHan: 1,
        standardHan: -1,
        standardEligible: false
      })
    ).toThrow(
      "標準翻数は0以上の整数で指定してください。"
    );
    expect(() =>
      createAkuukanNormalYakuCandidate({
        id: "riichi",
        name: "立直",
        closedHan: 1,
        standardHan: 0,
        standardEligible: true
      })
    ).toThrow(
      "標準成立する役には1翻以上が必要です。"
    );
  });

  it("能力による成立許可の翻数を参照する", () => {
    const candidate = {
      ...createAkuukanNormalYakuCandidate({
        id: "pinfu",
        name: "平和",
        closedHan: 1,
        standardHan: 0,
        standardEligible: false
      }),
      abilityGrants: [
        {
          sourceId: "player-skill:2-6",
          han: 1
        }
      ]
    } as const;

    expect(
      getAkuukanNormalYakuReferenceHan(
        candidate
      )
    ).toBe(1);
    expect(
      isAkuukanNormalYakuCandidateActive(
        candidate
      )
    ).toBe(true);
    expect(
      getAkuukanNormalYakuFinalHan(
        candidate
      )
    ).toBe(1);
  });

  it("無効化または上位役との重複で除外する", () => {
    const invalidated = {
      ...createOpenSanshokuCandidate(),
      invalidatedBy: [
        "enemy-ability:E-7"
      ]
    } as const;
    const excluded = {
      ...createAkuukanNormalYakuCandidate({
        id: "iipeikou",
        name: "一盃口",
        closedHan: 1,
        standardHan: 1,
        standardEligible: true
      }),
      excludedBy: "ryanpeikou"
    } as const;

    expect(
      isAkuukanNormalYakuCandidateActive(
        invalidated
      )
    ).toBe(false);
    expect(
      getAkuukanNormalYakuFinalHan(
        invalidated
      )
    ).toBe(0);
    expect(
      isAkuukanNormalYakuCandidateActive(
        excluded
      )
    ).toBe(false);
    expect(
      getAkuukanNormalYakuFinalHan(
        excluded
      )
    ).toBe(0);
  });

  it("喰い下がりを無効にして門前時翻数へ戻す", () => {
    const candidate = {
      ...createOpenSanshokuCandidate(),
      openReductionCancelledBy: [
        "player-skill:2-1"
      ]
    } as const;

    expect(
      getAkuukanNormalYakuReferenceHan(
        candidate
      )
    ).toBe(1);
    expect(
      getAkuukanNormalYakuFinalHan(
        candidate
      )
    ).toBe(2);
  });

  it("最大の固定翻を採用してから翻数を加算する", () => {
    const original =
      createOpenSanshokuCandidate();
    const candidate = {
      ...original,
      openReductionCancelledBy: [
        "player-skill:2-1"
      ],
      fixedHanChanges: [
        {
          sourceId: "player-skill:1-7",
          han: 3
        },
        {
          sourceId: "enemy-ability:E-14",
          han: 4
        }
      ],
      hanAdditions: [
        {
          sourceId: "player-skill:2-8",
          han: 2
        }
      ]
    } as const;

    expect(
      getAkuukanNormalYakuFinalHan(
        candidate
      )
    ).toBe(6);
    expect(
      getAkuukanNormalYakuFinalHan(
        original
      )
    ).toBe(1);
  });

  it("固定翻は変更前の翻数より低くても置き換える", () => {
    const candidate = {
      ...createAkuukanNormalYakuCandidate({
        id: "chinitsu",
        name: "清一色",
        closedHan: 6,
        standardHan: 6,
        standardEligible: true
      }),
      fixedHanChanges: [
        {
          sourceId: "enemy-ability:E-17",
          han: 2
        }
      ]
    } as const;

    expect(
      getAkuukanNormalYakuFinalHan(
        candidate
      )
    ).toBe(2);
  });
});

describe("亜空間麻雀の役満候補", () => {
  it("標準成立・能力許可・無効化・重複除外を区別する", () => {
    const standard =
      createAkuukanYakumanCandidate({
        id: "pureNineGates",
        name: "純正九蓮宝燈",
        standardMultiplier: 2,
        standardEligible: true
      });
    const granted = {
      ...createAkuukanYakumanCandidate({
        id: "fourConcealedTriplets",
        name: "四暗刻",
        standardMultiplier: 1,
        standardEligible: false
      }),
      abilityGrants: [
        {
          sourceId: "player-skill:3-1",
          multiplier: 2
        }
      ]
    } as const;
    const invalidated = {
      ...granted,
      invalidatedBy: [
        "enemy-ability:E-17"
      ]
    } as const;
    const excluded = {
      ...standard,
      excludedBy: "nineGates"
    } as const;

    expect(
      getAkuukanYakumanMultiplier(
        standard
      )
    ).toBe(2);
    expect(
      getAkuukanYakumanMultiplier(
        granted
      )
    ).toBe(2);
    expect(
      isAkuukanYakumanCandidateActive(
        granted
      )
    ).toBe(true);
    expect(
      getAkuukanYakumanMultiplier(
        invalidated
      )
    ).toBe(0);
    expect(
      isAkuukanYakumanCandidateActive(
        invalidated
      )
    ).toBe(false);
    expect(
      getAkuukanYakumanMultiplier(
        excluded
      )
    ).toBe(0);
  });
});
