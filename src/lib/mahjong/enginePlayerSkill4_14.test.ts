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
    id: `engine-player-skill-4-14-${serialNumber}`,
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

describe("プレイヤースキル4-14のエンジン統合", () => {
  it("通常ツモで中央の数牌候補へ2倍を適用する", () => {
    const outerTile = createTile("man", 1);
    const centerTile = createTile("pin", 5);
    const state = prepareDrawState(
      [],
      [outerTile, centerTile],
      [{ id: "4-14", level: 5 }]
    );
    const result = drawTile(
      state,
      0,
      () => 0.34
    );

    expect(getPlayerDrawnTile(result)).toBe(
      centerTile
    );
    expect(result.round.liveWall).toEqual([
      outerTile
    ]);
  });

  it("1・2・8・9の候補だけなら抽選結果を変更しない", () => {
    const firstTile = createTile("man", 1);
    const secondTile = createTile("pin", 9);
    const state = prepareDrawState(
      [],
      [firstTile, secondTile],
      [{ id: "4-14", level: 5 }]
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

  it("4-13と4-14の両方に該当する3・7へ倍率を乗算する", () => {
    const honorTile = createTile("honor", 1);
    const overlappingTile = createTile("pin", 3);
    const state = prepareDrawState(
      [],
      [honorTile, overlappingTile],
      [
        { id: "4-13", level: 5 },
        { id: "4-14", level: 5 }
      ]
    );
    const result = drawTile(
      state,
      0,
      () => 0.21
    );

    expect(getPlayerDrawnTile(result)).toBe(
      overlappingTile
    );
  });
});
