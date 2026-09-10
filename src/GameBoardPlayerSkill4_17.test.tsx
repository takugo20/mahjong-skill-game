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
  SkillLevel
} from "./lib/akuukan/types";

function createState(level: SkillLevel) {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "4-17",
        level
      }]
    }
  );
}

afterEach(() => {
  cleanup();
});

describe("プレイヤースキル4-17の画面操作", () => {
  it("交換する牌の選択数と交換上限を表示する", () => {
    render(
      <GameBoard initialState={createState(2)} />
    );

    expect(
      screen.queryByText(
        "手牌整理【序】：交換する牌を選択（0／2枚）"
      )
    ).not.toBeNull();

    const hand = screen.getByLabelText(
      "プレイヤーの手牌"
    );
    const tiles = within(hand).getAllByRole(
      "button"
    );

    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[1]);

    expect(
      screen.queryByText(
        "手牌整理【序】：交換する牌を選択（2／2枚）"
      )
    ).not.toBeNull();
    expect(
      tiles[0].getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      tiles[1].getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("交換上限を超える牌は追加選択しない", () => {
    render(
      <GameBoard initialState={createState(1)} />
    );

    const hand = screen.getByLabelText(
      "プレイヤーの手牌"
    );
    const tiles = within(hand).getAllByRole(
      "button"
    );

    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[1]);

    expect(
      tiles[0].getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      tiles[1].getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("選択した牌を交換して局を開始する", () => {
    render(
      <GameBoard initialState={createState(1)} />
    );

    const hand = screen.getByLabelText(
      "プレイヤーの手牌"
    );

    fireEvent.click(
      within(hand).getAllByRole("button")[0]
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "選択した牌を交換"
      })
    );

    expect(
      screen.queryByRole("button", {
        name: "選択した牌を交換"
      })
    ).toBeNull();

    expect(
      document.body.textContent
        ?.replace(/\s/g, "")
    ).toContain("MP300／900");
  });

  it("3-14を見送った後に4-17を表示する", () => {
    const state = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [
          {
            id: "3-14",
            level: 5
          },
          {
            id: "4-17",
            level: 5
          }
        ]
      }
    );

    render(
      <GameBoard initialState={state} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "発動しない"
      })
    );

    expect(
      screen.queryByText(
        "手牌整理【序】：交換する牌を選択（0／6枚）"
      )
    ).not.toBeNull();

    expect(
      screen.queryByRole("button", {
        name: "選択した牌を交換"
      })
    ).not.toBeNull();
  });
});
