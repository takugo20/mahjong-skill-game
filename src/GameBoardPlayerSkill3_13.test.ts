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
      equippedSkills: [{
        id: "3-13",
        level: 1
      }]
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

describe("プレイヤースキル3-13の画面操作", () => {
  it("発動可能なら相手3人の対象選択ボタンを表示する", () => {
    const state = createState();

    render(
      <GameBoard initialState={state} />
    );

    for (const seat of [1, 2, 3] as const) {
      expect(
        screen.queryByRole("button", {
          name:
            `河牌転送：${state.round.players[seat].name}`
        })
      ).not.toBeNull();
    }
  });

  it("指定相手へ発動してMPと発動状態を表示する", () => {
    const state = createState();
    const target = state.round.players[2];

    render(
      <GameBoard initialState={state} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `河牌転送：${target.name}`
      })
    );

    const pageText =
      document.body.textContent
        ?.replace(/\s/g, "") ?? "";

    expect(pageText).toContain(
      `河牌転送→${target.name}残り1巡／予約0枚`
    );
    expect(pageText).toContain("MP120／900");
    expect(
      screen.queryAllByRole("button", {
        name: /河牌転送：/
      })
    ).toHaveLength(0);
  });

  it("MP不足なら対象選択ボタンを表示しない", () => {
    render(
      <GameBoard
        initialState={createState(379)}
      />
    );

    expect(
      screen.queryAllByRole("button", {
        name: /河牌転送：/
      })
    ).toHaveLength(0);
  });
});
