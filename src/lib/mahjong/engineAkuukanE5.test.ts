import {
  describe,
  expect,
  it
} from "vitest";
import {
  getAkuukanE5TargetSuit
} from "../akuukan/drawTileSelection";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  AkuukanMatchSetup,
  EnemyId
} from "../akuukan/types";
import {
  createInitialGameState,
  drawTile,
  startNextRound
} from "./engine";
import type {
  GameState,
  SeatIndex,
  Tile
} from "./types";

const E5_TEST_SEED = 123456789;

function createSetup(
  enemyId: EnemyId
): AkuukanMatchSetup {
  return {
    enemyId,
    equippedSkills: []
  };
}

function createSeededRandom(
  initialSeed: number
): () => number {
  let seed = initialSeed >>> 0;

  return () => {
    seed = (
      seed * 1664525 +
      1013904223
    ) >>> 0;

    return seed / 0x100000000;
  };
}

function createPrefixedRandom(
  firstValue: number,
  remainingRandom: () => number
): () => number {
  let firstCall = true;

  return () => {
    if (firstCall) {
      firstCall = false;
      return firstValue;
    }

    return remainingRandom();
  };
}

function createE5State(
  targetSuitRandom = 0
): GameState {
  return createInitialGameState(
    () => targetSuitRandom,
    createSetup("enemy-5")
  );
}

function endRoundWithAbortiveDraw(
  state: GameState
): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      phase: "roundEnd",
      abortiveDrawResult: {
        reason: "nineTerminals",
        declarerSeat: 0,
        distinctYaochuCount: 9
      }
    }
  };
}

function createTestTile(
  id: string,
  suit: Tile["suit"],
  rank: number,
  red = false
): Tile {
  return {
    id,
    suit,
    rank,
    red
  };
}

function prepareForcedDraw(
  state: GameState,
  seat: SeatIndex,
  liveWall: Tile[]
): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      currentSeat: seat,
      phase: "drawing",
      liveWall,
      players: state.round.players.map(
        (player) =>
          player.seat === seat
            ? {
                ...player,
                drawnTileId: null,
                drawnTileSource: null
              }
            : player
      )
    }
  };
}

function getTargetSuit(
  state: GameState
) {
  if (!state.akuukan) {
    throw new Error(
      "亜空間状態が初期化されていません。"
    );
  }

  return getAkuukanE5TargetSuit(
    state.akuukan
  );
}

function getHandTileIds(
  state: GameState
): string[][] {
  return state.round.players.map(
    (player) =>
      player.hand.map((tile) => tile.id)
  );
}

describe("敵5 E-5のエンジン統合", () => {
  it("初局開始時に対象色を選んで状態へ保存する", () => {
    const state = createE5State(0.5);

    expect(getTargetSuit(state)).toBe(
      "pin"
    );
  });

  it("対象色抽選以外では配牌と親の第1ツモを変更しない", () => {
    const normalState =
      createInitialGameState(
        createSeededRandom(E5_TEST_SEED)
      );
    const e5State = createInitialGameState(
      createPrefixedRandom(
        0,
        createSeededRandom(E5_TEST_SEED)
      ),
      createSetup("enemy-5")
    );

    expect(getTargetSuit(e5State)).toBe(
      "sou"
    );
    expect(
      getHandTileIds(e5State)
    ).toEqual(getHandTileIds(normalState));
    expect(
      e5State.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalState.round.liveWall.map(
        (tile) => tile.id
      )
    );
    expect(
      e5State.round.deadWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalState.round.deadWall.map(
        (tile) => tile.id
      )
    );
  });

  it("能力者CPUの通常ツモで字牌と他色を飛ばして対象色を取得する", () => {
    const honorTile = createTestTile(
      "e5-honor",
      "honor",
      1
    );
    const manTile = createTestTile(
      "e5-man",
      "man",
      2
    );
    const pinTile = createTestTile(
      "e5-pin",
      "pin",
      3
    );
    const souTile = createTestTile(
      "e5-sou",
      "sou",
      5,
      true
    );
    const state = prepareForcedDraw(
      createE5State(0),
      2,
      [
        honorTile,
        manTile,
        pinTile,
        souTile
      ]
    );

    const result = drawTile(state, 2);

    expect(
      result.round.players[2].drawnTileId
    ).toBe(souTile.id);
    expect(
      result.round.players[2]
        .drawnTileSource
    ).toBe("liveWall");
    expect(result.round.liveWall).toEqual([
      honorTile,
      manTile,
      pinTile
    ]);
    expect(getTargetSuit(result)).toBe(
      "sou"
    );
  });

  it("能力者CPU以外の通常ツモには限定を適用しない", () => {
    const honorTile = createTestTile(
      "e5-other-honor",
      "honor",
      2
    );
    const souTile = createTestTile(
      "e5-other-sou",
      "sou",
      7
    );
    const state = prepareForcedDraw(
      createE5State(0),
      1,
      [honorTile, souTile]
    );

    const result = drawTile(state, 1);

    expect(
      result.round.players[1].drawnTileId
    ).toBe(honorTile.id);
    expect(result.round.liveWall).toEqual([
      souTile
    ]);
  });

  it("対象色が通常山から尽きたら通常どおり先頭を取得する", () => {
    const honorTile = createTestTile(
      "e5-empty-honor",
      "honor",
      3
    );
    const pinTile = createTestTile(
      "e5-empty-pin",
      "pin",
      4
    );
    const manTile = createTestTile(
      "e5-empty-man",
      "man",
      5
    );
    const state = prepareForcedDraw(
      createE5State(0),
      2,
      [honorTile, pinTile, manTile]
    );

    const result = drawTile(state, 2);

    expect(
      result.round.players[2].drawnTileId
    ).toBe(honorTile.id);
    expect(result.round.liveWall).toEqual([
      pinTile,
      manTile
    ]);
  });

  it("E-5が無効なら能力者CPUも通常どおり先頭を取得する", () => {
    const state = createE5State(0);

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...state,
      akuukan: disableAkuukanSource(
        state.akuukan,
        "enemy-ability:E-5"
      )
    };
    const honorTile = createTestTile(
      "e5-disabled-honor",
      "honor",
      4
    );
    const souTile = createTestTile(
      "e5-disabled-sou",
      "sou",
      8
    );
    const drawingState = prepareForcedDraw(
      disabledState,
      2,
      [honorTile, souTile]
    );

    const result = drawTile(
      drawingState,
      2
    );

    expect(
      result.round.players[2].drawnTileId
    ).toBe(honorTile.id);
    expect(result.round.liveWall).toEqual([
      souTile
    ]);
  });

  it("次局開始時に対象色を再抽選する", () => {
    const firstRound = createE5State(0);
    const nextRound = startNextRound(
      endRoundWithAbortiveDraw(
        firstRound
      ),
      () => 0.999999
    );

    expect(
      getTargetSuit(firstRound)
    ).toBe("sou");
    expect(
      getTargetSuit(nextRound)
    ).toBe("man");
  });

  it("E-5が無効なら次局で対象色を消去し通常配牌を維持する", () => {
    const e5State = createE5State(0.5);
    const normalState =
      createInitialGameState(() => 0.5);

    if (!e5State.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    const disabledState: GameState = {
      ...e5State,
      akuukan: disableAkuukanSource(
        e5State.akuukan,
        "enemy-ability:E-5"
      )
    };
    const disabledNextState = startNextRound(
      endRoundWithAbortiveDraw(
        disabledState
      ),
      createSeededRandom(E5_TEST_SEED)
    );
    const normalNextState = startNextRound(
      endRoundWithAbortiveDraw(
        normalState
      ),
      createSeededRandom(E5_TEST_SEED)
    );

    expect(
      getTargetSuit(disabledNextState)
    ).toBeNull();
    expect(
      disabledNextState.akuukan
    ).not.toHaveProperty("e5TargetSuit");
    expect(
      getHandTileIds(disabledNextState)
    ).toEqual(
      getHandTileIds(normalNextState)
    );
    expect(
      disabledNextState.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalNextState.round.liveWall.map(
        (tile) => tile.id
      )
    );
    expect(
      disabledNextState.round.deadWall.map(
        (tile) => tile.id
      )
    ).toEqual(
      normalNextState.round.deadWall.map(
        (tile) => tile.id
      )
    );
  });
});
