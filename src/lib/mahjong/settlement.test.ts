import {
  describe,
  expect,
  it
} from "vitest";
import {
  resolveWinningSettlement
} from "./settlement";
import type {
  RoundScorePlayer,
  ValidWinningSettlement,
  WinningSettlementResult
} from "./settlement";
import type {
  Meld,
  Tile,
  TileSuit,
  Wind
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `settlement-test-${serialNumber}`,
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

interface TestPlayer
  extends RoundScorePlayer {
  name: string;
}

function createPlayers(): TestPlayer[] {
  const winds: Wind[] = [
    "east",
    "south",
    "west",
    "north"
  ];

  return winds.map((wind, index) => ({
    id: `player-${index}`,
    name:
      index === 0
        ? "あなた"
        : `CPU ${index}`,
    wind,
    points: 25000
  }));
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

function requireValid<
  TPlayer extends RoundScorePlayer
>(
  result:
    WinningSettlementResult<TPlayer>
): ValidWinningSettlement<TPlayer> {
  if (!result.valid) {
    throw new Error(
      `和了精算に失敗しました: ${result.reason}`
    );
  }

  return result;
}

function getChange(
  result:
    ValidWinningSettlement,
  playerId: string
): number | undefined {
  return result.pointChanges.find(
    (change) =>
      change.playerId === playerId
  )?.change;
}

describe("ロン和了の精算", () => {
  it("放銃者から和了者へ点数を移す", () => {
    const result = requireValid(
      resolveWinningSettlement({
        players: createPlayers(),
        winnerId: "player-1",
        loserId: "player-2",
        winMethod: "ron",
        hand: {
          concealedTiles:
            createPinfuHand(),
          winningTile: {
            suit: "man",
            rank: 2
          },
          prevailingWind: "east",
          riichi: true,
          honba: 2,
          riichiSticks: 1
        }
      })
    );

    expect(result.winnerId).toBe(
      "player-1"
    );
    expect(result.loserId).toBe(
      "player-2"
    );
    expect(
      result.evaluation.best.totalHan
    ).toBe(2);
    expect(
      result.evaluation.best.fu?.fu
    ).toBe(30);
    expect(getChange(
      result,
      "player-1"
    )).toBe(3600);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-2600);
    expect(getChange(
      result,
      "player-0"
    )).toBe(0);
    expect(getChange(
      result,
      "player-3"
    )).toBe(0);
    expect(
      result.playersAfter[1]?.points
    ).toBe(28600);
    expect(
      result.playersAfter[2]?.points
    ).toBe(22400);
    expect(
      result.playersAfter[1]?.name
    ).toBe("CPU 1");
  });
});

describe("ツモ和了の精算", () => {
  it("子のツモで親と子の支払額を分ける", () => {
    const result = requireValid(
      resolveWinningSettlement({
        players: createPlayers(),
        winnerId: "player-1",
        winMethod: "tsumo",
        hand: {
          concealedTiles:
            createPinfuHand(),
          winningTile: {
            suit: "man",
            rank: 2
          },
          prevailingWind: "east",
          riichi: true,
          honba: 1,
          riichiSticks: 1
        }
      })
    );

    expect(result.loserId).toBeNull();
    expect(
      result.evaluation.best.totalHan
    ).toBe(3);
    expect(
      result.evaluation.best.fu?.fu
    ).toBe(20);
    expect(getChange(
      result,
      "player-1"
    )).toBe(4000);
    expect(getChange(
      result,
      "player-0"
    )).toBe(-1400);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-800);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-800);
  });

  it("親のツモで子3人から同額を受け取る", () => {
    const result = requireValid(
      resolveWinningSettlement({
        players: createPlayers(),
        winnerId: "player-0",
        winMethod: "tsumo",
        hand: {
          concealedTiles:
            createPinfuHand(),
          winningTile: {
            suit: "man",
            rank: 2
          },
          prevailingWind: "east",
          riichi: true
        }
      })
    );

    expect(getChange(
      result,
      "player-0"
    )).toBe(3900);
    expect(getChange(
      result,
      "player-1"
    )).toBe(-1300);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-1300);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-1300);
  });
});

describe("無効和了と入力検証", () => {
  it("ドラだけの和了では点数を移動しない", () => {
    const meld: Meld = {
      kind: "chi",
      tiles: createTiles(
        "man",
        [2, 3, 4]
      )
    };

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

    const result =
      resolveWinningSettlement({
        players: createPlayers(),
        winnerId: "player-1",
        loserId: "player-2",
        winMethod: "ron",
        hand: {
          concealedTiles: hand,
          melds: [meld],
          winningTile: {
            suit: "pin",
            rank: 4
          },
          prevailingWind: "east",
          doraIndicators: [
            {
              suit: "honor",
              rank: 2
            }
          ]
        }
      });

    expect(result.valid).toBe(false);

    if (result.valid) {
      throw new Error(
        "役なし和了が成立しています"
      );
    }

    expect(result.reason).toBe("noYaku");
    expect(result.evaluation).toEqual({
      valid: false,
      reason: "noYaku",
      candidates: []
    });
  });

  it("ロンでは放銃者を必須とする", () => {
    expect(() =>
      resolveWinningSettlement({
        players: createPlayers(),
        winnerId: "player-1",
        winMethod: "ron",
        hand: {
          concealedTiles:
            createPinfuHand(),
          winningTile: {
            suit: "man",
            rank: 2
          },
          prevailingWind: "east",
          riichi: true
        }
      })
    ).toThrow(
      "ロン和了では放銃者を指定してください"
    );
  });

  it("4人未満では精算しない", () => {
    expect(() =>
      resolveWinningSettlement({
        players:
          createPlayers().slice(0, 3),
        winnerId: "player-1",
        winMethod: "tsumo",
        hand: {
          concealedTiles:
            createPinfuHand(),
          winningTile: {
            suit: "man",
            rank: 2
          },
          prevailingWind: "east",
          riichi: true
        }
      })
    ).toThrow(
      "和了精算には4人のプレイヤーが必要です"
    );
  });
});
