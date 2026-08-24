import {
  describe,
  expect,
  it
} from "vitest";
import {
  resolveExhaustiveDrawSettlement
} from "./drawSettlement";
import type {
  ExhaustiveDrawSettlementResult
} from "./drawSettlement";
import type {
  RoundScorePlayer
} from "./settlement";
import type {
  Wind
} from "./types";

interface TestPlayer
  extends RoundScorePlayer {
  name: string;
}

function createPlayers(): TestPlayer[] {
  const winds: Wind[] = [
    "east",
    "south",
    "west",
    "north"
  ];

  return winds.map((wind, index) => ({
    id: `player-${index}`,
    name:
      index === 0
        ? "あなた"
        : `CPU ${index}`,
    wind,
    points: 25000
  }));
}

function getChange(
  result:
    ExhaustiveDrawSettlementResult,
  playerId: string
): number | undefined {
  return result.pointChanges.find(
    (change) =>
      change.playerId === playerId
  )?.change;
}

describe("荒牌流局の不聴罰符", () => {
  it("1人聴牌では聴牌者が3000点を受け取る", () => {
    const result =
      resolveExhaustiveDrawSettlement({
        players: createPlayers(),
        tenpaiPlayerIds: ["player-0"]
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(3000);
    expect(getChange(
      result,
      "player-1"
    )).toBe(-1000);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-1000);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-1000);
  });

  it("2人聴牌では1500点ずつ受け取る", () => {
    const result =
      resolveExhaustiveDrawSettlement({
        players: createPlayers(),
        tenpaiPlayerIds: [
          "player-0",
          "player-2"
        ]
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(1500);
    expect(getChange(
      result,
      "player-2"
    )).toBe(1500);
    expect(getChange(
      result,
      "player-1"
    )).toBe(-1500);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-1500);
  });

  it("3人聴牌では聴牌者が1000点ずつ受け取る", () => {
    const result =
      resolveExhaustiveDrawSettlement({
        players: createPlayers(),
        tenpaiPlayerIds: [
          "player-0",
          "player-1",
          "player-2"
        ]
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(1000);
    expect(getChange(
      result,
      "player-1"
    )).toBe(1000);
    expect(getChange(
      result,
      "player-2"
    )).toBe(1000);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-3000);
  });

  it("全員聴牌または全員不聴では点数を移動しない", () => {
    const allTenpai =
      resolveExhaustiveDrawSettlement({
        players: createPlayers(),
        tenpaiPlayerIds: [
          "player-0",
          "player-1",
          "player-2",
          "player-3"
        ]
      });

    const allNoten =
      resolveExhaustiveDrawSettlement({
        players: createPlayers(),
        tenpaiPlayerIds: []
      });

    expect(
      allTenpai.pointChanges.map(
        (change) => change.change
      )
    ).toEqual([0, 0, 0, 0]);
    expect(
      allNoten.pointChanges.map(
        (change) => change.change
      )
    ).toEqual([0, 0, 0, 0]);
  });

  it("点数合計とプレイヤー固有情報を維持する", () => {
    const result =
      resolveExhaustiveDrawSettlement({
        players: createPlayers(),
        tenpaiPlayerIds: [
          "player-1",
          "player-3"
        ]
      });

    expect(
      result.pointChanges.reduce(
        (total, change) =>
          total + change.change,
        0
      )
    ).toBe(0);
    expect(
      result.playersAfter.map(
        (player) => player.points
      )
    ).toEqual([
      23500,
      26500,
      23500,
      26500
    ]);
    expect(
      result.playersAfter[1].name
    ).toBe("CPU 1");
  });
});

describe("流局精算の入力検証", () => {
  it("4人未満では精算しない", () => {
    expect(() =>
      resolveExhaustiveDrawSettlement({
        players:
          createPlayers().slice(0, 3),
        tenpaiPlayerIds: []
      })
    ).toThrow(
      "流局精算には4人のプレイヤーが必要です"
    );
  });

  it("存在しない聴牌者を指定できない", () => {
    expect(() =>
      resolveExhaustiveDrawSettlement({
        players: createPlayers(),
        tenpaiPlayerIds: [
          "unknown-player"
        ]
      })
    ).toThrow(
      "聴牌者に存在しないプレイヤーが指定されています"
    );
  });
});
