import {
  canPlayerDeclareNineTerminals,
  createInitialGameState,
  declarePlayerNineTerminals,
  playPlayerDiscard,
  startNextRound
} from "./engine";
import type {
  GameState,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";
import {
  describe,
  expect,
  it
} from "vitest";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-nine-terminals-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

const YAOCHU_TILE_TYPES = [
  ["man", 1],
  ["man", 9],
  ["pin", 1],
  ["pin", 9],
  ["sou", 1],
  ["sou", 9],
  ["honor", 1],
  ["honor", 2],
  ["honor", 3],
  ["honor", 4],
  ["honor", 5],
  ["honor", 6],
  ["honor", 7]
] as const;

function createFirstDrawHand(
  distinctYaochuCount: number
): Tile[] {
  const selectedTypes =
    YAOCHU_TILE_TYPES.slice(
      0,
      distinctYaochuCount
    );
  const hand = selectedTypes.map(
    ([suit, rank]) =>
      createTile(suit, rank)
  );

  let fillerIndex = 0;

  while (
    hand.length < 14 &&
    selectedTypes.length > 0
  ) {
    const [suit, rank] =
      selectedTypes[
        fillerIndex %
          selectedTypes.length
      ];

    hand.push(createTile(suit, rank));
    fillerIndex += 1;
  }

  return hand;
}

function setFirstDraw(
  state: GameState,
  seat: SeatIndex,
  distinctYaochuCount: number
): void {
  const hand = createFirstDrawHand(
    distinctYaochuCount
  );
  const drawnTile = hand[hand.length - 1];

  state.round.currentSeat = seat;
  state.round.phase = "discarding";
  state.round.kanCount = 0;
  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        melds: [],
        discards: [],
        riichi: false,
        doubleRiichi: false,
        ippatsu: false,
        drawnTileId: null,
        drawnTileSource: null
      })
    );
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    drawnTileId: drawnTile.id,
    drawnTileSource: "liveWall"
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

function prepareCpuFirstDraw(
  concealedTiles: Tile[],
  drawnTile: Tile
): {
  state: GameState;
  playerDiscard: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const playerDiscard = createTile(
    "man",
    5
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    discards: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: concealedTiles,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.players[2] = {
    ...state.round.players[2],
    hand: [],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.players[3] = {
    ...state.round.players[3],
    hand: [],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.liveWall = [
    drawnTile,
    createTile("man", 2),
    createTile("man", 3),
    createTile("pin", 2),
    createTile("pin", 3),
    createTile("sou", 2),
    createTile("sou", 3),
    createTile("honor", 5)
  ];

  return {
    state,
    playerDiscard
  };
}

describe("九種九牌のゲーム進行", () => {
  it("プレイヤーが宣言すると点数を動かさず途中流局にする", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    setFirstDraw(state, 0, 9);
    state.round.honba = 2;
    state.round.riichiPool = 2000;

    const scoresBefore =
      state.round.players.map(
        (player) => player.score
      );

    expect(
      canPlayerDeclareNineTerminals(
        state
      )
    ).toBe(true);

    const result =
      declarePlayerNineTerminals(
        state
      );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toEqual({
      reason: "nineTerminals",
      declarerSeat: 0,
      distinctYaochuCount: 9
    });
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual(scoresBefore);
    expect(result.round.riichiPool).toBe(
      2000
    );
    expect(result.round.drawResult).toBeNull();
    expect(result.notice).toBe(
      "九種九牌を宣言したため、途中流局です。"
    );
  });

  it("条件を満たさない手牌では宣言できない", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    setFirstDraw(state, 0, 8);

    expect(
      canPlayerDeclareNineTerminals(
        state
      )
    ).toBe(false);

    const result =
      declarePlayerNineTerminals(
        state
      );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
    expect(result.notice).toBe(
      "現在は九種九牌を宣言できません。"
    );
  });

  it("次局は親を継続し本場を増やして供託を持ち越す", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    setFirstDraw(state, 0, 9);
    state.round.honba = 2;
    state.round.riichiPool = 2000;
    state.round.players[0].score = 24000;
    state.round.players[1].score = 26000;

    const endedState =
      declarePlayerNineTerminals(
        state
      );
    const result = startNextRound(
      endedState,
      createSeededRandom(1)
    );

    expect(result.round.handNumber).toBe(1);
    expect(result.round.honba).toBe(3);
    expect(result.round.riichiPool).toBe(
      2000
    );
    expect(
      result.round.players[0].isDealer
    ).toBe(true);
    expect(
      result.round.players.map(
        (player) => player.score
      )
    ).toEqual([
      24000,
      26000,
      25000,
      25000
    ]);
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
  });

  it("CPUも第1ツモで条件を満たせば九種九牌を宣言する", () => {
    const completeHand =
      createFirstDrawHand(9);
    const drawnTile =
      completeHand[completeHand.length - 1];
    const {
      state,
      playerDiscard
    } = prepareCpuFirstDraw(
      completeHand.slice(0, -1),
      drawnTile
    );

    state.round.riichiPool = 1000;

    const scoresBefore =
      state.round.players.map(
        (player) => player.score
      );
    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toMatchObject({
      reason: "nineTerminals",
      declarerSeat: 1
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
      "CPU・右が九種九牌を宣言したため、途中流局です。"
    );
  });

  it("CPUがツモ和了できる場合は九種九牌より和了を優先する", () => {
    const kokushiTiles =
      YAOCHU_TILE_TYPES.map(
        ([suit, rank]) =>
          createTile(suit, rank)
      );
    const drawnTile = createTile(
      "man",
      1
    );
    const {
      state,
      playerDiscard
    } = prepareCpuFirstDraw(
      kokushiTiles,
      drawnTile
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.abortiveDrawResult
    ).toBeNull();
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 1,
      winningTile: drawnTile
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain(
      "国士無双十三面待ち"
    );
  });
});
