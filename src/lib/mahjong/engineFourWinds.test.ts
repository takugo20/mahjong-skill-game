import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerMeldCall,
  playPlayerDiscard,
  skipPlayerRon
} from "./engine";
import type {
  Discard,
  GameState,
  MeldCallOption,
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
    id: `engine-four-winds-${serialNumber}`,
    suit,
    rank,
    red: false
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

function createLiveWall(): Tile[] {
  return Array.from(
    { length: 12 },
    (_, index) =>
      createTile(
        "man",
        index % 9 + 1
      )
  );
}

function preparePlayerFourthDiscard(
  otherWindRank = 1
): {
  state: GameState;
  fourthDiscardTile: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const fourthDiscardTile =
    createTile("honor", 1);

  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        hand: [],
        melds: [],
        discards: [],
        riichi: false,
        doubleRiichi: false,
        ippatsu: false,
        drawnTileId: null,
        drawnTileSource: null
      })
    );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [fourthDiscardTile],
    drawnTileId: fourthDiscardTile.id,
    drawnTileSource: "liveWall"
  };

  for (
    let seat = 1 as SeatIndex;
    seat <= 3;
    seat = (seat + 1) as SeatIndex
  ) {
    const rank =
      seat === 3
        ? otherWindRank
        : 1;

    const discard = createDiscard(
      createTile("honor", rank)
    );

    state.round.players[seat] = {
      ...state.round.players[seat],
      discards: [discard]
    };
  }

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 3;
  state.round.kanCount = 0;
  state.round.liveWall = createLiveWall();
  state.round.lastDiscard = {
    seat: 3,
    discard:
      state.round.players[3]
        .discards[0]
  };

  return {
    state,
    fourthDiscardTile
  };
}

function createFourWindsReactionState(): {
  state: GameState;
  ponOption: MeldCallOption;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const firstEast =
    createTile("honor", 1);
  const secondEast =
    createTile("honor", 1);

  const playerDiscard = createDiscard(
    createTile("honor", 1)
  );
  const lastDiscard = createDiscard(
    createTile("honor", 1)
  );

  const ponOption: MeldCallOption = {
    id: "engine-four-winds-pon",
    kind: "pon",
    callerSeat: 0,
    discarderSeat: 3,
    calledTileId:
      lastDiscard.tile.id,
    handTileIds: [
      firstEast.id,
      secondEast.id
    ]
  };

  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        hand: [],
        melds: [],
        discards: [
          createDiscard(
            createTile("honor", 1)
          )
        ],
        riichi: false,
        doubleRiichi: false,
        ippatsu: false,
        drawnTileId: null,
        drawnTileSource: null
      })
    );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      firstEast,
      secondEast,
      ...Array.from(
        { length: 11 },
        (_, index) =>
          createTile(
            "man",
            index % 9 + 1
          )
      )
    ],
    discards: [playerDiscard]
  };

  state.round.players[3] = {
    ...state.round.players[3],
    discards: [lastDiscard]
  };

  state.round.currentSeat = 0;
  state.round.phase = "reaction";
  state.round.turnNumber = 4;
  state.round.kanCount = 0;
  state.round.liveWall = createLiveWall();
  state.round.lastDiscard = {
    seat: 3,
    discard: lastDiscard
  };
  state.round.meldCallOptions = [
    ponOption
  ];

  return {
    state,
    ponOption
  };
}

describe("四風連打のゲーム進行", () => {
  it("4人の第1打が同じ風牌なら途中流局にする", () => {
    const {
      state,
      fourthDiscardTile
    } = preparePlayerFourthDiscard();

    state.round.honba = 2;
    state.round.riichiPool = 1000;

    const scoresBefore =
      state.round.players.map(
        (player) => player.score
      );

    const result = playPlayerDiscard(
      state,
      fourthDiscardTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourWinds",
      wind: "east"
    });
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual(scoresBefore);
    expect(result.round.riichiPool).toBe(
      1000
    );
    expect(result.notice).toBe(
      "四風連打で途中流局です。"
    );
  });

  it("第1打の風牌が1人でも異なれば途中流局にしない", () => {
    const {
      state,
      fourthDiscardTile
    } = preparePlayerFourthDiscard(2);

    const result = playPlayerDiscard(
      state,
      fourthDiscardTile.id,
      () => 0.5
    );

    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
  });

  it("4枚目への副露を見送ると四風連打にする", () => {
    const {
      state
    } = createFourWindsReactionState();

    const result = skipPlayerRon(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourWinds",
      wind: "east"
    });
  });

  it("4枚目がポンされた場合は四風連打にしない", () => {
    const {
      state,
      ponOption
    } = createFourWindsReactionState();

    const result =
      declarePlayerMeldCall(
        state,
        ponOption.id
      );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(
      result.round.players[0]
        .melds[0]?.kind
    ).toBe("pon");
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
  });
});
