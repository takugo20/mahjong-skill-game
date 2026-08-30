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
  createInitialAkuukanGameState
} from "./state";
import type {
  AkuukanGameState
} from "./types";
import {
  resolveAkuukanPlayerWinningYaku,
  resolveAkuukanStandardWinningYaku
} from "./winningEvaluationPipeline";

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

let tileNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  tileNumber += 1;

  return {
    id: `player-pipeline-${tileNumber}`,
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

function createOpenSanshokuContext(
  overrides:
    Partial<YakumanContext> = {}
): YakumanContext {
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
    prevailingWind: "east",
    ...overrides
  };
}

function createOpenRyanpeikouContext(
  overrides:
    Partial<YakumanContext> = {}
): YakumanContext {
  return {
    concealedTiles: [
      createTile("man", 1),
      createTile("man", 2),
      createTile("man", 3),
      createTile("pin", 4),
      createTile("pin", 5),
      createTile("pin", 6),
      createTile("pin", 4),
      createTile("pin", 5),
      createTile("pin", 6),
      createTile("sou", 5),
      createTile("sou", 5)
    ],
    melds: [
      createOpenSequenceMeld("man", 1)
    ],
    decomposition: {
      kind: "standard",
      pair: {
        suit: "sou",
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
      suit: "pin",
      rank: 6
    },
    waitType: "ryanmen",
    winMethod: "ron",
    seatWind: "south",
    prevailingWind: "east",
    ...overrides
  };
}

function createContext(): YakumanContext {
  return {
    concealedTiles: [],
    melds: [],
    decomposition:
      sequenceDecomposition,
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

describe("プレイヤーの役決定パイプライン", () => {
  it("装備スキルの役別加算翻を自動適用する", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context: createContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-1",
            equippedSkills: [
              {
                id: "2-15",
                level: 5
              }
            ]
          })
      });
    const ryanpeikou =
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "ryanpeikou"
      );

    expect(result.normalYakuHan).toBe(8);
    expect(ryanpeikou?.hanAdditions).toEqual([
      {
        sourceId: "player-skill:2-15",
        han: 2
      }
    ]);
  });

  it("対象スキルがなければ通常結果と一致する", () => {
    const context = createContext();
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });

    expect(
      resolveAkuukanPlayerWinningYaku({
        context,
        akuukan
      })
    ).toEqual(
      resolveAkuukanStandardWinningYaku(
        context
      )
    );
  });

  it("無効化中の装備スキルを適用しない", () => {
    const context = createContext();
    const initial =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "2-15",
            level: 5
          }
        ]
      });
    const akuukan: AkuukanGameState = {
      ...initial,
      disabledSources: [
        "player-skill:2-15"
      ]
    };

    expect(
      resolveAkuukanPlayerWinningYaku({
        context,
        akuukan
      })
    ).toEqual(
      resolveAkuukanStandardWinningYaku(
        context
      )
    );
  });

  it("喰い下がり無効の後に役別加算翻を適用する", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createOpenSanshokuContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-1",
            equippedSkills: [
              {
                id: "2-1",
                level: 1
              },
              {
                id: "2-8",
                level: 5
              }
            ]
          })
      });
    const sanshoku =
      result.activeNormalYakuCandidates.find(
        (candidate) =>
          candidate.id ===
          "sanshokuDoujun"
      );

    expect(result.normalYakuHan).toBe(4);
    expect(sanshoku).toMatchObject({
      standardHan: 1,
      openReductionCancelledBy: [
        "player-skill:2-1"
      ],
      hanAdditions: [
        {
          sourceId: "player-skill:2-8",
          han: 2
        }
      ]
    });
  });

  it("2-5と2-6で副露手の二盃口・平和を成立させる", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createOpenRyanpeikouContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-1",
            equippedSkills: [
              {
                id: "2-5",
                level: 1
              },
              {
                id: "2-6",
                level: 1
              }
            ]
          })
      });

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["pinfu", "ryanpeikou"]);
    expect(result.normalYakuHan).toBe(4);
    expect(
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "iipeikou"
      )?.excludedBy
    ).toBe("ryanpeikou");
  });

  it("2-7は副露時の立直・一発・門前清自摸和だけを許可する", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createOpenRyanpeikouContext({
            winMethod: "tsumo",
            doubleRiichi: true,
            ippatsu: true
          }),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-1",
            equippedSkills: [
              {
                id: "2-7",
                level: 1
              }
            ]
          })
      });
    const activeIds =
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      );

    expect(activeIds).toEqual([
      "riichi",
      "ippatsu",
      "menzenTsumo"
    ]);
    expect(activeIds).not.toContain(
      "doubleRiichi"
    );
    expect(activeIds).not.toContain("pinfu");
    expect(activeIds).not.toContain(
      "ryanpeikou"
    );
    expect(result.normalYakuHan).toBe(3);
  });

  it("発動中の1-15で門前限定役と門前時翻数を適用する", () => {
    const initial =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "1-15",
            level: 3
          }
        ]
      });
    const akuukan: AkuukanGameState = {
      ...initial,
      activeEffects: [
        {
          instanceId:
            "active-menzen-kaiki",
          sourceId:
            "player-skill:1-15",
          remainingTurns: 2
        }
      ]
    };
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createOpenSanshokuContext(),
        akuukan
      });

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual([
      "pinfu",
      "sanshokuDoujun"
    ]);
    expect(result.normalYakuHan).toBe(3);
    expect(
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id ===
          "sanshokuDoujun"
      )?.openReductionCancelledBy
    ).toEqual(["player-skill:1-15"]);
  });
});
