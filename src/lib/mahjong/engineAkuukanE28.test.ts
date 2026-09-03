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
  drawAkuukanE28RiverTile
} from "./engine";
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
});
