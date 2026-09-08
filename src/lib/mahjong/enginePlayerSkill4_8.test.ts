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
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-4-8-${serialNumber}`,
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

function createStandardTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles(
      "sou",
      [1, 2, 3, 7, 8, 9]
    ),
    createTile("honor", 1)
  ];
}

function prepareDrawState(
  scores: readonly [
    number,
    number,
    number,
    number
  ],
  initialDealerSeat: SeatIndex,
  liveWall: readonly Tile[]
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "4-8", level: 5 }
      ]
    }
  );

  return {
    ...state,
    initialDealerSeat,
    round: {
      ...state.round,
      currentSeat: 0,
      phase: "drawing",
      liveWall: [...liveWall],
      players: state.round.players.map(
        (player) => ({
          ...player,
          score: scores[player.seat],
          ...(player.seat === 0
            ? {
                hand:
                  createStandardTenpaiHand(),
                melds: [],
                drawnTileId: null,
                drawnTileSource: null
              }
            : {})
        })
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

function drawWithSkill(
  scores: readonly [
    number,
    number,
    number,
    number
  ],
  initialDealerSeat: SeatIndex,
  random: () => number
) {
  const normalTile = createTile(
    "honor",
    2
  );
  const improvingTile = createTile(
    "honor",
    1
  );
  const state = prepareDrawState(
    scores,
    initialDealerSeat,
    [normalTile, improvingTile]
  );
  const result = drawTile(
    state,
    0,
    random
  );

  return {
    normalTile,
    improvingTile,
    result
  };
}

describe(
  "プレイヤースキル4-8のエンジン統合",
  () => {
    it(
      "ツモ直前に単独4着なら向聴改善候補へ2倍を適用する",
      () => {
        const {
          improvingTile,
          result
        } = drawWithSkill(
          [
            24000,
            25000,
            25500,
            25500
          ],
          0,
          () => 0.34
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(improvingTile);
      }
    );

    it(
      "ツモ直前に4着でなければ向聴改善候補を優遇しない",
      () => {
        let randomCallCount = 0;
        const {
          normalTile,
          result
        } = drawWithSkill(
          [
            26000,
            24000,
            25000,
            25000
          ],
          0,
          () => {
            randomCallCount += 1;
            return 0.999;
          }
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(normalTile);
        expect(
          randomCallCount
        ).toBe(0);
      }
    );

    it(
      "全員同点で起家が座席1なら座席0を4着として適用する",
      () => {
        const {
          improvingTile,
          result
        } = drawWithSkill(
          [
            25000,
            25000,
            25000,
            25000
          ],
          1,
          () => 0.34
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(improvingTile);
      }
    );

    it(
      "全員同点で座席0が起家なら座席0を1着として適用しない",
      () => {
        let randomCallCount = 0;
        const {
          normalTile,
          result
        } = drawWithSkill(
          [
            25000,
            25000,
            25000,
            25000
          ],
          0,
          () => {
            randomCallCount += 1;
            return 0.999;
          }
        );

        expect(
          getPlayerDrawnTile(result)
        ).toBe(normalTile);
        expect(
          randomCallCount
        ).toBe(0);
      }
    );
  }
);
