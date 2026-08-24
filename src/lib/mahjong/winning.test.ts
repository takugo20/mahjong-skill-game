import {
  describe,
  expect,
  it
} from "vitest";
import {
  evaluateWinningHand
} from "./winning";
import type {
  ValidWinningHandEvaluation,
  WinningHandEvaluationResult
} from "./winning";
import type {
  Meld,
  MeldKind,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `winning-test-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createTiles(
  suit: TileSuit,
  ranks: number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createMeld(
  kind: MeldKind,
  suit: TileSuit,
  ranks: number[]
): Meld {
  return {
    kind,
    tiles: createTiles(suit, ranks)
  };
}

function requireValid(
  result: WinningHandEvaluationResult
): ValidWinningHandEvaluation {
  if (!result.valid) {
    throw new Error(
      `和了判定に失敗しました: ${result.reason}`
    );
  }

  return result;
}

describe("通常和了の総合判定", () => {
  it("役・ドラ・符・点数をまとめて計算する", () => {
    const hand = [
      createTile(
        "man",
        2,
        true
      ),
      ...createTiles(
        "man",
        [3, 4, 5, 6, 7]
      ),
      ...createTiles(
        "pin",
        [2, 3, 4]
      ),
      ...createTiles(
        "sou",
        [6, 7, 8]
      ),
      ...createTiles(
        "honor",
        [3, 3]
      )
    ];

    const result = requireValid(
      evaluateWinningHand({
        concealedTiles: hand,
        winningTile: {
          suit: "man",
          rank: 2
        },
        winMethod: "tsumo",
        seatWind: "south",
        prevailingWind: "east",
        riichi: true,
        doraIndicators: [
          {
            suit: "man",
            rank: 1
          }
        ],
        uraDoraIndicators: [
          {
            suit: "pin",
            rank: 1
          }
        ],
        honba: 1,
        riichiSticks: 2
      })
    );

    const yakuIds =
      result.best.normalYaku.map(
        (yaku) => yaku.id
      );

    expect(yakuIds).toContain("riichi");
    expect(yakuIds).toContain(
      "menzenTsumo"
    );
    expect(yakuIds).toContain("pinfu");
    expect(result.best.yakuHan).toBe(3);
    expect(result.best.dora.dora).toBe(1);
    expect(result.best.dora.uraDora).toBe(1);
    expect(result.best.dora.redDora).toBe(1);
    expect(result.best.bonusHan).toBe(3);
    expect(result.best.totalHan).toBe(6);
    expect(result.best.fu?.fu).toBe(20);
    expect(result.best.score.limit).toBe(
      "haneman"
    );
    expect(
      result.best.score.tsumoPayments
    ).toEqual({
      dealerPays: 6100,
      nonDealerPays: 3100,
      nonDealerPayerCount: 2
    });
    expect(
      result.best.score.totalPoints
    ).toBe(14300);
  });

  it("門前扱いスキルを総合判定へ反映する", () => {
    const meld = createMeld(
      "chi",
      "man",
      [2, 3, 4]
    );

    const hand = [
      ...createTiles(
        "pin",
        [4, 5, 6]
      ),
      ...createTiles(
        "sou",
        [2, 3, 4, 6, 7, 8]
      ),
      ...createTiles(
        "honor",
        [3, 3]
      )
    ];

    const result = requireValid(
      evaluateWinningHand({
        concealedTiles: hand,
        melds: [meld],
        winningTile: {
          suit: "pin",
          rank: 4
        },
        winMethod: "ron",
        seatWind: "south",
        prevailingWind: "east",
        riichi: true,
        treatAsClosed: true
      })
    );

    const yakuIds =
      result.best.normalYaku.map(
        (yaku) => yaku.id
      );

    expect(yakuIds).toContain("riichi");
    expect(yakuIds).toContain("pinfu");
    expect(result.best.fu?.fu).toBe(30);
    expect(
      result.best.score.ronPayment
    ).toBe(2000);
  });

  it("複数の構成から最も高いものを選ぶ", () => {
    const hand = [
      ...createTiles(
        "man",
        [
          1, 1,
          2, 2,
          3, 3
        ]
      ),
      ...createTiles(
        "pin",
        [
          4, 4,
          5, 5,
          6, 6
        ]
      ),
      ...createTiles(
        "honor",
        [7, 7]
      )
    ];

    const result = requireValid(
      evaluateWinningHand({
        concealedTiles: hand,
        winningTile: {
          suit: "honor",
          rank: 7
        },
        winMethod: "ron",
        seatWind: "south",
        prevailingWind: "east"
      })
    );

    expect(
      result.candidates.some(
        (candidate) =>
          candidate.decomposition.kind ===
          "standard"
      )
    ).toBe(true);

    expect(
      result.candidates.some(
        (candidate) =>
          candidate.decomposition.kind ===
          "sevenPairs"
      )
    ).toBe(true);

    expect(
      result.best.decomposition.kind
    ).toBe("standard");

    expect(
      result.best.normalYaku.map(
        (yaku) => yaku.id
      )
    ).toContain("ryanpeikou");

    expect(result.best.yakuHan).toBe(3);
    expect(result.best.fu?.fu).toBe(40);
    expect(
      result.best.score.ronPayment
    ).toBe(5200);
    expect(result.candidates[0]).toBe(
      result.best
    );
  });
});

describe("役満と無効和了", () => {
  it("複合役満ではドラを点数へ加えない", () => {
    const hand = [
      createTile(
        "honor",
        5,
        true
      ),
      ...createTiles(
        "honor",
        [
          5, 5,
          6, 6, 6,
          7, 7, 7,
          1, 1, 1,
          2, 2
        ]
      )
    ];

    const result = requireValid(
      evaluateWinningHand({
        concealedTiles: hand,
        winningTile: {
          suit: "honor",
          rank: 5
        },
        winMethod: "ron",
        seatWind: "south",
        prevailingWind: "east",
        doraIndicators: [
          {
            suit: "honor",
            rank: 4
          }
        ]
      })
    );

    const yakumanIds =
      result.best.yakuman.map(
        (yakuman) => yakuman.id
      );

    expect(result.best.isYakuman).toBe(true);
    expect(yakumanIds).toContain(
      "bigThreeDragons"
    );
    expect(yakumanIds).toContain(
      "allHonors"
    );
    expect(
      result.best.dora.totalHan
    ).toBe(4);
    expect(result.best.bonusHan).toBe(0);
    expect(result.best.totalHan).toBe(0);
    expect(
      result.best.yakumanMultiplier
    ).toBe(2);
    expect(result.best.fu).toBeNull();
    expect(
      result.best.score.ronPayment
    ).toBe(64000);
  });

  it("ドラだけの和了を役なしとして拒否する", () => {
    const meld = createMeld(
      "chi",
      "man",
      [2, 3, 4]
    );

    const hand = [
      ...createTiles(
        "pin",
        [4, 5, 6]
      ),
      ...createTiles(
        "sou",
        [6, 7, 8]
      ),
      ...createTiles(
        "man",
        [6, 7, 8]
      ),
      ...createTiles(
        "honor",
        [3, 3]
      )
    ];

    const result = evaluateWinningHand({
      concealedTiles: hand,
      melds: [meld],
      winningTile: {
        suit: "pin",
        rank: 4
      },
      winMethod: "ron",
      seatWind: "south",
      prevailingWind: "east",
      doraIndicators: [
        {
          suit: "honor",
          rank: 2
        }
      ]
    });

    expect(result).toEqual({
      valid: false,
      reason: "noYaku",
      candidates: []
    });
  });

  it("未完成の手牌を和了として扱わない", () => {
    const result = evaluateWinningHand({
      concealedTiles: createTiles(
        "man",
        [1, 2, 3]
      ),
      winningTile: {
        suit: "man",
        rank: 3
      },
      winMethod: "ron",
      seatWind: "south",
      prevailingWind: "east"
    });

    expect(result).toEqual({
      valid: false,
      reason: "notWinningHand",
      candidates: []
    });
  });
});
