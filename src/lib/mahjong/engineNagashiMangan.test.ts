import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  playPlayerDiscard,
  startNextRound
} from "./engine";
import type {
  Discard,
  GameState,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-nagashi-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createDiscard(
  tile: Tile,
  called = false
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called
  };
}

function createSeededRandom(
  initialSeed: number
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (
      seed * 1664525 +
      1013904223
    ) >>> 0;

    return seed / 4294967296;
  };
}

function prepareFinalDiscard(
  state: GameState,
  finalDiscard: Tile
): void {
  state.round.liveWall = [];
  state.round.players[0] = {
    ...state.round.players[0],
    hand: [finalDiscard],
    drawnTileId: finalDiscard.id
  };

  for (
    let seat = 1;
    seat < 4;
    seat += 1
  ) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      drawnTileId: null
    };
  }
}

function getChange(
  state: GameState,
  seat: SeatIndex
): number | undefined {
  return state.round
    .nagashiManganResult
    ?.pointChanges.find(
      (change) => change.seat === seat
    )?.change;
}

describe("流し満貫のゲーム内精算", () => {
  it("荒牌時に親の流し満貫を不聴罰符より優先して精算する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const finalDiscard = createTile(
      "honor",
      7
    );

    prepareFinalDiscard(
      state,
      finalDiscard
    );
    state.round.honba = 1;
    state.round.riichiPool = 1000;
    state.round.players[0].discards = [
      createDiscard(
        createTile("man", 1)
      )
    ];

    const result = playPlayerDiscard(
      state,
      finalDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.drawResult
    ).toBeNull();
    expect(
      result.round.nagashiManganResult
        ?.winnerSeats
    ).toEqual([0]);
    expect(
      result.round.nagashiManganResult
        ?.riichiPoolRecipientSeat
    ).toBe(0);
    expect(getChange(result, 0)).toBe(
      13300
    );
    expect(getChange(result, 1)).toBe(
      -4100
    );
    expect(getChange(result, 2)).toBe(
      -4100
    );
    expect(getChange(result, 3)).toBe(
      -4100
    );
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      38300,
      20900,
      20900,
      20900
    ]);
    expect(result.round.riichiPool).toBe(
      0
    );
  });

  it("親を含まない流し満貫では親を流して本場を0に戻す", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const finalDiscard = createTile(
      "man",
      5
    );

    prepareFinalDiscard(
      state,
      finalDiscard
    );
    state.round.honba = 2;
    state.round.players[1].discards = [
      createDiscard(
        createTile("pin", 9)
      ),
      createDiscard(
        createTile("honor", 1)
      )
    ];

    const settled = playPlayerDiscard(
      state,
      finalDiscard.id,
      () => 0.5
    );

    expect(
      settled.round.nagashiManganResult
        ?.winnerSeats
    ).toEqual([1]);
    expect(
      settled.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      20800,
      33600,
      22800,
      22800
    ]);

    const nextRound = startNextRound(
      settled,
      createSeededRandom(17)
    );

    expect(
      nextRound.round.handNumber
    ).toBe(2);
    expect(nextRound.round.honba).toBe(0);
    expect(
      nextRound.round.players[1].isDealer
    ).toBe(true);
    expect(
      nextRound.round.nagashiManganResult
    ).toBeNull();
  });

  it("親が流し満貫なら同じ局で連荘して本場を増やす", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const finalDiscard = createTile(
      "honor",
      6
    );

    prepareFinalDiscard(
      state,
      finalDiscard
    );
    state.round.honba = 2;
    state.round.players[0].discards = [
      createDiscard(
        createTile("sou", 1)
      )
    ];

    const settled = playPlayerDiscard(
      state,
      finalDiscard.id,
      () => 0.5
    );
    const nextRound = startNextRound(
      settled,
      createSeededRandom(19)
    );

    expect(
      nextRound.round.handNumber
    ).toBe(1);
    expect(nextRound.round.honba).toBe(3);
    expect(
      nextRound.round.players[0].isDealer
    ).toBe(true);
  });
});
