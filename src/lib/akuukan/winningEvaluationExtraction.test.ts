import {
  describe,
  expect,
  it
} from "vitest";
import type {
  WinningHandDecomposition
} from "../mahjong/hand";
import type {
  Meld,
  Tile,
  TileSuit
} from "../mahjong/types";
import type {
  YakumanContext
} from "../mahjong/yakuman";
import {
  createAkuukanWinningYakuCandidatesFromContext,
  extractAkuukanStructuralNormalYakuIds,
  extractAkuukanStructuralYakumanIds
} from "./winningEvaluationExtraction";

let tileNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  tileNumber += 1;

  return {
    id: `extraction-${tileNumber}`,
    suit,
    rank,
    red: false
  };
}

function createContext(
  decomposition:
    WinningHandDecomposition,
  overrides:
    Partial<YakumanContext> = {}
): YakumanContext {
  return {
    concealedTiles: [],
    melds: [],
    decomposition,
    winningTile: {
      suit: "man",
      rank: 3
    },
    waitType: "ryanmen",
    winMethod: "ron",
    seatWind: "south",
    prevailingWind: "east",
    ...overrides
  };
}

describe("亜空間麻雀の構造役抽出", () => {
  it("通常判定を再利用して上位役と下位役を両方残す", () => {
    const context = createContext(
      {
        kind: "standard",
        pair: {
          suit: "man",
          rank: 5
        },
        concealedMelds: [
          {
            kind: "sequence",
            suit: "man",
            startRank: 1
          },
          {
            kind: "sequence",
            suit: "man",
            startRank: 1
          },
          {
            kind: "sequence",
            suit: "pin",
            startRank: 4
          },
          {
            kind: "sequence",
            suit: "pin",
            startRank: 4
          }
        ]
      },
      {
        doubleRiichi: true
      }
    );

    expect(
      extractAkuukanStructuralNormalYakuIds(
        context
      )
    ).toEqual([
      "doubleRiichi",
      "riichi",
      "pinfu",
      "ryanpeikou",
      "iipeikou",
      "sevenPairs"
    ]);
  });

  it("副露手の門前限定候補を残して実際の成立可否を再適用する", () => {
    const meld: Meld = {
      kind: "chi",
      tiles: [
        createTile("man", 1),
        createTile("man", 2),
        createTile("man", 3)
      ]
    };
    const concealedTiles = [
      createTile("pin", 1),
      createTile("pin", 2),
      createTile("pin", 3),
      createTile("sou", 1),
      createTile("sou", 2),
      createTile("sou", 3),
      createTile("man", 4),
      createTile("man", 5),
      createTile("man", 6),
      createTile("man", 5),
      createTile("man", 5)
    ];
    const context = createContext(
      {
        kind: "standard",
        pair: {
          suit: "man",
          rank: 5
        },
        concealedMelds: [
          {
            kind: "sequence",
            suit: "pin",
            startRank: 1
          },
          {
            kind: "sequence",
            suit: "sou",
            startRank: 1
          },
          {
            kind: "sequence",
            suit: "man",
            startRank: 4
          }
        ]
      },
      {
        concealedTiles,
        melds: [meld],
        winningTile: {
          suit: "pin",
          rank: 3
        }
      }
    );

    const candidates =
      createAkuukanWinningYakuCandidatesFromContext(
        context
      ).normalYakuCandidates;
    const pinfu = candidates.find(
      (candidate) =>
        candidate.id === "pinfu"
    );
    const sanshoku = candidates.find(
      (candidate) =>
        candidate.id ===
        "sanshokuDoujun"
    );

    expect(pinfu).toMatchObject({
      standardHan: 0,
      standardEligible: false
    });
    expect(sanshoku).toMatchObject({
      standardHan: 1,
      standardEligible: true
    });
  });

  it("上位役満と下位役満を両方残す", () => {
    const context = createContext(
      {
        kind: "thirteenOrphans",
        pair: {
          suit: "man",
          rank: 1
        }
      },
      {
        waitType:
          "kokushiThirteenSided"
      }
    );

    expect(
      extractAkuukanStructuralYakumanIds(
        context
      )
    ).toEqual([
      "thirteenOrphansThirteenSided",
      "thirteenOrphans"
    ]);
  });

  it("役満時も通常役候補を同時に生成する", () => {
    const context = createContext(
      {
        kind: "thirteenOrphans",
        pair: {
          suit: "man",
          rank: 1
        }
      },
      {
        waitType:
          "kokushiThirteenSided",
        winMethod: "tsumo"
      }
    );

    const candidates =
      createAkuukanWinningYakuCandidatesFromContext(
        context
      );

    expect(
      candidates.normalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toContain("menzenTsumo");
    expect(
      candidates.yakumanCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual([
      "thirteenOrphansThirteenSided",
      "thirteenOrphans"
    ]);
  });
});
