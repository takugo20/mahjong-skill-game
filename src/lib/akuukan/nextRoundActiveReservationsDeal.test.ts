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
  applyActiveReservationsAtDeal
} from "./nextRoundActiveReservationsDeal";

describe("対子と順子の予約順", () => {
  it.each([true, false])(
    "順子先行=%sの発動順を配牌へ反映する",
    (sequenceFirst) => {
      const initial = {
        akuukan: createInitialAkuukanGameState({
          enemyId: "enemy-1",
          equippedSkills: [
            { id: "4-21", level: 5 },
            { id: "4-22", level: 5 }
          ]
        }),
        playerMp: 900,
        maxMp: 900
      };

      const reserved = sequenceFirst
        ? tryActivateAkuukanPlayerSkill4_21(
            tryActivateAkuukanPlayerSkill4_22(
              initial
            ).state
          )
        : tryActivateAkuukanPlayerSkill4_22(
            tryActivateAkuukanPlayerSkill4_21(
              initial
            ).state
          );

      const availableTiles: Tile[] = [1, 1, 2, 3].map(
        (rank, index) => ({
          id: "mixed-" + index,
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
        remainingHandTileCount: 4,
        random: () => 0
      });

      expect(
        result.reservedTiles.map((tile) => tile.rank)
      ).toEqual(
        sequenceFirst ? [1, 2, 3] : [1, 1]
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
      ).toBe(4);
    }
  );
});
