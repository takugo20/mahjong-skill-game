import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateShanten,
  getWaitTypes,
  getWinningHandDecompositions,
  getWinningTileTypes,
  isTenpai,
  isWinningHand
} from "./hand";
import type {
  TileType,
  WinningHandDecomposition
} from "./hand";
import type {
  Meld,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTestTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `test-tile-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTestTiles(
  suit: TileSuit,
  ranks: number[]
): Tile[] {
  return ranks.map(
    (rank) =>
      createTestTile(suit, rank)
  );
}

function findDecomposition(
  decompositions:
    WinningHandDecomposition[],
  kind:
    WinningHandDecomposition["kind"]
): WinningHandDecomposition | undefined {
  return decompositions.find(
    (decomposition) =>
      decomposition.kind === kind
  );
}

function getStandardWaitTypes(
  hand: Tile[],
  winningTile: TileType
) {
  const decomposition =
    getWinningHandDecompositions(
      hand
    ).find(
      (candidate) =>
        candidate.kind === "standard"
    );

  if (
    !decomposition ||
    decomposition.kind !== "standard"
  ) {
    throw new Error(
      "通常形の構成が見つかりません"
    );
  }

  return getWaitTypes(
    decomposition,
    winningTile
  );
}

describe("和了形の判定", () => {
  it("4面子1雀頭の通常形を判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 7, 8, 9]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    const decompositions =
      getWinningHandDecompositions(
        hand
      );

    expect(isWinningHand(hand)).toBe(
      true
    );

    expect(
      decompositions.some(
        (decomposition) =>
          decomposition.kind ===
          "standard"
      )
    ).toBe(true);
  });

  it("七対子と通常形の両方を候補に残す", () => {
    const hand = createTestTiles(
      "man",
      [
        1, 1,
        2, 2,
        3, 3,
        4, 4,
        5, 5,
        6, 6,
        7, 7
      ]
    );

    const decompositions =
      getWinningHandDecompositions(
        hand
      );

    expect(
      findDecomposition(
        decompositions,
        "sevenPairs"
      )
    ).toBeDefined();

    expect(
      findDecomposition(
        decompositions,
        "standard"
      )
    ).toBeDefined();
  });

  it("同一牌4枚を七対子の2対子として数えない", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 1, 1, 1]
      ),
      ...createTestTiles(
        "man",
        [2, 2, 3, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 1, 2, 2]
      ),
      ...createTestTiles(
        "sou",
        [1, 1]
      )
    ];

    const decompositions =
      getWinningHandDecompositions(
        hand
      );

    expect(
      findDecomposition(
        decompositions,
        "sevenPairs"
      )
    ).toBeUndefined();
  });

  it("国士無双を判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 9]
      ),
      ...createTestTiles(
        "pin",
        [1, 9]
      ),
      ...createTestTiles(
        "sou",
        [1, 9]
      ),
      ...createTestTiles(
        "honor",
        [
          1, 2, 3, 4,
          5, 6, 7, 1
        ]
      )
    ];

    const decompositions =
      getWinningHandDecompositions(
        hand
      );

    expect(isWinningHand(hand)).toBe(
      true
    );

    expect(
      findDecomposition(
        decompositions,
        "thirteenOrphans"
      )
    ).toBeDefined();
  });

  it("副露面子を含む通常形を判定する", () => {
    const meld: Meld = {
      kind: "chi",
      tiles: createTestTiles(
        "man",
        [1, 2, 3]
      )
    };

    const concealedTiles = [
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 7, 8, 9]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    const decompositions =
      getWinningHandDecompositions(
        concealedTiles,
        [meld]
      );

    expect(
      decompositions.some(
        (decomposition) =>
          decomposition.kind ===
          "standard"
      )
    ).toBe(true);

    const shanten = calculateShanten(
      concealedTiles,
      [meld]
    );

    expect(shanten.minimum).toBe(-1);
    expect(shanten.sevenPairs).toBeNull();
    expect(
      shanten.thirteenOrphans
    ).toBeNull();
  });
});

describe("向聴数の計算", () => {
  it("完成済みの通常形をマイナス1向聴とする", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 7, 8, 9]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    expect(
      calculateShanten(hand).minimum
    ).toBe(-1);
  });

  it("通常形の聴牌を0向聴とする", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 7, 8, 9]
      ),
      ...createTestTiles(
        "honor",
        [1]
      )
    ];

    expect(
      calculateShanten(hand).minimum
    ).toBe(0);

    expect(isTenpai(hand)).toBe(true);
  });

  it("通常形の一向聴を判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3, 5]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3, 9]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    expect(
      calculateShanten(hand).minimum
    ).toBe(1);
  });

  it("七対子の聴牌を判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [
          1, 1,
          2, 2,
          3, 3,
          4, 4,
          5, 5,
          6, 6,
          9
        ]
      )
    ];

    const result =
      calculateShanten(hand);

    expect(result.sevenPairs).toBe(0);
    expect(result.minimum).toBe(0);
  });

  it("国士無双十三面待ちを0向聴とする", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 9]
      ),
      ...createTestTiles(
        "pin",
        [1, 9]
      ),
      ...createTestTiles(
        "sou",
        [1, 9]
      ),
      ...createTestTiles(
        "honor",
        [1, 2, 3, 4, 5, 6, 7]
      )
    ];

    const result =
      calculateShanten(hand);

    expect(
      result.thirteenOrphans
    ).toBe(0);

    expect(result.minimum).toBe(0);
  });
});

describe("和了牌の判定", () => {
  it("両面待ちの2種類を返す", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 7, 8]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    const winningTileKeys =
      getWinningTileTypes(hand).map(
        (tile) =>
          `${tile.suit}-${tile.rank}`
      );

    expect(winningTileKeys).toEqual([
      "sou-6",
      "sou-9"
    ]);
  });
});

describe("待ちの種類", () => {
  it("単騎待ちを判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 7, 8, 9]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    expect(
      getStandardWaitTypes(
        hand,
        {
          suit: "honor",
          rank: 1
        }
      )
    ).toContain("tanki");
  });

  it("辺張待ちを判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    expect(
      getStandardWaitTypes(
        hand,
        {
          suit: "man",
          rank: 3
        }
      )
    ).toContain("penchan");
  });

  it("嵌張待ちを判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [4, 5, 6]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3, 7, 8, 9]
      ),
      ...createTestTiles(
        "honor",
        [1, 1]
      )
    ];

    expect(
      getStandardWaitTypes(
        hand,
        {
          suit: "man",
          rank: 5
        }
      )
    ).toContain("kanchan");
  });

  it("双碰待ちを判定する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "pin",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "sou",
        [1, 2, 3]
      ),
      ...createTestTiles(
        "honor",
        [1, 1, 1, 2, 2]
      )
    ];

    expect(
      getStandardWaitTypes(
        hand,
        {
          suit: "honor",
          rank: 1
        }
      )
    ).toContain("shanpon");
  });

  it("国士無双の待ちを区別する", () => {
    const hand = [
      ...createTestTiles(
        "man",
        [1, 9]
      ),
      ...createTestTiles(
        "pin",
        [1, 9]
      ),
      ...createTestTiles(
        "sou",
        [1, 9]
      ),
      ...createTestTiles(
        "honor",
        [
          1, 1, 2, 3,
          4, 5, 6, 7
        ]
      )
    ];

    const decomposition =
      getWinningHandDecompositions(
        hand
      ).find(
        (candidate) =>
          candidate.kind ===
          "thirteenOrphans"
      );

    if (
      !decomposition ||
      decomposition.kind !==
        "thirteenOrphans"
    ) {
      throw new Error(
        "国士無双の構成が見つかりません"
      );
    }

    expect(
      getWaitTypes(
        decomposition,
        {
          suit: "honor",
          rank: 1
        }
      )
    ).toEqual([
      "kokushiThirteenSided"
    ]);

    expect(
      getWaitTypes(
        decomposition,
        {
          suit: "honor",
          rank: 5
        }
      )
    ).toEqual([
      "kokushiSingle"
    ]);
  });
});
