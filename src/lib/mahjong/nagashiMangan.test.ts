import {
  describe,
  expect,
  it
} from "vitest";
import {
  isNagashiManganEligible,
  resolveNagashiManganSettlement
} from "./nagashiMangan";
import type {
  NagashiManganSettlementResult
} from "./nagashiMangan";
import type {
  Discard,
  Tile,
  TileSuit,
  Wind
} from "./types";

interface TestPlayer {
  id: string;
  name: string;
  wind: Wind;
  points: number;
  discards: Discard[];
}

function createTile(
  id: string,
  suit: TileSuit,
  rank: number
): Tile {
  return {
    id,
    suit,
    rank,
    red: false
  };
}

function createDiscard(
  id: string,
  suit: TileSuit,
  rank: number,
  called = false
): Discard {
  return {
    tile: createTile(id, suit, rank),
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called
  };
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
    points: 25000,
    discards: [
      createDiscard(
        `middle-${index}`,
        "man",
        5
      )
    ]
  }));
}

function makeEligible(
  player: TestPlayer
): void {
  player.discards = [
    createDiscard(
      `${player.id}-terminal`,
      "sou",
      1
    ),
    createDiscard(
      `${player.id}-honor`,
      "honor",
      7
    )
  ];
}

function getChange(
  result:
    NagashiManganSettlementResult,
  playerId: string
): number | undefined {
  return result.pointChanges.find(
    (change) =>
      change.playerId === playerId
  )?.change;
}

describe("流し満貫の成立判定", () => {
  it("1枚以上の捨て牌がすべて么九牌なら成立候補になる", () => {
    expect(
      isNagashiManganEligible([
        createDiscard("m1", "man", 1),
        createDiscard("p9", "pin", 9),
        createDiscard(
          "east",
          "honor",
          1
        )
      ])
    ).toBe(true);
  });

  it("捨て牌なし・中張牌・副露された捨て牌では成立しない", () => {
    expect(
      isNagashiManganEligible([])
    ).toBe(false);
    expect(
      isNagashiManganEligible([
        createDiscard("m5", "man", 5)
      ])
    ).toBe(false);
    expect(
      isNagashiManganEligible([
        createDiscard(
          "m9",
          "man",
          9,
          true
        )
      ])
    ).toBe(false);
  });
});

describe("流し満貫の点数精算", () => {
  it("成立者がいなければ通常流局へ委ねる", () => {
    expect(
      resolveNagashiManganSettlement({
        players: createPlayers(),
        honba: 0,
        riichiPool: 0
      })
    ).toBeNull();
  });

  it("親1人の成立を満貫ツモとして精算する", () => {
    const players = createPlayers();
    makeEligible(players[0]);

    const result =
      resolveNagashiManganSettlement({
        players,
        honba: 2,
        riichiPool: 1000
      });

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.winnerIds).toEqual([
      "player-0"
    ]);
    expect(
      result.riichiPoolRecipientId
    ).toBe("player-0");
    expect(getChange(
      result,
      "player-0"
    )).toBe(13600);
    expect(getChange(
      result,
      "player-1"
    )).toBe(-4200);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-4200);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-4200);
  });

  it("子1人の成立では親と子の支払額を分ける", () => {
    const players = createPlayers();
    makeEligible(players[2]);

    const result =
      resolveNagashiManganSettlement({
        players,
        honba: 1,
        riichiPool: 2000
      });

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(getChange(
      result,
      "player-0"
    )).toBe(-4100);
    expect(getChange(
      result,
      "player-1"
    )).toBe(-2100);
    expect(getChange(
      result,
      "player-2"
    )).toBe(10300);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-2100);
  });

  it("複数成立では成立者同士の支払いも含めて差額を合算する", () => {
    const players = createPlayers();
    makeEligible(players[0]);
    makeEligible(players[1]);

    const result =
      resolveNagashiManganSettlement({
        players,
        honba: 1,
        riichiPool: 2000
      });

    expect(result).not.toBeNull();
    if (!result) {
      return;
    }

    expect(result.winnerIds).toEqual([
      "player-0",
      "player-1"
    ]);
    expect(
      result.riichiPoolRecipientId
    ).toBe("player-0");
    expect(getChange(
      result,
      "player-0"
    )).toBe(10200);
    expect(getChange(
      result,
      "player-1"
    )).toBe(4200);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-6200);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-6200);
    expect(
      result.pointChanges.reduce(
        (total, change) =>
          total + change.change,
        0
      )
    ).toBe(2000);
  });

  it("入力順に関係なく親から最も近い成立者へ供託を渡す", () => {
    const players = createPlayers();
    makeEligible(players[1]);
    makeEligible(players[3]);

    const result =
      resolveNagashiManganSettlement({
        players: [
          players[3],
          players[2],
          players[1],
          players[0]
        ],
        honba: 0,
        riichiPool: 3000
      });

    expect(result?.winnerIds).toEqual([
      "player-1",
      "player-3"
    ]);
    expect(
      result?.riichiPoolRecipientId
    ).toBe("player-1");
    expect(
      result?.playersAfter[0].name
    ).toBe("CPU 3");
  });
});
