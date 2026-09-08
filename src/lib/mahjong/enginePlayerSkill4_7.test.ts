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
  Meld,
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
    id: `engine-player-skill-4-7-${serialNumber}`,
    suit,
    rank,
    red: false
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

function createClosedKanMeld(): Meld {
  return {
    kind: "closedKan",
    tiles: createTiles(
      "man",
      [9, 9, 9, 9]
    )
  };
}

function prepareDrawState(
  hand: readonly Tile[],
  liveWall: readonly Tile[],
  equippedSkills:
    readonly EquippedPlayerSkill[],
  melds: readonly Meld[] = []
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
                melds: [...melds],
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

describe(
  "プレイヤースキル4-7のエンジン統合",
  () => {
    it(
      "暗槓成立後の通常ツモで手牌と同じ牌種へ2倍を適用する",
      () => {
        const normalTile = createTile(
          "honor",
          1
        );
        const sameTile = createTile(
          "pin",
          5
        );
        const state = prepareDrawState(
          [createTile("pin", 5)],
          [normalTile, sameTile],
          [{ id: "4-7", level: 5 }],
          [createClosedKanMeld()]
        );
        const result = drawTile(
          state,
          0,
          () => 0.34
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(sameTile);
        expect(
          result.round.liveWall
        ).toEqual([normalTile]);
      }
    );

    it(
      "暗槓成立前の通常ツモでは同牌種候補を優遇しない",
      () => {
        const firstTile = createTile(
          "honor",
          1
        );
        const sameTile = createTile(
          "pin",
          5
        );
        const state = prepareDrawState(
          [createTile("pin", 5)],
          [firstTile, sameTile],
          [{ id: "4-7", level: 5 }]
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

        expect(
          getPlayerDrawnTile(result)
        ).toBe(firstTile);
        expect(randomCallCount).toBe(0);
      }
    );

    it(
      "4-2と4-7の両方に該当する候補へ倍率を乗算する",
      () => {
        const normalTile = createTile(
          "honor",
          1
        );
        const sameTile = createTile(
          "pin",
          5
        );
        const state = prepareDrawState(
          [createTile("pin", 5)],
          [normalTile, sameTile],
          [
            { id: "4-2", level: 5 },
            { id: "4-7", level: 5 }
          ],
          [createClosedKanMeld()]
        );
        const result = drawTile(
          state,
          0,
          () => 0.3
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(sameTile);
      }
    );
  }
);
