import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  startNextRound
} from "./engine";
import type {
  GameState
} from "./types";

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

function createState(): GameState {
  return createInitialGameState(
    createSeededRandom(123456789),
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-4",
        level: 2
      }]
    }
  );
}

function endRound(
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

function expectVisibleOpponentTiles(
  state: GameState,
  expectedCount: number
): void {
  if (!state.akuukan) {
    throw new Error(
      "亜空間状態がありません。"
    );
  }

  for (const player of state.round.players) {
    const visibleTileIds =
      state.akuukan
        .playerSkill3_4VisibleTileIdsByPlayerId?.[
          player.id
        ];

    if (player.seat === 0) {
      expect(visibleTileIds).toBeUndefined();
      continue;
    }

    expect(visibleTileIds).toHaveLength(
      expectedCount
    );

    const handTileIds = new Set(
      player.hand.map((tile) => tile.id)
    );

    for (const tileId of visibleTileIds ?? []) {
      expect(handTileIds.has(tileId)).toBe(true);
    }
  }
}

describe("プレイヤースキル3-4 透牌のエンジン統合", () => {
  it("初回配牌で他家3人の手牌を指定枚数公開する", () => {
    const state = createState();

    expectVisibleOpponentTiles(state, 2);
  });

  it("次局の配牌でも公開牌を現在の手牌から選び直す", () => {
    const state = createState();

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    const stateWithStaleTile: GameState = {
      ...state,
      akuukan: {
        ...state.akuukan,
        playerSkill3_4VisibleTileIdsByPlayerId: {
          [state.round.players[1].id]: [
            "stale-transparent-tile"
          ]
        }
      }
    };
    const nextState = startNextRound(
      endRound(stateWithStaleTile),
      createSeededRandom(987654321)
    );

    expectVisibleOpponentTiles(nextState, 2);
    expect(
      Object.values(
        nextState.akuukan
          ?.playerSkill3_4VisibleTileIdsByPlayerId ??
          {}
      ).flat()
    ).not.toContain(
      "stale-transparent-tile"
    );
  });
});
