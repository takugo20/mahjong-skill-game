// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";
import {
  GameBoard
} from "./GameBoard";
import {
  createInitialGameState
} from "./lib/mahjong/engine";
import type {
  GameState
} from "./lib/mahjong/types";

function createFourRiichiResultState(
  riichiPool: number
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "roundEnd";
  state.round.riichiPool = riichiPool;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.abortiveDrawResult = {
    reason: "fourRiichi",
    riichiSeats: [0, 1, 2, 3]
  };
  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        score: 24000,
        riichi: true
      })
    );

  return state;
}

afterEach(() => {
  cleanup();
});

describe("四家立直の結果画面", () => {
  it("成立人数と供託持越しを表示する", () => {
    render(
      <GameBoard
        initialState={
          createFourRiichiResultState(
            4000
          )
        }
      />
    );

    const resultDialog =
      screen.getByRole("dialog", {
        name: "四家立直結果"
      });
    const resultText =
      resultDialog.textContent ?? "";

    expect(resultText).toContain(
      "途中流局"
    );
    expect(resultText).toContain(
      "四家立直"
    );
    expect(resultText).toContain(
      "立直4人"
    );
    expect(resultText).toContain(
      "4人全員の立直が成立"
    );
    expect(resultText).toContain(
      "点数移動なし"
    );
    expect(resultText).toContain(
      "親は連荘し、本場を1つ増やします。"
    );
    expect(resultText).toContain(
      "供託4,000点は次局へ持ち越します。"
    );
  });

  it("次局へ進むと結果画面を閉じて連荘する", () => {
    render(
      <GameBoard
        initialState={
          createFourRiichiResultState(
            4000
          )
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "次局へ"
      })
    );

    expect(
      screen.queryByRole("dialog", {
        name: "四家立直結果"
      })
    ).toBeNull();
    expect(
      screen.queryByText("1本場")
    ).not.toBeNull();
  });
});
