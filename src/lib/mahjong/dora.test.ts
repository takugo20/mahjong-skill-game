import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateDora,
  getDoraTileType
} from "./dora";
import type {
  Meld,
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
    id: `dora-test-${serialNumber}`,
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

describe("ドラ表示牌", () => {
  it("数牌を循環させる", () => {
    expect(
      getDoraTileType({
        suit: "man",
        rank: 4
      })
    ).toEqual({
      suit: "man",
      rank: 5
    });

    expect(
      getDoraTileType({
        suit: "pin",
        rank: 9
      })
    ).toEqual({
      suit: "pin",
      rank: 1
    });
  });

  it("風牌を循環させる", () => {
    expect(
      getDoraTileType({
        suit: "honor",
        rank: 1
      })
    ).toEqual({
      suit: "honor",
      rank: 2
    });

    expect(
      getDoraTileType({
        suit: "honor",
        rank: 4
      })
    ).toEqual({
      suit: "honor",
      rank: 1
    });
  });

  it("三元牌を循環させる", () => {
    expect(
      getDoraTileType({
        suit: "honor",
        rank: 5
      })
    ).toEqual({
      suit: "honor",
      rank: 6
    });

    expect(
      getDoraTileType({
        suit: "honor",
        rank: 7
      })
    ).toEqual({
      suit: "honor",
      rank: 5
    });
  });

  it("不正な表示牌を拒否する", () => {
    expect(() =>
      getDoraTileType({
        suit: "sou",
        rank: 10
      })
    ).toThrow();
  });
});

describe("ドラ計数", () => {
  it("同じ表示牌が複数あれば重複して数える", () => {
    const result = calculateDora({
      concealedTiles: createTiles(
        "man",
        [5, 5, 5]
      ),
      doraIndicators: [
        {
          suit: "man",
          rank: 4
        },
        {
          suit: "man",
          rank: 4
        }
      ]
    });

    expect(result.dora).toBe(6);
  });

  it("副露牌と槓子も数える", () => {
    const meld: Meld = {
      kind: "openKan",
      tiles: createTiles(
        "pin",
        [1, 1, 1, 1]
      )
    };

    const result = calculateDora({
      concealedTiles: [],
      melds: [meld],
      doraIndicators: [
        {
          suit: "pin",
          rank: 9
        }
      ]
    });

    expect(result.dora).toBe(4);
  });

  it("立直時だけ裏ドラを数える", () => {
    const concealedTiles = createTiles(
      "sou",
      [6, 6]
    );

    const uraDoraIndicators = [
      {
        suit: "sou" as const,
        rank: 5
      }
    ];

    expect(
      calculateDora({
        concealedTiles,
        uraDoraIndicators
      }).uraDora
    ).toBe(0);

    expect(
      calculateDora({
        concealedTiles,
        uraDoraIndicators,
        riichi: true
      }).uraDora
    ).toBe(2);

    expect(
      calculateDora({
        concealedTiles,
        uraDoraIndicators,
        doubleRiichi: true
      }).uraDora
    ).toBe(2);
  });

  it("任意の赤牌を赤ドラとして数える", () => {
    const concealedTiles = [
      createTile(
        "honor",
        1,
        true
      ),
      createTile(
        "man",
        5,
        true
      ),
      createTile(
        "pin",
        2
      )
    ];

    const result = calculateDora({
      concealedTiles
    });

    expect(result.redDora).toBe(2);
  });

  it("通常ドラと赤ドラを重複して数える", () => {
    const result = calculateDora({
      concealedTiles: [
        createTile(
          "man",
          5,
          true
        )
      ],
      doraIndicators: [
        {
          suit: "man",
          rank: 4
        }
      ]
    });

    expect(result.dora).toBe(1);
    expect(result.redDora).toBe(1);
    expect(result.totalHan).toBe(2);
  });

  it("成立した種類だけ内訳へ追加する", () => {
    const result = calculateDora({
      concealedTiles: [
        createTile(
          "man",
          5,
          true
        )
      ]
    });

    expect(
      result.bonuses.map(
        (bonus) => bonus.id
      )
    ).toEqual([
      "redDora"
    ]);
  });
});
