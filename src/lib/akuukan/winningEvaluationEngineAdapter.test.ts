import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Meld,
  Tile,
  TileSuit
} from "../mahjong/types";
import type {
  YakumanContext
} from "../mahjong/yakuman";
import {
  createInitialAkuukanGameState
} from "./state";
import type {
  AkuukanGameState
} from "./types";
import {
  createAkuukanWinningCandidateYakuEvaluator
} from "./winningEvaluationEngineAdapter";

let tileNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  tileNumber += 1;

  return {
    id: `engine-adapter-${tileNumber}`,
    suit,
    rank,
    red: false
  };
}

function createOpenSequenceMeld(
  suit: "man" | "pin" | "sou",
  startRank: number
): Meld {
  return {
    kind: "chi",
    tiles: [
      createTile(suit, startRank),
      createTile(suit, startRank + 1),
      createTile(suit, startRank + 2)
    ]
  };
}

function createClosedRyanpeikouContext(): YakumanContext {
  return {
    concealedTiles: [],
    melds: [],
    decomposition: {
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
    winningTile: {
      suit: "man",
      rank: 3
    },
    waitType: "ryanmen",
    winMethod: "ron",
    seatWind: "south",
    prevailingWind: "east",
    doubleRiichi: true
  };
}

function createSevenPairsContext(): YakumanContext {
  return {
    concealedTiles: [],
    melds: [],
    decomposition: {
      kind: "sevenPairs",
      pairs: [
        { suit: "man", rank: 1 },
        { suit: "man", rank: 2 },
        { suit: "pin", rank: 3 },
        { suit: "pin", rank: 4 },
        { suit: "sou", rank: 5 },
        { suit: "sou", rank: 6 },
        { suit: "honor", rank: 1 }
      ]
    },
    winningTile: {
      suit: "honor",
      rank: 1
    },
    waitType: "tanki",
    winMethod: "tsumo",
    seatWind: "south",
    prevailingWind: "east"
  };
}

function createOpenSanshokuContext(): YakumanContext {
  return {
    concealedTiles: [
      createTile("pin", 1),
      createTile("pin", 2),
      createTile("pin", 3),
      createTile("sou", 1),
      createTile("sou", 2),
      createTile("sou", 3),
      createTile("man", 4),
      createTile("man", 5),
      createTile("man", 6),
      createTile("pin", 5),
      createTile("pin", 5)
    ],
    melds: [
      createOpenSequenceMeld("man", 1)
    ],
    decomposition: {
      kind: "standard",
      pair: {
        suit: "pin",
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
    winningTile: {
      suit: "sou",
      rank: 3
    },
    waitType: "ryanmen",
    winMethod: "ron",
    seatWind: "south",
    prevailingWind: "east"
  };
}

function createClosedPinfuContext(): YakumanContext {
  return {
    concealedTiles: [],
    melds: [],
    decomposition: {
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
          startRank: 4
        },
        {
          kind: "sequence",
          suit: "pin",
          startRank: 1
        },
        {
          kind: "sequence",
          suit: "sou",
          startRank: 4
        }
      ]
    },
    winningTile: {
      suit: "man",
      rank: 3
    },
    waitType: "ryanmen",
    winMethod: "ron",
    seatWind: "south",
    prevailingWind: "east",
    riichi: true
  };
}

function createThirteenOrphansContext(): YakumanContext {
  return {
    concealedTiles: [],
    melds: [],
    decomposition: {
      kind: "thirteenOrphans",
      pair: {
        suit: "man",
        rank: 1
      }
    },
    winningTile: {
      suit: "man",
      rank: 1
    },
    waitType: "kokushiThirteenSided",
    winMethod: "ron",
    seatWind: "south",
    prevailingWind: "east"
  };
}

function getIdAndHan(
  yaku: {
    readonly id: string;
    readonly han: number;
  }
): [string, number] {
  return [yaku.id, yaku.han];
}

describe("亜空間役判定の通常エンジン変換", () => {
  it("E-6で変更された最終翻数を変換する", () => {
    const akuukan: AkuukanGameState = {
      ...createInitialAkuukanGameState({
        enemyId: "enemy-3",
        equippedSkills: []
      }),
      e6LastWinningNormalYakuIds: [
        "doubleRiichi",
        "pinfu",
        "ryanpeikou"
      ]
    };
    const evaluate =
      createAkuukanWinningCandidateYakuEvaluator(
        {
          akuukan,
          owner: "selectedEnemy"
        }
      );
    const result = evaluate(
      createClosedRyanpeikouContext()
    );

    expect(
      result.normalYaku.map(getIdAndHan)
    ).toEqual([
      ["doubleRiichi", 4],
      ["pinfu", 2],
      ["ryanpeikou", 6]
    ]);
    expect(result.hasValidYaku).toBe(true);
  });

  it("E-7で七対子形が無効なら残存役と和了不可を両方渡す", () => {
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-7",
        equippedSkills: []
      });
    const evaluate =
      createAkuukanWinningCandidateYakuEvaluator(
        {
          akuukan,
          owner: "player"
        }
      );
    const result = evaluate(
      createSevenPairsContext()
    );

    expect(
      result.normalYaku.map(getIdAndHan)
    ).toEqual([["menzenTsumo", 1]]);
    expect(result.yakuman).toEqual([]);
    expect(result.hasValidYaku).toBe(false);
  });

  it("E-14で能力者本人の副露手を門前翻へ変換する", () => {
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-5",
        equippedSkills: []
      });
    const evaluate =
      createAkuukanWinningCandidateYakuEvaluator(
        {
          akuukan,
          owner: "selectedEnemy"
        }
      );
    const result = evaluate(
      createOpenSanshokuContext()
    );

    expect(
      result.normalYaku.map(getIdAndHan)
    ).toEqual([
      ["pinfu", 1],
      ["sanshokuDoujun", 2]
    ]);
    expect(result.hasValidYaku).toBe(true);
  });

  it("E-17で通常CPUの平和を無効にして立直だけを渡す", () => {
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-9",
        equippedSkills: []
      });
    const evaluate =
      createAkuukanWinningCandidateYakuEvaluator(
        {
          akuukan,
          owner: "normalOpponent"
        }
      );
    const result = evaluate(
      createClosedPinfuContext()
    );

    expect(
      result.normalYaku.map(getIdAndHan)
    ).toEqual([["riichi", 1]]);
    expect(result.hasValidYaku).toBe(true);
  });

  it("国士無双十三面待ちを2倍役満として変換する", () => {
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });
    const evaluate =
      createAkuukanWinningCandidateYakuEvaluator(
        {
          akuukan,
          owner: "normalOpponent"
        }
      );
    const result = evaluate(
      createThirteenOrphansContext()
    );

    expect(result.normalYaku).toEqual([]);
    expect(result.yakuman).toEqual([
      {
        id:
          "thirteenOrphansThirteenSided",
        name: "国士無双十三面待ち",
        multiplier: 2
      }
    ]);
    expect(result.hasValidYaku).toBe(true);
  });
});
