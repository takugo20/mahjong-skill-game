import {
  renderToStaticMarkup
} from "react-dom/server";
import {
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
  RoundWinResult,
  SeatIndex
} from "./lib/mahjong/types";

function createRonResult(
  winnerSeat: SeatIndex,
  loserSeat: SeatIndex,
  tileId: string,
  yakuNames: string[],
  han: number,
  totalPoints: number
): RoundWinResult {
  return {
    winMethod: "ron",
    winnerSeat,
    loserSeat,
    winningTile: {
      id: tileId,
      suit: "man",
      rank: 5,
      red: false
    },
    yakuNames,
    han,
    fu: 30,
    yakumanMultiplier: 0,
    limitName: null,
    totalPoints,
    pointChanges: []
  };
}

describe("対局画面", () => {
  it("半荘戦と表示し配り直し操作を表示しない", () => {
    const html = renderToStaticMarkup(
      <GameBoard />
    );

    expect(html).toContain("半荘戦");
    expect(html).not.toContain("配り直し");
  });

  it("ダブロン結果に2人分の和了内容と合算した点数移動を表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "roundEnd";
    state.round.players[0].score = 25000;
    state.round.players[1].score = 8000;
    state.round.players[2].score = 34000;
    state.round.players[3].score = 33000;
    state.round.winResult = null;
    state.round.doubleRonResult = {
      loserSeat: 1,
      winResults: [
        createRonResult(
          2,
          1,
          "double-ron-first",
          ["立直", "断么九"],
          2,
          9000
        ),
        createRonResult(
          3,
          1,
          "double-ron-second",
          ["混一色"],
          3,
          8000
        )
      ],
      pointChanges: [
        {
          playerId: "player-0",
          seat: 0,
          pointsBefore: 25000,
          change: 0,
          pointsAfter: 25000
        },
        {
          playerId: "player-1",
          seat: 1,
          pointsBefore: 25000,
          change: -17000,
          pointsAfter: 8000
        },
        {
          playerId: "player-2",
          seat: 2,
          pointsBefore: 25000,
          change: 9000,
          pointsAfter: 34000
        },
        {
          playerId: "player-3",
          seat: 3,
          pointsBefore: 25000,
          change: 8000,
          pointsAfter: 33000
        }
      ],
      riichiPoolRecipientSeat: 2
    };
    state.round.drawResult = null;
    state.round.abortiveDrawResult = null;

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain(
      'aria-label="ダブロン結果"'
    );
    expect(html).toContain("2人和了");
    expect(html).toContain("立直");
    expect(html).toContain("断么九");
    expect(html).toContain("混一色");
    expect(html).toContain("9,000点");
    expect(html).toContain("8,000点");
    expect(html).toContain("供託取得");
    expect(html).toContain("-17,000");
    expect(html).toContain("+9,000");
    expect(html).toContain("+8,000");
    expect(html).toContain("次局へ");
  });

  it("三家和結果に宣言者と供託持ち越しを表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "roundEnd";
    state.round.riichiPool = 2000;
    state.round.winResult = null;
    state.round.doubleRonResult = null;
    state.round.drawResult = null;
    state.round.abortiveDrawResult = {
      reason: "tripleRon",
      discarderSeat: 0,
      ronCandidateSeats: [1, 2, 3]
    };

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain(
      'aria-label="三家和結果"'
    );
    expect(html).toContain("三家和");
    expect(html).toContain("3人ロン");
    expect(html).toContain("CPU・右");
    expect(html).toContain("能力者CPU");
    expect(html).toContain("CPU・左");
    expect(html).toContain("点数移動なし");
    expect(html).toContain(
      "供託2,000点は次局へ持ち越します。"
    );
    expect(html).toContain("次局へ");
  });

  it("対局終了時に最終順位と供託取得を表示する", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "matchEnd";
    state.round.players[0].score = 31000;
    state.round.players[1].score = 29000;
    state.round.players[2].score = 20000;
    state.round.players[3].score = 20000;
    state.matchResult = {
      provisionalLeaderId: "player-0",
      riichiPoolRecipientId: "player-0",
      riichiPoolAward: 2000,
      rankings: [
        {
          rank: 1,
          playerId: "player-0",
          seat: 0,
          pointsBeforePool: 29000,
          riichiPoolAward: 2000,
          finalPoints: 31000
        },
        {
          rank: 2,
          playerId: "player-1",
          seat: 1,
          pointsBeforePool: 29000,
          riichiPoolAward: 0,
          finalPoints: 29000
        },
        {
          rank: 3,
          playerId: "player-2",
          seat: 2,
          pointsBeforePool: 20000,
          riichiPoolAward: 0,
          finalPoints: 20000
        },
        {
          rank: 4,
          playerId: "player-3",
          seat: 3,
          pointsBeforePool: 20000,
          riichiPoolAward: 0,
          finalPoints: 20000
        }
      ]
    };

    const html = renderToStaticMarkup(
      <GameBoard initialState={state} />
    );

    expect(html).toContain("最終順位");
    expect(html).toContain("1位");
    expect(html).toContain("4位");
    expect(html).toContain("31,000点");
    expect(html).toContain("供託 +2,000点");
    expect(html).toContain("起家");
    expect(html).toContain("新しい対局");
  });
});
