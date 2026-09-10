import {
  describe,
  expect,
  it
} from "vitest";
import type {
  EquippedPlayerSkill
} from "../akuukan/types";
import {
  createInitialGameState,
  drawTile
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
    id: `engine-player-skill-4-10-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function prepareDrawState(
  hand: readonly Tile[],
  liveWall: readonly Tile[],
  equippedSkills:
    readonly EquippedPlayerSkill[]
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [...equippedSkills]
    }
  );

  return {
    ...state,
    round: {
      ...state.round,
      currentSeat: 0,
      phase: "drawing",
      liveWall: [...liveWall],
      players: state.round.players.map(
        (player) =>
          player.seat === 0
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

function getPlayerDrawnTile(
  state: GameState
): Tile {
  const player = state.round.players[0];
  const drawnTile = player.hand.find(
    (tile) =>
      tile.id === player.drawnTileId
  );

  if (!drawnTile) {
    throw new Error(
      "プレイヤーのツモ牌が見つかりません。"
    );
  }

  return drawnTile;
}

describe("プレイヤースキル4-10のエンジン統合", () => {
  it("通常ツモで索子候補へ2倍を適用する", () => {
    const otherTile = createTile("man", 5);
    const souTile = createTile("sou", 1);
    const state = prepareDrawState(
      [],
      [otherTile, souTile],
      [{ id: "4-10", level: 5 }]
    );
    const result = drawTile(
      state,
      0,
      () => 0.34
    );

    expect(getPlayerDrawnTile(result)).toBe(
      souTile
    );
    expect(result.round.liveWall).toEqual([
      otherTile
    ]);
  });

  it("索子以外の候補だけなら抽選結果を変更しない", () => {
    const firstTile = createTile("pin", 2);
    const secondTile = createTile("honor", 1);
    const state = prepareDrawState(
      [],
      [firstTile, secondTile],
      [{ id: "4-10", level: 5 }]
    );
    let randomCallCount = 0;
    const result = drawTile(
      state,
      0,
      () => {
        randomCallCount += 1;
        return 0.999;
      }
    );

    expect(getPlayerDrawnTile(result)).toBe(
      firstTile
    );
    expect(randomCallCount).toBe(0);
  });

  it("4-2と4-10の両方に該当する索子へ倍率を乗算する", () => {
    const otherTile = createTile("man", 5);
    const souTile = createTile("sou", 7);
    const state = prepareDrawState(
      [createTile("sou", 7)],
      [otherTile, souTile],
      [
        { id: "4-2", level: 5 },
        { id: "4-10", level: 5 }
      ]
    );
    const result = drawTile(
      state,
      0,
      () => 0.26
    );

    expect(getPlayerDrawnTile(result)).toBe(
      souTile
    );
  });
});
