import {
  describe,
  expect,
  it
} from "vitest";
import {
  createAkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import {
  applyAkuukanWinningYakuAdjustments
} from "./winningEvaluationAdjustments";
import {
  resolveAkuukanWinningYaku
} from "./winningEvaluationResolution";

describe("亜空間麻雀の役能力変更", () => {
  it("成立許可から翻数加算までを仕様順に適用する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "riichi",
          "sanshokuDoujun",
          "chinitsu"
        ],
        structuralYakumanIds: [],
        isClosed: false
      });
    const adjusted =
      applyAkuukanWinningYakuAdjustments(
        candidates,
        {
          normalYakuGrants: [
            {
              yakuId: "riichi",
              sourceId:
                "player-skill:2-7",
              han: 1
            }
          ],
          normalYakuInvalidations: [
            {
              yakuId:
                "sanshokuDoujun",
              sourceId:
                "enemy-ability:E-17"
            }
          ],
          openReductionCancellations: [
            {
              yakuId:
                "sanshokuDoujun",
              sourceId:
                "player-skill:2-1"
            },
            {
              yakuId: "chinitsu",
              sourceId:
                "player-skill:2-4"
            }
          ],
          fixedHanChanges: [
            {
              yakuId: "riichi",
              sourceId:
                "enemy-ability:E-6",
              han: 2
            }
          ],
          hanAdditions: [
            {
              yakuId: "riichi",
              sourceId:
                "player-skill:2-8",
              han: 1
            }
          ]
        }
      );
    const result =
      resolveAkuukanWinningYaku(
        adjusted
      );
    const invalidatedSanshoku =
      adjusted.normalYakuCandidates.find(
        (candidate) =>
          candidate.id ===
          "sanshokuDoujun"
      );

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["riichi", "chinitsu"]);
    expect(result.normalYakuHan).toBe(9);
    expect(
      invalidatedSanshoku
        ?.openReductionCancelledBy
    ).toEqual([]);
  });

  it("上位役の無効化後に下位役を復活させて変更する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "doubleRiichi",
          "riichi"
        ],
        structuralYakumanIds: [],
        isClosed: true
      });
    const adjusted =
      applyAkuukanWinningYakuAdjustments(
        candidates,
        {
          normalYakuInvalidations: [
            {
              yakuId: "doubleRiichi",
              sourceId:
                "enemy-ability:E-7"
            }
          ],
          hanAdditions: [
            {
              yakuId: "doubleRiichi",
              sourceId:
                "player-skill:2-8",
              han: 1
            },
            {
              yakuId: "riichi",
              sourceId:
                "player-skill:2-8",
              han: 1
            }
          ]
        }
      );
    const result =
      resolveAkuukanWinningYaku(
        adjusted
      );
    const doubleRiichi =
      adjusted.normalYakuCandidates.find(
        (candidate) =>
          candidate.id ===
          "doubleRiichi"
      );
    const riichi =
      adjusted.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "riichi"
      );

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["riichi"]);
    expect(result.normalYakuHan).toBe(2);
    expect(
      doubleRiichi?.hanAdditions
    ).toEqual([]);
    expect(riichi?.excludedBy).toBeNull();
  });

  it("役満の成立許可と無効化を個別に適用する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [],
        structuralYakumanIds: [
          "nineGates",
          "bigThreeDragons"
        ],
        isClosed: false
      });
    const adjusted =
      applyAkuukanWinningYakuAdjustments(
        candidates,
        {
          yakumanGrants: [
            {
              yakumanId: "nineGates",
              sourceId:
                "player-skill:1-15",
              multiplier: 1
            }
          ],
          yakumanInvalidations: [
            {
              yakumanId:
                "bigThreeDragons",
              sourceId:
                "enemy-ability:E-7"
            }
          ]
        }
      );
    const result =
      resolveAkuukanWinningYaku(
        adjusted
      );

    expect(
      result.activeYakumanCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["nineGates"]);
    expect(result.yakumanMultiplier).toBe(1);
  });

  it("変更がない場合は元の候補を再利用する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "tanyao"
        ],
        structuralYakumanIds: [],
        isClosed: true
      });

    expect(
      applyAkuukanWinningYakuAdjustments(
        candidates,
        {}
      )
    ).toBe(candidates);
    expect(
      applyAkuukanWinningYakuAdjustments(
        candidates,
        {
          hanAdditions: [
            {
              yakuId: "chinitsu",
              sourceId:
                "player-skill:2-13",
              han: 1
            }
          ]
        }
      )
    ).toBe(candidates);
  });
});
