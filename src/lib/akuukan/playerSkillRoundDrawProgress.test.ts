import { describe, expect, it } from "vitest";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillRoundDrawProgress as record,
  type PlayerSkillRoundDrawResult
} from "./playerSkillRoundDrawProgress";

function round(): PlayerSkillRoundDrawResult {
  return {
    phase: "roundEnd",
    drawResult: {
      tenpaiSeats: [],
      notenSeats: [0, 1, 2, 3],
      pointChanges: []
    }
  };
}

describe("局結果から流局進捗への変換", () => {
  it.each([
    "roundEnd",
    "matchEnd"
  ] as const)("%sの荒牌平局を記録する", phase => {
    const state = createInitialPlayerSkillGrowthState();

    const result = record(state, {
      ...round(),
      phase
    });

    expect(
      result.unlockProgress["round-draw-count"]
    ).toBe(1);
    expect(
      state.unlockProgress["round-draw-count"]
    ).toBe(0);
  });

  it("三家和による途中流局を記録する", () => {
    const state = createInitialPlayerSkillGrowthState();

    const result = record(state, {
      phase: "roundEnd",
      abortiveDrawResult: {
        reason: "tripleRon",
        discarderSeat: 0,
        ronCandidateSeats: [1, 2, 3]
      }
    });

    expect(
      result.unlockProgress["round-draw-count"]
    ).toBe(1);
  });

  it("E-27による特殊途中流局を記録する", () => {
    const state = createInitialPlayerSkillGrowthState();

    const result = record(state, {
      phase: "roundEnd",
      abortiveDrawResult: {
        reason: "enemyAbilityE27",
        invalidatedWinnerSeats: [0]
      }
    });

    expect(
      result.unlockProgress["round-draw-count"]
    ).toBe(1);
  });

  it("流し満貫では進捗を増やさない", () => {
    const state = createInitialPlayerSkillGrowthState();

    expect(
      record(state, {
        phase: "roundEnd",
        nagashiManganResult: {
          winnerSeats: [0],
          riichiPoolRecipientSeat: 0,
          pointChanges: []
        }
      })
    ).toBe(state);
  });

  it("局が終了していない場合と結果がない場合は記録しない", () => {
    const state = createInitialPlayerSkillGrowthState();

    expect(
      record(state, {
        ...round(),
        phase: "drawing"
      })
    ).toBe(state);

    expect(
      record(state, {
        phase: "roundEnd"
      })
    ).toBe(state);
  });
});
