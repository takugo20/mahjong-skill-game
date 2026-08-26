import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  getPlayerSelfKanOptions,
  playPlayerDiscard
} from "./engine";
import type {
  GameState,
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
    id: `engine-riichi-kan-${serialNumber}`,
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

function createAllowedHand(): {
  beforeDraw: Tile[];
  drawnTile: Tile;
} {
  return {
    beforeDraw: [
      ...createTiles(
        "man",
        [1, 1, 1, 2, 3, 4]
      ),
      ...createTiles(
        "pin",
        [4, 5, 6]
      ),
      ...createTiles(
        "sou",
        [7, 8]
      ),
      ...createTiles(
        "honor",
        [5, 5]
      )
    ],
    drawnTile: createTile("man", 1)
  };
}

function createWaitChangingHand(): {
  beforeDraw: Tile[];
  drawnTile: Tile;
} {
  return {
    beforeDraw: [
      ...createTiles(
        "man",
        [4, 5, 5, 5]
      ),
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles(
        "sou",
        [7, 8, 9]
      )
    ],
    drawnTile: createTile("man", 5)
  };
}

function setPlayerRiichiHand(
  state: GameState,
  beforeDraw: Tile[],
  drawnTile: Tile
): void {
  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...beforeDraw,
      drawnTile
    ],
    melds: [],
    riichi: true,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: drawnTile.id,
    drawnTileSource: "liveWall"
  };
}

function setCpuRiichiHand(
  state: GameState,
  hand: Tile[]
): void {
  state.round.players[1] = {
    ...state.round.players[1],
    hand,
    melds: [],
    riichi: true,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function setEmptyCpuHand(
  state: GameState,
  seat: 2 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

function setLiveWallAfterFirstDraw(
  state: GameState,
  firstDraw: Tile
): void {
  state.round.liveWall = [
    firstDraw,
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 9),
    createTile("pin", 9),
    createTile("sou", 1)
  ];
}

function setPlayerDiscard(
  state: GameState
): Tile {
  const discard = createTile(
    "honor",
    7
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [discard],
    melds: [],
    drawnTileId: discard.id,
    drawnTileSource: "liveWall"
  };

  return discard;
}

describe("立直後暗槓のゲーム進行", () => {
  it("条件を維持するプレイヤーの暗槓を候補にする", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const {
      beforeDraw,
      drawnTile
    } = createAllowedHand();

    setPlayerRiichiHand(
      state,
      beforeDraw,
      drawnTile
    );

    const options =
      getPlayerSelfKanOptions(state);

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "closedKan"
    });
    expect(
      options[0].kind === "closedKan" &&
      options[0].tileIds.includes(
        drawnTile.id
      )
    ).toBe(true);
  });

  it("待ちが変わるプレイヤーの暗槓を候補にしない", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const {
      beforeDraw,
      drawnTile
    } = createWaitChangingHand();

    setPlayerRiichiHand(
      state,
      beforeDraw,
      drawnTile
    );

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);
  });

  it("条件を維持するCPUの暗槓を成立させる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const discard = setPlayerDiscard(
      state
    );
    const {
      beforeDraw,
      drawnTile
    } = createAllowedHand();

    setCpuRiichiHand(
      state,
      beforeDraw
    );
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setLiveWallAfterFirstDraw(
      state,
      drawnTile
    );
    state.round.deadWall[0] =
      createTile("honor", 7);

    const result = playPlayerDiscard(
      state,
      discard.id,
      () => 0.5
    );
    const cpu = result.round.players[1];

    expect(cpu.melds).toHaveLength(1);
    expect(cpu.melds[0]).toMatchObject({
      kind: "closedKan"
    });
    expect(result.round.kanCount).toBe(1);
  });

  it("待ちが変わるCPUの暗槓をせずツモ切りする", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const discard = setPlayerDiscard(
      state
    );
    const {
      beforeDraw,
      drawnTile
    } = createWaitChangingHand();

    setCpuRiichiHand(
      state,
      beforeDraw
    );
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setLiveWallAfterFirstDraw(
      state,
      drawnTile
    );

    const result = playPlayerDiscard(
      state,
      discard.id,
      () => 0.5
    );
    const cpu = result.round.players[1];

    expect(cpu.melds).toEqual([]);
    expect(result.round.kanCount).toBe(0);
    expect(cpu.discards[0]).toMatchObject({
      tile: drawnTile,
      tsumogiri: true
    });
  });
});
