import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  beginAkuukanRound,
  createInitialAkuukanGameState
} from "./state";
import {
  tryActivateAkuukanPlayerSkill4_21
} from "./nextRoundPairReservation";
import {
  tryActivateAkuukanPlayerSkill4_22
} from "./nextRoundSequenceReservation";
import {
  tryActivateAkuukanPlayerSkill4_23
} from "./nextRoundTripletReservation";
import {
  applyActiveReservationsAtDeal
} from "./nextRoundActiveReservationsDeal";

describe("暗刻予約と他の予約の順序", () => {
  it.each(["pair", "sequence"] as const)(
    "%sとの予約順を守る",
    (kind) => {
      for (const tripletFirst of [true, false]) {
        const initial = {
          akuukan: createInitialAkuukanGameState({
            enemyId: "enemy-1",
            equippedSkills: [
              { id: "4-21", level: 5 },
              { id: "4-22", level: 5 },
              { id: "4-23", level: 5 }
            ]
          }),
          playerMp: 900,
          maxMp: 900
        };

        const other = kind === "pair"
          ? tryActivateAkuukanPlayerSkill4_21
          : tryActivateAkuukanPlayerSkill4_22;

        const reserved = tripletFirst
          ? other(
              tryActivateAkuukanPlayerSkill4_23(
                initial
              ).state
            )
          : tryActivateAkuukanPlayerSkill4_23(
              other(initial).state
            );

        const availableTiles: Tile[] = [1, 1, 1, 2, 3].map(
          (rank, index) => ({
            id: "triplet-order-" + index,
            suit: "man",
            rank,
            red: false
          })
        );

        const result = applyActiveReservationsAtDeal({
          akuukan: beginAkuukanRound(
            reserved.state.akuukan
          ),
          availableTiles,
          remainingHandTileCount: 3,
          random: () => 0
        });

        expect(
          result.reservedTiles.map((tile) => tile.rank)
        ).toEqual(
          tripletFirst
            ? [1, 1, 1]
            : kind === "pair"
              ? [1, 1]
              : [1, 2, 3]
        );

        expect(result.consumedReservationCount).toBe(2);
        expect(
          result.akuukan.activeEffects
        ).toHaveLength(0);

        expect(
          new Set([
            ...result.reservedTiles,
            ...result.remainingTiles
          ]).size
        ).toBe(5);
      }
    }
  );
});
