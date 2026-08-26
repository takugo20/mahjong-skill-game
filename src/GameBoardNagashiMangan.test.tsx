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
  RoundPointResult,
  SeatIndex
} from "./lib/mahjong/types";

function createPointChange(
  state: GameState,
  seat: SeatIndex,
  change: number
): RoundPointResult {
  const player = state.round.players[seat];

  return {
    playerId: player.id,
    seat,
    pointsBefore: player.score,
    change,
    pointsAfter: player.score + change
  };
}

function createNagashiManganResultState(
  winnerSeats: SeatIndex[],
  riichiPoolRecipientSeat:
    SeatIndex | null,
  changes: [
    number,
    number,
    number,
    number
  ],
  honba: number
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );
  const pointChanges = changes.map(
    (change, seat) =>
      createPointChange(
        state,
        seat as SeatIndex,
        change
      )
  );

  state.round.phase = "roundEnd";
  state.round.honba = honba;
  state.round.riichiPool = 0;
  state.round.players =
    state.round.players.map(
      (player, seat) => ({
        ...player,
        score:
          pointChanges[seat].pointsAfter
      })
    );
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.nagashiManganResult = {
    winnerSeats,
    riichiPoolRecipientSeat,
    pointChanges
  };
  state.round.abortiveDrawResult = null;

  return state;
}

afterEach(() => {
  cleanup();
});

describe("流し満貫の結果画面", () => {
  it("親1人の成立・供託取得・点数移動を表示する", () => {
    render(
      <GameBoard
        initialState={
          createNagashiManganResultState(
            [0],
            0,
            [
              13300,
              -4100,
              -4100,
              -4100
            ],
            1
          )
        }
      />
    );

    const resultDialog =
      screen.getByRole("dialog", {
        name: "流し満貫結果"
      });
    const resultText =
      resultDialog.textContent ?? "";

    expect(resultText).toContain(
      "流し満貫"
    );
    expect(resultText).toContain(
      "成立1人"
    );
    expect(resultText).toContain(
      "満貫ツモ扱い"
    );
    expect(resultText).toContain(
      "東・あなた（供託取得）"
    );
    expect(resultText).toContain(
      "+13,300"
    );
    expect(resultText).toContain(
      "38,300点"
    );
    expect(resultText).toContain(
      "南・CPU・右"
    );
    expect(resultText).toContain(
      "-4,100"
    );
    expect(resultText).toContain(
      "不聴罰符は発生しません。"
    );
    expect(resultText).toContain(
      "親を含むため連荘し、本場を1つ増やします。"
    );
  });

  it("複数の子が成立した結果を全員分表示する", () => {
    render(
      <GameBoard
        initialState={
          createNagashiManganResultState(
            [1, 2],
            1,
            [
              -8000,
              8000,
              6000,
              -4000
            ],
            0
          )
        }
      />
    );

    const resultText =
      screen.getByRole("dialog", {
        name: "流し満貫結果"
      }).textContent ?? "";

    expect(resultText).toContain(
      "成立2人"
    );
    expect(resultText).toContain(
      "南・CPU・右（供託取得）"
    );
    expect(resultText).toContain(
      "西・能力者CPU"
    );
    expect(resultText).toContain(
      "子のみの成立のため親流れとなり、本場を0に戻します。"
    );
  });

  it("次局へ進むと結果画面を閉じて親が連荘する", () => {
    render(
      <GameBoard
        initialState={
          createNagashiManganResultState(
            [0],
            null,
            [
              12600,
              -4200,
              -4200,
              -4200
            ],
            2
          )
        }
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "次局へ"
      })
    );

    expect(
      screen.queryByRole("dialog", {
        name: "流し満貫結果"
      })
    ).toBeNull();
    expect(
      screen.queryByText("3本場")
    ).not.toBeNull();
  });
});
