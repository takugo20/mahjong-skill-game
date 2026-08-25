import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  getPlayerMeldCallOptions,
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
    id: `engine-cpu-call-${serialNumber}`,
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

function createPonHand(
  discardAfterCall: Tile
): Tile[] {
  return [
    ...createTiles("honor", [5, 5]),
    ...createTiles("man", [2, 2]),
    discardAfterCall,
    ...createTiles(
      "pin",
      [1, 2, 3, 4, 5, 6]
    ),
    ...createTiles("sou", [7, 8])
  ];
}

function createChiHand(
  discardAfterCall: Tile
): Tile[] {
  return [
    ...createTiles("man", [5, 6, 7, 8]),
    ...createTiles(
      "pin",
      [2, 2, 2, 3, 4]
    ),
    ...createTiles("sou", [5, 6, 7]),
    discardAfterCall
  ];
}

function setEmptyCpuHand(
  state: GameState,
  seat: 2 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    drawnTileId: null
  };
}

function setShortLiveWall(
  state: GameState
): void {
  state.round.liveWall = [
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4)
  ];
}

describe("CPU副露のゲーム進行", () => {
  it("プレイヤーの捨て牌をCPUがポンしてツモせず打牌する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const discardAfterCall =
      createTile("man", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    const caller = result.round.players[1];
    const meld = caller.melds[0];

    expect(meld?.kind).toBe("pon");
    expect(meld?.calledFrom).toBe(0);
    expect(meld?.calledTileId).toBe(
      calledTile.id
    );
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(true);
    expect(caller.discards[0].tile.id).toBe(
      discardAfterCall.id
    );
    expect(caller.hand).toHaveLength(10);
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
  });

  it("プレイヤーの捨て牌を下家CPUがチーして打牌する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("man", 4);
    const discardAfterCall =
      createTile("honor", 7);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createChiHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    const caller = result.round.players[1];
    const meld = caller.melds[0];

    expect(meld?.kind).toBe("chi");
    expect(meld?.calledFrom).toBe(0);
    expect(
      meld?.tiles.map((tile) => tile.rank)
    ).toEqual([4, 5, 6]);
    expect(caller.discards[0].tile.id).toBe(
      discardAfterCall.id
    );
    expect(caller.hand).toHaveLength(10);
  });

  it("複数CPUのポンが競合すると打牌者に最も近いCPUを優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const firstDiscard =
      createTile("man", 9);
    const secondDiscard =
      createTile("pin", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(firstDiscard),
      melds: [],
      drawnTileId: null
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: createPonHand(secondDiscard),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds
    ).toHaveLength(1);
    expect(
      result.round.players[1]
        .melds[0].calledTileId
    ).toBe(calledTile.id);
    expect(
      result.round.players[2].melds
    ).toHaveLength(0);
  });

  it("CPUが鳴くと全員の一発を消し鳴き後の打牌へ反応できる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const discardAfterCall =
      createTile("man", 9);
    const firstNine =
      createTile("man", 9);
    const secondNine =
      createTile("man", 9);
    const playerDiscardAfterCall =
      createTile("pin", 1);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        calledTile,
        firstNine,
        secondNine,
        playerDiscardAfterCall
      ],
      ippatsu: true,
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: [],
      ippatsu: true,
      drawnTileId: null
    };
    state.round.players[3] = {
      ...state.round.players[3],
      hand: [],
      ippatsu: true,
      drawnTileId: null
    };
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players.map(
        (player) => player.ippatsu
      )
    ).toEqual([
      false,
      false,
      false,
      false
    ]);
    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(
      getPlayerMeldCallOptions(result).map(
        (option) => option.kind
      )
    ).toEqual(["pon"]);
    expect(
      result.round.lastDiscard?.discard.tile.id
    ).toBe(discardAfterCall.id);
  });

  it("通常山が空になった後の打牌ではCPUは副露しない", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const discardAfterCall =
      createTile("man", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.liveWall = [];

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds
    ).toHaveLength(0);
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(false);
    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.drawResult).not.toBeNull();
  });
});
