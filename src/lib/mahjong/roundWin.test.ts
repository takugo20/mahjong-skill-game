import {
  describe,
  expect,
  it
} from "vitest";
import {
  evaluateRoundWin,
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
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `round-win-${serialNumber}`,
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

function createDiscard(
  tile: Tile
): Discard {
  return {
    tile,
    tsumogiri: true,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
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

describe("局内ツモ和了", () => {
  it("ツモ牌を和了牌として点数を精算する", () => {
    const round = createRound();
    const hand = createPinfuHand();
    const winningTile = hand[0];

    round.currentSeat = 1;
    round.honba = 1;
    round.riichiPool = 1000;
    round.players[1] = {
      ...round.players[1],
      hand,
      riichi: true,
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
        "ツモ和了が成立しませんでした"
      );
    }

    expect(result.winningTile).toBe(
      winningTile
    );
    expect(result.loserSeat).toBeNull();
    expect(
      result.evaluation.best.totalHan
    ).toBe(3);
    expect(
      result.evaluation.best.fu?.fu
    ).toBe(20);
    expect(getChange(result, 1)).toBe(4000);
    expect(getChange(result, 0)).toBe(-1400);
    expect(getChange(result, 2)).toBe(-800);
    expect(getChange(result, 3)).toBe(-800);
    expect(
      result.playersAfter[1].score
    ).toBe(29000);
    expect(round.players[1].score).toBe(25000);
  });

  it("他家の手番ではツモを宣言できない", () => {
    const round = createRound();
    const hand = createPinfuHand();

    round.currentSeat = 0;
    round.players[1] = {
      ...round.players[1],
      hand,
      drawnTileId: hand[0].id
    };

    expect(() =>
      evaluateRoundWin({
        round,
        winnerSeat: 1,
        winMethod: "tsumo",
        doraIndicators: []
      })
    ).toThrow(
      "現在はツモ和了を宣言できる手番ではありません"
    );
  });
});

describe("局内ロン和了", () => {
  it("最後の捨て牌を手牌へ加えて精算する", () => {
    const round = createRound();
    const completedHand =
      createPinfuHand();
    const winningTile =
      completedHand[0];

    round.honba = 2;
    round.riichiPool = 1000;
    round.currentSeat = 3;
    round.phase = "drawing";
    round.players[1] = {
      ...round.players[1],
      hand: completedHand.slice(1),
      riichi: true
    };
    round.players[2] = {
      ...round.players[2],
      discards: [
        createDiscard(winningTile)
      ]
    };
    round.lastDiscard = {
      seat: 2,
      discard: createDiscard(winningTile)
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
        "ロン和了が成立しませんでした"
      );
    }

    expect(result.winnerSeat).toBe(1);
    expect(result.loserSeat).toBe(2);
    expect(getChange(result, 1)).toBe(3600);
    expect(getChange(result, 2)).toBe(-2600);
    expect(getChange(result, 0)).toBe(0);
    expect(getChange(result, 3)).toBe(0);
  });

  it("槓宣言牌を和了牌として槓宣言者から槍槓する", () => {
    const round = createRound();
    const completedHand =
      createPinfuHand();
    const winningTile =
      completedHand[0];
    const unrelatedDiscard =
      createTile("honor", 7);

    round.phase = "reaction";
    round.players[1] = {
      ...round.players[1],
      hand: completedHand.slice(1)
    };
    round.lastDiscard = {
      seat: 3,
      discard:
        createDiscard(unrelatedDiscard)
    };

    const result = resolveRoundWin({
      round,
      winnerSeat: 1,
      winMethod: "ron",
      doraIndicators: [],
      chankanSource: {
        declarerSeat: 2,
        winningTile
      }
    });

    expect(result.valid).toBe(true);

    if (!result.valid) {
      throw new Error(
        "槍槓が成立しませんでした"
      );
    }

    expect(result.winningTile).toBe(
      winningTile
    );
    expect(result.loserSeat).toBe(2);
    expect(
      result.evaluation.best.normalYaku
        .map((yaku) => yaku.name)
    ).toContain("槍槓");
    expect(getChange(result, 1)).toBe(2000);
    expect(getChange(result, 2)).toBe(-2000);
    expect(getChange(result, 3)).toBe(0);
  });

  it("槍槓対象牌なしでは最後の捨て牌を代用しない", () => {
    const round = createRound();
    const completedHand =
      createPinfuHand();
    const winningTile =
      completedHand[0];

    round.phase = "reaction";
    round.players[1] = {
      ...round.players[1],
      hand: completedHand.slice(1)
    };
    round.lastDiscard = {
      seat: 2,
      discard: createDiscard(winningTile)
    };

    expect(() =>
      evaluateRoundWin({
        round,
        winnerSeat: 1,
        winMethod: "ron",
        doraIndicators: [],
        chankan: true
      })
    ).toThrow(
      "槍槓ロンの対象牌がありません"
    );
  });

  it("役なしなら精算しない", () => {
    const round = createRound();
    const winningTile =
      createTile("pin", 4);

    const meld: Meld = {
      kind: "chi",
      tiles: createTiles(
        "man",
        [2, 3, 4]
      )
    };

    round.currentSeat = 3;
    round.phase = "drawing";
    round.players[1] = {
      ...round.players[1],
      hand: [
        ...createTiles("pin", [5, 6]),
        ...createTiles("sou", [6, 7, 8]),
        ...createTiles("man", [6, 7, 8]),
        ...createTiles("honor", [3, 3])
      ],
      melds: [meld]
    };
    round.lastDiscard = {
      seat: 2,
      discard: createDiscard(winningTile)
    };

    const doraIndicator =
      createTile("honor", 2);

    const result = resolveRoundWin({
      round,
      winnerSeat: 1,
      winMethod: "ron",
      doraIndicators: [doraIndicator]
    });

    expect(result).toEqual({
      valid: false,
      reason: "noYaku",
      evaluation: {
        valid: false,
        reason: "noYaku",
        candidates: []
      }
    });
  });
    it("子の4翻30符ロンを切り上げ満貫とする", () => {
    const round = createRound();
    const completedHand =
      createPinfuHand();
    const winningTile =
      completedHand[0];

    round.currentSeat = 3;
    round.phase = "drawing";
    round.players[1] = {
      ...round.players[1],
      hand: completedHand.slice(1),
      riichi: true
    };
    round.lastDiscard = {
      seat: 2,
      discard: createDiscard(winningTile)
    };

    const result = resolveRoundWin({
      round,
      winnerSeat: 1,
      winMethod: "ron",
      doraIndicators: [
        createTile("man", 1),
        createTile("man", 1)
      ]
    });

    expect(result.valid).toBe(true);

    if (!result.valid) {
      throw new Error(
        "切り上げ満貫が成立しませんでした"
      );
    }

    expect(
      result.evaluation.best.totalHan
    ).toBe(4);
    expect(
      result.evaluation.best.fu?.fu
    ).toBe(30);
    expect(
      result.evaluation.best.score.limit
    ).toBe("mangan");
    expect(getChange(result, 1)).toBe(8000);
    expect(getChange(result, 2)).toBe(-8000);
  });
});

describe("供託点の検証", () => {
  it("1000点単位でない供託を拒否する", () => {
    const round = createRound();
    const hand = createPinfuHand();

    round.riichiPool = 500;
    round.players[0] = {
      ...round.players[0],
      hand,
      drawnTileId: hand[0].id
    };

    expect(() =>
      evaluateRoundWin({
        round,
        winnerSeat: 0,
        winMethod: "tsumo",
        doraIndicators: []
      })
    ).toThrow(
      "供託点は1000点単位で指定してください"
    );
  });
});
