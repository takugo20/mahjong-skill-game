// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  within
} from "@testing-library/react";
import {
  afterEach,
  expect,
  it
} from "vitest";
import { WinResultHand } from "./WinResultHand";
import type { Tile } from "../lib/mahjong/types";

const tile = (id: string): Tile => ({
  id,
  suit: "man",
  rank: 5,
  red: true
});

afterEach(cleanup);

it.each(["tsumo", "ron"] as const)(
  "%sの和了牌を重複せず表示する",
  winMethod => {
    const winningTile = tile("win");
    const hand = [
      tile("hand"),
      ...(winMethod === "tsumo" ? [winningTile] : [])
    ];

    render(
      <WinResultHand
        player={{
          name: "自分",
          hand,
          melds: []
        }}
        result={{ winMethod, winningTile }}
      />
    );

    expect(
      within(
        screen.getByRole("group", { name: "手牌" })
      ).getAllByRole("img")
    ).toHaveLength(1);

    expect(
      within(
        screen.getByRole("group", { name: "和了牌" })
      ).getAllByRole("img")
    ).toHaveLength(1);

    expect(
      screen.getAllByRole("img")
    ).toHaveLength(2);
  }
);

it("暗槓の4枚を表示し、元の手牌を変更しない", () => {
  const player = {
    name: "自分",
    hand: [tile("hand")],
    melds: [{
      kind: "closedKan" as const,
      tiles: [0, 1, 2, 3].map(
        i => tile(`kan-${i}`)
      )
    }]
  };

  const before = JSON.stringify(player);

  render(
    <WinResultHand
      player={player}
      result={{
        winMethod: "ron",
        winningTile: tile("win")
      }}
    />
  );

  expect(
    within(
      screen.getByRole("group", { name: "暗槓" })
    ).getAllByRole("img")
  ).toHaveLength(4);

  expect(JSON.stringify(player)).toBe(before);
});
