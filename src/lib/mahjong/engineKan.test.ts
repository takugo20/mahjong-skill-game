import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  getPlayerSelfKanOptions
} from "./engine";
import type {
  GameState,
  Meld,
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
    id: `engine-kan-${serialNumber}`,
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

function setPlayerHand(
  state: GameState,
  hand: Tile[],
  drawnTileId: string | null,
  melds: Meld[] = []
): void {
  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds,
    drawnTileId,
    drawnTileSource:
      drawnTileId === null
        ? null
        : "liveWall"
  };
}

function createClosedKanState(): {
  state: GameState;
  kanTiles: Tile[];
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const kanTiles = createTiles(
    "man",
    [5, 5, 5, 5]
  );
  const otherTiles = createTiles(
    "pin",
    [
      1, 2, 3, 4, 6,
      7, 8, 9, 1, 2
    ]
  );

  setPlayerHand(
    state,
    [...kanTiles, ...otherTiles],
    otherTiles[
      otherTiles.length - 1
    ].id
  );

  return {
    state,
    kanTiles
  };
}

describe("プレイヤーの槓候補", () => {
  it("ツモ後に同じ牌4枚があれば暗槓候補を返す", () => {
    const { state, kanTiles } =
      createClosedKanState();

    const options =
      getPlayerSelfKanOptions(state);

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "closedKan",
      tileIds: kanTiles.map(
        (tile) => tile.id
      )
    });
  });

  it("ポンと同じ牌を持っていれば加槓候補を返す", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const ponTiles = createTiles(
      "honor",
      [6, 6, 6]
    );
    const addedTile = createTile(
      "honor",
      6
    );
    const otherTiles = createTiles(
      "sou",
      [
        1, 2, 3, 4, 5,
        6, 7, 8, 9, 1
      ]
    );
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    setPlayerHand(
      state,
      [addedTile, ...otherTiles],
      otherTiles[
        otherTiles.length - 1
      ].id,
      [pon]
    );

    const options =
      getPlayerSelfKanOptions(state);

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "addedKan",
      meldIndex: 0,
      tileId: addedTile.id
    });
  });

  it("自分のツモ後の打牌段階以外では候補を返さない", () => {
    const { state } =
      createClosedKanState();

    state.round.players[0]
      .drawnTileId = null;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.players[0]
      .drawnTileId =
        state.round.players[0]
          .hand[0].id;
    state.round.phase = "reaction";

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.phase = "discarding";
    state.round.currentSeat = 1;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);
  });

  it("槓上限または王牌補充用の通常山不足では候補を返さない", () => {
    const { state } =
      createClosedKanState();

    state.round.kanCount = 4;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.kanCount = 0;
    state.round.rinshanDrawCount = 4;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.rinshanDrawCount = 0;
    state.round.liveWall = [];

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);
  });
});
