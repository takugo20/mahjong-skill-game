import { describe, expect, it } from "vitest";
import {
  beginAkuukanTurn,
  createInitialAkuukanGameState
} from "./state";
import {
  tryActivateAkuukanPlayerSkill4_22
} from "./nextRoundSequenceReservation";

function createState() {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "4-22", level: 1 }]
    }),
    playerMp: 900,
    maxMp: 900
  };
}

describe("4-22の次局順子予約", () => {
  it("消費MP・同じ手番の再使用禁止・後の手番の累積を反映する", () => {
    const initial = createState();
    const first = tryActivateAkuukanPlayerSkill4_22(
      initial
    );

    expect(first.succeeded).toBe(true);
    expect(first.state.playerMp).toBe(500);
    expect(
      first.state.akuukan.nextRoundEffects
    ).toHaveLength(1);
    expect(
      initial.akuukan.nextRoundEffects
    ).toHaveLength(0);

    const repeated = tryActivateAkuukanPlayerSkill4_22(
      first.state
    );

    expect(repeated.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(repeated.state).toBe(first.state);

    const second = tryActivateAkuukanPlayerSkill4_22({
      ...first.state,
      akuukan: beginAkuukanTurn(first.state.akuukan)
    });

    expect(second.succeeded).toBe(true);
    expect(second.state.playerMp).toBe(100);

    const reservations =
      second.state.akuukan.nextRoundEffects;

    expect(reservations).toHaveLength(2);
    expect(
      new Set(
        reservations.map((effect) => effect.instanceId)
      ).size
    ).toBe(2);
  });

  it("MP不足では予約も使用履歴も追加しない", () => {
    const state = {
      ...createState(),
      playerMp: 399
    };
    const result = tryActivateAkuukanPlayerSkill4_22(
      state
    );

    expect(result.failureReason).toBe(
      "insufficientMp"
    );
    expect(result.state).toBe(state);
    expect(
      result.state.akuukan.nextRoundEffects
    ).toHaveLength(0);
    expect(
      result.state.akuukan.usedSources.turn
    ).not.toContain("player-skill:4-22");
  });
});
