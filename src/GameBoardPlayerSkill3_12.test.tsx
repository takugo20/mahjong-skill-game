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

function createTile(
  id: string,
  suit: Tile["suit"],
  rank: number,
  red = false
): Tile {
  return {
    id,
    suit,
    rank,
    red
  };
}

function createState(
  playerMp = 500
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-12",
        level: 1
      }]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = playerMp;
  state.round.players[2] = {
    ...state.round.players[2],
    hand: [
      createTile(
        "player-skill-3-12-man-1",
        "man",
        1
      ),
      createTile(
        "player-skill-3-12-red-pin-5",
        "pin",
        5,
        true
      )
    ]
  };

  return state;
}

afterEach(() => {
  cleanup();
});

describe("プレイヤースキル3-12の画面操作", () => {
  it("発動可能なら相手3人の対象選択ボタンを表示する", () => {
    const state = createState();

    render(
      <GameBoard initialState={state} />
    );

    for (const seat of [1, 2, 3] as const) {
      expect(
        screen.queryByRole("button", {
          name:
            `透牌【全】：${state.round.players[seat].name}`
        })
      ).not.toBeNull();
    }
  });

  it("指定相手の保存手牌だけをすべて表示する", () => {
    const state = createState();
    const target = state.round.players[2];
    const other = state.round.players[1];

    render(
      <GameBoard initialState={state} />
    );

    const targetArea = screen.getByRole(
      "region",
      { name: target.name }
    );

    expect(
      within(targetArea).getAllByLabelText(
        "裏向きの牌"
      )
    ).toHaveLength(2);

    fireEvent.click(
      screen.getByRole("button", {
        name: `透牌【全】：${target.name}`
      })
    );

    expect(
      within(targetArea).queryByLabelText(
        "一萬"
      )
    ).not.toBeNull();
    expect(
      within(targetArea).queryByLabelText(
        "赤五筒"
      )
    ).not.toBeNull();
    expect(
      within(targetArea).queryByLabelText(
        "裏向きの牌"
      )
    ).toBeNull();

    const otherArea = screen.getByRole(
      "region",
      { name: other.name }
    );

    expect(
      within(otherArea).queryAllByLabelText(
        "裏向きの牌"
      ).length
    ).toBeGreaterThan(0);
    expect(
      document.body.textContent
        ?.replace(/\s/g, "")
    ).toContain("MP200／900");
    expect(
      screen.queryAllByRole("button", {
        name: /透牌【全】/
      })
    ).toHaveLength(0);
  });

  it("MP不足なら対象選択ボタンを表示しない", () => {
    render(
      <GameBoard
        initialState={createState(299)}
      />
    );

    expect(
      screen.queryAllByRole("button", {
        name: /透牌【全】/
      })
    ).toHaveLength(0);
  });
});
