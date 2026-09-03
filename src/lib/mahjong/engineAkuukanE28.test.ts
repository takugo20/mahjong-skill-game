import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import {
  createInitialGameState,
  declarePlayerTsumo,
  drawAkuukanE28RiverTile,
  drawCpuTile,
  playPlayerDiscard
} from "./engine";
import {
  isDiscardFuriten
} from "./furiten";
import type {
  Discard,
  GameState,
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
    id: `engine-akuukan-e28-${serialNumber}`,
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

function createSingleWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1, 1]),
    createTile("pin", 5)
  ];
}

function createDiscard(
  tile: Tile,
  options: {
    readonly faceDown?: boolean;
    readonly called?: boolean;
  } = {}
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown:
      options.faceDown === true,
    called: options.called === true
  };
}

function prepareDrawState(): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-15",
      equippedSkills: []
    }
  );

  return {
    ...state,
    round: {
      ...state.round,
      currentSeat: 2,
      phase: "drawing",
      lastDiscard: null,
      players: state.round.players.map(
        (player) =>
          player.seat === 2
            ? {
                ...player,
                temporaryFuriten: true,
                drawnTileId: null,
                drawnTileSource: null
              }
            : player
      )
    }
  };
}

function getDrawnTile(
  state: GameState
): Tile {
  const drawer = state.round.players[2];
  const drawnTile = drawer.hand.find(
    (tile) => tile.id === drawer.drawnTileId
  );

  if (!drawnTile) {
    throw new Error(
      "敵15の河ツモ牌が見つかりません。"
    );
  }

  return drawnTile;
}

describe("敵15 E-28のエンジン統合", () => {
  it("他家の表向き河牌をツモして通常山を減らさない", () => {
    const state = prepareDrawState();
    const riverTile = createTile("man", 5);
    const firstWallTile = createTile(
      "pin",
      1
    );
    const secondWallTile = createTile(
      "sou",
      9
    );

    state.round.players[0].discards = [
      createDiscard(riverTile)
    ];
    state.round.liveWall = [
      firstWallTile,
      secondWallTile
    ];

    const liveWallBefore =
      state.round.liveWall;
    const handLengthBefore =
      state.round.players[2].hand.length;
    const mpBefore = state.playerMp;
    const result =
      drawAkuukanE28RiverTile(
        state,
        2,
        0,
        riverTile.id
      );
    const drawer = result.round.players[2];

    expect(result).not.toBe(state);
    expect(getDrawnTile(result)).toBe(
      riverTile
    );
    expect(drawer.hand).toHaveLength(
      handLengthBefore + 1
    );
    expect(drawer.drawnTileSource).toBe(
      "river"
    );
    expect(drawer.temporaryFuriten).toBe(
      false
    );
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(
      result.round.players[0].discards
    ).toEqual([]);
    expect(result.round.liveWall).toBe(
      liveWallBefore
    );
    expect(result.round.liveWall).toEqual([
      firstWallTile,
      secondWallTile
    ]);
    expect(result.playerMp).toBe(mpBefore);
    expect(
      state.round.players[0].discards
    ).toHaveLength(1);
  });

  it("敵15自身の河から指定した物理牌だけを回収する", () => {
    const state = prepareDrawState();
    const selectedTile = createTile(
      "man",
      5,
      true
    );
    const remainingTile = createTile(
      "man",
      5
    );

    state.round.players[2].discards = [
      createDiscard(selectedTile),
      createDiscard(remainingTile)
    ];

    const result =
      drawAkuukanE28RiverTile(
        state,
        2,
        2,
        selectedTile.id
      );

    expect(getDrawnTile(result)).toBe(
      selectedTile
    );
    expect(
      result.round.players[2].discards.map(
        (discard) => discard.tile.id
      )
    ).toEqual([remainingTile.id]);
  });

    it("河牌と履歴の削除によって唯一の捨て牌振聴を解除する", () => {
    const state = prepareDrawState();
    const discardedWinningTile =
      createTile("pin", 5);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: createSingleWaitHand(),
      melds: [],
      discards: [
        createDiscard(
          discardedWinningTile
        )
      ]
    };

    const beforePlayer =
      state.round.players[0];

    expect(
      isDiscardFuriten({
        concealedTiles:
          beforePlayer.hand,
        melds: beforePlayer.melds,
        discards: beforePlayer.discards
      })
    ).toBe(true);

    const result =
      drawAkuukanE28RiverTile(
        state,
        2,
        0,
        discardedWinningTile.id
      );
    const afterPlayer =
      result.round.players[0];

    expect(afterPlayer.discards).toEqual(
      []
    );
    expect(
      isDiscardFuriten({
        concealedTiles:
          afterPlayer.hand,
        melds: afterPlayer.melds,
        discards: afterPlayer.discards
      })
    ).toBe(false);
  });

  it("同じ和了牌の捨て牌履歴が残れば振聴を継続する", () => {
    const state = prepareDrawState();
    const selectedWinningTile =
      createTile("pin", 5);
    const remainingWinningTile =
      createTile("pin", 5);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: createSingleWaitHand(),
      melds: [],
      discards: [
        createDiscard(
          selectedWinningTile
        ),
        createDiscard(
          remainingWinningTile
        )
      ]
    };

    const result =
      drawAkuukanE28RiverTile(
        state,
        2,
        0,
        selectedWinningTile.id
      );
    const riverOwner =
      result.round.players[0];

    expect(
      riverOwner.discards.map(
        (discard) => discard.tile.id
      )
    ).toEqual([
      remainingWinningTile.id
    ]);
    expect(
      isDiscardFuriten({
        concealedTiles: riverOwner.hand,
        melds: riverOwner.melds,
        discards: riverOwner.discards
      })
    ).toBe(true);
  });

  it("裏向き牌を選ぶ場合は全裏向き候補から再抽選する", () => {
    const state = prepareDrawState();
    const requestedFaceDown = createTile(
      "man",
      1
    );
    const selectedFaceDown = createTile(
      "pin",
      9
    );
    const faceUp = createTile("sou", 4);
    let randomCallCount = 0;

    state.round.players[0].discards = [
      createDiscard(requestedFaceDown, {
        faceDown: true
      })
    ];
    state.round.players[1].discards = [
      createDiscard(selectedFaceDown, {
        faceDown: true
      })
    ];
    state.round.players[3].discards = [
      createDiscard(faceUp)
    ];

    const result =
      drawAkuukanE28RiverTile(
        state,
        2,
        0,
        requestedFaceDown.id,
        () => {
          randomCallCount += 1;
          return 0.999;
        }
      );

    expect(getDrawnTile(result)).toBe(
      selectedFaceDown
    );
    expect(randomCallCount).toBe(1);
    expect(
      result.round.players[0].discards[0]
        .tile
    ).toBe(requestedFaceDown);
    expect(
      result.round.players[1].discards
    ).toEqual([]);
    expect(
      result.round.players[3].discards[0]
        .tile
    ).toBe(faceUp);
  });

  it("表向き牌の指定では裏向き牌用の乱数を消費しない", () => {
    const state = prepareDrawState();
    const faceUp = createTile("honor", 5);
    const faceDown = createTile("sou", 7);
    let randomCallCount = 0;

    state.round.players[0].discards = [
      createDiscard(faceUp)
    ];
    state.round.players[1].discards = [
      createDiscard(faceDown, {
        faceDown: true
      })
    ];

    const result =
      drawAkuukanE28RiverTile(
        state,
        2,
        0,
        faceUp.id,
        () => {
          randomCallCount += 1;
          return 0;
        }
      );

    expect(getDrawnTile(result)).toBe(
      faceUp
    );
    expect(randomCallCount).toBe(0);
    expect(
      result.round.players[1].discards[0]
        .tile
    ).toBe(faceDown);
  });

  it("能力無効時・本人以外の手番・不正な牌指定では状態を変えない", () => {
    const state = prepareDrawState();
    const riverTile = createTile("pin", 3);

    state.round.players[0].discards = [
      createDiscard(riverTile)
    ];

    if (!state.akuukan) {
      throw new Error(
        "亜空間麻雀状態がありません。"
      );
    }

    const disabledState: GameState = {
      ...state,
      akuukan: disableAkuukanSource(
        state.akuukan,
        "enemy-ability:E-28"
      )
    };
    const otherPlayerTurn: GameState = {
      ...state,
      round: {
        ...state.round,
        currentSeat: 1
      }
    };

    expect(
      drawAkuukanE28RiverTile(
        disabledState,
        2,
        0,
        riverTile.id
      )
    ).toBe(disabledState);
    expect(
      drawAkuukanE28RiverTile(
        otherPlayerTurn,
        1,
        0,
        riverTile.id
      )
    ).toBe(otherPlayerTurn);
    expect(
      drawAkuukanE28RiverTile(
        state,
        2,
        0,
        "missing-tile"
      )
    ).toBe(state);
  });

    it("CPUツモでは和了できる河牌を通常山より優先する", () => {
    const state = prepareDrawState();
    const winningRiverTile = createTile(
      "pin",
      5
    );
    const wallTile = createTile("man", 9);

    state.round.players[2].hand =
      createSingleWaitHand();
    state.round.players[0].discards = [
      createDiscard(winningRiverTile)
    ];
    state.round.liveWall = [wallTile];

    const result = drawCpuTile(
      state,
      2,
      () => 0
    );

    expect(getDrawnTile(result)).toBe(
      winningRiverTile
    );
    expect(
      result.round.players[2]
        .drawnTileSource
    ).toBe("river");
    expect(result.round.liveWall).toEqual([
      wallTile
    ]);
    expect(
      result.round.players[0].discards
    ).toEqual([]);
  });

  it("有用な河牌がなければ通常山からツモる", () => {
    const state = prepareDrawState();
    const unrelatedRiverTile = createTile(
      "honor",
      7
    );
    const winningWallTile = createTile(
      "pin",
      5
    );

    state.round.players[2].hand =
      createSingleWaitHand();
    state.round.players[0].discards = [
      createDiscard(unrelatedRiverTile)
    ];
    state.round.liveWall = [
      winningWallTile
    ];
    state.round.doraIndicatorCount = 0;

    const result = drawCpuTile(
      state,
      2,
      () => 0
    );

    expect(getDrawnTile(result)).toBe(
      winningWallTile
    );
    expect(
      result.round.players[2]
        .drawnTileSource
    ).toBe("liveWall");
    expect(result.round.liveWall).toEqual([]);
    expect(
      result.round.players[0].discards[0]
        .tile
    ).toBe(unrelatedRiverTile);
  });

    it("小さな改善で他家の振聴を解除する河牌を避けて通常山からツモる", () => {
    const state = prepareDrawState();
    const riskyRiverTile = createTile(
      "pin",
      6
    );
    const wallTile = createTile("pin", 5);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles(
          "honor",
          [1, 1, 1]
        ),
        createTile("pin", 6)
      ],
      melds: [],
      discards: [
        createDiscard(riskyRiverTile)
      ]
    };
    state.round.players[2].hand =
      createSingleWaitHand();
    state.round.liveWall = [
      wallTile,
      createTile("pin", 4),
      createTile("pin", 4),
      createTile("pin", 7),
      createTile("pin", 7)
    ];
    state.round.doraIndicatorCount = 0;

    const result = drawCpuTile(
      state,
      2,
      () => 0
    );

    expect(getDrawnTile(result)).toBe(
      wallTile
    );
    expect(
      result.round.players[2]
        .drawnTileSource
    ).toBe("liveWall");
    expect(
      result.round.players[0].discards[0]
        .tile
    ).toBe(riskyRiverTile);
    expect(result.round.liveWall).toHaveLength(
      4
    );
  });

  it("E-28が無効なら和了牌が河にあっても通常山からツモる", () => {
    const state = prepareDrawState();
    const winningRiverTile = createTile(
      "pin",
      5
    );
    const wallTile = createTile("sou", 9);

    state.round.players[2].hand =
      createSingleWaitHand();
    state.round.players[0].discards = [
      createDiscard(winningRiverTile)
    ];
    state.round.liveWall = [wallTile];

    if (!state.akuukan) {
      throw new Error(
        "亜空間麻雀状態がありません。"
      );
    }

    const disabledState: GameState = {
      ...state,
      akuukan: disableAkuukanSource(
        state.akuukan,
        "enemy-ability:E-28"
      )
    };
    const result = drawCpuTile(
      disabledState,
      2,
      () => 0
    );

    expect(getDrawnTile(result)).toBe(
      wallTile
    );
    expect(
      result.round.players[2]
        .drawnTileSource
    ).toBe("liveWall");
    expect(
      result.round.players[0].discards[0]
        .tile
    ).toBe(winningRiverTile);
  });

    it("通常山が空なら河ツモを行わず荒牌平局にする", () => {
    const state = prepareDrawState();
    const winningRiverTile = createTile(
      "pin",
      5
    );

    state.round.players[2].hand =
      createSingleWaitHand();
    state.round.players[0].discards = [
      createDiscard(winningRiverTile)
    ];
    state.round.liveWall = [];

    const result = drawCpuTile(
      state,
      2,
      () => 0
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.drawResult).not.toBeNull();
    expect(
      result.round.nagashiManganResult
    ).toBeNull();
    expect(
      result.round.players[0].discards[0]
        .tile
    ).toBe(winningRiverTile);
    expect(
      result.round.players[2].drawnTileId
    ).toBeNull();
  });

    it("CPU進行中に河牌をツモしてそのままツモ和了する", () => {
    const state = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-15",
        equippedSkills: []
      }
    );
    const playerDiscard = createTile(
      "honor",
      6
    );
    const cpuOneDraw = createTile(
      "honor",
      7
    );
    const remainingWallTile = createTile(
      "man",
      9
    );
    const winningRiverTile = createTile(
      "pin",
      5
    );

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [playerDiscard],
      melds: [],
      discards: [],
      drawnTileId: playerDiscard.id,
      drawnTileSource: "liveWall"
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: createSingleWaitHand(),
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.players[3] = {
      ...state.round.players[3],
      hand: [],
      melds: [],
      discards: [
        createDiscard(winningRiverTile)
      ],
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.liveWall = [
      cpuOneDraw,
      remainingWallTile
    ];
    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.lastDiscard = null;
    state.round.turnNumber = 8;
    state.round.doraIndicatorCount = 0;

    const result = playPlayerDiscard(
      state,
      playerDiscard.id,
      () => 0
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.winResult).toMatchObject({
      winMethod: "tsumo",
      winnerSeat: 2,
      loserSeat: null,
      winningTile: winningRiverTile
    });
    expect(
      result.round.winResult?.yakuNames
    ).toContain("門前清自摸和");
    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("海底摸月");
    expect(result.round.liveWall).toEqual([
      remainingWallTile
    ]);
    expect(
      result.round.players[3].discards
    ).toEqual([]);
  });

  it("河ツモは通常山が空でも海底摸月にならない", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const winningTile = createTile(
      "pin",
      5
    );

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...createSingleWaitHand(),
        winningTile
      ],
      melds: [],
      discards: [],
      drawnTileId: winningTile.id,
      drawnTileSource: "river"
    };
    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.round.liveWall = [];
    state.round.turnNumber = 8;
    state.round.doraIndicatorCount = 0;

    const result = declarePlayerTsumo(
      state
    );

    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(
      result.round.winResult?.winMethod
    ).toBe("tsumo");
    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("海底摸月");
  });
});
