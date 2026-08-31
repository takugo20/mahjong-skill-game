import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import {
  canPlayerRon,
  createInitialGameState,
  getRonCandidates,
  playPlayerDiscard
} from "./engine";
import type {
  Discard,
  GameState,
  Meld,
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
    id: `engine-akuukan-e13-${serialNumber}`,
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

function createE13State(): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-8",
      equippedSkills: []
    }
  );
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [3, 4, 5, 6, 7]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4, 5, 5]
    ),
    ...createTiles(
      "sou",
      [6, 7, 8]
    )
  ];
}

function createNonWinningHand(): Tile[] {
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

function createThirteenOrphansWaitHand():
  Tile[] {
  return [
    ...createTiles("man", [1, 1, 9]),
    ...createTiles("pin", [1, 9]),
    ...createTiles("sou", [1, 9]),
    ...createTiles(
      "honor",
      [2, 3, 4, 5, 6, 7]
    )
  ];
}

function setHand(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[]
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function setEmptyCpuHand(
  state: GameState,
  seat: 1 | 2 | 3
): void {
  setHand(state, seat, []);
}

function createNormalRonState(): GameState {
  const state = createE13State();
  const winningTile =
    createTile("man", 2);

  state.round.deadWall = Array.from(
    { length: 14 },
    () => createTile("honor", 7)
  );
  state.round.liveWall = [
    createTile("man", 9)
  ];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.winResult = null;
  state.round.lastDiscard = {
    seat: 1,
    discard: createDiscard(winningTile)
  };

  setHand(
    state,
    0,
    createPinfuWaitHand()
  );
  setHand(
    state,
    1,
    createNonWinningHand()
  );
  setHand(
    state,
    2,
    createNonWinningHand()
  );
  setHand(
    state,
    3,
    createNonWinningHand()
  );

  state.round.players[1].discards = [
    createDiscard(winningTile)
  ];

  return state;
}

function setPlayerDiscard(
  state: GameState,
  concealedHand: Tile[]
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
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
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

function setAddedKanCpu(
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
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  setLiveWallAfterFirstDraw(
    state,
    addedTile
  );
}

function setClosedKanCpu(
  state: GameState
): void {
  state.round.players[1] = {
    ...state.round.players[1],
    hand: [
      ...createTiles(
        "honor",
        [1, 1, 1, 1]
      ),
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles("sou", [7, 8, 9])
    ],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.liveWall = [
    createTile("honor", 2),
    createTile("honor", 4),
    createTile("honor", 5),
    createTile("honor", 6),
    createTile("honor", 7),
    createTile("man", 9),
    createTile("pin", 9),
    createTile("sou", 1)
  ];
}

describe("E-13のロン禁止エンジン統合", () => {
  it("プレイヤーの通常ロン候補を除外する", () => {
    const state = createNormalRonState();

    expect(canPlayerRon(state)).toBe(false);
    expect(getRonCandidates(state)).toEqual([]);
  });

  it("CPUの通常ロン候補は除外しない", () => {
    const state = createNormalRonState();

    setHand(
      state,
      2,
      createPinfuWaitHand()
    );

    expect(
      getRonCandidates(state).map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([2]);
  });

  it("E-13が無効ならプレイヤーの通常ロンを許可する", () => {
    const state = createNormalRonState();

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-13"
    );

    expect(canPlayerRon(state)).toBe(true);
    expect(
      getRonCandidates(state).map(
        (candidate) =>
          candidate.winnerSeat
      )
    ).toEqual([0]);
  });

  it("プレイヤーの加槓搶槓を禁止してCPUの加槓を成立させる", () => {
    const state = createE13State();
    const discard = setPlayerDiscard(
      state,
      createHonorPairWaitHand(6)
    );
    const addedTile = createTile(
      "honor",
      6
    );

    setAddedKanCpu(state, addedTile);
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.deadWall[0] =
      createTile("honor", 2);

    const result = playPlayerDiscard(
      state,
      discard.id,
      () => 0.5
    );

    expect(result.round.winResult).toBeNull();
    expect(result.round.pendingKan).toBeNull();
    expect(result.round.kanCount).toBe(1);
    expect(
      result.round.players[1].melds[0]
    ).toMatchObject({
      kind: "addedKan"
    });
    expect(
      result.round.players[1].melds[0]
        .tiles
    ).toHaveLength(4);
  });

  it("プレイヤーの国士無双の暗槓搶槓を禁止してCPUの暗槓を成立させる", () => {
    const state = createE13State();
    const discard = setPlayerDiscard(
      state,
      createThirteenOrphansWaitHand()
    );

    setClosedKanCpu(state);
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.deadWall[0] =
      createTile("honor", 3);

    const result = playPlayerDiscard(
      state,
      discard.id,
      () => 0.5
    );

    expect(result.round.winResult).toBeNull();
    expect(result.round.pendingKan).toBeNull();
    expect(result.round.kanCount).toBe(1);
    expect(
      result.round.players[1].melds[0]
    ).toMatchObject({
      kind: "closedKan"
    });
    expect(
      result.round.players[1].melds[0]
        .tiles
    ).toHaveLength(4);
  });
});
