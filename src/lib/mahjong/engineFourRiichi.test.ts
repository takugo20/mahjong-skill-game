import {
  describe,
  expect,
  it
} from "vitest";
import {
  canPlayerRon,
  createInitialGameState,
  declarePlayerRiichi,
  declarePlayerRon,
  playPlayerDiscard,
  skipPlayerRon
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
    id: `engine-four-riichi-${serialNumber}`,
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

function createDiscard(
  tile: Tile,
  riichiDeclaration = false
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration,
    faceDown: false,
    called: false
  };
}

function createRiichiHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    createTile("man", 5),
    createTile("pin", 5)
  ];
}

function createPinFiveRonHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("man", [6, 7, 8]),
    ...createTiles("sou", [2, 3, 4]),
    ...createTiles(
      "honor",
      [5, 5, 5]
    ),
    createTile("pin", 5)
  ];
}

function createLiveWall(
  firstTile?: Tile
): Tile[] {
  return [
    ...(firstTile ? [firstTile] : []),
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 9),
    createTile("pin", 9),
    createTile("sou", 9),
    createTile("honor", 7)
  ];
}

function setEstablishedRiichi(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[] = []
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    discards: [
      createDiscard(
        createTile("honor", seat + 1),
        true
      )
    ],
    score: 24000,
    riichi: true,
    doubleRiichi: false,
    ippatsu: true,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createPlayerFourthRiichiState(): {
  state: GameState;
  declarationTile: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const hand = createRiichiHand();
  const declarationTile = hand[12];

  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds: [],
    discards: [],
    score: 25000,
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: hand[13].id,
    drawnTileSource: "liveWall"
  };

  setEstablishedRiichi(state, 1);
  setEstablishedRiichi(state, 2);
  setEstablishedRiichi(state, 3);

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.riichiPool = 3000;
  state.round.liveWall = createLiveWall();
  state.round.lastDiscard = null;

  return {
    state,
    declarationTile
  };
}

function createCpuFourthRiichiState(): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const playerDiscard =
    createTile("honor", 7);
  const cpuCompleteHand =
    createRiichiHand();
  const cpuDraw =
    cpuCompleteHand[
      cpuCompleteHand.length - 1
    ];

  setEstablishedRiichi(
    state,
    0,
    [
      ...createPinFiveRonHand(),
      playerDiscard
    ]
  );
  state.round.players[0] = {
    ...state.round.players[0],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };

  state.round.players[1] = {
    ...state.round.players[1],
    hand: cpuCompleteHand.slice(0, -1),
    melds: [],
    discards: [],
    score: 25000,
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };

  setEstablishedRiichi(state, 2);
  setEstablishedRiichi(state, 3);

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.riichiPool = 3000;
  state.round.liveWall =
    createLiveWall(cpuDraw);
  state.round.lastDiscard = null;

  return {
    state,
    playerDiscard
  };
}

describe("四家立直のゲーム進行", () => {
  it("プレイヤーが4人目の立直を成立させると途中流局にする", () => {
    const {
      state,
      declarationTile
    } = createPlayerFourthRiichiState();

    const result = declarePlayerRiichi(
      state,
      declarationTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourRiichi",
      riichiSeats: [0, 1, 2, 3]
    });
    expect(
      result.round.players[0].riichi
    ).toBe(true);
    expect(
      result.round.players[0].score
    ).toBe(24000);
    expect(result.round.riichiPool).toBe(
      4000
    );
    expect(result.notice).toBe(
      "四家立直で途中流局です。"
    );
  });

  it("4人目の宣言牌がロンされた場合は立直も途中流局も成立しない", () => {
    const {
      state,
      declarationTile
    } = createPlayerFourthRiichiState();
    const cpuWinningHand =
      createRiichiHand().filter(
        (_, index) => index !== 13
      );

    setEstablishedRiichi(
      state,
      1,
      cpuWinningHand
    );

    const result = declarePlayerRiichi(
      state,
      declarationTile.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 1,
      loserSeat: 0
    });
    expect(
      result.round.players[0].riichi
    ).toBe(false);
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
  });

  it("CPUの4人目の宣言牌にロンできる間は立直を成立させない", () => {
    const {
      state,
      playerDiscard
    } = createCpuFourthRiichiState();

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(canPlayerRon(result)).toBe(
      true
    );
    expect(
      result.round.players[1].riichi
    ).toBe(false);
    expect(result.round.riichiPool).toBe(
      3000
    );
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();

    const ronResult =
      declarePlayerRon(result);

    expect(ronResult.round.winResult)
      .toMatchObject({
        winMethod: "ron",
        winnerSeat: 0,
        loserSeat: 1
      });
    expect(
      ronResult.round.players[1].riichi
    ).toBe(false);
  });

  it("CPUの4人目の宣言牌を見逃すと立直成立後に途中流局にする", () => {
    const {
      state,
      playerDiscard
    } = createCpuFourthRiichiState();
    const reactionState =
      playPlayerDiscard(
        state,
        playerDiscard.id,
        () => 0.5
      );

    const result = skipPlayerRon(
      reactionState,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.players[1].riichi
    ).toBe(true);
    expect(
      result.round.players[1].score
    ).toBe(24000);
    expect(result.round.riichiPool).toBe(
      4000
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "fourRiichi",
      riichiSeats: [0, 1, 2, 3]
    });
  });
});
