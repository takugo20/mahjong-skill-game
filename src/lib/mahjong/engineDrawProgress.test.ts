import { describe, expect, it } from "vitest";
import {
  createInitialGameState,
  drawTile,
  createNextRoundProgression,
  startNextRound,
  declarePlayerNineTerminals
} from "./engine";
import {
  recordAkuukanGameDrawProgress
} from "../akuukan/gameDrawProgress";
import type { Tile } from "./types";

function prepare() {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: []
  });

  state.round.phase = "drawing";
  state.round.currentSeat = 0;
  state.round.liveWall = [];

  for (const player of state.round.players) {
    player.hand = [];
    player.melds = [];
    player.discards = [];
  }

  return state;
}

describe("対局処理と流局進捗の接続", () => {
  it("荒牌平局の成立直後に1回だけ記録する", () => {
    const state = prepare();
    const result = drawTile(state, 0);

    expect(result.round.phase).toBe("roundEnd");
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(1);
    expect(
      recordAkuukanGameDrawProgress(result)
    ).toBe(result);
    expect(
      state.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(0);
  });

  it("次局へ進んでも二重に加算せず、通し番号を進める", () => {
    const ended = drawTile(prepare(), 0);

    const next = createNextRoundProgression(
      ended,
      () => 0.5
    ).stateAfterStart;

    expect(next.roundSequence).toBe(2);
    expect(
      next.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(1);
    expect(
      next.playerSkillDrawProgress?.recordedRoundNumbers
    ).toEqual([1]);
  });

  it("飛び終了時にも流局の記録を維持する", () => {
    const ended = drawTile(prepare(), 0);
    ended.round.players[1].score = -100;

    const result = startNextRound(ended, () => 0.5);

    expect(result.round.phase).toBe("matchEnd");
    expect(result.roundSequence).toBe(1);
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(1);
  });

  it("九種九牌の成立直後に途中流局を記録する", () => {
    const state = createInitialGameState(() => 0.5, {
      enemyId: "enemy-1",
      equippedSkills: []
    });

    const hand: Tile[] = [
      ...[1, 9].map(rank => ({
        id: `m${rank}`,
        suit: "man" as const,
        rank,
        red: false
      })),
      ...[1, 9].map(rank => ({
        id: `p${rank}`,
        suit: "pin" as const,
        rank,
        red: false
      })),
      ...[1, 2, 3, 4, 5, 6, 7].map(rank => ({
        id: `h${rank}`,
        suit: "honor" as const,
        rank,
        red: false
      })),
      ...[2, 3, 4].map(rank => ({
        id: `s${rank}`,
        suit: "sou" as const,
        rank,
        red: false
      }))
    ];

    state.round.players[0].hand = hand;
    state.round.players[0].drawnTileId = hand[13].id;

    const result = declarePlayerNineTerminals(state);

    expect(
      result.round.abortiveDrawResult?.reason
    ).toBe("nineTerminals");
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(1);
  });
});
