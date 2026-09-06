import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
  reservePlayerSkill2_19AfterWin
} from "../akuukan/nextRoundPairGuarantee";
import type {
  EnemyId,
  SkillLevel
} from "../akuukan/types";
import {
  getTileTypeIndex
} from "./hand";
import {
  createInitialGameState,
  startNextRound
} from "./engine";
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
        id: "2-19",
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
      reservePlayerSkill2_19AfterWin({
        akuukan: state.akuukan,
        normalYakuIds: ["toitoi"]
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

function hasSkill2_19Effect(
  state: GameState
): boolean {
  if (!state.akuukan) {
    return false;
  }

  return [
    ...state.akuukan.activeEffects,
    ...state.akuukan.nextRoundEffects
  ].some(
    (effect) =>
      effect.instanceId ===
      AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID
  );
}

describe("プレイヤースキル2-19の配牌統合", () => {
  it.each([
    [1, 2],
    [2, 2],
    [3, 3],
    [4, 3],
    [5, 4]
  ] as const)(
    "Lv.%sでは次局の配牌に最低%s対子を保証して予約を消費する",
    (level, minimumPairCount) => {
      const settled =
        createRoundEndWithReservation(
          level
        );

      const result = startNextRound(
        settled,
        () => 0
      );

      expect(
        countPairTileTypes(
          result.round.players[0].hand
        )
      ).toBeGreaterThanOrEqual(
        minimumPairCount
      );
      expect(
        hasSkill2_19Effect(result)
      ).toBe(false);
    }
  );

  it("E-29より先にプレイヤーの対子保証を維持する", () => {
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
      countPairTileTypes(
        result.round.players[0].hand
      )
    ).toBeGreaterThanOrEqual(4);
    expect(
      hasSkill2_19Effect(result)
    ).toBe(false);
  });
});
