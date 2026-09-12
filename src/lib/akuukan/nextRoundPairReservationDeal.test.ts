import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  beginAkuukanRound,
  beginAkuukanTurn,
  createInitialAkuukanGameState
} from "./state";
import {
  tryActivateAkuukanPlayerSkill4_21
} from "./nextRoundPairReservation";
import {
  applyPlayerSkill4_21AtDeal
} from "./nextRoundPairReservationDeal";

function prepare() {
  const first = tryActivateAkuukanPlayerSkill4_21({
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "4-21", level: 5 }]
    }),
    playerMp: 900,
    maxMp: 900
  });

  const second = tryActivateAkuukanPlayerSkill4_21({
    ...first.state,
    akuukan: beginAkuukanTurn(first.state.akuukan)
  });

  const tiles: Tile[] = [1, 1, 2, 2, 3].map(
    (rank, index) => ({
      id: "deal-pair-" + index,
      suit: "man",
      rank,
      red: false
    })
  );

  return {
    akuukan: beginAkuukanRound(second.state.akuukan),
    availableTiles: tiles,
    remainingHandTileCount: 13,
    random: () => 0.99
  };
}

describe("4-21の配牌適用", () => {
  it("複数予約をランダムな対子へ変換し牌を重複使用しない", () => {
    const input = prepare();
    const result = applyPlayerSkill4_21AtDeal(input);

    expect(
      result.reservedTiles.map((tile) => tile.rank)
    ).toEqual([2, 2, 1, 1]);

    expect(
      result.remainingTiles.map((tile) => tile.rank)
    ).toEqual([3]);

    expect(result.consumedReservationCount).toBe(2);
    expect(result.guaranteedPairCount).toBe(2);

    expect(
      input.akuukan.activeEffects
    ).toHaveLength(2);

    expect(
      result.akuukan.activeEffects
    ).toHaveLength(0);

    expect(
      new Set([
        ...result.reservedTiles,
        ...result.remainingTiles
      ]).size
    ).toBe(5);
  });

  it("空き枠に入る分だけ確保し残りの予約も消費する", () => {
    const result = applyPlayerSkill4_21AtDeal({
      ...prepare(),
      remainingHandTileCount: 3
    });

    expect(result.reservedTiles).toHaveLength(2);
    expect(result.consumedReservationCount).toBe(2);
    expect(
      result.akuukan.activeEffects
    ).toHaveLength(0);
  });

  it("牌が足りなければ予約を消費し架空の牌を作らない", () => {
    const input = prepare();
    const result = applyPlayerSkill4_21AtDeal({
      ...input,
      availableTiles: [input.availableTiles[0]]
    });

    expect(result.reservedTiles).toHaveLength(0);
    expect(result.remainingTiles).toHaveLength(1);
    expect(result.consumedReservationCount).toBe(2);
  });
});
