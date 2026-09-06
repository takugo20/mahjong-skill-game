import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export function activatePlayerSkill3_7RonImmunity(
  akuukan: AkuukanGameState
): AkuukanGameState {
  if (
    akuukan
      .playerSkill3_7RonImmunityActive ||
    !getEquippedPlayerSkill(
      akuukan,
      "3-7"
    ) ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-7"
    )
  ) {
    return akuukan;
  }

  return {
    ...akuukan,
    playerSkill3_7RonImmunityActive: true
  };
}

export function hasPlayerSkill3_7RonImmunity(
  akuukan: AkuukanGameState
): boolean {
  return (
    akuukan
      .playerSkill3_7RonImmunityActive ===
    true
  );
}
