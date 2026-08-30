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

function createOneShantenHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3, 5]),
    ...createTiles("pin", [1, 2, 3, 9]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1, 2])
  ];
}

function createTwoShantenHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3, 5]),
    ...createTiles("pin", [1, 2, 3, 9]),
    ...createTiles("sou", [1, 2]),
    ...createTiles(
      "honor",
      [1, 1, 2, 3]
    )
  ];
}

function createFarFromTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 4, 7]),
    ...createTiles("pin", [1, 4, 7]),
    ...createTiles("sou", [1, 4, 7]),
    ...createTiles(
      "honor",
      [1, 2, 3, 4, 5]
    )
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

describe("E-4のノーテン立直判断", () => {
  it("一向聴なら90パーセントで立直する", () => {
    const hand = createOneShantenHand();
    const player = createCpuPlayer(hand);
    const createInput = (
      randomValue: number
    ) => ({
      player,
      riichiDiscardTileIds:
        hand.map((tile) => tile.id),
      doraIndicators: [],
      allowNotenRiichi: true,
      random: () => randomValue
    });
    const result = chooseCpuRiichi(
      createInput(0.899999)
    );

    expect(result).toMatchObject({
      shanten: 1,
      waitTileTypes: [],
      remainingWinningTileCount: 0
    });
    expect(
      result?.remainingImprovingTileCount
    ).toBeGreaterThan(0);
    expect(
      chooseCpuRiichi(
        createInput(0.9)
      )
    ).toBeNull();
  });

  it("二向聴は序盤なら50パーセントで立直する", () => {
    const hand = createTwoShantenHand();
    const player = createCpuPlayer(hand);

    player.discards = Array.from(
      { length: 5 },
      () => ({
        tile: createTile("honor", 7),
        tsumogiri: false,
        riichiDeclaration: false,
        faceDown: false,
        called: false
      })
    );

    const createInput = (
      randomValue: number
    ) => ({
      player,
      riichiDiscardTileIds:
        hand.map((tile) => tile.id),
      doraIndicators: [],
      allowNotenRiichi: true,
      random: () => randomValue
    });

    expect(
      chooseCpuRiichi(
        createInput(0.499999)
      )
    ).toMatchObject({
      shanten: 2
    });
    expect(
      chooseCpuRiichi(
        createInput(0.5)
      )
    ).toBeNull();
  });

  it("二向聴でも第7打以降は立直しない", () => {
    const hand = createTwoShantenHand();
    const player = createCpuPlayer(hand);

    player.discards = Array.from(
      { length: 6 },
      () => ({
        tile: createTile("honor", 7),
        tsumogiri: false,
        riichiDeclaration: false,
        faceDown: false,
        called: false
      })
    );

    expect(
      chooseCpuRiichi({
        player,
        riichiDiscardTileIds:
          hand.map((tile) => tile.id),
        doraIndicators: [],
        allowNotenRiichi: true,
        random: () => 0
      })
    ).toBeNull();
  });

  it("三向聴以上では立直しない", () => {
    const hand =
      createFarFromTenpaiHand();
    const player = createCpuPlayer(hand);

    expect(
      chooseCpuRiichi({
        player,
        riichiDiscardTileIds:
          hand.map((tile) => tile.id),
        doraIndicators: [],
        allowNotenRiichi: true,
        random: () => 0
      })
    ).toBeNull();
  });

  it("E-4の許可がなければノーテン立直しない", () => {
    const hand = createOneShantenHand();
    const player = createCpuPlayer(hand);

    expect(
      chooseCpuRiichi({
        player,
        riichiDiscardTileIds:
          hand.map((tile) => tile.id),
        doraIndicators: [],
        random: () => 0
      })
    ).toBeNull();
  });
});
