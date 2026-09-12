import type { Tile } from "../mahjong/types";
import type { AkuukanGameState } from "./types";
import {
  applyPlayerSkill4_21AtDeal
} from "./nextRoundPairReservationDeal";
import {
  applyPlayerSkill4_22AtDeal
} from "./nextRoundSequenceReservationDeal";
import {
  applyPlayerSkill4_23AtDeal
} from "./nextRoundTripletReservationDeal";
import {
  AKUUKAN_PLAYER_SKILL_4_21_RESERVATION_PREFIX
} from "./nextRoundPairReservation";
import {
  AKUUKAN_PLAYER_SKILL_4_22_RESERVATION_PREFIX
} from "./nextRoundSequenceReservation";
import {
  AKUUKAN_PLAYER_SKILL_4_23_RESERVATION_PREFIX
} from "./nextRoundTripletReservation";

export interface ApplyActiveReservationsAtDealInput {
  readonly akuukan: AkuukanGameState;
  readonly availableTiles: readonly Tile[];
  readonly remainingHandTileCount: number;
  readonly random: () => number;
}

export function applyActiveReservationsAtDeal(
  input: ApplyActiveReservationsAtDealInput
) {
  if (
    !Number.isSafeInteger(input.remainingHandTileCount) ||
    input.remainingHandTileCount < 0 ||
    input.remainingHandTileCount > 13
  ) {
    throw new RangeError("配牌の空き枠は0〜13の整数で指定してください。");
  }

  const reservations = input.akuukan.activeEffects.filter(
    (effect) =>
      (
        effect.sourceId === "player-skill:4-21" &&
        effect.instanceId.startsWith(
          AKUUKAN_PLAYER_SKILL_4_21_RESERVATION_PREFIX
        )
      ) ||
      (
        effect.sourceId === "player-skill:4-22" &&
        effect.instanceId.startsWith(
          AKUUKAN_PLAYER_SKILL_4_22_RESERVATION_PREFIX
        )
      ) ||
      (
        effect.sourceId === "player-skill:4-23" &&
        effect.instanceId.startsWith(
          AKUUKAN_PLAYER_SKILL_4_23_RESERVATION_PREFIX
        )
      )
  );

  const reservationIds = new Set(
    reservations.map((effect) => effect.instanceId)
  );
  const otherEffects = input.akuukan.activeEffects.filter(
    (effect) => !reservationIds.has(effect.instanceId)
  );
  const reservedTiles: Tile[] = [];
  let remainingTiles = [...input.availableTiles];

  // 対子・順子・暗刻を、予約された順で処理する。
  for (const reservation of reservations) {
    const currentInput = {
      akuukan: {
        ...input.akuukan,
        activeEffects: [...otherEffects, reservation]
      },
      availableTiles: remainingTiles,
      remainingHandTileCount:
        input.remainingHandTileCount - reservedTiles.length,
      random: input.random
    };

    const result = reservation.sourceId === "player-skill:4-21"
      ? applyPlayerSkill4_21AtDeal(currentInput)
      : reservation.sourceId === "player-skill:4-22"
        ? applyPlayerSkill4_22AtDeal(currentInput)
        : applyPlayerSkill4_23AtDeal(currentInput);

    reservedTiles.push(...result.reservedTiles);
    remainingTiles = result.remainingTiles;
  }

  return {
    akuukan: reservations.length === 0
      ? input.akuukan
      : { ...input.akuukan, activeEffects: otherEffects },
    reservedTiles,
    remainingTiles,
    consumedReservationCount: reservations.length
  };
}
