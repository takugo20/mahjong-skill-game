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
  playGameSound,
  unlockGameAudio
} from "./lib/gameAudio";
import {
  createInitialGameState
} from "./lib/mahjong/engine";
import type {
  GameState,
  SeatIndex,
  Tile,
  TileSuit
} from "./lib/mahjong/types";

vi.mock("./lib/gameAudio", () => ({
  playGameSound: vi.fn(),
  unlockGameAudio: vi.fn(
    () => Promise.resolve()
  )
}));

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

function createTiles(
  suit: TileSuit,
  ranks: number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createPlayerWinHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [2, 3, 4, 5, 6, 7]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4]
    ),
    ...createTiles(
      "sou",
      [6, 7, 8]
    ),
    ...createTiles(
      "honor",
      [3, 3]
    )
  ];
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

function createRiichiProgressionState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const hand = [
    createTile("man", 2),
    createTile("man", 3),
    createTile("man", 4),
    createTile("pin", 2),
    createTile("pin", 3),
    createTile("pin", 4),
    createTile("sou", 2),
    createTile("sou", 3),
    createTile("sou", 4),
    createTile("sou", 6),
    createTile("sou", 7),
    createTile("sou", 8),
    createTile("man", 5),
    createTile("pin", 5)
  ];

  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: hand[13].id,
    drawnTileSource: "liveWall"
  };
  emptyCpuHand(state, 1);
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    createTile("man", 1),
    createTile("pin", 1),
    createTile("sou", 1),
    createTile("honor", 4)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

function createCpuDealerNextRoundState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "roundEnd";
  state.round.winResult = {
    winMethod: "ron",
    winnerSeat: 1,
    loserSeat: 0,
    winningTile: createTile("honor", 7),
    yakuNames: ["断么九"],
    doraCount: 0,
    doraIndicatorTiles: [],
    uraDoraIndicatorTiles: [],
    han: 1,
    fu: 30,
    yakumanMultiplier: 0,
    limitName: null,
    totalPoints: 1000,
    pointChanges: []
  };
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

function createCpuPonProgressionState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const calledTile = createTile(
    "honor",
    5
  );
  const discardAfterCall = createTile(
    "man",
    9
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [calledTile],
    melds: [],
    discards: [],
    drawnTileId: calledTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: [
      createTile("honor", 5),
      createTile("honor", 5),
      createTile("man", 2),
      createTile("man", 2),
      discardAfterCall,
      createTile("pin", 1),
      createTile("pin", 2),
      createTile("pin", 3),
      createTile("pin", 4),
      createTile("pin", 5),
      createTile("pin", 6),
      createTile("sou", 7),
      createTile("sou", 8)
    ],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

function createCpuRiichiPresentationState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const playerDiscard = createTile(
    "honor",
    7
  );
  const completeCpuHand = [
    ...createTiles("man", [2, 3, 4]),
    ...createTiles("pin", [2, 3, 4]),
    ...createTiles("sou", [2, 3, 4]),
    ...createTiles("sou", [6, 7, 8]),
    createTile("man", 5),
    createTile("pin", 5)
  ];
  const cpuDrawnTile =
    completeCpuHand[
      completeCpuHand.length - 1
    ];

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    discards: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: completeCpuHand.slice(0, -1),
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    cpuDrawnTile,
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 9),
    createTile("pin", 9),
    createTile("sou", 9)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

function createPlayerTsumoPresentationState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const hand = createPlayerWinHand();

  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: hand[0].id,
    drawnTileSource: "liveWall"
  };
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 4;
  state.round.lastDiscard = null;

  return state;
}

function createPlayerRonPresentationState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const completedHand =
    createPlayerWinHand();
  const winningTile = completedHand[0];
  const discard = {
    tile: winningTile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };

  state.round.players[0] = {
    ...state.round.players[0],
    hand: completedHand.slice(1),
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.players[1] = {
    ...state.round.players[1],
    discards: [discard]
  };
  state.round.currentSeat = 2;
  state.round.phase = "reaction";
  state.round.turnNumber = 4;
  state.round.lastDiscard = {
    seat: 1,
    discard
  };

  return state;
}

function createCpuWinNonWinningHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 4, 5, 7, 8, 9]
    ),
    ...createTiles(
      "pin",
      [1, 4, 5, 7, 8, 9]
    ),
    createTile("honor", 1)
  ];
}

function createCpuRonPresentationState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const completedHand =
    createPlayerWinHand();
  const winningTile = completedHand[0];

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      winningTile,
      ...createCpuWinNonWinningHand()
    ],
    melds: [],
    discards: [],
    drawnTileId: winningTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: completedHand.slice(1),
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    createTile("honor", 1)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return state;
}

function createCpuTsumoPresentationState(): GameState {
  const state = createCpuRonPresentationState();
  const completedHand =
    createPlayerWinHand();
  const winningTile = completedHand[0];
  const playerDiscard = createTile(
    "honor",
    7
  );

  state.round.turnNumber = 4;
  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      playerDiscard,
      ...createCpuWinNonWinningHand()
    ],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: completedHand.slice(1),
    drawnTileId: null,
    drawnTileSource: null
  };
  state.round.liveWall = [
    winningTile,
    createTile("honor", 1)
  ];

  return state;
}

function advanceTime(milliseconds: number) {
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(playGameSound).mockClear();
  vi.mocked(unlockGameAudio).mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("GameBoardのCPU進行演出", () => {
  it("最初の画面操作で音声を有効化する", () => {
    render(
      <GameBoard
        initialState={
          createCpuProgressionState()
        }
      />
    );

    expect(unlockGameAudio)
      .not.toHaveBeenCalled();

    fireEvent.pointerDown(
      screen.getByLabelText("麻雀卓")
    );

    expect(unlockGameAudio)
      .toHaveBeenCalledTimes(1);
  });

  it("CPU進行に合わせてツモ音と打牌音を順番に再生する", () => {
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

    expect(playGameSound)
      .toHaveBeenCalledTimes(1);
    expect(playGameSound)
      .toHaveBeenNthCalledWith(
        1,
        "discardTile"
      );

    advanceTime(499);

    expect(playGameSound)
      .toHaveBeenCalledTimes(1);

    advanceTime(1);

    expect(playGameSound)
      .toHaveBeenNthCalledWith(
        2,
        "drawTile"
      );

    advanceTime(500);

    expect(playGameSound)
      .toHaveBeenNthCalledWith(
        3,
        "discardTile"
      );
  });

  it("リーチ宣言から500ミリ秒後に立直棒音を再生する", () => {
    render(
      <GameBoard
        initialState={
          createRiichiProgressionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "五筒"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "立直"
      })
    );

    expect(
      vi.mocked(playGameSound).mock.calls
    ).toEqual([["riichi"]]);

    advanceTime(499);

    expect(
      vi.mocked(playGameSound).mock.calls
    ).toEqual([["riichi"]]);

    advanceTime(1);

    expect(
      vi.mocked(playGameSound).mock.calls
    ).toEqual([
      ["riichi"],
      ["discardTile"],
      ["riichiStick"]
    ]);
  });

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

  it("立直演出後もCPUのツモまで0.5秒待機する", () => {
    render(
      <GameBoard
        initialState={
          createRiichiProgressionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "五筒"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "立直"
      })
    );

    expect(
      screen.getByText("宣言演出中…")
    ).not.toBeNull();
    expect(
      screen.queryByText("24,000点")
    ).toBeNull();
    expect(
      screen.queryByText("1,000")
    ).toBeNull();
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
      screen.getByText("CPU進行中…")
    ).not.toBeNull();
    expect(
      screen.getByText("24,000点")
    ).not.toBeNull();
    expect(
      screen.getByText("1,000")
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

    advanceTime(3000);

    expect(
      screen.queryByText("CPU進行中…")
    ).toBeNull();
  });

    it("CPUが次局の親なら最初のツモまで0.5秒待機する", () => {
    render(
      <GameBoard
        initialState={
          createCpuDealerNextRoundState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "次局へ"
      })
    );

    expect(
      screen.getByText("CPU進行中…")
    ).not.toBeNull();
    expect(
      screen.getByLabelText(
        "CPU・右の手牌13枚"
      )
    ).not.toBeNull();

    advanceTime(499);

    expect(
      screen.getByLabelText(
        "CPU・右の手牌13枚"
      )
    ).not.toBeNull();

    advanceTime(1);

    expect(
      screen.getByLabelText(
        "CPU・右の手牌14枚"
      )
    ).not.toBeNull();
  });

    it("ポンを中央へ500ミリ秒表示する", () => {
    render(
      <GameBoard
        initialState={
          createMeldReactionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "ポン"
      })
    );

    const overlay = screen.getByRole(
      "status",
      {
        name: "あなたのポン"
      }
    );

    expect(overlay.textContent).toBe(
      "ポン"
    );
    expect(
      overlay.classList.contains(
        "declaration-overlay--pon"
      )
    ).toBe(true);

    advanceTime(499);

    expect(
      screen.queryByRole("status", {
        name: "あなたのポン"
      })
    ).not.toBeNull();

    advanceTime(1);

    expect(
      screen.queryByRole("status", {
        name: "あなたのポン"
      })
    ).toBeNull();
  });

  it("リーチを中央へ表示してCPU進行開始時も500ミリ秒維持する", () => {
    render(
      <GameBoard
        initialState={
          createRiichiProgressionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "五筒"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "立直"
      })
    );

    expect(
      screen.getByRole("status", {
        name: "あなたのリーチ"
      }).textContent
    ).toBe("リーチ");
    expect(
      screen.getByText("宣言演出中…")
    ).not.toBeNull();

    advanceTime(499);

    expect(
      screen.queryByRole("status", {
        name: "あなたのリーチ"
      })
    ).not.toBeNull();

    advanceTime(1);

    expect(
      screen.queryByRole("status", {
        name: "あなたのリーチ"
      })
    ).toBeNull();

    expect(
      screen.getByText("CPU進行中…")
    ).not.toBeNull();
  });

  it("CPUのポンを行動ステップで中央表示する", () => {
    render(
      <GameBoard
        initialState={
          createCpuPonProgressionState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "白"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "打牌"
      })
    );

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のポン"
      })
    ).toBeNull();

    advanceTime(499);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のポン"
      })
    ).toBeNull();

    advanceTime(1);

    const overlay = screen.getByRole(
      "status",
      {
        name: "CPU・右のポン"
      }
    );

    expect(overlay.textContent).toBe(
      "ポン"
    );
    expect(
      overlay.classList.contains(
        "declaration-overlay--pon"
      )
    ).toBe(true);
    expect(
      screen.queryByLabelText(
        "CPU・右の面子"
      )
    ).toBeNull();
    expect(
      document.querySelector(
        '[data-declaration-target="true"]'
      )
    ).not.toBeNull();

    advanceTime(499);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のポン"
      })
    ).not.toBeNull();
    expect(
      screen.queryByLabelText(
        "CPU・右の面子"
      )
    ).toBeNull();

    advanceTime(1);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のポン"
      })
    ).toBeNull();
    expect(
      screen.getByLabelText(
        "CPU・右の面子"
      )
    ).not.toBeNull();
    expect(
      document.querySelector(
        '[data-declaration-target="true"]'
      )
    ).toBeNull();
  });

    it("CPUの立直牌を演出後に横向き表示する", () => {
    render(
      <GameBoard
        initialState={
          createCpuRiichiPresentationState()
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

    advanceTime(999);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のリーチ"
      })
    ).toBeNull();

    advanceTime(1);

    const cpuRiver = screen.getByLabelText(
      "CPU・右の河"
    );

    expect(
      screen.getByRole("status", {
        name: "CPU・右のリーチ"
      }).textContent
    ).toBe("リーチ");
    expect(
      cpuRiver.querySelector(
        '[data-declaration-target="true"]'
      )
    ).not.toBeNull();
    expect(
      cpuRiver.querySelector(
        '[data-riichi-declaration="true"]'
      )
    ).toBeNull();

    advanceTime(499);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のリーチ"
      })
    ).not.toBeNull();
    expect(
      cpuRiver.querySelector(
        '[data-riichi-declaration="true"]'
      )
    ).toBeNull();

    advanceTime(1);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のリーチ"
      })
    ).toBeNull();
    expect(
      cpuRiver.querySelector(
        '[data-declaration-target="true"]'
      )
    ).toBeNull();
    expect(
      cpuRiver.querySelector(
        '[data-riichi-declaration="true"]'
      )
    ).not.toBeNull();
  });

    it("ツモ表示後に和了結果へ移り演出中の操作を無効にする", () => {
    render(
      <GameBoard
        initialState={
          createPlayerTsumoPresentationState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "ツモ"
      })
    );

    expect(
      screen.getByRole("status", {
        name: "あなたのツモ"
      }).textContent
    ).toBe("ツモ");
    expect(
      screen.getByText("和了演出中…")
    ).not.toBeNull();
    expect(
      screen.queryByRole("dialog", {
        name: "和了結果"
      })
    ).toBeNull();
    expect(
      screen.getByRole("button", {
        name: "ツモ"
      }).closest("fieldset")
        ?.hasAttribute("disabled")
    ).toBe(true);

    advanceTime(499);

    expect(
      screen.queryByRole("dialog", {
        name: "和了結果"
      })
    ).toBeNull();

    advanceTime(1);

    expect(
      screen.queryByRole("status", {
        name: "あなたのツモ"
      })
    ).toBeNull();
    expect(
      screen.getByRole("dialog", {
        name: "和了結果"
      })
    ).not.toBeNull();
  });

  it("ロンを500ミリ秒表示してから和了結果へ移る", () => {
    render(
      <GameBoard
        initialState={
          createPlayerRonPresentationState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "ロン"
      })
    );

    expect(
      screen.getByRole("status", {
        name: "あなたのロン"
      }).textContent
    ).toBe("ロン");
    expect(
      screen.queryByRole("dialog", {
        name: "和了結果"
      })
    ).toBeNull();

    advanceTime(499);

    expect(
      screen.queryByRole("dialog", {
        name: "和了結果"
      })
    ).toBeNull();

    advanceTime(1);

    expect(
      screen.queryByRole("status", {
        name: "あなたのロン"
      })
    ).toBeNull();
    expect(
      screen.getByRole("dialog", {
        name: "和了結果"
      })
    ).not.toBeNull();
  });

    it("CPUのロン表示後に和了結果へ移る", () => {
    render(
      <GameBoard
        initialState={
          createCpuRonPresentationState()
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "二萬"
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "打牌"
      })
    );

    advanceTime(499);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のロン"
      })
    ).toBeNull();

    advanceTime(1);

    expect(
      screen.getByRole("status", {
        name: "CPU・右のロン"
      }).textContent
    ).toBe("ロン");
    expect(
      screen.queryByRole("dialog", {
        name: "和了結果"
      })
    ).toBeNull();

    advanceTime(500);

    expect(
      screen.getByRole("dialog", {
        name: "和了結果"
      })
    ).not.toBeNull();
  });

  it("CPUのツモ表示後に和了結果へ移る", () => {
    render(
      <GameBoard
        initialState={
          createCpuTsumoPresentationState()
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

    advanceTime(999);

    expect(
      screen.queryByRole("status", {
        name: "CPU・右のツモ"
      })
    ).toBeNull();

    advanceTime(1);

    expect(
      screen.getByRole("status", {
        name: "CPU・右のツモ"
      }).textContent
    ).toBe("ツモ");
    expect(
      screen.queryByRole("dialog", {
        name: "和了結果"
      })
    ).toBeNull();

    advanceTime(500);

    expect(
      screen.getByRole("dialog", {
        name: "和了結果"
      })
    ).not.toBeNull();
  });
});
