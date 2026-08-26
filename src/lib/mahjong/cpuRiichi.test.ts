import {
  describe,
  expect,
  it
} from "vitest";
import {
  chooseCpuRiichi
} from "./cpuRiichi";
import {
  getRiichiDiscardTileIds
} from "./riichi";
import type {
  PlayerState,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `cpu-riichi-${serialNumber}`,
    suit,
    rank,
    red
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

function createCpuPlayer(
  hand: Tile[]
): PlayerState {
  return {
    id: "cpu-riichi-player",
    name: "CPU・右",
    seat: 1,
    seatWind: "south",
    score: 25000,
    hand,
    melds: [],
    discards: [],
    isDealer: false,
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId:
      hand[hand.length - 1]?.id ?? null,
    drawnTileSource: "liveWall"
  };
}

function getCandidateIds(
  player: PlayerState
): string[] {
  return getRiichiDiscardTileIds({
    concealedTiles: player.hand,
    melds: player.melds,
    score: player.score,
    liveWallTileCount: 20,
    alreadyRiichi: player.riichi
  });
}

describe("CPUの立直判断", () => {
  it("条件が同じならツモ切りで立直する", () => {
    const hand = createRiichiHand();
    const player = createCpuPlayer(hand);
    const candidateIds =
      getCandidateIds(player);
    const result = chooseCpuRiichi({
      player,
      riichiDiscardTileIds:
        candidateIds,
      doraIndicators: []
    });

    expect(result).toMatchObject({
      discardTileId:
        player.drawnTileId,
      remainingWinningTileCount: 6,
      discardedDoraCount: 0
    });
    expect(result?.waitTileTypes).toEqual([
      {
        suit: "man",
        rank: 2
      },
      {
        suit: "man",
        rank: 5
      }
    ]);
  });

  it("見えている牌を差し引いて残り和了牌が多い候補を選ぶ", () => {
    const hand = createRiichiHand();
    const player = createCpuPlayer(hand);
    const visibleTiles = [
      ...createTiles("man", [2, 2]),
      ...createTiles("man", [5, 5, 5])
    ];
    const doraIndicator =
      createTile("man", 2);

    const result = chooseCpuRiichi({
      player,
      riichiDiscardTileIds:
        getCandidateIds(player),
      doraIndicators: [
        doraIndicator
      ],
      visibleTiles
    });

    expect(result).toMatchObject({
      discardTileId: hand[0].id,
      remainingWinningTileCount: 6
    });
    expect(result?.waitTileTypes).toEqual([
      {
        suit: "pin",
        rank: 2
      },
      {
        suit: "pin",
        rank: 5
      }
    ]);
  });

  it("同じ待ちなら赤ドラを残して通常牌を捨てる", () => {
    const redFive = createTile(
      "man",
      5,
      true
    );
    const normalFive = createTile(
      "man",
      5
    );
    const hand = [
      ...createTiles("man", [1, 2, 3]),
      ...createTiles("pin", [1, 2, 3]),
      ...createTiles("sou", [1, 2, 3]),
      ...createTiles("sou", [6, 7, 8]),
      normalFive,
      redFive
    ];
    const player = createCpuPlayer(hand);

    player.drawnTileId = redFive.id;

    const result = chooseCpuRiichi({
      player,
      riichiDiscardTileIds: [
        redFive.id,
        normalFive.id
      ],
      doraIndicators: [
        createTile("man", 4)
      ]
    });

    expect(result).toMatchObject({
      discardTileId: normalFive.id,
      discardedDoraCount: 1
    });
  });

  it("不正な候補IDを無視する", () => {
    const hand = createRiichiHand();
    const player = createCpuPlayer(hand);

    expect(
      chooseCpuRiichi({
        player,
        riichiDiscardTileIds: [
          "unknown-tile"
        ],
        doraIndicators: []
      })
    ).toBeNull();
  });

  it("プレイヤー席・立直済み・ツモ前では判断しない", () => {
    const hand = createRiichiHand();
    const player = createCpuPlayer(hand);
    const candidateIds =
      getCandidateIds(player);
    const createInput = (
      targetPlayer: PlayerState
    ) => ({
      player: targetPlayer,
      riichiDiscardTileIds:
        candidateIds,
      doraIndicators: []
    });

    expect(
      chooseCpuRiichi(
        createInput({
          ...player,
          seat: 0
        })
      )
    ).toBeNull();
    expect(
      chooseCpuRiichi(
        createInput({
          ...player,
          riichi: true
        })
      )
    ).toBeNull();
    expect(
      chooseCpuRiichi(
        createInput({
          ...player,
          drawnTileId: null
        })
      )
    ).toBeNull();
  });
});
