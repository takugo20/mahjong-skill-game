// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import {
  GameBoard
} from "./GameBoard";
import {
  createInitialGameState
} from "./lib/mahjong/engine";
import type {
  GameState,
  SeatIndex,
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
    id: `board-cpu-progress-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function emptyCpuHand(
  state: GameState,
  seat: SeatIndex
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createCpuProgressionState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const playerDiscard = createTile(
    "honor",
    7
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    discards: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  emptyCpuHand(state, 1);
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    createTile("man", 1),
    createTile("pin", 2),
    createTile("sou", 3),
    createTile("honor", 4)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

function createMeldReactionState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const calledTile = createTile("man", 4);
  const firstHandTile = createTile(
    "man",
    4
  );
  const secondHandTile = createTile(
    "man",
    4
  );
  const calledDiscard = {
    tile: calledTile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      firstHandTile,
      secondHandTile
    ],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  emptyCpuHand(state, 1);
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.players[1].discards = [
    calledDiscard
  ];
  state.round.liveWall = [
    createTile("pin", 2),
    createTile("sou", 3),
    createTile("honor", 4)
  ];
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.lastDiscard = {
    seat: 1,
    discard: calledDiscard
  };
  state.round.meldCallOptions = [{
    id: "board-cpu-progress-pon",
    kind: "pon",
    callerSeat: 0,
    discarderSeat: 1,
    calledTileId: calledTile.id,
    handTileIds: [
      firstHandTile.id,
      secondHandTile.id
    ]
  }];

  return state;
}

function advanceTime(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("GameBoardのCPU進行演出", () => {
  it("0.5秒ごとにCPU3人のツモと打牌を1段階ずつ表示する", () => {
    render(
      <GameBoard
        initialState={
          createCpuProgressionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "中"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "打牌"
      })
    );

    expect(
      screen.getByText("CPU進行中…")
    ).not.toBeNull();
    expect(
      screen.getByLabelText(
        "CPU・右の手牌0枚"
      )
    ).not.toBeNull();

    advanceTime(499);

    expect(
      screen.getByLabelText(
        "CPU・右の手牌0枚"
      )
    ).not.toBeNull();

    advanceTime(1);

    expect(
      screen.getByLabelText(
        "CPU・右の手牌1枚"
      )
    ).not.toBeNull();

    advanceTime(500);

    expect(
      screen.getByLabelText(
        "CPU・右の手牌0枚"
      )
    ).not.toBeNull();
    expect(
      screen.getByLabelText(
        "CPU・右の河"
      ).children
    ).toHaveLength(1);

    advanceTime(500);

    expect(
      screen.getByLabelText(
        "能力者CPUの手牌1枚"
      )
    ).not.toBeNull();

    advanceTime(500);

    expect(
      screen.getByLabelText(
        "能力者CPUの河"
      ).children
    ).toHaveLength(1);

    advanceTime(500);

    expect(
      screen.getByLabelText(
        "CPU・左の手牌1枚"
      )
    ).not.toBeNull();

    advanceTime(500);

    expect(
      screen.getByLabelText(
        "CPU・左の河"
      ).children
    ).toHaveLength(1);

    advanceTime(500);

    expect(
      screen.queryByText("CPU進行中…")
    ).toBeNull();
    expect(
      screen.getByLabelText("麻雀卓")
        .getAttribute("aria-busy")
    ).toBe("false");
  });

  it("CPU進行中は操作ボタン欄を無効にする", () => {
    render(
      <GameBoard
        initialState={
          createCpuProgressionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "中"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "打牌"
      })
    );

    const discardButton =
      screen.getByRole("button", {
        name: "打牌"
      });
    const controlFieldset =
      discardButton.closest("fieldset");

    expect(controlFieldset).not.toBeNull();
    expect(
      controlFieldset?.hasAttribute(
        "disabled"
      )
    ).toBe(true);
    expect(
      screen.getByLabelText("麻雀卓")
        .getAttribute("aria-busy")
    ).toBe("true");

    advanceTime(3500);

    expect(
      controlFieldset?.hasAttribute(
        "disabled"
      )
    ).toBe(false);
  });

    it("副露を見送った後も残りのCPUを0.5秒ごとに進める", () => {
    render(
      <GameBoard
        initialState={
          createMeldReactionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "見逃す"
      })
    );

    expect(
      screen.getByText("CPU進行中…")
    ).not.toBeNull();
    expect(
      screen.getByLabelText(
        "能力者CPUの手牌0枚"
      )
    ).not.toBeNull();

    advanceTime(499);

    expect(
      screen.getByLabelText(
        "能力者CPUの手牌0枚"
      )
    ).not.toBeNull();

    advanceTime(1);

    expect(
      screen.getByLabelText(
        "能力者CPUの手牌1枚"
      )
    ).not.toBeNull();

    advanceTime(500);

    expect(
      screen.getByLabelText(
        "能力者CPUの河"
      ).children
    ).toHaveLength(1);

    advanceTime(500);

    expect(
      screen.getByLabelText(
        "CPU・左の手牌1枚"
      )
    ).not.toBeNull();

    advanceTime(1000);

    expect(
      screen.queryByText("CPU進行中…")
    ).toBeNull();
  });
});
