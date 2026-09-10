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
  TileSuit,
  Wind
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-4-16-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function prepareDrawState(
  hand: readonly Tile[],
  liveWall: readonly Tile[],
  equippedSkills:
    readonly EquippedPlayerSkill[],
  seatWind: Wind
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
                seatWind,
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

describe("プレイヤースキル4-16のエンジン統合", () => {
  it("現在の自風が南なら南へ2倍を適用する", () => {
    const eastTile = createTile("honor", 1);
    const southTile = createTile("honor", 2);
    const state = prepareDrawState(
      [],
      [eastTile, southTile],
      [{ id: "4-16", level: 5 }],
      "south"
    );
    const result = drawTile(
      state,
      0,
      () => 0.34
    );

    expect(getPlayerDrawnTile(result)).toBe(
      southTile
    );
    expect(result.round.liveWall).toEqual([
      eastTile
    ]);
  });

  it("自風以外の風牌候補だけなら抽選結果を変更しない", () => {
    const southTile = createTile("honor", 2);
    const westTile = createTile("honor", 3);
    const state = prepareDrawState(
      [],
      [southTile, westTile],
      [{ id: "4-16", level: 5 }],
      "east"
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
      southTile
    );
    expect(randomCallCount).toBe(0);
  });

  it("4-9と4-16の両方に該当する自風牌へ倍率を乗算する", () => {
    const numberTile = createTile("man", 1);
    const westTile = createTile("honor", 3);
    const state = prepareDrawState(
      [],
      [numberTile, westTile],
      [
        { id: "4-9", level: 5 },
        { id: "4-16", level: 5 }
      ],
      "west"
    );
    const result = drawTile(
      state,
      0,
      () => 0.21
    );

    expect(getPlayerDrawnTile(result)).toBe(
      westTile
    );
  });
});
