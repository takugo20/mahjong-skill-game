import {
  canPlayerRon,
  createInitialGameState,
  playPlayerDiscard,
  skipPlayerRon
} from "./engine";
import type {
  Discard,
  GameState,
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
    id: `engine-cpu-riichi-${serialNumber}`,
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

function createNormalDiscard(
  tile = createTile("honor", 1)
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function setPlayerDiscard(
  state: GameState,
  concealedHand: Tile[] = []
): Tile {
  const discard = createTile(
    "honor",
    7
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...concealedHand,
      discard
    ],
    melds: [],
    drawnTileId: discard.id,
    drawnTileSource: "liveWall"
  };

  return discard;
}

function setCpuReadyForRiichi(
  state: GameState,
  hasPriorDiscard = false
): Tile {
  const completeHand = createRiichiHand();
  const drawnTile =
    completeHand[completeHand.length - 1];

  state.round.players[1] = {
    ...state.round.players[1],
    hand: completeHand.slice(0, -1),
    melds: [],
    discards: hasPriorDiscard
      ? [createNormalDiscard()]
      : [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };

  return drawnTile;
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

function setLiveWall(
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
    createTile("sou", 9)
  ];
}

function createPinFiveRonHand(): Tile[] {
  return [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("man", [6, 7, 8]),
    ...createTiles("sou", [2, 3, 4]),
    ...createTiles("honor", [5, 5, 5]),
    createTile("pin", 5)
  ];
}

function setCpuHand(
  state: GameState,
  hand: Tile[]
): void {
  state.round.players[2] = {
    ...state.round.players[2],
    hand,
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createCpuRiichiTurn(
  hasPriorDiscard = false,
  playerHand: Tile[] = []
): {
  state: GameState;
  playerDiscard: Tile;
  cpuDraw: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const playerDiscard = setPlayerDiscard(
    state,
    playerHand
  );
  const cpuDraw = setCpuReadyForRiichi(
    state,
    hasPriorDiscard
  );

  setEmptyCpuHand(state, 2);
  setEmptyCpuHand(state, 3);
  setLiveWall(state, cpuDraw);

  return {
    state,
    playerDiscard,
    cpuDraw
  };
}

describe("CPU立直のゲーム進行", () => {
  it("CPUの第1打ならダブル立直を成立させる", () => {
    const {
      state,
      playerDiscard,
      cpuDraw
    } = createCpuRiichiTurn();

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const cpu = result.round.players[1];
    const declarationDiscard =
      cpu.discards[0];

    expect(cpu.riichi).toBe(true);
    expect(cpu.doubleRiichi).toBe(true);
    expect(cpu.ippatsu).toBe(true);
    expect(cpu.score).toBe(24000);
    expect(result.round.riichiPool).toBe(
      1000
    );
    expect(declarationDiscard).toMatchObject({
      tile: {
        id: cpuDraw.id
      },
      tsumogiri: true,
      riichiDeclaration: true
    });
  });

  it("既打牌があれば通常立直にする", () => {
    const {
      state,
      playerDiscard
    } = createCpuRiichiTurn(true);

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const cpu = result.round.players[1];

    expect(cpu.riichi).toBe(true);
    expect(cpu.doubleRiichi).toBe(false);
    expect(cpu.discards).toHaveLength(2);
    expect(
      cpu.discards[1].riichiDeclaration
    ).toBe(true);
  });

  it("プレイヤーが宣言牌でロンできる間は立直を成立させない", () => {
    const {
      state,
      playerDiscard,
      cpuDraw
    } = createCpuRiichiTurn(
      false,
      createPinFiveRonHand()
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const cpu = result.round.players[1];

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(canPlayerRon(result)).toBe(true);
    expect(cpu.riichi).toBe(false);
    expect(cpu.doubleRiichi).toBe(false);
    expect(cpu.score).toBe(25000);
    expect(result.round.riichiPool).toBe(0);
    expect(
      result.round.lastDiscard?.discard
        .tile.id
    ).toBe(cpuDraw.id);
    expect(
      result.round.lastDiscard?.discard
        .riichiDeclaration
    ).toBe(true);
  });

  it("プレイヤーがロンを見逃すとCPUの立直を成立させる", () => {
    const {
      state,
      playerDiscard
    } = createCpuRiichiTurn(
      false,
      createPinFiveRonHand()
    );
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
    const cpu = result.round.players[1];

    expect(cpu.riichi).toBe(true);
    expect(cpu.doubleRiichi).toBe(true);
    expect(cpu.score).toBe(24000);
    expect(result.round.riichiPool).toBe(
      1000
    );
  });

  it("別のCPUが宣言牌でロンすると立直を成立させない", () => {
    const {
      state,
      playerDiscard,
      cpuDraw
    } = createCpuRiichiTurn();

    setCpuHand(
      state,
      createPinFiveRonHand()
    );

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 2,
      loserSeat: 1,
      winningTile: cpuDraw
    });
    expect(
      result.round.players[1].riichi
    ).toBe(false);
    expect(result.round.riichiPool).toBe(0);
  });

  it("立直後のCPUは必ずツモ切りする", () => {
    const {
      state,
      playerDiscard
    } = createCpuRiichiTurn(true);
    const priorRiichiDiscard =
      state.round.players[1].discards[0];
    const drawnTile = createTile(
      "honor",
      6
    );

    state.round.players[1] = {
      ...state.round.players[1],
      riichi: true,
      doubleRiichi: false,
      ippatsu: true,
      score: 24000,
      discards: [{
        ...priorRiichiDiscard,
        riichiDeclaration: true
      }]
    };
    setLiveWall(state, drawnTile);

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0.5
    );
    const cpu = result.round.players[1];
    const latestDiscard =
      cpu.discards[cpu.discards.length - 1];

    expect(latestDiscard.tile.id).toBe(
      drawnTile.id
    );
    expect(latestDiscard.tsumogiri).toBe(
      true
    );
    expect(cpu.ippatsu).toBe(false);
  });
});
