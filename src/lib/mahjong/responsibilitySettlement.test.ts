import {
  describe,
  expect,
  it
} from "vitest";
import {
  resolveResponsibilitySettlement
} from "./responsibilitySettlement";
import type {
  ResponsibilitySettlementResult
} from "./responsibilitySettlement";
import type {
  RoundScorePlayer
} from "./settlement";
import type {
  Wind
} from "./types";
import type {
  YakumanResult
} from "./yakuman";

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
    name: `player ${index}`,
    wind,
    points: 25000
  }));
}

function bigThreeDragons(): YakumanResult {
  return {
    id: "bigThreeDragons",
    name: "大三元",
    multiplier: 1
  };
}

function bigFourWinds(): YakumanResult {
  return {
    id: "bigFourWinds",
    name: "大四喜",
    multiplier: 2
  };
}

function allHonors(): YakumanResult {
  return {
    id: "allHonors",
    name: "字一色",
    multiplier: 1
  };
}

function getChange(
  result:
    ResponsibilitySettlementResult,
  playerId: string
): number | undefined {
  return result.pointChanges.find(
    (change) =>
      change.playerId === playerId
  )?.change;
}

describe("責任払いの点数精算", () => {
  it("子の大三元ツモでは責任者が役満全額と本場を支払う", () => {
    const result =
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-1",
        winMethod: "tsumo",
        yakuman: [bigThreeDragons()],
        responsibility: {
          yakumanId:
            "bigThreeDragons",
          responsiblePlayerId:
            "player-3"
        },
        honba: 1,
        riichiPool: 1000
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(0);
    expect(getChange(
      result,
      "player-1"
    )).toBe(33300);
    expect(getChange(
      result,
      "player-2"
    )).toBe(0);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-32300);
  });

  it("親の大四喜ツモでは責任者がダブル役満全額を支払う", () => {
    const result =
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-0",
        winMethod: "tsumo",
        yakuman: [bigFourWinds()],
        responsibility: {
          yakumanId: "bigFourWinds",
          responsiblePlayerId:
            "player-2"
        },
        honba: 0,
        riichiPool: 0
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(96000);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-96000);
  });

  it("責任者自身が放銃した場合は全額を支払う", () => {
    const result =
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-1",
        loserId: "player-3",
        winMethod: "ron",
        yakuman: [bigThreeDragons()],
        responsibility: {
          yakumanId:
            "bigThreeDragons",
          responsiblePlayerId:
            "player-3"
        },
        honba: 2,
        riichiPool: 1000
      });

    expect(getChange(
      result,
      "player-1"
    )).toBe(33600);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-32600);
  });

  it("責任者以外の放銃では対象役満を責任者と放銃者で折半する", () => {
    const result =
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-1",
        loserId: "player-0",
        winMethod: "ron",
        yakuman: [bigThreeDragons()],
        responsibility: {
          yakumanId:
            "bigThreeDragons",
          responsiblePlayerId:
            "player-3"
        },
        honba: 1,
        riichiPool: 2000
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(-16300);
    expect(getChange(
      result,
      "player-1"
    )).toBe(34300);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-16000);
  });

  it("複合役満の責任払い対象外部分は通常ツモ払いにする", () => {
    const result =
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-1",
        winMethod: "tsumo",
        yakuman: [
          bigThreeDragons(),
          allHonors()
        ],
        responsibility: {
          yakumanId:
            "bigThreeDragons",
          responsiblePlayerId:
            "player-3"
        },
        honba: 1,
        riichiPool: 0
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(-16000);
    expect(getChange(
      result,
      "player-1"
    )).toBe(64300);
    expect(getChange(
      result,
      "player-2"
    )).toBe(-8000);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-40300);
  });

  it("複合役満ロンでは対象外部分と本場を放銃者が支払う", () => {
    const result =
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-1",
        loserId: "player-0",
        winMethod: "ron",
        yakuman: [
          bigThreeDragons(),
          allHonors()
        ],
        responsibility: {
          yakumanId:
            "bigThreeDragons",
          responsiblePlayerId:
            "player-3"
        },
        honba: 2,
        riichiPool: 1000
      });

    expect(getChange(
      result,
      "player-0"
    )).toBe(-48600);
    expect(getChange(
      result,
      "player-1"
    )).toBe(65600);
    expect(getChange(
      result,
      "player-2"
    )).toBe(0);
    expect(getChange(
      result,
      "player-3"
    )).toBe(-16000);
  });
});

describe("責任払い精算の入力検証", () => {
  it("和了していない役満は責任払いにできない", () => {
    expect(() =>
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-1",
        winMethod: "tsumo",
        yakuman: [allHonors()],
        responsibility: {
          yakumanId:
            "bigThreeDragons",
          responsiblePlayerId:
            "player-3"
        },
        honba: 0,
        riichiPool: 0
      })
    ).toThrow(
      "責任払い対象の役満が和了結果にありません"
    );
  });

  it("和了者自身を責任者にできない", () => {
    expect(() =>
      resolveResponsibilitySettlement({
        players: createPlayers(),
        winnerId: "player-1",
        winMethod: "tsumo",
        yakuman: [bigThreeDragons()],
        responsibility: {
          yakumanId:
            "bigThreeDragons",
          responsiblePlayerId:
            "player-1"
        },
        honba: 0,
        riichiPool: 0
      })
    ).toThrow(
      "和了者自身を責任者にはできません"
    );
  });
});
