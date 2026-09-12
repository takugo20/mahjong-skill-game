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
import { GameBoard } from "./GameBoard";
import {
  createInitialGameState
} from "./lib/mahjong/engine";

afterEach(cleanup);

it("副露・河拾いされた牌を元の順番に残してグレーアウト対象にする", () => {
  const state = createInitialGameState(() => 0.5);
  state.round.phase = "roundEnd";

  const player = state.round.players[0];

  player.discards = player.hand
    .slice(0, 3)
    .map((tile, index) => ({
      tile,
      tsumogiri: false,
      riichiDeclaration: index === 1,
      faceDown: false,
      called: index === 1,
      removedFromRiver: index === 2
    }));

  const before = JSON.stringify(player.discards);

  render(<GameBoard initialState={state} />);

  const river = screen.getByLabelText(
    `${player.name}の河`
  );

  expect(
    within(river).getAllByRole("img")
  ).toHaveLength(3);

  const slots = river.querySelectorAll(".discard-tile");

  expect(
    slots[0].classList.contains("discard-tile--removed")
  ).toBe(false);

  expect(
    slots[1].classList.contains("discard-tile--removed")
  ).toBe(true);

  expect(
    slots[2].classList.contains("discard-tile--removed")
  ).toBe(true);

  expect(
    slots[1].classList.contains("discard-tile--riichi")
  ).toBe(true);

  expect(JSON.stringify(player.discards)).toBe(before);
});
