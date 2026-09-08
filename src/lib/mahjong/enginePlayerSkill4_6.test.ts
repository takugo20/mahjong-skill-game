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
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-4-6-${serialNumber}`,
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

function createRedTenpaiHand(): Tile[] {
  return [
    createTile("man", 4),
    createTile("man", 5, true),
    createTile("man", 6),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles(
      "sou",
      [1, 2, 3, 7, 8, 9]
    ),
    createTile("honor", 1)
  ];
}

function createOpenTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [7, 8]),
    ...createTiles("honor", [1, 1])
  ];
}

function createRedChiMeld(): Meld {
  return {
    kind: "chi",
    tiles: [
      createTile("man", 4),
      createTile("man", 5, true),
      createTile("man", 6)
    ]
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
  "プレイヤースキル4-6のエンジン統合",
  () => {
    it(
      "赤ドラ所持中の通常ツモで向聴改善候補へ1.5倍を適用する",
      () => {
        const normalTile = createTile(
          "honor",
          2
        );
        const improvingTile = createTile(
          "honor",
          1
        );
        const state = prepareDrawState(
          createRedTenpaiHand(),
          [normalTile, improvingTile],
          [{ id: "4-6", level: 5 }]
        );
        const result = drawTile(
          state,
          0,
          () => 0.4
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(improvingTile);
        expect(
          result.round.liveWall
        ).toEqual([normalTile]);
      }
    );

    it(
      "副露面子にだけ赤ドラがある場合は向聴改善候補を優遇しない",
      () => {
        const firstTile = createTile(
          "honor",
          2
        );
        const improvingTile = createTile(
          "sou",
          6
        );
        const state = prepareDrawState(
          createOpenTenpaiHand(),
          [firstTile, improvingTile],
          [{ id: "4-6", level: 5 }],
          [createRedChiMeld()]
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
      "4-3と4-6の両方に該当する候補へ倍率を乗算する",
      () => {
        const normalTile = createTile(
          "honor",
          2
        );
        const improvingTile = createTile(
          "honor",
          1
        );
        const state = prepareDrawState(
          createRedTenpaiHand(),
          [normalTile, improvingTile],
          [
            { id: "4-3", level: 5 },
            { id: "4-6", level: 5 }
          ]
        );
        const result = drawTile(
          state,
          0,
          () => 0.37
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(improvingTile);
      }
    );
  }
);
