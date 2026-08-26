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
  SeatIndex,
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
    id:
      `settlement-responsibility-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createPon(
  suit: TileSuit,
  rank: number,
  calledFrom: SeatIndex
): Meld {
  const tiles = createTiles(
    suit,
    [rank, rank, rank]
  );

  return {
    kind: "pon",
    tiles,
    calledFrom,
    calledTileId: tiles[2]?.id
  };
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

function createBigThreeDragonsHand(): {
  concealedTiles: Tile[];
  melds: Meld[];
} {
  return {
    concealedTiles: [
      ...createTiles(
        "man",
        [1, 2, 3]
      ),
      ...createTiles(
        "pin",
        [2, 2]
      )
    ],
    melds: [
      createPon("honor", 5, 0),
      createPon("honor", 6, 2),
      createPon("honor", 7, 3)
    ]
  };
}

function createBigFourWindsHand(): {
  concealedTiles: Tile[];
  melds: Meld[];
} {
  return {
    concealedTiles: createTiles(
      "man",
      [5, 5]
    ),
    melds: [
      createPon("honor", 1, 1),
      createPon("honor", 2, 2),
      createPon("honor", 3, 3),
      createPon("honor", 4, 2)
    ]
  };
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
  result: ValidWinningSettlement,
  playerId: string
): number | undefined {
  return result.pointChanges.find(
    (change) =>
      change.playerId === playerId
  )?.change;
}

describe(
  "通常の和了精算と責任払いの接続",
  () => {
    it("大三元ツモでは責任者だけが役満全額と本場を支払う", () => {
      const result = requireValid(
        resolveWinningSettlement({
          players: createPlayers(),
          winnerId: "player-1",
          winMethod: "tsumo",
          responsibility: {
            yakumanId:
              "bigThreeDragons",
            responsiblePlayerId:
              "player-3"
          },
          hand: {
            ...createBigThreeDragonsHand(),
            winningTile: {
              suit: "pin",
              rank: 2
            },
            prevailingWind: "east",
            honba: 1,
            riichiSticks: 1
          }
        })
      );

      expect(
        result.evaluation.best.yakuman.map(
          (yakuman) => yakuman.id
        )
      ).toContain("bigThreeDragons");
      expect(result.responsibility).toEqual({
        yakumanId: "bigThreeDragons",
        responsiblePlayerId: "player-3",
        yakumanMultiplier: 1
      });
      expect(getChange(
        result,
        "player-1"
      )).toBe(33300);
      expect(getChange(
        result,
        "player-3"
      )).toBe(-32300);
      expect(getChange(
        result,
        "player-0"
      )).toBe(0);
      expect(getChange(
        result,
        "player-2"
      )).toBe(0);
    });

    it("大三元ロンの第三者放銃では責任者と放銃者が役満部分を折半する", () => {
      const result = requireValid(
        resolveWinningSettlement({
          players: createPlayers(),
          winnerId: "player-1",
          loserId: "player-0",
          winMethod: "ron",
          responsibility: {
            yakumanId:
              "bigThreeDragons",
            responsiblePlayerId:
              "player-3"
          },
          hand: {
            ...createBigThreeDragonsHand(),
            winningTile: {
              suit: "pin",
              rank: 2
            },
            prevailingWind: "east",
            honba: 1,
            riichiSticks: 2
          }
        })
      );

      expect(getChange(
        result,
        "player-1"
      )).toBe(34300);
      expect(getChange(
        result,
        "player-0"
      )).toBe(-16300);
      expect(getChange(
        result,
        "player-3"
      )).toBe(-16000);
      expect(getChange(
        result,
        "player-2"
      )).toBe(0);
    });

    it("親の大四喜ツモではダブル役満全額を責任者が支払う", () => {
      const result = requireValid(
        resolveWinningSettlement({
          players: createPlayers(),
          winnerId: "player-0",
          winMethod: "tsumo",
          responsibility: {
            yakumanId: "bigFourWinds",
            responsiblePlayerId:
              "player-2"
          },
          hand: {
            ...createBigFourWindsHand(),
            winningTile: {
              suit: "man",
              rank: 5
            },
            prevailingWind: "east"
          }
        })
      );

      expect(
        result.evaluation.best
          .yakumanMultiplier
      ).toBe(2);
      expect(result.responsibility).toEqual({
        yakumanId: "bigFourWinds",
        responsiblePlayerId: "player-2",
        yakumanMultiplier: 2
      });
      expect(getChange(
        result,
        "player-0"
      )).toBe(96000);
      expect(getChange(
        result,
        "player-2"
      )).toBe(-96000);
      expect(getChange(
        result,
        "player-1"
      )).toBe(0);
      expect(getChange(
        result,
        "player-3"
      )).toBe(0);
    });

    it("申告された対象役満がなければ通常精算を維持する", () => {
      const result = requireValid(
        resolveWinningSettlement({
          players: createPlayers(),
          winnerId: "player-1",
          loserId: "player-2",
          winMethod: "ron",
          responsibility: {
            yakumanId:
              "bigThreeDragons",
            responsiblePlayerId:
              "player-3"
          },
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

      expect(result.responsibility).toBeNull();
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
        "player-3"
      )).toBe(0);
    });
  }
);
