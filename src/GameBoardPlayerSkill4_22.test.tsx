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
import { GameBoard } from "./GameBoard";
import {
  createInitialGameState
} from "./lib/mahjong/engine";

afterEach(cleanup);

function createState() {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{ id: "4-22", level: 1 }]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = 500;

  return state;
}

describe("4-22の画面操作", () => {
  it("発動で400MP消費し同じ手番の発動ボタンを消す", () => {
    render(
      <GameBoard initialState={createState()} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "雲外蒼天【順】"
      })
    );

    expect(
      document.body.textContent?.replace(/\s/g, "")
    ).toContain("MP100／900");

    expect(
      screen.queryByRole("button", {
        name: "雲外蒼天【順】"
      })
    ).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: "打牌"
      })
    ).not.toBeNull();
  });

  it("MP不足では発動ボタンを表示しない", () => {
    const state = createState();
    state.playerMp = 399;

    render(
      <GameBoard initialState={state} />
    );

    expect(
      screen.queryByRole("button", {
        name: "雲外蒼天【順】"
      })
    ).toBeNull();
  });
});
