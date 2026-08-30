import {
  describe,
  expect,
  it
} from "vitest";
import {
  createAkuukanNormalYakuCandidates,
  createAkuukanWinningYakuCandidates,
  createAkuukanYakumanCandidates
} from "./winningEvaluationCandidates";

describe("亜空間麻雀の通常役候補生成", () => {
  it("門前時の標準翻数を候補へ設定する", () => {
    const candidates =
      createAkuukanNormalYakuCandidates(
        ["riichi", "sanshokuDoujun"],
        true
      );

    expect(
      candidates.map((candidate) => ({
        id: candidate.id,
        closedHan: candidate.closedHan,
        standardHan: candidate.standardHan,
        standardEligible:
          candidate.standardEligible
      }))
    ).toEqual([
      {
        id: "riichi",
        closedHan: 1,
        standardHan: 1,
        standardEligible: true
      },
      {
        id: "sanshokuDoujun",
        closedHan: 2,
        standardHan: 2,
        standardEligible: true
      }
    ]);
  });

  it("副露時も構造候補を残して標準成立可否を分ける", () => {
    const candidates =
      createAkuukanNormalYakuCandidates(
        [
          "riichi",
          "sanshokuDoujun",
          "chinitsu"
        ],
        false
      );

    expect(
      candidates.map((candidate) => ({
        id: candidate.id,
        closedHan: candidate.closedHan,
        standardHan: candidate.standardHan,
        standardEligible:
          candidate.standardEligible
      }))
    ).toEqual([
      {
        id: "riichi",
        closedHan: 1,
        standardHan: 0,
        standardEligible: false
      },
      {
        id: "sanshokuDoujun",
        closedHan: 2,
        standardHan: 1,
        standardEligible: true
      },
      {
        id: "chinitsu",
        closedHan: 6,
        standardHan: 5,
        standardEligible: true
      }
    ]);
  });

  it("重複IDを最初の出現順で一つにまとめる", () => {
    const candidates =
      createAkuukanNormalYakuCandidates(
        [
          "tanyao",
          "riichi",
          "tanyao",
          "riichi"
        ],
        true
      );

    expect(
      candidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["tanyao", "riichi"]);
  });
});

describe("亜空間麻雀の役満候補生成", () => {
  it("副露可能かどうかと標準倍数を候補へ設定する", () => {
    const candidates =
      createAkuukanYakumanCandidates(
        ["nineGates", "bigThreeDragons"],
        false
      );

    expect(
      candidates.map((candidate) => ({
        id: candidate.id,
        standardMultiplier:
          candidate.standardMultiplier,
        standardEligible:
          candidate.standardEligible
      }))
    ).toEqual([
      {
        id: "nineGates",
        standardMultiplier: 1,
        standardEligible: false
      },
      {
        id: "bigThreeDragons",
        standardMultiplier: 1,
        standardEligible: true
      }
    ]);
  });
});

describe("亜空間麻雀の役候補生成", () => {
  it("通常役と役満の候補をまとめて生成する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "chinitsu"
        ],
        structuralYakumanIds: [
          "pureNineGates"
        ],
        isClosed: true
      });

    expect(
      candidates.normalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["chinitsu"]);
    expect(
      candidates.normalYakuCandidates[0]
        ?.standardHan
    ).toBe(6);
    expect(
      candidates.yakumanCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["pureNineGates"]);
    expect(
      candidates.yakumanCandidates[0]
        ?.standardMultiplier
    ).toBe(2);
  });

  it("未定義IDを受け取った場合は明示的に失敗する", () => {
    expect(() =>
      createAkuukanNormalYakuCandidates(
        ["unknown" as never],
        true
      )
    ).toThrow(
      "未定義の通常役IDです: unknown"
    );
    expect(() =>
      createAkuukanYakumanCandidates(
        ["unknown" as never],
        true
      )
    ).toThrow(
      "未定義の役満IDです: unknown"
    );
  });
});
