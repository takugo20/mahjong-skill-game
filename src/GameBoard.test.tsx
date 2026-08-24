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

describe("対局画面", () => {
  it("半荘戦と表示し配り直し操作を表示しない", () => {
    const html = renderToStaticMarkup(
      <GameBoard />
    );

    expect(html).toContain("半荘戦");
    expect(html).not.toContain("配り直し");
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
