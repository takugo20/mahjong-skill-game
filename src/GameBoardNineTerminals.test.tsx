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
  GameState,
  Tile,
  TileSuit
} from "./lib/mahjong/types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `game-board-nine-terminals-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

const YAOCHU_TILE_TYPES = [
  ["man", 1],
  ["man", 9],
  ["pin", 1],
  ["pin", 9],
  ["sou", 1],
  ["sou", 9],
  ["honor", 1],
  ["honor", 2],
  ["honor", 3],
  ["honor", 4],
  ["honor", 5],
  ["honor", 6],
  ["honor", 7]
] as const;

function createFirstDrawHand(
  distinctYaochuCount: number
): Tile[] {
  const selectedTypes =
    YAOCHU_TILE_TYPES.slice(
      0,
      distinctYaochuCount
    );
  const hand = selectedTypes.map(
    ([suit, rank]) =>
      createTile(suit, rank)
  );

  let fillerIndex = 0;

  while (hand.length < 14) {
    const [suit, rank] =
      selectedTypes[
        fillerIndex %
          selectedTypes.length
      ];

    hand.push(createTile(suit, rank));
    fillerIndex += 1;
  }

  return hand;
}

function createNineTerminalsState(
  distinctYaochuCount: number
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const hand = createFirstDrawHand(
    distinctYaochuCount
  );
  const drawnTile = hand[hand.length - 1];

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.kanCount = 0;
  state.round.lastDiscard = null;
  state.round.players =
    state.round.players.map(
      (player) => ({
        ...player,
        melds: [],
        discards: [],
        riichi: false,
        doubleRiichi: false,
        ippatsu: false,
        drawnTileId: null,
        drawnTileSource: null
      })
    );

  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    drawnTileId: drawnTile.id,
    drawnTileSource: "liveWall"
  };

  return state;
}

afterEach(() => {
  cleanup();
});

describe("九種九牌の画面操作", () => {
  it("第1ツモで么九牌が9種類あれば宣言ボタンを表示する", () => {
    render(
      <GameBoard
        initialState={
          createNineTerminalsState(9)
        }
      />
    );

    expect(
      screen.queryByText(
        "九種九牌を宣言可能"
      )
    ).not.toBeNull();

    expect(
      screen.queryByRole("button", {
        name: "九種九牌"
      })
    ).not.toBeNull();
  });

  it("么九牌が8種類なら宣言ボタンを表示しない", () => {
    render(
      <GameBoard
        initialState={
          createNineTerminalsState(8)
        }
      />
    );

    expect(
      screen.queryByRole("button", {
        name: "九種九牌"
      })
    ).toBeNull();
  });

  it("宣言すると途中流局の内容を結果画面へ表示する", () => {
    const state =
      createNineTerminalsState(9);

    state.round.honba = 2;
    state.round.riichiPool = 2000;

    render(
      <GameBoard initialState={state} />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "九種九牌"
      })
    );

    const resultDialog =
      screen.getByRole("dialog", {
        name: "九種九牌結果"
      });

    const resultText =
      resultDialog.textContent ?? "";

    expect(resultText).toContain(
      "途中流局"
    );
    expect(resultText).toContain(
      "么九牌9種類"
    );
    expect(resultText).toContain(
      "東・あなた"
    );
    expect(resultText).toContain(
      "点数移動なし"
    );
    expect(resultText).toContain(
      "供託2,000点は次局へ持ち越します。"
    );
    expect(
      screen.queryByRole("button", {
        name: "次局へ"
      })
    ).not.toBeNull();
  });
});
