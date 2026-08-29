import type {
  AkuukanEffectSourceId,
  AkuukanGameState,
  EquippedPlayerSkill,
  PlayerSkillId,
  SkillLevel
} from "./types";

const PLAYER_SKILL_SOURCE_PREFIX =
  "player-skill:";

export function getPlayerSkillIdFromSourceId(
  sourceId: AkuukanEffectSourceId
): PlayerSkillId | null {
  if (
    !sourceId.startsWith(
      PLAYER_SKILL_SOURCE_PREFIX
    )
  ) {
    return null;
  }

  return sourceId.slice(
    PLAYER_SKILL_SOURCE_PREFIX.length
  ) as PlayerSkillId;
}

export function getEquippedPlayerSkill(
  state: AkuukanGameState,
  skillId: PlayerSkillId
): EquippedPlayerSkill | null {
  const skill =
    state.setup.equippedSkills.find(
      (equippedSkill) =>
        equippedSkill.id === skillId
    );

  return skill ? { ...skill } : null;
}

export function isAkuukanPlayerSkillEquipped(
  state: AkuukanGameState,
  skillId: PlayerSkillId
): boolean {
  return getEquippedPlayerSkill(
    state,
    skillId
  ) !== null;
}

export function getEquippedPlayerSkillLevel(
  state: AkuukanGameState,
  skillId: PlayerSkillId
): SkillLevel | null {
  return (
    getEquippedPlayerSkill(
      state,
      skillId
    )?.level ?? null
  );
}
