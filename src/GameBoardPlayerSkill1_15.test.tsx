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

function createState(
  playerMp = 500
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "1-15", level: 2 }
      ]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = playerMp;

  return state;
}

afterEach(() => {
  cleanup();
});

describe("プレイヤースキル1-15の画面操作", () => {
  it("発動可能なら門前回帰ボタンを表示する", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "門前回帰"
      })
    ).not.toBeNull();
    expect(
      screen.queryByText(
        "門前回帰 残り2巡"
      )
    ).toBeNull();
  });

  it("発動するとMPと残り巡数を表示してボタンを消す", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "門前回帰"
      })
    );

    expect(
      document.body.textContent
        ?.replace(/\s/g, "")
    ).toContain("MP270／900");
    expect(
      screen.queryByText(
        "門前回帰 残り2巡"
      )
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "門前回帰"
      })
    ).toBeNull();
  });

  it("MP不足なら門前回帰ボタンを表示しない", () => {
    render(
      <GameBoard
        initialState={createState(229)}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "門前回帰"
      })
    ).toBeNull();
  });
});
