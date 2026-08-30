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
  resolveAkuukanStandardWinningYaku
} from "./winningEvaluationPipeline";

let tileNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  tileNumber += 1;

  return {
    id: `pipeline-${tileNumber}`,
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

const sequenceDecomposition:
  WinningHandDecomposition = {
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
  };

describe("亜空間麻雀の標準役決定", () => {
  it("重複整理後の通常役と翻数を集計する", () => {
    const result =
      resolveAkuukanStandardWinningYaku(
        createContext(
          sequenceDecomposition,
          {
            doubleRiichi: true
          }
        )
      );

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual([
      "doubleRiichi",
      "pinfu",
      "ryanpeikou"
    ]);
    expect(result.normalYakuHan).toBe(6);
    expect(result.hasValidYaku).toBe(true);
    expect(result.usesYakumanScoring).toBe(
      false
    );
  });

  it("副露時の門前限定役を除外して有効役だけを集計する", () => {
    const meld: Meld = {
      kind: "chi",
      tiles: [
        createTile("man", 1),
        createTile("man", 2),
        createTile("man", 3)
      ]
    };
    const result =
      resolveAkuukanStandardWinningYaku(
        createContext(
          {
            kind: "standard",
            pair: {
              suit: "man",
              rank: 5
            },
            concealedMelds: []
          },
          {
            concealedTiles: [
              createTile("pin", 1),
              createTile("honor", 1)
            ],
            melds: [meld],
            winMethod: "tsumo",
            riichi: true,
            rinshan: true
          }
        )
      );

    expect(
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "riichi"
      )?.standardEligible
    ).toBe(false);
    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["rinshan"]);
    expect(result.normalYakuHan).toBe(1);
  });

  it("役満時も通常役を記録して点数用通常翻だけを0にする", () => {
    const result =
      resolveAkuukanStandardWinningYaku(
        createContext(
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
        )
      );

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["menzenTsumo"]);
    expect(
      result.activeYakumanCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual([
      "thirteenOrphansThirteenSided"
    ]);
    expect(result.normalYakuHan).toBe(1);
    expect(result.scoringNormalYakuHan).toBe(
      0
    );
    expect(result.yakumanMultiplier).toBe(2);
    expect(result.usesYakumanScoring).toBe(
      true
    );
  });

  it("有効役がない場合を和了不可として集計する", () => {
    const result =
      resolveAkuukanStandardWinningYaku(
        createContext(
          {
            kind: "standard",
            pair: {
              suit: "man",
              rank: 5
            },
            concealedMelds: []
          },
          {
            concealedTiles: [
              createTile("man", 1),
              createTile("pin", 2)
            ]
          }
        )
      );

    expect(result.hasValidYaku).toBe(false);
    expect(result.normalYakuHan).toBe(0);
    expect(result.yakumanMultiplier).toBe(0);
  });
});
