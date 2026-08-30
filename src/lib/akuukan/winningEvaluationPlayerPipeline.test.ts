import {
  describe,
  expect,
  it
} from "vitest";
import type {
  WinningHandDecomposition
} from "../mahjong/hand";
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
});
