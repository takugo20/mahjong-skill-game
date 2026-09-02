import {
  getEnemyDefinition
} from "./enemyCatalog";
import type {
  AkuukanEffectSourceId,
  AkuukanMatchSetup
} from "./types";

function isAkuukanE18Present(
  setup: AkuukanMatchSetup
): boolean {
  return getEnemyDefinition(
    setup.enemyId
  ).abilities.some(
    (ability) => ability.id === "E-18"
  );
}

export function getAkuukanMatchSetupDisabledSources(
  setup: AkuukanMatchSetup
): AkuukanEffectSourceId[] {
  if (!isAkuukanE18Present(setup)) {
    return [];
  }

  return setup.equippedSkills.map(
    (skill) =>
      `player-skill:${skill.id}` as const
  );
}
