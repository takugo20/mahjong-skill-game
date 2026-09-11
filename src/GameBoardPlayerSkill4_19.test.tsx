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
import { GameBoard } from "./GameBoard";
import {
  createInitialGameState
} from "./lib/mahjong/engine";
import type {
  GameState,
  Tile
} from "./lib/mahjong/types";

function createState(): GameState {
  const initial = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "4-19",
        level: 2
      }]
    }
  );

  const hand: Tile[] = Array.from(
    { length: 14 },
    (_, index) => ({
      id: `ui-4-19-${index}`,
      suit:
        index === 0
          ? "man"
          : index < 3
            ? "sou"
            : "pin",
      rank: index % 9 + 1,
      red: false
    })
  );

  return {
    ...initial,
    playerMp: 390,
    round: {
      ...initial.round,
      currentSeat: 0,
      phase: "discarding",
      liveWall: [
        {
          id: "ui-incoming-pin",
          suit: "pin",
          rank: 9,
          red: false
        },
        ...initial.round.liveWall
      ],
      players: initial.round.players.map(
        (player) =>
          player.seat === 0
            ? {
                ...player,
                hand,
                riichi: false,
                drawnTileId: hand[13].id
              }
            : player
      )
    }
  };
}

function openPanel() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "手牌整理【筒】"
    })
  );

  return screen.getByRole("region", {
    name: "手牌整理【筒】の交換牌選択"
  });
}

function getTiles(panel: HTMLElement) {
  return within(panel)
    .getAllByRole("button")
    .filter((button) =>
      button.hasAttribute("aria-pressed")
    );
}

afterEach(cleanup);

describe("プレイヤースキル4-19の画面操作", () => {
  it("萬子・索子だけを表示し、上限を超えて選択できない", () => {
    render(
      <GameBoard initialState={createState()} />
    );

    const panel = openPanel();
    const tiles = getTiles(panel);

    expect(tiles).toHaveLength(3);

    const confirm = within(panel).getByRole(
      "button",
      { name: "選択した牌を筒子と交換" }
    ) as HTMLButtonElement;

    expect(confirm.disabled).toBe(true);

    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[1]);

    expect(
      (tiles[2] as HTMLButtonElement).disabled
    ).toBe(true);

    fireEvent.click(tiles[2]);

    expect(
      tiles[2].getAttribute("aria-pressed")
    ).toBe("false");

    expect(confirm.disabled).toBe(false);

    fireEvent.click(tiles[0]);

    expect(
      (tiles[2] as HTMLButtonElement).disabled
    ).toBe(false);

    const hand = screen.getByLabelText(
      "プレイヤーの手牌"
    );

    expect(
      within(hand)
        .getAllByRole("button")
        .every(
          (button) =>
            (button as HTMLButtonElement).disabled
        )
    ).toBe(true);

    expect(
      screen.queryByRole("button", {
        name: "打牌"
      })
    ).toBeNull();
  });

  it("取り消しではMPを消費せず、再度開くと未選択に戻る", () => {
    render(
      <GameBoard initialState={createState()} />
    );

    const panel = openPanel();

    fireEvent.click(getTiles(panel)[0]);
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "交換を取り消す"
      })
    );

    expect(
      screen.queryByRole("region", {
        name: "手牌整理【筒】の交換牌選択"
      })
    ).toBeNull();

    expect(
      document.body.textContent?.replace(/\s/g, "")
    ).toContain("MP390／900");

    const reopened = openPanel();

    expect(
      getTiles(reopened).every(
        (button) =>
          button.getAttribute("aria-pressed") ===
          "false"
      )
    ).toBe(true);
  });

  it("確定でMPを消費し、同じ手番の再発動ボタンを消す", () => {
    render(
      <GameBoard initialState={createState()} />
    );

    const panel = openPanel();

    fireEvent.click(getTiles(panel)[0]);
    fireEvent.click(
      within(panel).getByRole("button", {
        name: "選択した牌を筒子と交換"
      })
    );

    expect(
      screen.queryByRole("region", {
        name: "手牌整理【筒】の交換牌選択"
      })
    ).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: "手牌整理【筒】"
      })
    ).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: "手牌整理【筒】"
      })
    ).toBeNull();

    expect(
      document.body.textContent?.replace(/\s/g, "")
    ).toContain("MP290／900");

    expect(
      screen.queryByRole("button", {
        name: "打牌"
      })
    ).not.toBeNull();
  });
});
