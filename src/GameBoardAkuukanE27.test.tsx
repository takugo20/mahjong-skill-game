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
  GameState,
  SeatIndex
} from "./lib/mahjong/types";

function createE27ResultState(
  riichiPool: number,
  invalidatedWinnerSeats:
    SeatIndex[] = [0]
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-15",
      equippedSkills: []
    }
  );

  state.round.phase = "roundEnd";
  state.round.riichiPool = riichiPool;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = {
    reason: "enemyAbilityE27",
    invalidatedWinnerSeats
  };

  return state;
}

afterEach(() => {
  cleanup();
});

describe("敵15 E-27の結果画面", () => {
  it("無効になった和了者と特殊途中流局の内容を表示する", () => {
    render(
      <GameBoard
        initialState={
          createE27ResultState(
            2000,
            [2, 0]
          )
        }
      />
    );

    const resultDialog =
      screen.getByRole("dialog", {
        name: "E-27特殊途中流局結果"
      });
    const resultText =
      resultDialog.textContent ?? "";

    expect(resultText).toContain(
      "敵能力発動"
    );
    expect(resultText).toContain("E-27");
    expect(resultText).toContain(
      "和了無効"
    );
    expect(resultText).toContain(
      "能力者CPU"
    );
    expect(resultText).toContain("あなた");
    expect(resultText).toContain(
      "満貫未満の和了"
    );
    expect(resultText).toContain(
      "点数移動なし"
    );
    expect(resultText).toContain(
      "特殊途中流局"
    );
    expect(resultText).toContain(
      "親は連荘し、"
    );
    expect(resultText).toContain(
      "本場を1つ増やします。"
    );
    expect(resultText).toContain(
      "供託2,000点は次局へ持ち越します。"
    );
  });

  it("次局へ進むと結果画面を閉じて親連荘する", () => {
    render(
      <GameBoard
        initialState={
          createE27ResultState(0)
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
        name: "E-27特殊途中流局結果"
      })
    ).toBeNull();
    expect(
      screen.queryByText("1本場")
    ).not.toBeNull();
  });
});
