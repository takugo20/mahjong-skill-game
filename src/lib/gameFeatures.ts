import type { GameState } from "./mahjong/types";
import type { EnemyId, PlayerSkillId } from "./akuukan/types";
import { ENEMY_IDS, PLAYER_SKILL_IDS } from "./akuukan/types";
import { AKUUKAN_SAVE_DATA_STORAGE_KEY } from "./akuukan/saveDataStorage";
import type { AkuukanSaveData } from "./akuukan/saveData";
import { isAkuukanSaveData } from "./akuukan/saveDataValidation";
import type { MatchStatistics } from "./akuukan/matchStatistics";

export interface MatchSession {
  id: string; startedAt: number; seenEvent: number;
  activations: Partial<Record<PlayerSkillId, number>>;
}
export interface ResumeMatch { state: GameState; session: MatchSession; savedAt: number; progressSignature: string }
export interface BalanceRun {
  id: string; enemyId: EnemyId; endedAt: number; rank: number;
  skills: { id: PlayerSkillId; level: number }[];
  activations: Partial<Record<PlayerSkillId, number>>;
  statistics: MatchStatistics | null;
}
export interface EquipmentPreset { name: string; ids: PlayerSkillId[] }
export interface FeatureData {
  version: 1;
  resume: ResumeMatch | null;
  presets: (EquipmentPreset | null)[];
  runs: BalanceRun[];
}
export function featureKey(): string {
  const testing = AKUUKAN_SAVE_DATA_STORAGE_KEY.includes("-polish:") &&
    new URLSearchParams(window.location.search).get("test") === "1";
  return `${AKUUKAN_SAVE_DATA_STORAGE_KEY}:features${testing ? ":test" : ""}`;
}
export function emptyFeatures(): FeatureData { return { version: 1, resume: null, presets: [null, null, null, null, null], runs: [] }; }
export function progressSignature(save: AkuukanSaveData): string {
  return JSON.stringify([save.playerSkillGrowth, save.enemyProgress, save.statistics ?? null]);
}
export function createMatchSession(): MatchSession {
  return { id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    startedAt: Date.now(), seenEvent: 0, activations: {} };
}
function validSession(v: any): v is MatchSession {
  return v && typeof v.id === "string" && Number.isFinite(v.startedAt) && Number.isInteger(v.seenEvent) && v.seenEvent >= 0 &&
    v.activations && Object.entries(v.activations).every(([id, n]) => PLAYER_SKILL_IDS.includes(id as PlayerSkillId) && Number.isInteger(n) && Number(n) >= 0);
}
export function isResumeMatch(value: unknown): value is ResumeMatch {
  try {
    const v = value as ResumeMatch;
    const s = v.state; const r = s.round;
    if (!validSession(v.session) || !Number.isFinite(v.savedAt) || typeof v.progressSignature !== "string" ||
      !s.akuukan || !s.matchProgress || !s.playerSkillDrawProgress || !Number.isFinite(s.playerMp) || !Number.isFinite(s.maxMp) ||
      ![0, 1, 2, 3].includes(s.initialDealerSeat) || typeof s.notice !== "string" ||
      !["dealAction", "discarding", "reaction", "roundEnd"].includes(r.phase) ||
      ![0, 1, 2, 3].includes(r.currentSeat) || !Number.isInteger(r.turnNumber) ||
      !["east", "south"].includes(r.prevailingWind) || ![1, 2, 3, 4].includes(r.handNumber) ||
      !Array.isArray(r.players) || r.players.length !== 4 || !Array.isArray(r.liveWall) || !Array.isArray(r.deadWall) || r.deadWall.length !== 14) return false;
    const tile = (t: any) => t && typeof t.id === "string" && ["man", "pin", "sou", "honor"].includes(t.suit) &&
      Number.isInteger(t.rank) && t.rank >= 1 && t.rank <= (t.suit === "honor" ? 7 : 9) && typeof t.red === "boolean";
    if (![...r.liveWall, ...r.deadWall].every(tile) || !r.players.every((p, i) => p.seat === i && typeof p.id === "string" &&
      typeof p.name === "string" && Number.isFinite(p.score) && Array.isArray(p.hand) && p.hand.every(tile) &&
      Array.isArray(p.discards) && p.discards.every(d => tile(d.tile)) && Array.isArray(p.melds) && p.melds.every(m => Array.isArray(m.tiles) && m.tiles.every(tile)))) return false;
    if (!Array.isArray(s.akuukan.activeEffects) || !Array.isArray(s.akuukan.nextRoundEffects) || !Array.isArray(s.akuukan.disabledSources) ||
      !s.akuukan.usedSources || ![s.akuukan.usedSources.turn, s.akuukan.usedSources.round, s.akuukan.usedSources.match].every(Array.isArray)) return false;
    return isAkuukanSaveData({ version: 1, playerSkillGrowth: s.playerSkillDrawProgress.growth,
      enemyProgress: s.matchProgress.initialEnemyProgress, equippedSkills: s.akuukan.setup.equippedSkills });
  } catch { return false; }
}
export function readFeatures(): { data: FeatureData; error: string } {
  try {
    const raw = localStorage.getItem(featureKey());
    if (!raw) return { data: emptyFeatures(), error: "" };
    const v = JSON.parse(raw) as FeatureData;
    if (v.version !== 1 || !Array.isArray(v.presets) || v.presets.length !== 5 || !v.presets.every(p => p === null ||
      (typeof p.name === "string" && Array.isArray(p.ids) && p.ids.length <= 10 && new Set(p.ids).size === p.ids.length && p.ids.every(id => PLAYER_SKILL_IDS.includes(id)))) ||
      !Array.isArray(v.runs) || !v.runs.every(r => typeof r.id === "string" && ENEMY_IDS.includes(r.enemyId) &&
        [1, 2, 3, 4].includes(r.rank) && Array.isArray(r.skills) && r.skills.every(s => PLAYER_SKILL_IDS.includes(s.id)) && r.activations &&
        Object.values(r.activations).every(n => Number.isInteger(n) && Number(n) >= 0)) || (v.resume !== null && !isResumeMatch(v.resume))) throw new Error();
    return { data: v, error: "" };
  } catch { return { data: emptyFeatures(), error: "追加機能の保存データを読み込めません。既存の成長データは変更していません。" }; }
}
export function updateFeatures(update: (data: FeatureData) => FeatureData): boolean {
  try {
    const loaded = readFeatures();
    if (loaded.error) return false;
    localStorage.setItem(featureKey(), JSON.stringify(update(loaded.data)));
    return true;
  } catch { return false; }
}
export function recordBalanceRun(state: GameState, session: MatchSession): boolean {
  const rank = state.matchResult?.rankings.find(r => r.seat === 0)?.rank;
  if (!rank || !state.akuukan || state.round.phase !== "matchEnd") return false;
  const run: BalanceRun = { id: session.id, enemyId: state.akuukan.setup.enemyId, endedAt: Date.now(), rank,
    skills: [...state.akuukan.setup.equippedSkills], activations: { ...session.activations },
    statistics: state.matchProgress?.statistics?.current ?? null };
  return updateFeatures(data => ({ ...data, runs: [...data.runs.filter(r => r.id !== run.id), run].slice(-500) }));
}
export function winTier(state: GameState): "normal" | "mangan" | "haneman" | "baiman" | "sanbaiman" | "yakuman" {
  const results = state.round.doubleRonResult?.winResults ?? (state.round.winResult ? [state.round.winResult] : []);
  let tier = 0;
  for (const r of results) tier = Math.max(tier, r.yakumanMultiplier > 0 || r.han >= 13 ? 5 : r.han >= 11 ? 4 : r.han >= 8 ? 3 : r.han >= 6 ? 2 : r.limitName ? 1 : 0);
  return (["normal", "mangan", "haneman", "baiman", "sanbaiman", "yakuman"] as const)[tier];
}
