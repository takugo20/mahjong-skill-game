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

function createSouthFourRoundEnd():
  GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.prevailingWind = "south";
  state.round.handNumber = 4;
  state.round.honba = 2;
  state.round.riichiPool = 1000;
  state.round.phase = "roundEnd";
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

describe("南4局の終了・連荘条件", () => {
  it("親が聴牌した荒牌平局では順位にかかわらず連荘する", () => {
    const state =
      createSouthFourRoundEnd();

    state.round.drawResult = {
      tenpaiSeats: [0],
      notenSeats: [1, 2, 3],
      pointChanges: []
    };

    const result = startNextRound(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(4);
    expect(result.round.honba).toBe(3);
    expect(result.round.riichiPool).toBe(1000);
    expect(result.round.players[0].isDealer).toBe(
      true
    );
    expect(result.matchResult).toBeNull();
  });

  it("親が不聴の荒牌平局では南4局で対局終了にする", () => {
    const state =
      createSouthFourRoundEnd();

    state.round.drawResult = {
      tenpaiSeats: [1],
      notenSeats: [0, 2, 3],
      pointChanges: []
    };

    const result = startNextRound(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "matchEnd"
    );
    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(4);
    expect(result.round.riichiPool).toBe(0);
    expect(result.matchResult).not.toBeNull();
  });

  it("南4局の途中流局では親を連荘させ本場と供託を引き継ぐ", () => {
    const state =
      createSouthFourRoundEnd();

    state.round.abortiveDrawResult = {
      reason: "nineTerminals",
      declarerSeat: 2,
      distinctYaochuCount: 9
    };

    const result = startNextRound(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(4);
    expect(result.round.honba).toBe(3);
    expect(result.round.riichiPool).toBe(1000);
    expect(result.round.players[0].isDealer).toBe(
      true
    );
  });

  it("子だけの流し満貫では南4局で対局終了にする", () => {
    const state =
      createSouthFourRoundEnd();

    state.round.riichiPool = 0;
    state.round.nagashiManganResult = {
      winnerSeats: [1],
      riichiPoolRecipientSeat: null,
      pointChanges: []
    };

    const result = startNextRound(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "matchEnd"
    );
    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(4);
    expect(result.matchResult).not.toBeNull();
  });

  it("親の流し満貫では南4局でも連荘する", () => {
    const state =
      createSouthFourRoundEnd();

    state.round.riichiPool = 0;
    state.round.nagashiManganResult = {
      winnerSeats: [0],
      riichiPoolRecipientSeat: null,
      pointChanges: []
    };

    const result = startNextRound(
      state,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.prevailingWind).toBe(
      "south"
    );
    expect(result.round.handNumber).toBe(4);
    expect(result.round.honba).toBe(3);
    expect(result.round.players[0].isDealer).toBe(
      true
    );
  });
});
