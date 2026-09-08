import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  drawTile
} from "./engine";
import type {
  GameState,
  SeatIndex,
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
    id: `engine-player-skill-4-2-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function prepareDrawState(
  seat: SeatIndex,
  hand: readonly Tile[],
  liveWall: readonly Tile[]
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "4-2", level: 5 }
      ]
    }
  );

  return {
    ...state,
    round: {
      ...state.round,
      currentSeat: seat,
      phase: "drawing",
      liveWall: [...liveWall],
      players: state.round.players.map(
        (player) =>
          player.seat === seat
            ? {
                ...player,
                hand: [...hand],
                melds: [],
                drawnTileId: null,
                drawnTileSource: null
              }
            : player
      )
    }
  };
}

function getDrawnTile(
  state: GameState,
  seat: SeatIndex
): Tile {
  const player = state.round.players[seat];
  const drawnTile = player.hand.find(
    (tile) =>
      tile.id === player.drawnTileId
  );

  if (!drawnTile) {
    throw new Error(
      `座席${seat}のツモ牌が見つかりません。`
    );
  }

  return drawnTile;
}

describe("プレイヤースキル4-2のエンジン統合", () => {
  it("通常ツモで手牌と同じ牌種へ1.5倍を適用する", () => {
    const normalTile = createTile(
      "pin",
      1
    );
    const sameTile = createTile(
      "man",
      5
    );
    const state = prepareDrawState(
      0,
      [createTile("man", 5)],
      [normalTile, sameTile]
    );
    const result = drawTile(
      state,
      0,
      () => 0.4
    );

    expect(getDrawnTile(result, 0)).toBe(
      sameTile
    );
    expect(result.round.liveWall).toEqual([
      normalTile
    ]);
  });

  it("手牌の通常五と山の赤五を同じ牌種として抽選する", () => {
    const normalTile = createTile(
      "sou",
      1
    );
    const redFive = createTile(
      "pin",
      5,
      true
    );
    const state = prepareDrawState(
      0,
      [createTile("pin", 5)],
      [normalTile, redFive]
    );
    const result = drawTile(
      state,
      0,
      () => 0.4
    );

    expect(getDrawnTile(result, 0)).toBe(
      redFive
    );
  });

  it("CPUの通常ツモには4-2の倍率を適用しない", () => {
    const firstTile = createTile(
      "pin",
      1
    );
    const sameTile = createTile(
      "man",
      5
    );
    const state = prepareDrawState(
      1,
      [createTile("man", 5)],
      [firstTile, sameTile]
    );
    let randomCallCount = 0;
    const result = drawTile(
      state,
      1,
      () => {
        randomCallCount += 1;
        return 0.999;
      }
    );

    expect(getDrawnTile(result, 1)).toBe(
      firstTile
    );
    expect(randomCallCount).toBe(0);
  });
});
