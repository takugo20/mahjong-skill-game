import type {
  AkuukanGameState,
  AkuukanMatchSetup
} from "./types";

export function createInitialAkuukanGameState(
  setup: AkuukanMatchSetup
): AkuukanGameState {
  return {
    setup: {
      enemyId: setup.enemyId,
      equippedSkills:
        setup.equippedSkills.map(
          ({ id, level }) => ({
            id,
            level
          })
        )
    },
    disabledSources: [],
    activeEffects: [],
    nextRoundEffects: [],
    usedSources: {
      match: [],
      round: [],
      turn: []
    }
  };
}
