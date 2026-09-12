// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  expect,
  it
} from "vitest";
import { MeldTiles } from "./MeldTiles";
import type {
  Tile,
  SeatIndex
} from "../lib/mahjong/types";

const tiles: Tile[] = [0, 1, 2, 3].map(i => ({
  id: `tile-${i}`,
  suit: "man",
  rank: 5,
  red: i === 3
}));

afterEach(cleanup);

it("暗槓は両端を伏せ、中央2枚を表にする", () => {
  render(
    <MeldTiles
      meld={{ kind: "closedKan", tiles }}
      seat={0}
    />
  );

  const faces = screen.getAllByRole("img");

  expect(
    faces.map(
      face =>
        face.getAttribute("aria-label") === "裏向きの牌"
    )
  ).toEqual([true, false, false, true]);
});

it.each([1, 2, 3] as SeatIndex[])(
  "%s家からのポン位置を保ち、追加赤牌を重ねる",
  calledFrom => {
    const { container } = render(
      <MeldTiles
        seat={0}
        meld={{
          kind: "addedKan",
          tiles,
          calledFrom,
          calledTileId: "tile-0",
          addedTileId: "tile-3"
        }}
      />
    );

    expect(
      container.querySelectorAll(":scope > .meld-tile")
    ).toHaveLength(3);

    expect(
      screen.getAllByRole("img")
    ).toHaveLength(4);

    expect(
      container.querySelector(
        ".meld-tile--called .meld-stack-upper .mahjong-tile--red"
      )
    ).not.toBeNull();
  }
);
