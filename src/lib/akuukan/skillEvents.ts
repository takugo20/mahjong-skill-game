import type { AkuukanGameState, PlayerSkillId } from "./types";

export interface SkillEvent { sequence: number; skillId: PlayerSkillId; detail: string }

export function recordSkillEvent(state: AkuukanGameState, skillId: PlayerSkillId, detail: string): AkuukanGameState {
  const sequence = (state.skillEventSequence ?? 0) + 1;
  return { ...state, skillEventSequence: sequence,
    skillEvents: [...(state.skillEvents ?? []), { sequence, skillId, detail }].slice(-100) };
}
