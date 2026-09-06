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
        { id: "3-9", level: 2 }
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

describe("プレイヤースキル3-9の画面操作", () => {
  it("発動可能なら防御結界【破】ボタンを表示する", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "防御結界【破】"
      })
    ).not.toBeNull();
  });

  it("発動するとMPを消費して残り巡数を表示する", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "防御結界【破】"
      })
    );

    expect(
      document.body.textContent
        ?.replace(/\s/g, "")
    ).toContain("MP180／900");
    expect(
      document.body.textContent
        ?.replace(/\s/g, "")
    ).toContain(
      "防御結界【破】残り2巡"
    );
    expect(
      screen.queryByRole("button", {
        name: "防御結界【破】"
      })
    ).toBeNull();
  });

  it("MP不足なら発動ボタンを表示しない", () => {
    render(
      <GameBoard
        initialState={createState(319)}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "防御結界【破】"
      })
    ).toBeNull();
  });
});
