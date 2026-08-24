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
  evaluateNormalYaku
} from "./yaku";
import type {
  NormalYakuContext,
  NormalYakuId,
  WinMethod
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
    id: `yaku-test-${serialNumber}`,
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
  winMethod?: WinMethod;
  seatWind?: Wind;
  prevailingWind?: Wind;
  riichi?: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  rinshan?: boolean;
  chankan?: boolean;
  haitei?: boolean;
  houtei?: boolean;
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
    riichi: options.riichi,
    doubleRiichi:
      options.doubleRiichi,
    ippatsu: options.ippatsu,
    rinshan: options.rinshan,
    chankan: options.chankan,
    haitei: options.haitei,
    houtei: options.houtei
  };

  return evaluateNormalYaku(context);
}

function getIds(
  results: ReturnType<
    typeof evaluateNormalYaku
  >
): NormalYakuId[] {
  return results.map(
    (result) => result.id
  );
}

function getHan(
  results: ReturnType<
    typeof evaluateNormalYaku
  >,
  id: NormalYakuId
): number | undefined {
  return results.find(
    (result) => result.id === id
  )?.han;
}

describe("1翻役と立直関連", () => {
  it("立直・一発・門前ツモ・平和を判定する", () => {
    const hand = [
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

    const results = evaluate(
      hand,
      [],
      {
        winningTile: {
          suit: "man",
          rank: 2
        },
        waitType: "ryanmen",
        winMethod: "tsumo",
        riichi: true,
        ippatsu: true
      }
    );

    const ids = getIds(results);

    expect(ids).toContain("riichi");
    expect(ids).toContain("ippatsu");
    expect(ids).toContain(
      "menzenTsumo"
    );
    expect(ids).toContain("pinfu");
  });

  it("ダブル立直と通常立直を重複させない", () => {
    const hand = [
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

    const ids = getIds(
      evaluate(
        hand,
        [],
        {
          riichi: true,
          doubleRiichi: true
        }
      )
    );

    expect(ids).toContain(
      "doubleRiichi"
    );
    expect(ids).not.toContain(
      "riichi"
    );
  });

  it("嶺上開花と海底摸月を重複させない", () => {
    const hand = [
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

    const ids = getIds(
      evaluate(
        hand,
        [],
        {
          winMethod: "tsumo",
          rinshan: true,
          haitei: true
        }
      )
    );

    expect(ids).toContain("rinshan");
    expect(ids).not.toContain("haitei");
  });

  it("槍槓と河底撈魚を重複させない", () => {
    const hand = [
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

    const ids = getIds(
      evaluate(
        hand,
        [],
        {
          winMethod: "ron",
          chankan: true,
          houtei: true
        }
      )
    );

    expect(ids).toContain("chankan");
    expect(ids).not.toContain("houtei");
  });
});

describe("役牌", () => {
  it("白・自風・場風を個別に数える", () => {
    const hand = [
      ...createTiles(
        "honor",
        [5, 5, 5]
      ),
      ...createTiles(
        "honor",
        [1, 1, 1]
      ),
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
        [1, 2, 3]
      ),
      ...createTiles(
        "honor",
        [2, 2]
      )
    ];

    const ids = getIds(
      evaluate(hand)
    );

    expect(ids).toContain(
      "yakuhaiWhite"
    );
    expect(ids).toContain("seatWind");
    expect(ids).toContain(
      "prevailingWind"
    );
  });
});

describe("副露と喰い下がり", () => {
  it("副露三色同順を1翻で判定する", () => {
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

    const results = evaluate(
      hand,
      [meld],
      {
        winningTile: {
          suit: "pin",
          rank: 6
        },
        waitType: "tanki"
      }
    );

    expect(
      getIds(results)
    ).toContain("tanyao");

    expect(
      getHan(
        results,
        "sanshokuDoujun"
      )
    ).toBe(1);
  });

  it("副露一気通貫を1翻、混一色を2翻とする", () => {
    const meld = createMeld(
      "chi",
      "man",
      [1, 2, 3]
    );

    const hand = [
      ...createTiles(
        "man",
        [
          4, 5, 6,
          7, 8, 9,
          5, 5, 5
        ]
      ),
      ...createTiles(
        "honor",
        [1, 1]
      )
    ];

    const results = evaluate(
      hand,
      [meld]
    );

    expect(
      getHan(results, "ittsuu")
    ).toBe(1);

    expect(
      getHan(results, "honitsu")
    ).toBe(2);
  });
});

describe("対子・刻子系の役", () => {
  it("七対子と混老頭を重複する", () => {
    const hand = [
      ...createTiles(
        "man",
        [1, 1, 9, 9]
      ),
      ...createTiles(
        "pin",
        [1, 1, 9, 9]
      ),
      ...createTiles(
        "sou",
        [1, 1, 9, 9]
      ),
      ...createTiles(
        "honor",
        [1, 1]
      )
    ];

    const ids = getIds(
      evaluate(
        hand,
        [],
        {
          decompositionKind:
            "sevenPairs"
        }
      )
    );

    expect(ids).toContain(
      "sevenPairs"
    );
    expect(ids).toContain(
      "honroutou"
    );
  });

  it("対々和・三暗刻・三色同刻を判定する", () => {
    const hand = [
      ...createTiles(
        "man",
        [5, 5, 5]
      ),
      ...createTiles(
        "pin",
        [5, 5, 5]
      ),
      ...createTiles(
        "sou",
        [5, 5, 5]
      ),
      ...createTiles(
        "honor",
        [5, 5, 5]
      ),
      ...createTiles(
        "honor",
        [7, 7]
      )
    ];

    const ids = getIds(
      evaluate(
        hand,
        [],
        {
          winningTile: {
            suit: "honor",
            rank: 7
          },
          waitType: "tanki"
        }
      )
    );

    expect(ids).toContain("toitoi");
    expect(ids).toContain("sanankou");
    expect(ids).toContain(
      "sanshokuDoukou"
    );
  });

  it("小三元を判定する", () => {
    const hand = [
      ...createTiles(
        "honor",
        [5, 5, 5]
      ),
      ...createTiles(
        "honor",
        [6, 6, 6]
      ),
      ...createTiles(
        "honor",
        [7, 7]
      ),
      ...createTiles(
        "honor",
        [1, 1, 1]
      ),
      ...createTiles(
        "honor",
        [2, 2, 2]
      )
    ];

    const ids = getIds(
      evaluate(hand)
    );

    expect(ids).toContain(
      "shousangen"
    );
    expect(ids).toContain(
      "honroutou"
    );
  });

  it("三槓子を判定する", () => {
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
      )
    ];

    const hand = [
      ...createTiles(
        "honor",
        [1, 1, 1, 2, 2]
      )
    ];

    const ids = getIds(
      evaluate(hand, melds)
    );

    expect(ids).toContain(
      "sankantsu"
    );
    expect(ids).toContain("toitoi");
  });
});

describe("順子系と染め手", () => {
  it("一盃口を判定する", () => {
    const hand = [
      ...createTiles(
        "man",
        [
          1, 2, 3,
          1, 2, 3
        ]
      ),
      ...createTiles(
        "pin",
        [4, 5, 6]
      ),
      ...createTiles(
        "sou",
        [7, 8, 9]
      ),
      ...createTiles(
        "honor",
        [3, 3]
      )
    ];

    const ids = getIds(
      evaluate(hand)
    );

    expect(ids).toContain("iipeikou");
    expect(ids).not.toContain(
      "ryanpeikou"
    );
  });

  it("二盃口と一盃口を重複させない", () => {
    const hand = createTiles(
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

    const ids = getIds(
      evaluate(hand)
    );

    expect(ids).toContain(
      "ryanpeikou"
    );
    expect(ids).not.toContain(
      "iipeikou"
    );
    expect(ids).toContain("chinitsu");
  });

  it("一気通貫と混一色を判定する", () => {
    const hand = [
      ...createTiles(
        "man",
        [
          1, 2, 3,
          4, 5, 6,
          7, 8, 9,
          5, 5, 5
        ]
      ),
      ...createTiles(
        "honor",
        [3, 3]
      )
    ];

    const ids = getIds(
      evaluate(hand)
    );

    expect(ids).toContain("ittsuu");
    expect(ids).toContain("honitsu");
  });

  it("混全帯么九を判定する", () => {
    const hand = [
      ...createTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTiles(
        "pin",
        [7, 8, 9]
      ),
      ...createTiles(
        "honor",
        [1, 1, 1]
      ),
      ...createTiles(
        "honor",
        [5, 5, 5]
      ),
      ...createTiles(
        "honor",
        [2, 2]
      )
    ];

    expect(
      getIds(
        evaluate(hand)
      )
    ).toContain("chanta");
  });

  it("純全帯么九を判定する", () => {
    const hand = [
      ...createTiles(
        "man",
        [
          1, 2, 3,
          7, 8, 9
        ]
      ),
      ...createTiles(
        "pin",
        [1, 2, 3, 9, 9, 9]
      ),
      ...createTiles(
        "sou",
        [1, 1]
      )
    ];

    const ids = getIds(
      evaluate(hand)
    );

    expect(ids).toContain("junchan");
    expect(ids).not.toContain("chanta");
  });
});
