import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  playPlayerDiscard,
  skipPlayerRon,
  startNextRound
} from "./engine";
import type {
  Discard,
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
    id: `engine-draw-${serialNumber}`,
    suit,
    rank,
    red: false
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

function createTenpaiHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [3, 4, 5, 6, 7]
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

function createNonTenpaiHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 4, 5, 7, 8]
    ),
    ...createTiles(
      "pin",
      [1, 2, 4, 5, 7, 8]
    ),
    createTile("honor", 1)
  ];
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

describe("荒牌流局のゲーム内精算", () => {
  it("最後の打牌後に全員を判定して不聴罰符を反映する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    const finalDiscard = createTile(
      "man",
      5
    );

    state.round.liveWall = [];

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...createTenpaiHand(),
        finalDiscard
      ],
      drawnTileId: finalDiscard.id
    };

    for (
      let seat = 1;
      seat < 4;
      seat += 1
    ) {
      state.round.players[seat] = {
        ...state.round.players[seat],
        hand: createNonTenpaiHand(),
        drawnTileId: null
      };
    }

    const result = playPlayerDiscard(
      state,
      finalDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );

    expect(result.round.drawResult).toEqual({
      tenpaiSeats: [0],
      notenSeats: [1, 2, 3],
      pointChanges: [
        {
          playerId: "player-0",
          seat: 0,
          pointsBefore: 25000,
          change: 3000,
          pointsAfter: 28000
        },
        {
          playerId: "player-1",
          seat: 1,
          pointsBefore: 25000,
          change: -1000,
          pointsAfter: 24000
        },
        {
          playerId: "player-2",
          seat: 2,
          pointsBefore: 25000,
          change: -1000,
          pointsAfter: 24000
        },
        {
          playerId: "player-3",
          seat: 3,
          pointsBefore: 25000,
          change: -1000,
          pointsAfter: 24000
        }
      ]
    });

    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      28000,
      24000,
      24000,
      24000
    ]);

    expect(
      result.round.winResult
    ).toBeNull();
  });

  it("最後のロンを見送った場合も流局精算して次局へ引き継ぐ", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "reaction";
    state.round.liveWall = [];

    state.round.lastDiscard = {
      seat: 1,
      discard: createDiscard(
        createTile("honor", 7)
      )
    };

    state.round.players[0] = {
      ...state.round.players[0],
      hand: createTenpaiHand(),
      drawnTileId: null
    };

    state.round.players[1] = {
      ...state.round.players[1],
      hand: createNonTenpaiHand(),
      drawnTileId: null
    };

    state.round.players[2] = {
      ...state.round.players[2],
      hand: createTenpaiHand(),
      drawnTileId: null
    };

    state.round.players[3] = {
      ...state.round.players[3],
      hand: createNonTenpaiHand(),
      drawnTileId: null
    };

    const settled = skipPlayerRon(state);

    expect(
      settled.round.drawResult
        ?.tenpaiSeats
    ).toEqual([
      0,
      2
    ]);

    expect(
      settled.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      26500,
      23500,
      26500,
      23500
    ]);

    const nextRound = startNextRound(
      settled,
      createSeededRandom(7)
    );

    expect(
      nextRound.round.handNumber
    ).toBe(1);

    expect(
      nextRound.round.honba
    ).toBe(1);

    expect(
      nextRound.round.drawResult
    ).toBeNull();

    expect(
      nextRound.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      26500,
      23500,
      26500,
      23500
    ]);
  });
});
