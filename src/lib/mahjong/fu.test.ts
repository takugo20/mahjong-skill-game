import {
  describe,
  expect,
  it
} from "vitest";
import {
  calculateFu
} from "./fu";
import type {
  FuCalculationResult,
  FuComponentId
} from "./fu";
import {
  getWinningHandDecompositions
} from "./hand";
import type {
  TileType,
  WaitType,
  WinningHandDecomposition
} from "./hand";
import type {
  NormalYakuContext
} from "./yaku";
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
    id: `fu-test-${serialNumber}`,
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
    NormalYakuContext["winMethod"];
  seatWind?: Wind;
  prevailingWind?: Wind;
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

  const context: NormalYakuContext = {
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
    treatAsClosed:
      options.treatAsClosed
  };

  return calculateFu(context);
}

function requireFu(
  result: FuCalculationResult | null
): FuCalculationResult {
  if (!result) {
    throw new Error(
      "符計算結果がありません"
    );
  }

  return result;
}

function getComponentFu(
  result: FuCalculationResult,
  id: FuComponentId
): number[] {
  return result.components
    .filter(
      (component) =>
        component.id === id
    )
    .map(
      (component) => component.fu
    );
}

function createPinfuHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [2, 3, 4, 5, 6, 7]
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
}

function createSequenceHand(
  pairRank: number
): Tile[] {
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
      [pairRank, pairRank]
    )
  ];
}

describe("固定符と平和", () => {
  it("平和ツモを20符とする", () => {
    const result = requireFu(
      evaluate(
        createPinfuHand(),
        [],
        {
          winningTile: {
            suit: "man",
            rank: 2
          },
          waitType: "ryanmen",
          winMethod: "tsumo"
        }
      )
    );

    expect(result.rawFu).toBe(20);
    expect(result.fu).toBe(20);
    expect(
      getComponentFu(result, "tsumo")
    ).toEqual([]);
  });

  it("平和ロンを30符とする", () => {
    const result = requireFu(
      evaluate(
        createPinfuHand(),
        [],
        {
          winningTile: {
            suit: "man",
            rank: 2
          },
          waitType: "ryanmen",
          winMethod: "ron"
        }
      )
    );

    expect(result.rawFu).toBe(30);
    expect(result.fu).toBe(30);
    expect(
      getComponentFu(
        result,
        "closedRon"
      )
    ).toEqual([10]);
  });

  it("七対子を25符固定とする", () => {
    const hand = createTiles(
      "man",
      [
        1, 1,
        2, 2,
        3, 3,
        4, 4,
        5, 5,
        6, 6,
        9, 9
      ]
    );

    const result = requireFu(
      evaluate(
        hand,
        [],
        {
          decompositionKind:
            "sevenPairs"
        }
      )
    );

    expect(result.rawFu).toBe(25);
    expect(result.fu).toBe(25);
    expect(result.fixed).toBe(true);
  });

  it("国士無双では符を計算しない", () => {
    const hand = [
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

    expect(
      evaluate(
        hand,
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
      )
    ).toBeNull();
  });
});

describe("副露とツモの符", () => {
  function createOpenSequenceHand() {
    const meld = createMeld(
      "chi",
      "man",
      [2, 3, 4]
    );

    const hand = [
      ...createTiles(
        "pin",
        [2, 3, 4, 6, 6]
      ),
      ...createTiles(
        "sou",
        [2, 3, 4, 5, 6, 7]
      )
    ];

    return { hand, meld };
  }

  it("符のない副露ロンを最低30符とする", () => {
    const { hand, meld } =
      createOpenSequenceHand();

    const result = requireFu(
      evaluate(
        hand,
        [meld],
        {
          winningTile: {
            suit: "sou",
            rank: 2
          },
          waitType: "ryanmen",
          winMethod: "ron"
        }
      )
    );

    expect(result.rawFu).toBe(30);
    expect(result.fu).toBe(30);
    expect(
      getComponentFu(
        result,
        "openHandMinimum"
      )
    ).toEqual([10]);
  });

  it("門前扱いなら門前ロン10符を加える", () => {
    const { hand, meld } =
      createOpenSequenceHand();

    const result = requireFu(
      evaluate(
        hand,
        [meld],
        {
          winningTile: {
            suit: "sou",
            rank: 2
          },
          waitType: "ryanmen",
          winMethod: "ron",
          treatAsClosed: true
        }
      )
    );

    expect(
      getComponentFu(
        result,
        "closedRon"
      )
    ).toEqual([10]);
    expect(
      getComponentFu(
        result,
        "openHandMinimum"
      )
    ).toEqual([]);
  });

  it("平和以外のツモに2符を加える", () => {
    const hand = [
      ...createTiles(
        "man",
        [1, 1, 1]
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

    const result = requireFu(
      evaluate(
        hand,
        [],
        {
          winningTile: {
            suit: "honor",
            rank: 3
          },
          waitType: "tanki",
          winMethod: "tsumo"
        }
      )
    );

    expect(result.rawFu).toBe(32);
    expect(result.fu).toBe(40);
    expect(
      getComponentFu(result, "tsumo")
    ).toEqual([2]);
  });
});

describe("雀頭と待ちの符", () => {
  it("三元牌の雀頭に2符を加える", () => {
    const result = requireFu(
      evaluate(
        createSequenceHand(5),
        [],
        {
          winningTile: {
            suit: "man",
            rank: 1
          },
          waitType: "ryanmen",
          winMethod: "ron"
        }
      )
    );

    expect(result.rawFu).toBe(32);
    expect(result.fu).toBe(40);
    expect(
      getComponentFu(
        result,
        "dragonPair"
      )
    ).toEqual([2]);
  });

  it("連風牌の雀頭を4符とする", () => {
    const result = requireFu(
      evaluate(
        createSequenceHand(1),
        [],
        {
          winningTile: {
            suit: "man",
            rank: 1
          },
          waitType: "ryanmen",
          winMethod: "ron",
          seatWind: "east",
          prevailingWind: "east"
        }
      )
    );

    expect(result.rawFu).toBe(34);
    expect(result.fu).toBe(40);
    expect(
      getComponentFu(
        result,
        "seatWindPair"
      )
    ).toEqual([2]);
    expect(
      getComponentFu(
        result,
        "prevailingWindPair"
      )
    ).toEqual([2]);
  });

  it("嵌張待ちと辺張待ちに2符を加える", () => {
    const hand = createSequenceHand(3);

    const kanchan = requireFu(
      evaluate(
        hand,
        [],
        {
          winningTile: {
            suit: "pin",
            rank: 2
          },
          waitType: "kanchan",
          winMethod: "ron"
        }
      )
    );

    const penchan = requireFu(
      evaluate(
        hand,
        [],
        {
          winningTile: {
            suit: "man",
            rank: 3
          },
          waitType: "penchan",
          winMethod: "ron"
        }
      )
    );

    expect(
      getComponentFu(kanchan, "wait")
    ).toEqual([2]);
    expect(
      getComponentFu(penchan, "wait")
    ).toEqual([2]);
  });
});

describe("刻子と槓子の符", () => {
  it("明刻と暗刻を牌種別に計算する", () => {
    const melds = [
      createMeld(
        "pon",
        "sou",
        [3, 3, 3]
      ),
      createMeld(
        "pon",
        "honor",
        [5, 5, 5]
      )
    ];

    const hand = [
      ...createTiles(
        "man",
        [1, 1, 1]
      ),
      ...createTiles(
        "pin",
        [2, 2, 2, 6, 6]
      )
    ];

    const result = requireFu(
      evaluate(
        hand,
        melds,
        {
          winningTile: {
            suit: "pin",
            rank: 6
          },
          waitType: "tanki",
          winMethod: "ron"
        }
      )
    );

    expect(
      getComponentFu(
        result,
        "openTriplet"
      ).sort((a, b) => a - b)
    ).toEqual([2, 4]);
    expect(
      getComponentFu(
        result,
        "closedTriplet"
      ).sort((a, b) => a - b)
    ).toEqual([4, 8]);
    expect(result.rawFu).toBe(40);
    expect(result.fu).toBe(40);
  });

  it("明槓と暗槓を牌種別に計算する", () => {
    const melds = [
      createMeld(
        "addedKan",
        "man",
        [2, 2, 2, 2]
      ),
      createMeld(
        "openKan",
        "pin",
        [9, 9, 9, 9]
      ),
      createMeld(
        "closedKan",
        "sou",
        [3, 3, 3, 3]
      ),
      createMeld(
        "closedKan",
        "honor",
        [5, 5, 5, 5]
      )
    ];

    const hand = createTiles(
      "pin",
      [6, 6]
    );

    const result = requireFu(
      evaluate(
        hand,
        melds,
        {
          winningTile: {
            suit: "pin",
            rank: 6
          },
          waitType: "tanki",
          winMethod: "ron"
        }
      )
    );

    expect(
      getComponentFu(
        result,
        "openKan"
      ).sort((a, b) => a - b)
    ).toEqual([8, 16]);
    expect(
      getComponentFu(
        result,
        "closedKan"
      ).sort((a, b) => a - b)
    ).toEqual([16, 32]);
    expect(result.rawFu).toBe(94);
    expect(result.fu).toBe(100);
  });

  it("双碰待ちをロンした暗刻を明刻扱いにする", () => {
    const hand = [
      ...createTiles(
        "man",
        [2, 2, 2]
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

    const result = requireFu(
      evaluate(
        hand,
        [],
        {
          winningTile: {
            suit: "man",
            rank: 2
          },
          waitType: "shanpon",
          winMethod: "ron"
        }
      )
    );

    expect(
      getComponentFu(
        result,
        "openTriplet"
      )
    ).toEqual([2]);
    expect(
      getComponentFu(
        result,
        "closedTriplet"
      )
    ).toEqual([]);
  });
});
