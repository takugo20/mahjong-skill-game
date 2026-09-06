// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
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
  Tile
} from "./lib/mahjong/types";

function createTile(rank: number): Tile {
  return {
    id: `game-board-player-skill-3-8-${rank}`,
    suit: "man",
    rank,
    red: false
  };
}

function createState(
  playerMp = 300
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "3-8", level: 5 }
      ]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = [
    createTile(1),
    createTile(2),
    createTile(3),
    createTile(4)
  ];
  state.playerMp = playerMp;

  return state;
}

afterEach(() => {
  cleanup();
});

describe("プレイヤースキル3-8の画面操作", () => {
  it("発動可能なら山牌封印ボタンを表示する", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "山牌封印"
      })
    ).not.toBeNull();
  });

  it("発動すると通常山とMPを減らしてボタンを消す", () => {
    render(
      <GameBoard
        initialState={createState()}
      />
    );

    const roundInformation = within(
      screen.getByRole("region", {
        name: "対局情報"
      })
    );

    expect(
      roundInformation.queryByText("4")
    ).not.toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "山牌封印"
      })
    );

    expect(
      roundInformation.queryByText("1")
    ).not.toBeNull();
    expect(
      document.body.textContent
        ?.replace(/\s/g, "")
    ).toContain("MP240／900");
    expect(
      screen.queryByRole("button", {
        name: "山牌封印"
      })
    ).toBeNull();
  });

  it("MP不足なら山牌封印ボタンを表示しない", () => {
    render(
      <GameBoard
        initialState={createState(59)}
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "山牌封印"
      })
    ).toBeNull();
  });
});
