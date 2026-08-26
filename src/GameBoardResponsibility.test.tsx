// @vitest-environment jsdom

import {
  cleanup,
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
  RoundResponsibilityResult,
  RoundWinResult,
  SeatIndex
} from "./lib/mahjong/types";

function createWinResult(
  winnerSeat: SeatIndex,
  loserSeat: SeatIndex,
  responsibility:
    RoundResponsibilityResult | null
): RoundWinResult {
  const isYakuman =
    responsibility !== null;
  const yakuName =
    responsibility?.yakumanId ===
    "bigFourWinds"
      ? "大四喜"
      : responsibility
        ? "大三元"
        : "立直";

  return {
    winMethod: "ron",
    winnerSeat,
    loserSeat,
    winningTile: {
      id:
        `responsibility-win-${winnerSeat}`,
      suit: "honor",
      rank: 7,
      red: false
    },
    responsibility,
    yakuNames: [yakuName],
    doraCount: 0,
    doraIndicatorTiles: [],
    uraDoraIndicatorTiles: [],
    han: isYakuman ? 0 : 1,
    fu: isYakuman ? null : 30,
    yakumanMultiplier:
      responsibility?.yakumanMultiplier ??
      0,
    limitName:
      isYakuman ? "役満" : null,
    totalPoints:
      responsibility?.yakumanMultiplier ===
      2
        ? 64000
        : isYakuman
          ? 32000
          : 1000,
    pointChanges: []
  };
}

function createSingleWinState(
  responsibility:
    RoundResponsibilityResult | null
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "roundEnd";
  state.round.winResult =
    createWinResult(
      0,
      1,
      responsibility
    );
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

function createDoubleRonState(): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "roundEnd";
  state.round.winResult = null;
  state.round.doubleRonResult = {
    loserSeat: 0,
    winResults: [
      createWinResult(1, 0, null),
      createWinResult(3, 0, {
        yakumanId: "bigFourWinds",
        yakumanMultiplier: 2,
        responsibleSeat: 2
      })
    ],
    pointChanges: [],
    riichiPoolRecipientSeat: null
  };
  state.round.drawResult = null;
  state.round.nagashiManganResult = null;
  state.round.abortiveDrawResult = null;

  return state;
}

afterEach(() => {
  cleanup();
});

describe("責任払いの結果画面", () => {
  it("単独和了で対象役満と責任者を表示する", () => {
    render(
      <GameBoard
        initialState={
          createSingleWinState({
            yakumanId:
              "bigThreeDragons",
            yakumanMultiplier: 1,
            responsibleSeat: 3
          })
        }
      />
    );

    expect(
      screen.getByRole("dialog", {
        name: "和了結果"
      })
    ).toBeTruthy();

    const notice =
      screen.getByLabelText(
        "責任払い"
      );
    const noticeText =
      notice.textContent ?? "";

    expect(noticeText).toContain(
      "責任払い"
    );
    expect(noticeText).toContain(
      "大三元"
    );
    expect(noticeText).toContain(
      "責任者：北・CPU・左"
    );
    expect(noticeText).not.toContain(
      "ダブル役満"
    );
  });

  it("ダブロンでは責任払い対象の和了者だけに表示する", () => {
    render(
      <GameBoard
        initialState={
          createDoubleRonState()
        }
      />
    );

    expect(
      screen.getByRole("dialog", {
        name: "ダブロン結果"
      })
    ).toBeTruthy();

    const notices =
      screen.getAllByLabelText(
        "責任払い"
      );

    expect(notices).toHaveLength(1);

    const noticeText =
      notices[0]?.textContent ?? "";

    expect(noticeText).toContain(
      "大四喜（ダブル役満）"
    );
    expect(noticeText).toContain(
      "責任者：西・能力者CPU"
    );
  });

  it("通常和了では責任払い表示を出さない", () => {
    render(
      <GameBoard
        initialState={
          createSingleWinState(null)
        }
      />
    );

    expect(
      screen.queryByLabelText(
        "責任払い"
      )
    ).toBeNull();
  });
});
