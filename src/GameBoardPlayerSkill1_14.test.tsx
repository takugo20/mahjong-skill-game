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
  playerMp = 420
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "1-14", level: 5 }
      ]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.honba = 2;
  state.playerMp = playerMp;

  return state;
}

afterEach(() => {
  cleanup();
});

describe("プレイヤースキル1-14の画面操作", () => {
  it("発動可能なら心頭滅却ボタンを表示する", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "心頭滅却"
      })
    ).not.toBeNull();
  });

  it("発動すると本場とMPを更新してボタンを消す", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "心頭滅却"
      })
    );

    expect(
      screen.queryByText("3本場")
    ).not.toBeNull();
    expect(
      document.body.textContent
        ?.replace(/\s/g, "")
    ).toContain("MP390／900");
    expect(
      screen.queryByRole("button", {
        name: "心頭滅却"
      })
    ).toBeNull();
  });

  it("MP不足なら心頭滅却ボタンを表示しない", () => {
    render(
      <GameBoard
        initialState={createState(29)}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "心頭滅却"
      })
    ).toBeNull();
  });
});
