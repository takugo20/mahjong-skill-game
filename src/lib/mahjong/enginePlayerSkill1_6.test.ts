import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID,
  reserveAkuukanPlayerSkill1_6AfterWin
} from "../akuukan/nextRoundRedTile";
import type {
  SkillLevel
} from "../akuukan/types";
import {
  createInitialGameState,
  startNextRound
} from "./engine";
import type {
  GameState,
  Tile
} from "./types";

function createRoundEndWithReservation(
  level: SkillLevel
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "1-6",
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
      reserveAkuukanPlayerSkill1_6AfterWin(
        state.akuukan
      ),
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

function withoutReservation(
  state: GameState
): GameState {
  if (!state.akuukan) {
    return state;
  }

  return {
    ...state,
    akuukan: {
      ...state.akuukan,
      nextRoundEffects: []
    }
  };
}

function getNewRedTiles(
  baseline: GameState,
  transformed: GameState
): Tile[] {
  const baselineRedById = new Map(
    baseline.round.players[0].hand.map(
      (tile) => [tile.id, tile.red]
    )
  );

  return transformed.round.players[0].hand
    .filter(
      (tile) =>
        tile.red &&
        baselineRedById.get(tile.id) ===
          false
    );
}

function hasSkill1_6Effect(
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
      AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID
  );
}

describe("プレイヤースキル1-6の配牌統合", () => {
  it("予約があれば次局の最終配牌1枚を赤ドラ化して消費する", () => {
    const settled =
      createRoundEndWithReservation(5);
    const baseline = startNextRound(
      withoutReservation(settled),
      () => 0
    );
    const transformed = startNextRound(
      settled,
      () => 0
    );

    expect(
      getNewRedTiles(baseline, transformed)
    ).toHaveLength(1);
    expect(
      hasSkill1_6Effect(transformed)
    ).toBe(false);
  });

  it("次局の確率判定に失敗しても予約を消費する", () => {
    const settled =
      createRoundEndWithReservation(1);
    const baseline = startNextRound(
      withoutReservation(settled),
      () => 0.1
    );
    const failed = startNextRound(
      settled,
      () => 0.1
    );

    expect(
      failed.round.players[0].hand
    ).toEqual(
      baseline.round.players[0].hand
    );
    expect(
      hasSkill1_6Effect(failed)
    ).toBe(false);
  });
});
