import {
  describe,
  expect,
  it
} from "vitest";
import {
  resolveExhaustiveDrawSettlement
} from "../mahjong/drawSettlement";
import type {
  RoundScorePlayer
} from "../mahjong/settlement";
import {
  createInitialAkuukanGameState
} from "./state";
import type {
  SkillLevel
} from "./types";
import {
  applyPlayerSkill3_1ToDrawSettlement
} from "./notenPenaltyReduction";

function createPlayers(): RoundScorePlayer[] {
  return [
    "east",
    "south",
    "west",
    "north"
  ].map((wind, index) => ({
    id: `player-${index}`,
    wind: wind as RoundScorePlayer["wind"],
    points: 25000
  }));
}

function createAkuukan(
  level: SkillLevel,
  disabled = false
) {
  const akuukan =
    createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-1",
        level
      }]
    });

  return disabled
    ? {
        ...akuukan,
        disabledSources: [
          ...akuukan.disabledSources,
          "player-skill:3-1" as const
        ]
      }
    : akuukan;
}

function applySkill(
  level: SkillLevel,
  tenpaiPlayerIds: readonly string[],
  disabled = false
) {
  const players = createPlayers();
  const settlement =
    resolveExhaustiveDrawSettlement({
      players,
      tenpaiPlayerIds
    });

  return applyPlayerSkill3_1ToDrawSettlement({
    akuukan: createAkuukan(
      level,
      disabled
    ),
    players,
    playerId: "player-0",
    settlement
  });
}

function getChanges(
  result: ReturnType<typeof applySkill>
): number[] {
  return result.pointChanges.map(
    (change) => change.change
  );
}

describe("プレイヤースキル3-1 罰符軽減", () => {
  it.each([
    [1, -500, 2500],
    [2, -400, 2400],
    [3, -300, 2300],
    [4, -100, 2100],
    [5, 0, 2000]
  ] as const)(
    "Lv.%sでは通常1000点の支払を軽減する",
    (level, playerChange, tenpaiGain) => {
      const result = applySkill(
        level,
        ["player-1"]
      );

      expect(getChanges(result)).toEqual([
        playerChange,
        tenpaiGain,
        -1000,
        -1000
      ]);
    }
  );

  it("100点未満を切り上げてから聴牌者へ均等配分する", () => {
    const result = applySkill(
      1,
      ["player-1", "player-3"]
    );

    expect(getChanges(result)).toEqual([
      -800,
      1200,
      -1500,
      1100
    ]);
    expect(
      result.pointChanges.reduce(
        (total, change) =>
          total + change.change,
        0
      )
    ).toBe(0);
  });

  it("余る100点を発動者からツモ順が近い聴牌者へ配る", () => {
    const players = createPlayers();
    const settlement =
      resolveExhaustiveDrawSettlement({
        players,
        tenpaiPlayerIds: [
          "player-0",
          "player-2"
        ]
      });
    const result =
      applyPlayerSkill3_1ToDrawSettlement({
        akuukan: createAkuukan(1),
        players,
        playerId: "player-1",
        settlement
      });

    expect(getChanges(result)).toEqual([
      1100,
      -800,
      1200,
      -1500
    ]);
  });

  it("発動者が聴牌していれば通常精算を維持する", () => {
    const result = applySkill(
      5,
      ["player-0", "player-2"]
    );

    expect(getChanges(result)).toEqual([
      1500,
      -1500,
      1500,
      -1500
    ]);
  });

  it("スキルが無効化されていれば通常精算を維持する", () => {
    const result = applySkill(
      5,
      ["player-1"],
      true
    );

    expect(getChanges(result)).toEqual([
      -1000,
      3000,
      -1000,
      -1000
    ]);
  });

  it("全員不聴では点数を移動しない", () => {
    const result = applySkill(1, []);

    expect(getChanges(result)).toEqual([
      0,
      0,
      0,
      0
    ]);
  });
});
