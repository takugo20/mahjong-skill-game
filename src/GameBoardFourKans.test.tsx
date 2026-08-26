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

function createFourKansResultState(
  riichiPool: number
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "roundEnd";
  state.round.riichiPool = riichiPool;
  state.round.kanCount = 4;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.abortiveDrawResult = {
    reason: "fourKans",
    kanCountsBySeat: [1, 3, 0, 0]
  };

  return state;
}

afterEach(() => {
  cleanup();
});

describe("四槓散了の結果画面", () => {
  it("槓をした家ごとの回数と供託持越しを表示する", () => {
    render(
      <GameBoard
        initialState={
          createFourKansResultState(
            2000
          )
        }
      />
    );

    const resultDialog =
      screen.getByRole("dialog", {
        name: "四槓散了結果"
      });
    const resultText =
      resultDialog.textContent ?? "";

    expect(resultText).toContain(
      "途中流局"
    );
    expect(resultText).toContain(
      "四槓散了"
    );
    expect(resultText).toContain(
      "槓4回"
    );
    expect(resultText).toContain(
      "あなた・1回"
    );
    expect(resultText).toContain(
      "CPU・右・3回"
    );
    expect(resultText).toContain(
      "点数移動なし"
    );
    expect(resultText).toContain(
      "親は連荘し、本場を1つ増やします。"
    );
    expect(resultText).toContain(
      "供託2,000点は次局へ持ち越します。"
    );
  });

  it("次局へ進むと結果画面を閉じて連荘する", () => {
    render(
      <GameBoard
        initialState={
          createFourKansResultState(
            2000
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
        name: "四槓散了結果"
      })
    ).toBeNull();
    expect(
      screen.queryByText("1本場")
    ).not.toBeNull();
  });
});
