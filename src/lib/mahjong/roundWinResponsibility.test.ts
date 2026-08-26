import {
  describe,
  expect,
  it
} from "vitest";
import {
  resolveRoundWin
} from "./roundWin";
import type {
  Discard,
  Meld,
  PlayerState,
  RoundState,
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
      `round-win-responsibility-${serialNumber}`,
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
  rank: number,
  calledFrom: SeatIndex
): Meld {
  const tiles = createTiles(
    "honor",
    [rank, rank, rank]
  );

  return {
    kind: "pon",
    tiles,
    calledFrom,
    calledTileId: tiles[2]?.id
  };
}

function createPlayer(
  seat: SeatIndex,
  wind: Wind
): PlayerState {
  return {
    id: `player-${seat}`,
    name:
      seat === 0
        ? "あなた"
        : `CPU ${seat}`,
    seat,
    seatWind: wind,
    score: 25000,
    hand: [],
    melds: [],
    discards: [],
    isDealer: seat === 0,
    riichi: false,
    ippatsu: false,
    drawnTileId: null
  };
}

function createRound(): RoundState {
  return {
    prevailingWind: "east",
    handNumber: 1,
    honba: 0,
    riichiPool: 0,
    liveWall: [createTile("man", 9)],
    deadWall: [],
    players: [
      createPlayer(0, "east"),
      createPlayer(1, "south"),
      createPlayer(2, "west"),
      createPlayer(3, "north")
    ],
    currentSeat: 0,
    phase: "discarding",
    lastDiscard: null,
    turnNumber: 0,
    kanCount: 0,
    doraIndicatorCount: 1,
    rinshanDrawCount: 0
  };
}

function createDiscard(
  tile: Tile
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createBigThreeDragonsMelds():
  Meld[] {
  return [
    createPon(5, 0),
    createPon(6, 2),
    createPon(7, 3)
  ];
}

function createSmallConcealedPart():
  Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 3]
    ),
    ...createTiles(
      "pin",
      [2, 2]
    )
  ];
}

function getChange(
  result:
    ReturnType<typeof resolveRoundWin>,
  seat: SeatIndex
): number | undefined {
  if (!result.valid) {
    return undefined;
  }

  return result.pointChanges.find(
    (change) => change.seat === seat
  )?.change;
}

describe(
  "局内和了の責任者自動判定",
  () => {
    it("3種類目の三元牌を鳴かせた者へ大三元ツモの全額を請求する", () => {
      const round = createRound();
      const hand =
        createSmallConcealedPart();
      const winningTile = hand[4];

      if (!winningTile) {
        throw new Error(
          "ツモ牌を作成できませんでした"
        );
      }

      round.currentSeat = 1;
      round.honba = 1;
      round.riichiPool = 1000;
      round.players[1] = {
        ...round.players[1],
        hand,
        melds:
          createBigThreeDragonsMelds(),
        drawnTileId: winningTile.id
      };

      const result = resolveRoundWin({
        round,
        winnerSeat: 1,
        winMethod: "tsumo",
        doraIndicators: []
      });

      expect(result.valid).toBe(true);

      if (!result.valid) {
        throw new Error(
          "大三元ツモが成立しませんでした"
        );
      }

      expect(
        result.evaluation.best.yakuman.map(
          (yakuman) => yakuman.id
        )
      ).toContain("bigThreeDragons");
      expect(getChange(result, 1)).toBe(33300);
      expect(getChange(result, 3)).toBe(-32300);
      expect(getChange(result, 0)).toBe(0);
      expect(getChange(result, 2)).toBe(0);
      expect(
        result.playersAfter[3].score
      ).toBe(-7300);
    });

    it("大三元ロンでは責任者と第三者の放銃者が役満部分を折半する", () => {
      const round = createRound();
      const completedHand =
        createSmallConcealedPart();
      const winningTile =
        completedHand[4];

      if (!winningTile) {
        throw new Error(
          "ロン牌を作成できませんでした"
        );
      }

      round.phase = "drawing";
      round.honba = 1;
      round.riichiPool = 2000;
      round.players[1] = {
        ...round.players[1],
        hand: completedHand.slice(0, 4),
        melds:
          createBigThreeDragonsMelds()
      };
      round.players[0] = {
        ...round.players[0],
        discards: [
          createDiscard(winningTile)
        ]
      };
      round.lastDiscard = {
        seat: 0,
        discard: createDiscard(
          winningTile
        )
      };

      const result = resolveRoundWin({
        round,
        winnerSeat: 1,
        winMethod: "ron",
        doraIndicators: []
      });

      expect(result.valid).toBe(true);

      if (!result.valid) {
        throw new Error(
          "大三元ロンが成立しませんでした"
        );
      }

      expect(result.loserSeat).toBe(0);
      expect(getChange(result, 1)).toBe(34300);
      expect(getChange(result, 0)).toBe(-16300);
      expect(getChange(result, 3)).toBe(-16000);
      expect(getChange(result, 2)).toBe(0);
    });

    it("4種類目の風牌を鳴かせた者へ大四喜ダブル役満の全額を請求する", () => {
      const round = createRound();
      const hand = createTiles(
        "man",
        [5, 5]
      );
      const winningTile = hand[1];

      if (!winningTile) {
        throw new Error(
          "ツモ牌を作成できませんでした"
        );
      }

      round.players[0] = {
        ...round.players[0],
        hand,
        melds: [
          createPon(1, 1),
          createPon(2, 3),
          createPon(3, 1),
          createPon(4, 2)
        ],
        drawnTileId: winningTile.id
      };

      const result = resolveRoundWin({
        round,
        winnerSeat: 0,
        winMethod: "tsumo",
        doraIndicators: []
      });

      expect(result.valid).toBe(true);

      if (!result.valid) {
        throw new Error(
          "大四喜ツモが成立しませんでした"
        );
      }

      expect(
        result.evaluation.best
          .yakumanMultiplier
      ).toBe(2);
      expect(getChange(result, 0)).toBe(96000);
      expect(getChange(result, 2)).toBe(-96000);
      expect(getChange(result, 1)).toBe(0);
      expect(getChange(result, 3)).toBe(0);
    });

    it("最後の三元牌を暗刻で完成させた場合は通常のツモ払いにする", () => {
      const round = createRound();
      const hand = [
        ...createTiles(
          "honor",
          [7, 7, 7]
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
      const winningTile = hand[7];

      if (!winningTile) {
        throw new Error(
          "ツモ牌を作成できませんでした"
        );
      }

      round.currentSeat = 1;
      round.players[1] = {
        ...round.players[1],
        hand,
        melds: [
          createPon(5, 0),
          createPon(6, 3)
        ],
        drawnTileId: winningTile.id
      };

      const result = resolveRoundWin({
        round,
        winnerSeat: 1,
        winMethod: "tsumo",
        doraIndicators: []
      });

      expect(result.valid).toBe(true);

      if (!result.valid) {
        throw new Error(
          "大三元ツモが成立しませんでした"
        );
      }

      expect(
        result.evaluation.best.yakuman.map(
          (yakuman) => yakuman.id
        )
      ).toContain("bigThreeDragons");
      expect(getChange(result, 1)).toBe(32000);
      expect(getChange(result, 0)).toBe(-16000);
      expect(getChange(result, 2)).toBe(-8000);
      expect(getChange(result, 3)).toBe(-8000);
    });
  }
);
