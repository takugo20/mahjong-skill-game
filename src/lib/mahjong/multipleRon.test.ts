import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState
} from "./engine";
import {
  resolveRonDeclarations
} from "./multipleRon";
import type {
  GameState,
  RoundWinResult,
  SeatIndex
} from "./types";

function createWinResult(
  state: GameState,
  winnerSeat: SeatIndex,
  loserSeat: SeatIndex,
  payment: number,
  riichiPool: number
): RoundWinResult {
  return {
    winMethod: "ron",
    winnerSeat,
    loserSeat,
    winningTile: {
      id:
        `multiple-ron-${winnerSeat}-${loserSeat}`,
      suit: "man",
      rank: 2,
      red: false
    },
    yakuNames: ["平和"],
    han: 1,
    fu: 30,
    yakumanMultiplier: 0,
    limitName: null,
    totalPoints:
      payment + riichiPool,
    pointChanges:
      state.round.players.map(
        (player) => {
          const change =
            player.seat === winnerSeat
              ? payment + riichiPool
              : player.seat === loserSeat
                ? -payment
                : 0;

          return {
            playerId: player.id,
            seat: player.seat,
            pointsBefore: player.score,
            change,
            pointsAfter:
              player.score + change
          };
        }
      )
  };
}

function createState(): GameState {
  return createInitialGameState(
    () => 0.5
  );
}

describe("ロン宣言の精算", () => {
  it("単独ロンでは既存の点数移動を維持する", () => {
    const state = createState();
    const result = resolveRonDeclarations({
      players: state.round.players,
      winResults: [
        createWinResult(
          state,
          2,
          1,
          1000,
          2000
        )
      ],
      riichiPool: 2000
    });

    expect(result.kind).toBe(
      "singleRon"
    );

    if (result.kind !== "singleRon") {
      throw new Error(
        "単独ロンとして精算されませんでした。"
      );
    }

    expect(
      result.winResult.totalPoints
    ).toBe(3000);
    expect(
      result.playersAfter.map(
        (player) => player.score
      )
    ).toEqual([
      25000,
      24000,
      28000,
      25000
    ]);
    expect(result.riichiPoolAfter).toBe(0);
  });

  it("ダブロンでは両方を精算し供託を近い和了者だけに渡す", () => {
    const state = createState();
    const result = resolveRonDeclarations({
      players: state.round.players,
      winResults: [
        createWinResult(
          state,
          0,
          1,
          1500,
          2000
        ),
        createWinResult(
          state,
          2,
          1,
          1000,
          2000
        )
      ],
      riichiPool: 2000
    });

    expect(result.kind).toBe(
      "doubleRon"
    );

    if (result.kind !== "doubleRon") {
      throw new Error(
        "ダブロンとして精算されませんでした。"
      );
    }

    expect(
      result.doubleRonResult.winResults.map(
        (winResult) =>
          winResult.winnerSeat
      )
    ).toEqual([2, 0]);
    expect(
      result.doubleRonResult
        .riichiPoolRecipientSeat
    ).toBe(2);
    expect(
      result.doubleRonResult.winResults.map(
        (winResult) =>
          winResult.totalPoints
      )
    ).toEqual([3000, 1500]);
    expect(
      result.doubleRonResult
        .pointChanges.map(
          (change) => change.change
        )
    ).toEqual([
      1500,
      -2500,
      3000,
      0
    ]);
    expect(
      result.playersAfter.map(
        (player) => player.score
      )
    ).toEqual([
      26500,
      22500,
      28000,
      25000
    ]);
    expect(result.riichiPoolAfter).toBe(0);
  });

  it("供託がないダブロンでは供託取得者を設定しない", () => {
    const state = createState();
    const result = resolveRonDeclarations({
      players: state.round.players,
      winResults: [
        createWinResult(
          state,
          0,
          1,
          1500,
          0
        ),
        createWinResult(
          state,
          2,
          1,
          1000,
          0
        )
      ],
      riichiPool: 0
    });

    expect(result.kind).toBe(
      "doubleRon"
    );

    if (result.kind !== "doubleRon") {
      throw new Error(
        "ダブロンとして精算されませんでした。"
      );
    }

    expect(
      result.doubleRonResult
        .riichiPoolRecipientSeat
    ).toBeNull();
    expect(
      result.doubleRonResult
        .pointChanges.map(
          (change) => change.change
        )
    ).toEqual([
      1500,
      -2500,
      1000,
      0
    ]);
  });

  it("三家和では点数を動かさず供託を持ち越す", () => {
    const state = createState();
    const result = resolveRonDeclarations({
      players: state.round.players,
      winResults: [
        createWinResult(
          state,
          0,
          1,
          1500,
          2000
        ),
        createWinResult(
          state,
          2,
          1,
          1000,
          2000
        ),
        createWinResult(
          state,
          3,
          1,
          1000,
          2000
        )
      ],
      riichiPool: 2000
    });

    expect(result.kind).toBe(
      "tripleRon"
    );

    if (result.kind !== "tripleRon") {
      throw new Error(
        "三家和として処理されませんでした。"
      );
    }

    expect(
      result.abortiveDrawResult
    ).toEqual({
      reason: "tripleRon",
      discarderSeat: 1,
      ronCandidateSeats: [2, 3, 0]
    });
    expect(
      result.playersAfter.map(
        (player) => player.score
      )
    ).toEqual([
      25000,
      25000,
      25000,
      25000
    ]);
    expect(result.riichiPoolAfter).toBe(
      2000
    );
  });
});

describe("複数ロン精算の入力検証", () => {
  it("異なる放銃者の結果を混在させない", () => {
    const state = createState();

    expect(() =>
      resolveRonDeclarations({
        players: state.round.players,
        winResults: [
          createWinResult(
            state,
            2,
            1,
            1000,
            0
          ),
          createWinResult(
            state,
            0,
            3,
            1500,
            0
          )
        ],
        riichiPool: 0
      })
    ).toThrow(
      "複数ロンの放銃者は同一にしてください。"
    );
  });

  it("同じ和了者を重複させない", () => {
    const state = createState();

    expect(() =>
      resolveRonDeclarations({
        players: state.round.players,
        winResults: [
          createWinResult(
            state,
            2,
            1,
            1000,
            0
          ),
          createWinResult(
            state,
            2,
            1,
            1000,
            0
          )
        ],
        riichiPool: 0
      })
    ).toThrow(
      "和了者は放銃者以外の異なる座席にしてください。"
    );
  });

  it("供託点は1000点単位に限定する", () => {
    const state = createState();

    expect(() =>
      resolveRonDeclarations({
        players: state.round.players,
        winResults: [
          createWinResult(
            state,
            2,
            1,
            1000,
            500
          )
        ],
        riichiPool: 500
      })
    ).toThrow(
      "供託点は0以上の1000点単位で指定してください。"
    );
  });
});
