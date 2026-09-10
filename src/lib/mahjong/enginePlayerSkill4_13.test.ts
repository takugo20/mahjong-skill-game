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
    id: `engine-player-skill-4-13-${serialNumber}`,
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

describe("プレイヤースキル4-13のエンジン統合", () => {
  it("通常ツモで外側の数牌候補へ2倍を適用する", () => {
    const centerTile = createTile("man", 5);
    const outerTile = createTile("pin", 1);
    const state = prepareDrawState(
      [],
      [centerTile, outerTile],
      [{ id: "4-13", level: 5 }]
    );
    const result = drawTile(
      state,
      0,
      () => 0.34
    );

    expect(getPlayerDrawnTile(result)).toBe(
      outerTile
    );
    expect(result.round.liveWall).toEqual([
      centerTile
    ]);
  });

  it("4・5・6の候補だけなら抽選結果を変更しない", () => {
    const firstTile = createTile("man", 4);
    const secondTile = createTile("pin", 6);
    const state = prepareDrawState(
      [],
      [firstTile, secondTile],
      [{ id: "4-13", level: 5 }]
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

  it("4-12と4-13の両方に該当する萬子へ倍率を乗算する", () => {
    const centerTile = createTile("sou", 5);
    const outerManTile = createTile("man", 7);
    const state = prepareDrawState(
      [],
      [centerTile, outerManTile],
      [
        { id: "4-12", level: 5 },
        { id: "4-13", level: 5 }
      ]
    );
    const result = drawTile(
      state,
      0,
      () => 0.21
    );

    expect(getPlayerDrawnTile(result)).toBe(
      outerManTile
    );
  });
});
