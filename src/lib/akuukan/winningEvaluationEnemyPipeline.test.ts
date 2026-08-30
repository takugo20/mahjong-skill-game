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
import {
  recordAkuukanE6WinningYaku
} from "./winningEvaluationEnemyAbilityHistory";
import {
  resolveAkuukanOpponentWinningYaku,
  resolveAkuukanPlayerWinningYaku,
  resolveAkuukanStandardWinningYaku
} from "./winningEvaluationPipeline";

let tileNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  tileNumber += 1;

  return {
    id: `enemy-pipeline-${tileNumber}`,
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

function createOpenRyanpeikouContext(): YakumanContext {
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
    prevailingWind: "east"
  };
}

function createSevenPairsContext(): YakumanContext {
  const pairs: Array<{
    suit: TileSuit;
    rank: number;
  }> = [
    { suit: "man", rank: 1 },
    { suit: "man", rank: 2 },
    { suit: "pin", rank: 3 },
    { suit: "pin", rank: 4 },
    { suit: "sou", rank: 5 },
    { suit: "sou", rank: 6 },
    { suit: "honor", rank: 1 }
  ];

  return {
    concealedTiles: pairs.flatMap(
      (pair) => [
        createTile(pair.suit, pair.rank),
        createTile(pair.suit, pair.rank)
      ]
    ),
    melds: [],
    decomposition: {
      kind: "sevenPairs",
      pairs
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

function createThirteenOrphansContext(): YakumanContext {
  const tileTypes: Array<{
    suit: TileSuit;
    rank: number;
  }> = [
    { suit: "man", rank: 1 },
    { suit: "man", rank: 9 },
    { suit: "pin", rank: 1 },
    { suit: "pin", rank: 9 },
    { suit: "sou", rank: 1 },
    { suit: "sou", rank: 9 },
    { suit: "honor", rank: 1 },
    { suit: "honor", rank: 2 },
    { suit: "honor", rank: 3 },
    { suit: "honor", rank: 4 },
    { suit: "honor", rank: 5 },
    { suit: "honor", rank: 6 },
    { suit: "honor", rank: 7 },
    { suit: "man", rank: 1 }
  ];

  return {
    concealedTiles: tileTypes.map(
      (tile) =>
        createTile(tile.suit, tile.rank)
    ),
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
    winMethod: "tsumo",
    seatWind: "south",
    prevailingWind: "east"
  };
}

const closedSequenceDecomposition:
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

function createClosedSequenceContext(): YakumanContext {
  return {
    concealedTiles: [],
    melds: [],
    decomposition:
      closedSequenceDecomposition,
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

describe("敵能力対応の役決定パイプライン", () => {
  it("E-6は初回の役を記録後、同じ役を毎回2倍にする", () => {
    const context =
      createClosedSequenceContext();
    const initial =
      createInitialAkuukanGameState({
        enemyId: "enemy-3",
        equippedSkills: []
      });
    const firstResult =
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan: initial,
        winnerIsSelectedEnemy: true
      });
    const recorded =
      recordAkuukanE6WinningYaku({
        akuukan: initial,
        winnerIsSelectedEnemy: true,
        normalYakuIds:
          firstResult
            .activeNormalYakuCandidates
            .map(
              (candidate) => candidate.id
            )
      });
    const secondResult =
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan: recorded,
        winnerIsSelectedEnemy: true
      });
    const recordedAgain =
      recordAkuukanE6WinningYaku({
        akuukan: recorded,
        winnerIsSelectedEnemy: true,
        normalYakuIds:
          secondResult
            .activeNormalYakuCandidates
            .map(
              (candidate) => candidate.id
            )
      });
    const thirdResult =
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan: recordedAgain,
        winnerIsSelectedEnemy: true
      });

    expect(firstResult.normalYakuHan).toBe(6);
    expect(secondResult.normalYakuHan).toBe(
      12
    );
    expect(thirdResult.normalYakuHan).toBe(12);
    expect(recordedAgain).toBe(recorded);
    expect(
      secondResult.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "ryanpeikou"
      )?.fixedHanChanges
    ).toEqual([
      {
        sourceId: "enemy-ability:E-6",
        han: 6
      }
    ]);
  });

  it("E-6は同じ役を和了した通常CPUへ適用しない", () => {
    const context =
      createClosedSequenceContext();
    const akuukan =
      recordAkuukanE6WinningYaku({
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-3",
            equippedSkills: []
          }),
        winnerIsSelectedEnemy: true,
        normalYakuIds: [
          "doubleRiichi",
          "pinfu",
          "ryanpeikou"
        ]
      });

    expect(
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan,
        winnerIsSelectedEnemy: false
      })
    ).toEqual(
      resolveAkuukanStandardWinningYaku(
        context
      )
    );
  });
  
  it("E-14を特殊敵本人の副露手だけへ適用する", () => {
    const context =
      createOpenSanshokuContext();
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-5",
        equippedSkills: []
      });
    const selectedEnemyResult =
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan,
        winnerIsSelectedEnemy: true
      });
    const normalCpuResult =
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan,
        winnerIsSelectedEnemy: false
      });

    expect(
      selectedEnemyResult
        .activeNormalYakuCandidates.map(
          (candidate) => candidate.id
        )
    ).toEqual([
      "pinfu",
      "sanshokuDoujun"
    ]);
    expect(
      selectedEnemyResult.normalYakuHan
    ).toBe(3);
    expect(normalCpuResult).toEqual(
      resolveAkuukanStandardWinningYaku(
        context
      )
    );
  });

  it("E-7をプレイヤーの標準2翻以上の役へ適用する", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createClosedSequenceContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-7",
            equippedSkills: []
          })
      });

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual([
      "riichi",
      "pinfu",
      "iipeikou"
    ]);
    expect(result.normalYakuHan).toBe(3);
    expect(
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "ryanpeikou"
      )?.invalidatedBy
    ).toEqual(["enemy-ability:E-7"]);
    expect(result.hasValidWinningShape).toBe(
      true
    );
    expect(result.hasValidYaku).toBe(true);
  });

  it("E-7で七対子が無効なら門前清自摸和が残っても和了不可にする", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context: createSevenPairsContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-7",
            equippedSkills: []
          })
      });

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["menzenTsumo"]);
    expect(
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "sevenPairs"
      )?.invalidatedBy
    ).toEqual(["enemy-ability:E-7"]);
    expect(result.hasValidWinningShape).toBe(
      false
    );
    expect(result.hasValidYaku).toBe(false);
  });

  it("E-7で国士無双系が無効なら門前清自摸和が残っても和了不可にする", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createThirteenOrphansContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-7",
            equippedSkills: []
          })
      });

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["menzenTsumo"]);
    expect(
      result.activeYakumanCandidates
    ).toEqual([]);
    expect(
      result.yakumanCandidates.find(
        (candidate) =>
          candidate.id ===
          "thirteenOrphansThirteenSided"
      )?.invalidatedBy
    ).toEqual(["enemy-ability:E-7"]);
    expect(
      result.yakumanCandidates.find(
        (candidate) =>
          candidate.id ===
          "thirteenOrphans"
      )?.invalidatedBy
    ).toEqual(["enemy-ability:E-7"]);
    expect(result.hasValidWinningShape).toBe(
      false
    );
    expect(result.hasValidYaku).toBe(false);
  });
  
  it("E-7を通常CPUへ適用し特殊敵本人へは適用しない", () => {
    const context =
      createClosedSequenceContext();
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-7",
        equippedSkills: []
      });
    const normalCpuResult =
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan,
        winnerIsSelectedEnemy: false
      });
    const selectedEnemyResult =
      resolveAkuukanOpponentWinningYaku({
        context,
        akuukan,
        winnerIsSelectedEnemy: true
      });

    expect(
      normalCpuResult.normalYakuHan
    ).toBe(3);
    expect(selectedEnemyResult).toEqual(
      resolveAkuukanStandardWinningYaku(
        context
      )
    );
  });

  it("プレイヤーの成立許可を敵能力判定前に反映する", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createOpenRyanpeikouContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-7",
            equippedSkills: [
              {
                id: "2-5",
                level: 1
              },
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

    expect(
      ryanpeikou?.abilityGrants
    ).toEqual([
      {
        sourceId: "player-skill:2-5",
        han: 3
      }
    ]);
    expect(ryanpeikou?.invalidatedBy).toEqual([
      "enemy-ability:E-7"
    ]);
    expect(ryanpeikou?.hanAdditions).toEqual([]);
    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["iipeikou"]);
    expect(result.normalYakuHan).toBe(3);
  });

  it("E-17を立直以外の標準1翻役へ適用する", () => {
    const result =
      resolveAkuukanPlayerWinningYaku({
        context:
          createOpenSanshokuContext(),
        akuukan:
          createInitialAkuukanGameState({
            enemyId: "enemy-9",
            equippedSkills: [
              {
                id: "2-6",
                level: 1
              }
            ]
          })
      });

    expect(
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "pinfu"
      )?.invalidatedBy
    ).toEqual(["enemy-ability:E-17"]);
    expect(
      result.normalYakuCandidates.find(
        (candidate) =>
          candidate.id ===
          "sanshokuDoujun"
      )?.invalidatedBy
    ).toEqual(["enemy-ability:E-17"]);
    expect(result.hasValidYaku).toBe(false);
  });
});
