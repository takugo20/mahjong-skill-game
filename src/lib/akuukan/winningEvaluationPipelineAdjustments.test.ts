import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Meld,
  Tile
} from "../mahjong/types";
import type {
  YakumanContext
} from "../mahjong/yakuman";
import {
  resolveAkuukanStandardWinningYaku,
  resolveAkuukanWinningYakuWithAdjustments
} from "./winningEvaluationPipeline";

let tileNumber = 0;

function createTile(
  suit: Tile["suit"],
  rank: number
): Tile {
  tileNumber += 1;

  return {
    id: `adjusted-pipeline-${tileNumber}`,
    suit,
    rank,
    red: false
  };
}

function createOpenContext(): YakumanContext {
  const meld: Meld = {
    kind: "chi",
    tiles: [
      createTile("man", 1),
      createTile("man", 2),
      createTile("man", 3)
    ]
  };

  return {
    concealedTiles: [
      createTile("pin", 1),
      createTile("honor", 1)
    ],
    melds: [meld],
    decomposition: {
      kind: "standard",
      pair: {
        suit: "man",
        rank: 5
      },
      concealedMelds: []
    },
    winningTile: {
      suit: "man",
      rank: 3
    },
    waitType: "ryanmen",
    winMethod: "tsumo",
    seatWind: "south",
    prevailingWind: "east",
    riichi: true,
    rinshan: true
  };
}

describe("能力変更対応の役決定パイプライン", () => {
  it("能力変更を省略すると通常ルール結果と一致する", () => {
    const context = createOpenContext();

    expect(
      resolveAkuukanWinningYakuWithAdjustments({
        context
      })
    ).toEqual(
      resolveAkuukanStandardWinningYaku(
        context
      )
    );
  });

  it("候補生成後に能力変更を適用して集計する", () => {
    const result =
      resolveAkuukanWinningYakuWithAdjustments({
        context: createOpenContext(),
        adjustments: {
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
              yakuId: "rinshan",
              sourceId:
                "enemy-ability:E-17"
            },
            {
              yakuId: "haitei",
              sourceId:
                "enemy-ability:E-17"
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
      });

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["riichi"]);
    expect(result.normalYakuHan).toBe(3);
  });

  it("構造候補にない役への変更を無視する", () => {
    const context = createOpenContext();
    const standard =
      resolveAkuukanStandardWinningYaku(
        context
      );
    const adjusted =
      resolveAkuukanWinningYakuWithAdjustments({
        context,
        adjustments: {
          hanAdditions: [
            {
              yakuId: "chinitsu",
              sourceId:
                "player-skill:2-13",
              han: 2
            }
          ]
        }
      });

    expect(adjusted).toEqual(standard);
  });
});
