import { describe, expect, it, vi } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  getAkuukanPlayerSkill1_4LiveWallDrawIndex as drawIndex
} from "./drawWeight";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

function input() {
  const liveWall: Tile[] = [
    {
      id: "normal",
      suit: "pin",
      rank: 1,
      red: false
    },
    {
      id: "tanki",
      suit: "man",
      rank: 4,
      red: false
    }
  ];

  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-5", level: 5 }]
    }),
    drawerIsPlayer: true,
    isNormalDraw: true,
    liveWall,
    candidateIndexes: [0, 1],
    doraIndicators: [] as Tile[],
    tankiWinningTileIds: ["tanki"],
    random: vi.fn(() => 0.9)
  };
}

describe("5-5 単騎和了牌の重量抽選", () => {
  it("Lv.5では通常牌と単騎和了牌の重量比が1対2になる", () => {
    const value = input();

    expect(
      drawIndex({
        ...value,
        random: () => 1 / 3 - 0.000001
      })
    ).toBe(0);

    expect(
      drawIndex({
        ...value,
        random: () => 1 / 3 + 0.000001
      })
    ).toBe(1);
  });

  it("1-4のドラ倍率2倍と5-5の2倍を掛け合わせる", () => {
    const value = {
      ...input(),
      akuukan: createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: [
          { id: "1-4", level: 5 },
          { id: "5-5", level: 5 }
        ]
      }),
      doraIndicators: [{
        id: "indicator",
        suit: "man" as const,
        rank: 3,
        red: false
      }]
    };

    expect(
      drawIndex({
        ...value,
        random: () => 0.199999
      })
    ).toBe(0);

    expect(
      drawIndex({
        ...value,
        random: () => 0.2
      })
    ).toBe(1);
  });

  it.each([
    "drawerIsPlayer",
    "isNormalDraw"
  ] as const)("%sが偽なら補正しない", key => {
    const value = input();

    expect(
      drawIndex({
        ...value,
        [key]: false
      })
    ).toBe(0);

    expect(value.random).not.toHaveBeenCalled();
  });

  it("単騎和了牌の情報がなければ補正しない", () => {
    const value = input();

    expect(
      drawIndex({
        ...value,
        tankiWinningTileIds: undefined
      })
    ).toBe(0);

    expect(value.random).not.toHaveBeenCalled();
  });

  it("除外された単騎和了牌を選ばない", () => {
    const value = input();

    expect(
      drawIndex({
        ...value,
        candidateIndexes: [0]
      })
    ).toBe(0);

    expect(value.random).not.toHaveBeenCalled();
  });

  it("無効化中は補正しない", () => {
    const value = input();

    expect(
      drawIndex({
        ...value,
        akuukan: disableAkuukanSource(
          value.akuukan,
          "player-skill:5-5"
        )
      })
    ).toBe(0);

    expect(value.random).not.toHaveBeenCalled();
  });
});
