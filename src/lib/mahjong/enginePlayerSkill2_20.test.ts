import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
  reservePlayerSkill2_19AfterWin
} from "../akuukan/nextRoundPairGuarantee";
import {
  AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID,
  reservePlayerSkill2_20AfterWin
} from "../akuukan/nextRoundSuitGuarantee";
import type {
  EnemyId,
  SkillLevel
} from "../akuukan/types";
import {
  createInitialGameState,
  startNextRound
} from "./engine";
import {
  getTileTypeIndex
} from "./hand";
import type {
  GameState,
  Tile
} from "./types";

function createRoundEndWithReservation(
  level: SkillLevel,
  enemyId: EnemyId = "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: [{
        id: "2-20",
        level
      }]
    }
  );

  if (!state.akuukan) {
    throw new Error(
      "亜空間麻雀の状態がありません。"
    );
  }

  return {
    ...state,
    akuukan:
      reservePlayerSkill2_20AfterWin({
        akuukan: state.akuukan,
        normalYakuIds: ["honitsu"],
        winningTiles: [
          state.round.players[0].hand.find(
            (tile) => tile.suit === "man"
          ) ?? {
            id: "fallback-man",
            suit: "man",
            rank: 1,
            red: false
          },
          {
            id: "honor-for-reservation",
            suit: "honor",
            rank: 1,
            red: false
          }
        ]
      }),
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

function countSuitTiles(
  tiles: readonly Tile[],
  suit: "man" | "pin" | "sou"
): number {
  return tiles.filter(
    (tile) => tile.suit === suit
  ).length;
}

function countPairTileTypes(
  tiles: readonly Tile[]
): number {
  const counts = new Map<number, number>();

  for (const tile of tiles) {
    const tileTypeIndex =
      getTileTypeIndex(tile);

    counts.set(
      tileTypeIndex,
      (counts.get(tileTypeIndex) ?? 0) + 1
    );
  }

  return [...counts.values()].filter(
    (count) => count >= 2
  ).length;
}

function hasEffect(
  state: GameState,
  instanceId: string
): boolean {
  if (!state.akuukan) {
    return false;
  }

  return [
    ...state.akuukan.activeEffects,
    ...state.akuukan.nextRoundEffects
  ].some(
    (effect) =>
      effect.instanceId === instanceId
  );
}

describe("プレイヤースキル2-20の配牌統合", () => {
  it.each([
    [1, 4],
    [2, 5],
    [3, 6],
    [4, 7],
    [5, 9]
  ] as const)(
    "Lv.%sでは次局に使用色を最低%s枚保証して予約を消費する",
    (level, minimumTileCount) => {
      const settled =
        createRoundEndWithReservation(
          level
        );

      const result = startNextRound(
        settled,
        () => 0
      );

      expect(
        countSuitTiles(
          result.round.players[0].hand,
          "man"
        )
      ).toBeGreaterThanOrEqual(
        minimumTileCount
      );
      expect(
        hasEffect(
          result,
          AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID
        )
      ).toBe(false);
      expect(
        result.akuukan
          ?.playerSkill2_20ReservedSuit
      ).toBeUndefined();
    }
  );

  it("2-19と2-20を同時に予約して両方の保証を維持する", () => {
    const initial = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "2-19",
            level: 5
          },
          {
            id: "2-20",
            level: 5
          }
        ]
      }
    );

    if (!initial.akuukan) {
      throw new Error(
        "亜空間麻雀の状態がありません。"
      );
    }

    const afterPair =
      reservePlayerSkill2_19AfterWin({
        akuukan: initial.akuukan,
        normalYakuIds: ["toitoi"]
      });
    const afterSuit =
      reservePlayerSkill2_20AfterWin({
        akuukan: afterPair,
        normalYakuIds: ["honitsu"],
        winningTiles: [
          {
            id: "combined-man",
            suit: "man",
            rank: 1,
            red: false
          },
          {
            id: "combined-honor",
            suit: "honor",
            rank: 1,
            red: false
          }
        ]
      });
    const settled: GameState = {
      ...initial,
      akuukan: afterSuit,
      round: {
        ...initial.round,
        phase: "roundEnd",
        abortiveDrawResult: {
          reason: "nineTerminals",
          declarerSeat: 0,
          distinctYaochuCount: 9
        }
      }
    };

    const result = startNextRound(
      settled,
      () => 0
    );
    const playerHand =
      result.round.players[0].hand;

    expect(
      countPairTileTypes(playerHand)
    ).toBeGreaterThanOrEqual(4);
    expect(
      countSuitTiles(playerHand, "man")
    ).toBeGreaterThanOrEqual(9);
    expect(
      hasEffect(
        result,
        AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID
      )
    ).toBe(false);
    expect(
      hasEffect(
        result,
        AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID
      )
    ).toBe(false);
  });

  it("E-29より先にプレイヤーの使用色保証を維持する", () => {
    const settled =
      createRoundEndWithReservation(
        5,
        "enemy-16"
      );

    const result = startNextRound(
      settled,
      () => 0
    );

    expect(
      countSuitTiles(
        result.round.players[0].hand,
        "man"
      )
    ).toBeGreaterThanOrEqual(9);
    expect(
      hasEffect(
        result,
        AKUUKAN_PLAYER_SKILL_2_20_INSTANCE_ID
      )
    ).toBe(false);
  });
});
