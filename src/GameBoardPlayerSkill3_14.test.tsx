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
  SkillLevel
} from "./lib/akuukan/types";

function createState(level: SkillLevel) {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-14",
        level
      }]
    }
  );
}

afterEach(() => {
  cleanup();
});

describe("プレイヤースキル3-14の画面操作", () => {
  it("初局で発動可能なら発動と見送りのボタンを表示する", () => {
    render(
      <GameBoard initialState={createState(5)} />
    );

    expect(
      screen.queryByText(
        "色即是空を発動しますか？"
      )
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "色即是空を発動"
      })
    ).not.toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "発動しない"
      })
    ).not.toBeNull();
  });

  it("発動後に第1ツモ分のMPを加算して局を開始する", () => {
    render(
      <GameBoard initialState={createState(5)} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "色即是空を発動"
      })
    );

    const pageText =
      document.body.textContent
        ?.replace(/\s/g, "") ?? "";

    expect(pageText).toContain("MP70／900");
    expect(
      screen.queryByRole("button", {
        name: "発動しない"
      })
    ).toBeNull();
  });

  it("見送るとMPを消費せず局を開始する", () => {
    render(
      <GameBoard initialState={createState(5)} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "発動しない"
      })
    );

    const pageText =
      document.body.textContent
        ?.replace(/\s/g, "") ?? "";

    expect(pageText).toContain("MP420／900");
    expect(
      screen.queryByRole("button", {
        name: "色即是空を発動"
      })
    ).toBeNull();
  });

  it("初期MPで発動できないレベルでは選択を表示しない", () => {
    render(
      <GameBoard initialState={createState(1)} />
    );

    expect(
      screen.queryByRole("button", {
        name: "色即是空を発動"
      })
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "発動しない"
      })
    ).toBeNull();
  });
});
