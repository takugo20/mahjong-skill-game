import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill4_17,
  canActivatePlayerSkill4_17,
  createInitialGameState,
  getPlayerSkill4_17MaximumExchangeTileCount,
  skipPlayerSkill4_17
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
    id: `engine-player-skill-4-17-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createState(
  level: 1 | 2 | 3 | 4 | 5 = 1,
  playerMp = 390
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "4-17", level }
      ]
    }
  );
  const hand = [
    createTile("man", 1),
    createTile("pin", 2)
  ];

  return {
    ...state,
    playerMp,
    round: {
      ...state.round,
      phase: "dealAction",
      currentSeat: 0,
      liveWall: [createTile("sou", 3)],
      deadWall: [],
      doraIndicatorCount: 0,
      rinshanDrawCount: 0,
      players: state.round.players.map(
        (player) =>
          player.seat === 0
            ? {
                ...player,
                hand,
                drawnTileId: null,
                drawnTileSource: null
              }
            : player
      )
    }
  };
}

describe("プレイヤースキル4-17のエンジン統合", () => {
  it("配牌時に発動可否と最大交換枚数を返す", () => {
    const level1 = createState(1);
    const level5 = createState(5);

    expect(
      canActivatePlayerSkill4_17(level1)
    ).toBe(true);
    expect(
      getPlayerSkill4_17MaximumExchangeTileCount(
        level1
      )
    ).toBe(1);
    expect(
      getPlayerSkill4_17MaximumExchangeTileCount(
        level5
      )
    ).toBe(6);
  });

  it("選択した手牌を山牌と交換してMPを消費する", () => {
    const state = createState(1, 390);
    const playerBefore = state.round.players[0];
    const outgoingTile = playerBefore.hand[0];
    const incomingTile = state.round.liveWall[0];
    const result = activatePlayerSkill4_17(
      state,
      [outgoingTile.id],
      () => 0
    );

    expect(result.playerMp).toBe(270);
    expect(result.round.players[0].hand)
      .toContain(incomingTile);
    expect(result.round.liveWall)
      .toContain(outgoingTile);
    expect(result.round.phase).toBe(
      "drawing"
    );
    expect(result.notice).toBe(
      "手牌整理【序】を発動し、1枚を交換しました。"
    );
  });

  it("不正な選択では状態を変更しない", () => {
    const state = createState(1, 390);
    const result = activatePlayerSkill4_17(
      state,
      state.round.players[0].hand.map(
        (tile) => tile.id
      ),
      () => 0
    );

    expect(result).toBe(state);
  });

  it("配牌時以外は発動できない", () => {
    const state = createState(1, 390);
    const drawingState = {
      ...state,
      round: {
        ...state.round,
        phase: "drawing" as const
      }
    };

    expect(
      canActivatePlayerSkill4_17(
        drawingState
      )
    ).toBe(false);
    expect(
      activatePlayerSkill4_17(
        drawingState,
        [
          drawingState.round.players[0]
            .hand[0].id
        ],
        () => 0
      )
    ).toBe(drawingState);
  });

  it("発動しない選択では山を変えず局を開始する", () => {
    const state = createState(1, 390);
    const result = skipPlayerSkill4_17(state);

    expect(result.round.phase).toBe(
      "drawing"
    );
    expect(result.round.liveWall).toEqual(
      state.round.liveWall
    );
    expect(result.round.deadWall).toEqual(
      state.round.deadWall
    );
    expect(result.playerMp).toBe(390);
  });
});
