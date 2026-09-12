import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  beginAkuukanRound,
  beginAkuukanTurn,
  createInitialAkuukanGameState
} from "./state";
import {
  tryActivateAkuukanPlayerSkill4_22
} from "./nextRoundSequenceReservation";
import {
  applyPlayerSkill4_22AtDeal
} from "./nextRoundSequenceReservationDeal";

function prepare() {
  const first = tryActivateAkuukanPlayerSkill4_22({
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "4-22", level: 5 }]
    }),
    playerMp: 900,
    maxMp: 900
  });

  const second = tryActivateAkuukanPlayerSkill4_22({
    ...first.state,
    akuukan: beginAkuukanTurn(first.state.akuukan)
  });

  const tiles: Tile[] = [1, 2, 3, 7, 8, 9].map(
    (rank, index) => ({
      id: "deal-sequence-" + index,
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

describe("4-22の配牌適用", () => {
  it("実在する順子を抽選し同じ牌を二度使わない", () => {
    const input = prepare();
    const result = applyPlayerSkill4_22AtDeal(input);

    expect(
      result.reservedTiles.map((tile) => tile.rank)
    ).toEqual([7, 8, 9, 1, 2, 3]);

    expect(result.guaranteedSequenceCount).toBe(2);
    expect(result.remainingTiles).toHaveLength(0);

    expect(
      new Set(
        result.reservedTiles.map((tile) => tile.id)
      ).size
    ).toBe(6);

    expect(result.consumedReservationCount).toBe(2);
    expect(
      result.akuukan.activeEffects
    ).toHaveLength(0);
    expect(
      input.akuukan.activeEffects
    ).toHaveLength(2);
  });

  it("空き枠が4枚なら1組だけ確保して全予約を消費する", () => {
    const result = applyPlayerSkill4_22AtDeal({
      ...prepare(),
      remainingHandTileCount: 4
    });

    expect(result.reservedTiles).toHaveLength(3);
    expect(result.remainingTiles).toHaveLength(3);
    expect(result.consumedReservationCount).toBe(2);
    expect(
      result.akuukan.activeEffects
    ).toHaveLength(0);
  });

  it("字牌の連番や異なる色の連番は順子にしない", () => {
    const input = prepare();
    const invalid: Tile[] = [
      { id: "a", suit: "man", rank: 1, red: false },
      { id: "b", suit: "pin", rank: 2, red: false },
      { id: "c", suit: "sou", rank: 3, red: false },
      { id: "d", suit: "honor", rank: 1, red: false },
      { id: "e", suit: "honor", rank: 2, red: false },
      { id: "f", suit: "honor", rank: 3, red: false }
    ];

    const result = applyPlayerSkill4_22AtDeal({
      ...input,
      availableTiles: invalid
    });

    expect(result.reservedTiles).toHaveLength(0);
    expect(result.remainingTiles).toEqual(invalid);
    expect(result.consumedReservationCount).toBe(2);
  });

  it("1枚しかない共通牌を複数の順子で使い回さない", () => {
    const input = prepare();
    const tiles: Tile[] = [1, 2, 3, 4, 5].map(
      (rank) => ({
        id: "overlap-" + rank,
        suit: "pin",
        rank,
        red: false
      })
    );

    const result = applyPlayerSkill4_22AtDeal({
      ...input,
      availableTiles: tiles,
      random: () => 0.5
    });

    expect(
      result.reservedTiles.map((tile) => tile.rank)
    ).toEqual([2, 3, 4]);

    expect(
      result.remainingTiles.map((tile) => tile.rank)
    ).toEqual([1, 5]);

    expect(result.guaranteedSequenceCount).toBe(1);
    expect(result.consumedReservationCount).toBe(2);
  });
});
