import {
  canPlayerRon,
  createInitialGameState,
  playPlayerDiscard,
  skipPlayerRon
} from "./engine";
import type {
  GameState,
  Meld,
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
    id: `engine-cpu-kan-${serialNumber}`,
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

function setEmptyCpuHand(
  state: GameState,
  seat: 1 | 2 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
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
    createTile("man", 1),
    createTile("pin", 9),
    createTile("sou", 1)
  ];
}

function createAddedKanCpu(
  state: GameState,
  addedTile: Tile
): void {
  const ponTiles = createTiles(
    "honor",
    [6, 6, 6]
  );
  const pon: Meld = {
    kind: "pon",
    tiles: ponTiles,
    calledFrom: 3,
    calledTileId: ponTiles[0].id
  };

  state.round.players[1] = {
    ...state.round.players[1],
    hand: createTiles(
      "sou",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    ),
    melds: [pon],
    drawnTileId: null,
    drawnTileSource: null
  };
  setLiveWallAfterFirstDraw(
    state,
    addedTile
  );
}

function createHonorPairWaitHand(
  honorRank: number
): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("man", [4, 5, 6]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [7, 8, 9]),
    createTile("honor", honorRank)
  ];
}

function setCpuHand(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[]
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

describe("CPUの暗槓・加槓のゲーム進行", () => {
  it("CPUが暗槓して嶺上牌をツモった後に打牌する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const discard = setPlayerDiscard(state);
    const kanTiles = createTiles(
      "man",
      [5, 5, 5, 5]
    );
    const drawnTile = createTile(
      "honor",
      1
    );

    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...kanTiles,
        ...createTiles(
          "pin",
          [1, 2, 3, 4, 5, 6]
        ),
        ...createTiles("sou", [7, 8, 9])
      ],
      melds: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setLiveWallAfterFirstDraw(
      state,
      drawnTile
    );
    state.round.deadWall[0] =
      createTile("honor", 2);

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
    expect(cpu.melds[0].tiles).toHaveLength(4);
    expect(result.round.kanCount).toBe(1);
    expect(
      result.round.doraIndicatorCount
    ).toBe(2);
    expect(result.round.rinshanDrawCount).toBe(1);
    expect(result.round.pendingKan).toBeNull();
    expect(cpu.discards).toHaveLength(1);
  });

  it("CPUの加槓牌でロンできると槍槓の反応を待つ", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const playerWait =
      createHonorPairWaitHand(6);
    const discard = setPlayerDiscard(
      state,
      playerWait
    );
    const addedTile = createTile(
      "honor",
      6
    );

    createAddedKanCpu(
      state,
      addedTile
    );
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);

    const result = playPlayerDiscard(
      state,
      discard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(result.round.pendingKan).toMatchObject({
      kind: "addedKan",
      declarerSeat: 1,
      chankanTileId: addedTile.id
    });
    expect(canPlayerRon(result)).toBe(true);
    expect(result.round.kanCount).toBe(0);
    expect(
      result.round.players[1].melds[0].kind
    ).toBe("pon");
  });

  it("プレイヤーが槍槓を見逃すとCPUの加槓を成立させる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const playerWait =
      createHonorPairWaitHand(6);
    const discard = setPlayerDiscard(
      state,
      playerWait
    );
    const addedTile = createTile(
      "honor",
      6
    );

    createAddedKanCpu(
      state,
      addedTile
    );
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.deadWall[0] =
      createTile("honor", 2);

    const reactionState =
      playPlayerDiscard(
        state,
        discard.id,
        () => 0.5
      );
    const result = skipPlayerRon(
      reactionState,
      () => 0.5
    );

    expect(result.round.pendingKan).toBeNull();
    expect(result.round.kanCount).toBe(1);
    expect(
      result.round.players[1].melds[0]
    ).toMatchObject({
      kind: "addedKan"
    });
    expect(
      result.round.players[1].melds[0].tiles
    ).toHaveLength(4);
  });

  it("別のCPUが加槓牌で和了すると槍槓を成立させる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const discard = setPlayerDiscard(state);
    const addedTile = createTile(
      "honor",
      6
    );

    createAddedKanCpu(
      state,
      addedTile
    );
    setCpuHand(
      state,
      2,
      createHonorPairWaitHand(6)
    );
    setEmptyCpuHand(state, 3);

    const result = playPlayerDiscard(
      state,
      discard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "ron",
      winnerSeat: 2,
      loserSeat: 1,
      winningTile: addedTile
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("槍槓");
    expect(result.round.kanCount).toBe(0);
    expect(
      result.round.players[1].melds[0].kind
    ).toBe("pon");
  });

  it("CPUが暗槓後の嶺上牌で和了する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const discard = setPlayerDiscard(state);
    const kanTiles = createTiles(
      "man",
      [5, 5, 5, 5]
    );
    const singleHonor = createTile(
      "honor",
      5
    );

    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...kanTiles,
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2]),
        singleHonor
      ],
      melds: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setLiveWallAfterFirstDraw(
      state,
      createTile("sou", 3)
    );
    state.round.deadWall[0] =
      createTile("honor", 5);

    const result = playPlayerDiscard(
      state,
      discard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 1
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("嶺上開花");
    expect(result.round.kanCount).toBe(1);
  });
});
