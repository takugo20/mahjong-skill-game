import {
  describe,
  expect,
  it
} from "vitest";
import {
  resolveMatchSettlement
} from "./matchSettlement";
import type {
  MatchScorePlayer
} from "./matchSettlement";
import type {
  SeatIndex
} from "./types";

interface TestPlayer
  extends MatchScorePlayer {
  name: string;
}

function createPlayers(
  points: readonly number[] = [
    25000,
    25000,
    25000,
    25000
  ]
): TestPlayer[] {
  return points.map((score, index) => ({
    id: `player-${index}`,
    name:
      index === 0
        ? "あなた"
        : `CPU ${index}`,
    seat: index as SeatIndex,
    points: score
  }));
}

describe("対局終了時の供託点", () => {
  it("供託点を加える前の暫定1位が全額を受け取る", () => {
    const result = resolveMatchSettlement({
      players: createPlayers([
        28000,
        30000,
        22000,
        18000
      ]),
      riichiPool: 2000,
      initialDealerSeat: 0
    });

    expect(
      result.provisionalLeaderId
    ).toBe("player-1");
    expect(
      result.riichiPoolRecipientId
    ).toBe("player-1");
    expect(
      result.rankings.map(
        (ranking) => ranking.playerId
      )
    ).toEqual([
      "player-1",
      "player-0",
      "player-2",
      "player-3"
    ]);
    expect(result.rankings[0]).toEqual({
      rank: 1,
      playerId: "player-1",
      seat: 1,
      pointsBeforePool: 30000,
      riichiPoolAward: 2000,
      finalPoints: 32000
    });
  });

  it("暫定1位が同点なら起家から近い者を優先する", () => {
    const result = resolveMatchSettlement({
      players: createPlayers(),
      riichiPool: 1000,
      initialDealerSeat: 2
    });

    expect(
      result.riichiPoolRecipientId
    ).toBe("player-2");
    expect(
      result.rankings.map(
        (ranking) => ranking.seat
      )
    ).toEqual([2, 3, 0, 1]);
    expect(
      result.rankings[0].finalPoints
    ).toBe(26000);
  });

  it("最終同点順位も起家からのツモ順で決める", () => {
    const result = resolveMatchSettlement({
      players: createPlayers([
        30000,
        20000,
        30000,
        20000
      ]),
      riichiPool: 0,
      initialDealerSeat: 1
    });

    expect(
      result.rankings.map(
        (ranking) => ranking.seat
      )
    ).toEqual([2, 0, 1, 3]);
    expect(
      result.rankings.map(
        (ranking) => ranking.rank
      )
    ).toEqual([1, 2, 3, 4]);
  });

  it("供託点が0点なら受取者を設けず点数を変えない", () => {
    const players = createPlayers([
      31000,
      27000,
      23000,
      19000
    ]);

    const result = resolveMatchSettlement({
      players,
      riichiPool: 0,
      initialDealerSeat: 0
    });

    expect(
      result.riichiPoolRecipientId
    ).toBeNull();
    expect(
      result.playersAfter.map(
        (player) => player.points
      )
    ).toEqual([
      31000,
      27000,
      23000,
      19000
    ]);
    expect(
      result.playersAfter[0].name
    ).toBe("あなた");
  });
});

describe("対局終了精算の入力検証", () => {
  it("供託点は0以上の1000点単位に限定する", () => {
    expect(() =>
      resolveMatchSettlement({
        players: createPlayers(),
        riichiPool: 500,
        initialDealerSeat: 0
      })
    ).toThrow(
      "供託点は0以上の1000点単位で指定してください"
    );
  });
});
