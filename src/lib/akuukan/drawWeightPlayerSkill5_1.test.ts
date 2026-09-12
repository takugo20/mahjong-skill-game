import { describe, expect, it, vi } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  getAkuukanPlayerSkill1_4LiveWallDrawIndex as drawIndex
} from "./drawWeight";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

function createInput() {
  const liveWall: Tile[] = [
    { id: "normal", suit: "pin", rank: 1, red: false },
    { id: "winning", suit: "man", rank: 4, red: false }
  ];

  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-1", level: 5 }]
    }),
    drawerIsPlayer: true,
    liveWall,
    candidateIndexes: [0, 1],
    doraIndicators: [] as Tile[],
    riichiEstablished: true,
    isFirstNormalDrawAfterRiichi: true,
    normalIppatsuAvailable: true,
    winningTileIds: ["winning"],
    random: vi.fn(() => 0.9)
  };
}

describe("5-1 紫電一閃のツモ抽選への適用", () => {
  it("Lv.5では通常牌と和了牌の重量比が1対3になる", () => {
    const input = createInput();

    expect(drawIndex({
      ...input,
      random: () => 0.25 - 0.000001
    })).toBe(0);

    expect(drawIndex({
      ...input,
      random: () => 0.25
    })).toBe(1);
  });

  it("1-4のドラ倍率2倍と5-1の3倍を掛け合わせる", () => {
    const input = createInput();
    const combined = {
      ...input,
      akuukan: createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: [
          { id: "1-4", level: 5 },
          { id: "5-1", level: 5 }
        ]
      }),
      doraIndicators: [{
        id: "indicator",
        suit: "man" as const,
        rank: 3,
        red: false
      }]
    };

    expect(drawIndex({
      ...combined,
      random: () => 1 / 7 - 0.000001
    })).toBe(0);

    expect(drawIndex({
      ...combined,
      random: () => 1 / 7 + 0.000001
    })).toBe(1);
  });

  it.each([
    "drawerIsPlayer",
    "riichiEstablished",
    "isFirstNormalDrawAfterRiichi",
    "normalIppatsuAvailable"
  ] as const)("%sが偽なら抽選を変更しない", (key) => {
    const input = createInput();

    expect(drawIndex({
      ...input,
      [key]: false
    })).toBe(0);

    expect(input.random).not.toHaveBeenCalled();
  });

  it("追加情報を省略した既存の呼び出しでは補正しない", () => {
    const input = createInput();

    expect(drawIndex({
      akuukan: input.akuukan,
      drawerIsPlayer: true,
      liveWall: input.liveWall,
      candidateIndexes: input.candidateIndexes,
      doraIndicators: [],
      random: input.random
    })).toBe(0);

    expect(input.random).not.toHaveBeenCalled();
  });

  it("和了牌が候補から除外されていれば選ばない", () => {
    const input = createInput();

    expect(drawIndex({
      ...input,
      candidateIndexes: [0]
    })).toBe(0);

    expect(input.random).not.toHaveBeenCalled();
  });

  it("5-1が無効化中なら抽選を変更しない", () => {
    const input = createInput();

    expect(drawIndex({
      ...input,
      akuukan: disableAkuukanSource(
        input.akuukan,
        "player-skill:5-1"
      )
    })).toBe(0);

    expect(input.random).not.toHaveBeenCalled();
  });
});
