import {
  describe,
  expect,
  it
} from "vitest";
import {
  getWinningHandDecompositions
} from "./hand";
import type {
  TileType,
  WaitType,
  WinningHandDecomposition
} from "./hand";
import {
  evaluateYakuman,
  getYakumanMultiplier
} from "./yakuman";
import type {
  YakumanContext,
  YakumanId
} from "./yakuman";
import type {
  Meld,
  MeldKind,
  Tile,
  TileSuit,
  Wind
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `yakuman-test-${serialNumber}`,
    suit,
    rank,
    red: false
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

interface EvaluationOptions {
  decompositionKind?:
    WinningHandDecomposition["kind"];
  winningTile?: TileType;
  waitType?: WaitType;
  winMethod?:
    YakumanContext["winMethod"];
  seatWind?: Wind;
  prevailingWind?: Wind;
  tenhou?: boolean;
  chiihou?: boolean;
  treatAsClosed?: boolean;
}

function evaluate(
  concealedTiles: Tile[],
  melds: Meld[] = [],
  options: EvaluationOptions = {}
) {
  const decompositionKind =
    options.decompositionKind ??
    "standard";

  const decomposition =
    getWinningHandDecompositions(
      concealedTiles,
      melds
    ).find(
      (candidate) =>
        candidate.kind ===
        decompositionKind
    );

  if (!decomposition) {
    throw new Error(
      `${decompositionKind}の構成が見つかりません`
    );
  }

  const context: YakumanContext = {
    concealedTiles,
    melds,
    decomposition,
    winningTile:
      options.winningTile ?? {
        suit: "honor",
        rank: 1
      },
    waitType:
      options.waitType ?? "tanki",
    winMethod:
      options.winMethod ?? "ron",
    seatWind:
      options.seatWind ?? "east",
    prevailingWind:
      options.prevailingWind ??
      "east",
    tenhou: options.tenhou,
    chiihou: options.chiihou,
    treatAsClosed:
      options.treatAsClosed
  };

  return evaluateYakuman(context);
}

function getIds(
  results: ReturnType<
    typeof evaluateYakuman
  >
): YakumanId[] {
  return results.map(
    (result) => result.id
  );
}

function getMultiplier(
  results: ReturnType<
    typeof evaluateYakuman
  >,
  id: YakumanId
): number | undefined {
  return results.find(
    (result) => result.id === id
  )?.multiplier;
}

function createBasicWinningHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 3]
    ),
    ...createTiles(
      "pin",
      [1, 2, 3]
    ),
    ...createTiles(
      "sou",
      [1, 2, 3, 7, 8, 9]
    ),
    ...createTiles(
      "honor",
      [3, 3]
    )
  ];
}

describe("天和と地和", () => {
  it("親の第一ツモを天和とする", () => {
    const ids = getIds(
      evaluate(
        createBasicWinningHand(),
        [],
        {
          winningTile: {
            suit: "honor",
            rank: 3
          },
          waitType: "tanki",
          winMethod: "tsumo",
          seatWind: "east",
          tenhou: true
        }
      )
    );

    expect(ids).toContain("tenhou");
    expect(ids).not.toContain("chiihou");
  });

  it("子の第一ツモを地和とする", () => {
    const ids = getIds(
      evaluate(
        createBasicWinningHand(),
        [],
        {
          winningTile: {
            suit: "honor",
            rank: 3
          },
          waitType: "tanki",
          winMethod: "tsumo",
          seatWind: "south",
          chiihou: true
        }
      )
    );

    expect(ids).toContain("chiihou");
    expect(ids).not.toContain("tenhou");
  });
});

describe("国士無双", () => {
  function createThirteenOrphans(): Tile[] {
    return [
      ...createTiles(
        "man",
        [1, 9]
      ),
      ...createTiles(
        "pin",
        [1, 9]
      ),
      ...createTiles(
        "sou",
        [1, 9]
      ),
      ...createTiles(
        "honor",
        [
          1, 1, 2, 3,
          4, 5, 6, 7
        ]
      )
    ];
  }

  it("通常の国士無双を判定する", () => {
    const results = evaluate(
      createThirteenOrphans(),
      [],
      {
        decompositionKind:
          "thirteenOrphans",
        winningTile: {
          suit: "honor",
          rank: 5
        },
        waitType: "kokushiSingle"
      }
    );

    expect(getIds(results)).toContain(
      "thirteenOrphans"
    );
    expect(
      getMultiplier(
        results,
        "thirteenOrphans"
      )
    ).toBe(1);
  });

  it("十三面待ちをダブル役満とする", () => {
    const results = evaluate(
      createThirteenOrphans(),
      [],
      {
        decompositionKind:
          "thirteenOrphans",
        winningTile: {
          suit: "honor",
          rank: 1
        },
        waitType:
          "kokushiThirteenSided"
      }
    );

    const ids = getIds(results);

    expect(ids).toContain(
      "thirteenOrphansThirteenSided"
    );
    expect(ids).not.toContain(
      "thirteenOrphans"
    );
    expect(
      getMultiplier(
        results,
        "thirteenOrphansThirteenSided"
      )
    ).toBe(2);
  });
});

describe("四暗刻", () => {
  function createFourTripletHand(): Tile[] {
    return [
      ...createTiles(
        "man",
        [1, 1, 1]
      ),
      ...createTiles(
        "pin",
        [2, 2, 2]
      ),
      ...createTiles(
        "sou",
        [3, 3, 3]
      ),
      ...createTiles(
        "honor",
        [5, 5, 5, 7, 7]
      )
    ];
  }

  it("ツモ和了の四暗刻を判定する", () => {
    const results = evaluate(
      createFourTripletHand(),
      [],
      {
        winningTile: {
          suit: "man",
          rank: 1
        },
        waitType: "shanpon",
        winMethod: "tsumo"
      }
    );

    expect(getIds(results)).toContain(
      "fourConcealedTriplets"
    );
    expect(
      getMultiplier(
        results,
        "fourConcealedTriplets"
      )
    ).toBe(1);
  });

  it("単騎待ちをダブル役満とする", () => {
    const results = evaluate(
      createFourTripletHand(),
      [],
      {
        winningTile: {
          suit: "honor",
          rank: 7
        },
        waitType: "tanki",
        winMethod: "ron"
      }
    );

    const ids = getIds(results);

    expect(ids).toContain(
      "fourConcealedTripletsSingleWait"
    );
    expect(ids).not.toContain(
      "fourConcealedTriplets"
    );
    expect(
      getMultiplier(
        results,
        "fourConcealedTripletsSingleWait"
      )
    ).toBe(2);
  });

  it("双碰待ちのロンを四暗刻にしない", () => {
    const ids = getIds(
      evaluate(
        createFourTripletHand(),
        [],
        {
          winningTile: {
            suit: "man",
            rank: 1
          },
          waitType: "shanpon",
          winMethod: "ron"
        }
      )
    );

    expect(ids).not.toContain(
      "fourConcealedTriplets"
    );
    expect(ids).not.toContain(
      "fourConcealedTripletsSingleWait"
    );
  });
});

describe("三元牌と風牌", () => {
  it("大三元を判定する", () => {
    const hand = [
      ...createTiles(
        "honor",
        [
          5, 5, 5,
          6, 6, 6,
          7, 7, 7
        ]
      ),
      ...createTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTiles(
        "pin",
        [2, 2]
      )
    ];

    expect(
      getIds(
        evaluate(
          hand,
          [],
          {
            winningTile: {
              suit: "pin",
              rank: 2
            },
            waitType: "tanki"
          }
        )
      )
    ).toContain("bigThreeDragons");
  });

  it("小四喜を判定する", () => {
    const hand = [
      ...createTiles(
        "honor",
        [
          1, 1, 1,
          2, 2, 2,
          3, 3, 3,
          4, 4
        ]
      ),
      ...createTiles(
        "man",
        [1, 2, 3]
      )
    ];

    const ids = getIds(
      evaluate(
        hand,
        [],
        {
          winningTile: {
            suit: "honor",
            rank: 4
          },
          waitType: "tanki"
        }
      )
    );

    expect(ids).toContain(
      "littleFourWinds"
    );
    expect(ids).not.toContain(
      "bigFourWinds"
    );
  });

  it("大四喜をダブル役満とする", () => {
    const hand = [
      ...createTiles(
        "honor",
        [
          1, 1, 1,
          2, 2, 2,
          3, 3, 3,
          4, 4, 4,
          5, 5
        ]
      )
    ];

    const results = evaluate(
      hand,
      [],
      {
        winningTile: {
          suit: "honor",
          rank: 1
        },
        waitType: "shanpon",
        winMethod: "ron"
      }
    );

    const ids = getIds(results);

    expect(ids).toContain(
      "bigFourWinds"
    );
    expect(ids).not.toContain(
      "littleFourWinds"
    );
    expect(
      getMultiplier(
        results,
        "bigFourWinds"
      )
    ).toBe(2);
  });
});

describe("牌種限定の役満", () => {
  it("字一色を判定する", () => {
    const hand = [
      ...createTiles(
        "honor",
        [
          1, 1, 1,
          2, 2, 2,
          5, 5, 5,
          6, 6, 6,
          7, 7
        ]
      )
    ];

    expect(
      getIds(
        evaluate(
          hand,
          [],
          {
            winningTile: {
              suit: "honor",
              rank: 1
            },
            waitType: "shanpon"
          }
        )
      )
    ).toContain("allHonors");
  });

  it("發を含む緑一色を判定する", () => {
    const hand = [
      ...createTiles(
        "sou",
        [
          2, 2, 2,
          3, 3, 3,
          4, 4, 4,
          8, 8
        ]
      ),
      ...createTiles(
        "honor",
        [6, 6, 6]
      )
    ];

    expect(
      getIds(
        evaluate(
          hand,
          [],
          {
            winningTile: {
              suit: "honor",
              rank: 6
            },
            waitType: "shanpon"
          }
        )
      )
    ).toContain("allGreen");
  });

  it("清老頭を判定する", () => {
    const hand = [
      ...createTiles(
        "man",
        [1, 1, 1, 9, 9, 9]
      ),
      ...createTiles(
        "pin",
        [1, 1, 1, 9, 9, 9]
      ),
      ...createTiles(
        "sou",
        [1, 1]
      )
    ];

    expect(
      getIds(
        evaluate(
          hand,
          [],
          {
            winningTile: {
              suit: "man",
              rank: 1
            },
            waitType: "shanpon"
          }
        )
      )
    ).toContain("allTerminals");
  });
});

describe("九蓮宝燈", () => {
  it("通常の九蓮宝燈を判定する", () => {
    const hand = createTiles(
      "man",
      [
        1, 1, 1, 1,
        2, 3, 4, 5,
        6, 7, 8,
        9, 9, 9
      ]
    );

    const ids = getIds(
      evaluate(
        hand,
        [],
        {
          winningTile: {
            suit: "man",
            rank: 2
          },
          waitType: "kanchan"
        }
      )
    );

    expect(ids).toContain("nineGates");
    expect(ids).not.toContain(
      "pureNineGates"
    );
  });

  it("純正九蓮宝燈をダブル役満とする", () => {
    const hand = createTiles(
      "man",
      [
        1, 1, 1,
        2, 3, 4,
        5, 5,
        6, 7, 8,
        9, 9, 9
      ]
    );

    const results = evaluate(
      hand,
      [],
      {
        winningTile: {
          suit: "man",
          rank: 5
        },
        waitType: "tanki"
      }
    );

    const ids = getIds(results);

    expect(ids).toContain(
      "pureNineGates"
    );
    expect(ids).not.toContain(
      "nineGates"
    );
    expect(
      getMultiplier(
        results,
        "pureNineGates"
      )
    ).toBe(2);
  });
});

describe("四槓子と複合役満", () => {
  it("4組の槓子を四槓子とする", () => {
    const melds = [
      createMeld(
        "openKan",
        "man",
        [1, 1, 1, 1]
      ),
      createMeld(
        "closedKan",
        "pin",
        [2, 2, 2, 2]
      ),
      createMeld(
        "addedKan",
        "sou",
        [3, 3, 3, 3]
      ),
      createMeld(
        "openKan",
        "honor",
        [1, 1, 1, 1]
      )
    ];

    const hand = createTiles(
      "honor",
      [5, 5]
    );

    expect(
      getIds(
        evaluate(
          hand,
          melds,
          {
            winningTile: {
              suit: "honor",
              rank: 5
            },
            waitType: "tanki"
          }
        )
      )
    ).toContain("fourKans");
  });

  it("複数の役満を合計する", () => {
    const hand = createTiles(
      "honor",
      [
        5, 5, 5,
        6, 6, 6,
        7, 7, 7,
        1, 1, 1,
        2, 2
      ]
    );

    const results = evaluate(
      hand,
      [],
      {
        winningTile: {
          suit: "honor",
          rank: 5
        },
        waitType: "shanpon",
        winMethod: "ron"
      }
    );

    const ids = getIds(results);

    expect(ids).toContain(
      "bigThreeDragons"
    );
    expect(ids).toContain("allHonors");
    expect(
      getYakumanMultiplier(results)
    ).toBe(2);
  });
});
