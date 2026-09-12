import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  beginAkuukanRound,
  beginAkuukanTurn,
  createInitialAkuukanGameState
} from "./state";
import {
  tryActivateAkuukanPlayerSkill4_23
} from "./nextRoundTripletReservation";
import {
  applyPlayerSkill4_23AtDeal
} from "./nextRoundTripletReservationDeal";

function prepare() {
  const first = tryActivateAkuukanPlayerSkill4_23({
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "4-23", level: 5 }]
    }),
    playerMp: 900,
    maxMp: 900
  });

  const second = tryActivateAkuukanPlayerSkill4_23({
    ...first.state,
    akuukan: beginAkuukanTurn(first.state.akuukan)
  });

  const availableTiles: Tile[] = [1, 1, 1, 2, 2, 2, 3].map(
    (rank, index) => ({
      id: "triplet-" + index,
      suit: "honor",
      rank,
      red: false
    })
  );

  return {
    akuukan: beginAkuukanRound(second.state.akuukan),
    availableTiles,
    remainingHandTileCount: 13,
    random: () => 0.99
  };
}

describe("4-23の配牌適用", () => {
  it("字牌を含む実在する暗刻を抽選して予約を消費する", () => {
    const input = prepare();
    const result = applyPlayerSkill4_23AtDeal(input);

    expect(
      result.reservedTiles.map((tile) => tile.rank)
    ).toEqual([2, 2, 2, 1, 1, 1]);

    expect(
      result.remainingTiles.map((tile) => tile.rank)
    ).toEqual([3]);

    expect(result.guaranteedTripletCount).toBe(2);
    expect(result.consumedReservationCount).toBe(2);

    expect(
      result.akuukan.activeEffects
    ).toHaveLength(0);
    expect(
      input.akuukan.activeEffects
    ).toHaveLength(2);

    expect(
      new Set([
        ...result.reservedTiles,
        ...result.remainingTiles
      ]).size
    ).toBe(7);
  });

  it("空き枠が4枚なら1組だけ確保し全予約を消費する", () => {
    const result = applyPlayerSkill4_23AtDeal({
      ...prepare(),
      remainingHandTileCount: 4
    });

    expect(result.reservedTiles).toHaveLength(3);
    expect(result.remainingTiles).toHaveLength(4);
    expect(result.consumedReservationCount).toBe(2);
    expect(
      result.akuukan.activeEffects
    ).toHaveLength(0);
  });

  it("同じ牌が2枚しかない場合は暗刻を作らない", () => {
    const input = prepare();
    const result = applyPlayerSkill4_23AtDeal({
      ...input,
      availableTiles: input.availableTiles.slice(0, 2)
    });

    expect(result.reservedTiles).toHaveLength(0);
    expect(result.remainingTiles).toHaveLength(2);
    expect(result.consumedReservationCount).toBe(2);
  });

  it("赤牌と通常牌を同じ牌種とし4枚から暗刻を二重に作らない", () => {
    const tiles: Tile[] = [0, 1, 2, 3].map(
      (index) => ({
        id: "red-triplet-" + index,
        suit: "man",
        rank: 5,
        red: index === 0
      })
    );

    const result = applyPlayerSkill4_23AtDeal({
      ...prepare(),
      availableTiles: tiles
    });

    expect(result.guaranteedTripletCount).toBe(1);
    expect(result.reservedTiles).toHaveLength(3);
    expect(result.reservedTiles[0]).toBe(tiles[0]);
    expect(result.remainingTiles).toEqual([tiles[3]]);
    expect(result.consumedReservationCount).toBe(2);
  });
});
