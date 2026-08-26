import {
  describe,
  expect,
  it
} from "vitest";
import {
  chooseCpuSelfKan
} from "./cpuKan";
import {
  getSelfKanOptions
} from "./kan";
import type {
  Meld,
  PlayerState,
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
    id: `cpu-kan-${serialNumber}`,
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

function createCpuPlayer(
  hand: Tile[],
  drawnTileId: string | null,
  melds: Meld[] = []
): PlayerState {
  return {
    id: "cpu-kan-player",
    name: "CPU・右",
    seat: 1,
    seatWind: "south",
    score: 25000,
    hand,
    melds,
    discards: [],
    isDealer: false,
    riichi: false,
    ippatsu: false,
    drawnTileId,
    drawnTileSource:
      drawnTileId === null
        ? null
        : "liveWall"
  };
}

function createOptions(
  player: PlayerState
) {
  return getSelfKanOptions({
    concealedTiles: player.hand,
    melds: player.melds,
    riichi: player.riichi,
    drawnTileId: player.drawnTileId,
    kanCount: 0,
    rinshanDrawCount: 0,
    liveWallTileCount: 40
  });
}

describe("CPUの暗槓・加槓判断", () => {
  it("向聴数が悪化しない暗槓を選ぶ", () => {
    const kanTiles = createTiles(
      "man",
      [5, 5, 5, 5]
    );
    const otherTiles = [
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles("sou", [7, 8, 9]),
      createTile("honor", 1)
    ];
    const hand = [
      ...kanTiles,
      ...otherTiles
    ];
    const player = createCpuPlayer(
      hand,
      otherTiles[otherTiles.length - 1].id
    );

    const result = chooseCpuSelfKan({
      player,
      options: createOptions(player)
    });

    expect(result?.option.kind).toBe(
      "closedKan"
    );
    expect(result?.shantenAfter).toBeLessThanOrEqual(
      result?.shantenBefore ?? -1
    );
  });

  it("ポンと同じ牌をツモれば加槓を選ぶ", () => {
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
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    );
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 0,
      calledTileId: ponTiles[0].id
    };
    const player = createCpuPlayer(
      [addedTile, ...otherTiles],
      otherTiles[otherTiles.length - 1].id,
      [pon]
    );

    const result = chooseCpuSelfKan({
      player,
      options: createOptions(player)
    });

    expect(result?.option.kind).toBe(
      "addedKan"
    );
    expect(result?.shantenAfter).toBeLessThanOrEqual(
      result?.shantenBefore ?? -1
    );
  });

  it("七対子を崩して向聴数が悪化する暗槓は選ばない", () => {
    const hand = [
      ...createTiles("man", [1, 1, 1, 1]),
      ...createTiles("man", [2, 2]),
      ...createTiles("man", [3, 3]),
      ...createTiles("pin", [4, 4]),
      ...createTiles("pin", [5, 5]),
      ...createTiles("sou", [6, 6])
    ];
    const player = createCpuPlayer(
      hand,
      hand[hand.length - 1].id
    );

    const result = chooseCpuSelfKan({
      player,
      options: createOptions(player)
    });

    expect(result).toBeNull();
  });

  it("プレイヤー席・ツモ前・不一致候補では選ばない", () => {
    const kanTiles = createTiles(
      "man",
      [5, 5, 5, 5]
    );
    const otherTiles = createTiles(
      "pin",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    );
    const player = createCpuPlayer(
      [...kanTiles, ...otherTiles],
      otherTiles[otherTiles.length - 1].id
    );
    const options = createOptions(player);

    expect(
      chooseCpuSelfKan({
        player: {
          ...player,
          seat: 0
        },
        options
      })
    ).toBeNull();
    expect(
      chooseCpuSelfKan({
        player: {
          ...player,
          drawnTileId: null
        },
        options
      })
    ).toBeNull();
    expect(
      chooseCpuSelfKan({
        player,
        options: options.map(
          (option) =>
            option.kind === "closedKan"
              ? {
                  ...option,
                  tileIds: [
                    ...option.tileIds.slice(0, 3),
                    "unknown-tile"
                  ] as [
                    string,
                    string,
                    string,
                    string
                  ]
                }
              : option
        )
      })
    ).toBeNull();
  });
});
