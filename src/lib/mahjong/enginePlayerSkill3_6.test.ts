import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
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
    id: `engine-player-skill-3-6-${serialNumber}`,
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

function createOpenMelds(): Meld[] {
  return [
    {
      kind: "pon",
      tiles: createTiles("man", [1, 1, 1]),
      calledFrom: 1
    },
    {
      kind: "pon",
      tiles: createTiles("pin", [2, 2, 2]),
      calledFrom: 2
    },
    {
      kind: "pon",
      tiles: createTiles("sou", [3, 3, 3]),
      calledFrom: 3
    },
    {
      kind: "pon",
      tiles: createTiles("honor", [1, 1, 1]),
      calledFrom: 1
    }
  ];
}

function createPonHand(): Tile[] {
  return [
    ...createTiles("honor", [5, 5]),
    ...createTiles("man", [2, 2, 4, 5]),
    ...createTiles("pin", [1, 2, 4, 5]),
    ...createTiles("sou", [7, 8, 9])
  ];
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles("man", [3, 4, 5, 6, 7]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    ...createTiles("honor", [3, 3])
  ];
}

function emptyCpuHand(
  state: GameState,
  seat: SeatIndex
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createState(
  discardTile: Tile,
  protectedMelds: Meld[]
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-6",
        level: 1
      }]
    }
  );
  const tankiTile =
    createTile("honor", 7);

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [discardTile, tankiTile],
    melds: protectedMelds,
    discards: [],
    drawnTileId: discardTile.id,
    drawnTileSource: "liveWall"
  };
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    createTile("honor", 2)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

describe("プレイヤースキル3-6 防御結界【裸】のエンジン統合", () => {
  it("裸単騎完成時の捨て牌をCPUがポンできない", () => {
    const discardTile =
      createTile("honor", 5);
    const state = createState(
      discardTile,
      createOpenMelds()
    );

    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(),
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };

    const result = playPlayerDiscard(
      state,
      discardTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds
    ).toHaveLength(0);
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(false);
  });

  it("裸単騎完成時の捨て牌をCPUがロンできない", () => {
    const discardTile =
      createTile("man", 2);
    const state = createState(
      discardTile,
      createOpenMelds()
    );

    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPinfuWaitHand(),
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };

    const result = playPlayerDiscard(
      state,
      discardTile.id,
      () => 0.5
    );

    expect(result.round.winResult).toBeNull();
    expect(
      result.round.doubleRonResult
    ).toBeNull();
  });

  it("3副露なら捨て牌をCPUがロンできる", () => {
    const discardTile =
      createTile("man", 2);
    const state = createState(
      discardTile,
      createOpenMelds().slice(0, 3)
    );

    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPinfuWaitHand(),
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };

    const result = playPlayerDiscard(
      state,
      discardTile.id,
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
  });
});
