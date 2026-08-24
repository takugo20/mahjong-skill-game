import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  discardTile,
  getDoraIndicators,
  playPlayerDiscard,
  skipPlayerRon
} from "./engine";
import {
  createFullTileSet,
  getTileTypeKey
} from "./tiles";
import type {
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTestTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-test-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createSafeCpuHand(): Tile[] {
  const types: Array<
    [TileSuit, number]
  > = [
    ["man", 1],
    ["man", 2],
    ["man", 4],
    ["man", 5],
    ["man", 7],
    ["man", 8],
    ["pin", 1],
    ["pin", 2],
    ["pin", 4],
    ["pin", 5],
    ["pin", 7],
    ["pin", 8],
    ["honor", 1]
  ];

  return types.map(
    ([suit, rank]) =>
      createTestTile(suit, rank)
  );
}

describe("麻雀牌の構成", () => {
  it("136枚が重複しない物理牌として生成される", () => {
    const tiles = createFullTileSet();
    const tileIds = new Set(
      tiles.map((tile) => tile.id)
    );

    expect(tiles).toHaveLength(136);
    expect(tileIds.size).toBe(136);
  });

  it("各牌種が4枚ずつ存在する", () => {
    const tiles = createFullTileSet();
    const counts = new Map<string, number>();

    for (const tile of tiles) {
      const key = getTileTypeKey(tile);

      counts.set(
        key,
        (counts.get(key) ?? 0) + 1
      );
    }

    expect(counts.size).toBe(34);

    for (const count of counts.values()) {
      expect(count).toBe(4);
    }
  });

  it("赤五萬・赤五筒・赤五索が各1枚存在する", () => {
    const redTiles = createFullTileSet()
      .filter((tile) => tile.red)
      .map((tile) =>
        `${tile.suit}-${tile.rank}`
      )
      .sort();

    expect(redTiles).toEqual([
      "man-5",
      "pin-5",
      "sou-5"
    ]);
  });
});

describe("東1局の開始処理", () => {
  it("配牌・王牌・通常山の枚数が正しい", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    expect(state.round.deadWall).toHaveLength(14);
    expect(state.round.liveWall).toHaveLength(69);

    expect(
      state.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([
      14,
      13,
      13,
      13
    ]);

    const totalTileCount =
      state.round.deadWall.length +
      state.round.liveWall.length +
      state.round.players.reduce(
        (total, player) =>
          total + player.hand.length,
        0
      );

    expect(totalTileCount).toBe(136);
  });

  it("初期ドラ表示牌が1枚確定している", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    const indicators = getDoraIndicators(
      state.round
    );

    expect(indicators).toHaveLength(1);
    expect(indicators[0]).toBe(
      state.round.deadWall[4]
    );
  });

  it("配牌390MPと親の第1ツモ30MPを獲得する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    expect(state.playerMp).toBe(420);
    expect(state.maxMp).toBe(900);
  });
});

describe("通常のツモ・打牌", () => {
  it("親の第1ツモ牌を捨てるとツモ切りになる", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    const drawnTileId =
      state.round.players[0].drawnTileId;

    expect(drawnTileId).not.toBeNull();

    const nextState = discardTile(
      state,
      drawnTileId as string
    );

    const playerDiscard =
      nextState.round.players[0].discards[0];

    expect(playerDiscard.tsumogiri).toBe(true);
    expect(nextState.round.currentSeat).toBe(1);
    expect(nextState.round.phase).toBe("drawing");
  });

  it("プレイヤー打牌後にCPU3人が行動して再びプレイヤーがツモる", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    const selectedTile =
      state.round.players[0].hand[0];

    let nextState = playPlayerDiscard(
      state,
      selectedTile.id,
      () => 0.5
    );

    while (
      nextState.round.phase === "reaction"
    ) {
      nextState = skipPlayerRon(
        nextState,
        () => 0.5
      );
    }

    expect(nextState.round.currentSeat).toBe(0);
    expect(nextState.round.phase).toBe("discarding");
    expect(nextState.round.liveWall).toHaveLength(65);

    expect(
      nextState.round.players.map(
        (player) => player.hand.length
      )
    ).toEqual([
      14,
      13,
      13,
      13
    ]);

    expect(
      nextState.round.players.map(
        (player) => player.discards.length
      )
    ).toEqual([
      1,
      1,
      1,
      1
    ]);

    expect(nextState.playerMp).toBe(450);
  });
});
