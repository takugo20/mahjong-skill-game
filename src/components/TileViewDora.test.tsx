// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TileDoraProvider, TileView } from "./TileView";
import type { Tile } from "../lib/mahjong/types";

const indicator: Tile = { id: "indicator", suit: "man", rank: 4, red: false };
const dora: Tile = { id: "dora", suit: "man", rank: 5, red: false };

afterEach(cleanup);

it("表向きのドラだけを強調し、表示牌と裏向きの牌は強調しない", () => {
  render(
    <TileDoraProvider indicators={[indicator]}>
      <TileView tile={dora} />
      <TileView tile={dora} faceDown />
      <TileView tile={indicator} markDora={false} />
    </TileDoraProvider>
  );

  expect(screen.getAllByRole("img").map(tile =>
    tile.classList.contains("mahjong-tile--dora")
  )).toEqual([true, false, false]);
});

it("表示牌が隠れている間は通常ドラを示さず、赤ドラは示す", () => {
  render(
    <TileDoraProvider indicators={[]}>
      <TileView tile={dora} />
      <TileView tile={{ ...dora, id: "red", red: true }} />
    </TileDoraProvider>
  );

  expect(screen.getAllByRole("img").map(tile =>
    tile.classList.contains("mahjong-tile--dora")
  )).toEqual([false, true]);
});
