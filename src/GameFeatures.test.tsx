// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFeatures, updateFeatures, featureKey, createMatchSession, isResumeMatch, progressSignature, recordBalanceRun, winTier } from "./lib/gameFeatures";
import { createInitialAkuukanSaveData } from "./lib/akuukan/saveData";
import { tryStartAkuukanMatchFromSaveData } from "./lib/akuukan/saveDataMatchStart";
import { EquipmentPresets } from "./EquipmentPresets";
import { MatchTools } from "./MatchTools";
import { recordSkillEvent } from "./lib/akuukan/skillEvents";
import { AkuukanGame } from "./AkuukanGame";
import { AKUUKAN_SAVE_DATA_STORAGE_KEY } from "./lib/akuukan/saveDataStorage";
import { BalanceDashboard } from "./BalanceDashboard";
import type { MatchSession } from "./lib/gameFeatures";
import type { GameState } from "./lib/mahjong/types";

beforeEach(() => { localStorage.clear(); window.history.replaceState({}, "", "/"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });
function fixture() {
  const save = createInitialAkuukanSaveData();
  const result = tryStartAkuukanMatchFromSaveData(save, "enemy-1");
  if (!result.succeeded) throw new Error("fixture");
  return { save, state: result.gameState, session: createMatchSession() };
}
it("中断データの往復で牌山・手牌・成長・発動カウントを保持する", () => {
  const f = fixture();
  const resume = { state: f.state, session: f.session, savedAt: Date.now(), progressSignature: progressSignature(f.save) };
  expect(isResumeMatch(resume)).toBe(true);
  expect(updateFeatures(d => ({ ...d, resume }))).toBe(true);
  expect(readFeatures().data.resume).toEqual(resume);
  expect(isResumeMatch({ ...resume, state: {} })).toBe(false);
});
it("壊れたデータや容量不足を黙って上書きしない", () => {
  localStorage.setItem(featureKey(), "broken");
  expect(readFeatures().error).toBeTruthy();
  expect(updateFeatures(d => d)).toBe(false);
  expect(localStorage.getItem(featureKey())).toBe("broken");
  localStorage.clear();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error(); });
  expect(updateFeatures(d => d)).toBe(false);
});
it("検証モードの追加データを通常データと分離する（コピー先のみ）", () => {
  const normal = featureKey();
  window.history.replaceState({}, "", "/?test=1");
  expect(featureKey() === normal).toBe(!AKUUKAN_SAVE_DATA_STORAGE_KEY.includes("-polish:"));
});
it("装備セットを保存し、現在の成長レベルで呼び出す", () => {
  const save = createInitialAkuukanSaveData();
  const onLoad = vi.fn();
  const equipped = { ...save, equippedSkills: [{ id: "1-1" as const, level: 1 as const }] };
  const { rerender } = render(<EquipmentPresets draft={equipped} onLoad={onLoad} />);
  fireEvent.change(screen.getByPlaceholderText("速度重視など"), { target: { value: "赤ドラ" } });
  fireEvent.click(screen.getByText("選択中の装備を登録"));
  const raised = { ...save, playerSkillGrowth: { ...save.playerSkillGrowth, skills: {
    ...save.playerSkillGrowth.skills, "1-1": { isUnlocked: true as const, level: 3 as const, currentExp: 0 }
  } } };
  rerender(<EquipmentPresets draft={raised} onLoad={onLoad} />);
  fireEvent.click(screen.getByText("セットを呼び出す"));
  expect(onLoad).toHaveBeenCalledWith([{ id: "1-1", level: 3 }]);
});
it("発動を一度だけ集計し、再開時は通知や加算を繰り返さない", () => {
  const f = fixture();
  f.state.akuukan = recordSkillEvent(f.state.akuukan!, "1-1", "赤ドラ化");
  const checkpoint = vi.fn((_state: GameState, _session: MatchSession) => true);
  const { rerender, unmount } = render(<MatchTools state={f.state} busy={false} session={f.session} onCheckpoint={checkpoint} onSuspend={() => {}} />);
  const tracked = checkpoint.mock.calls[checkpoint.mock.calls.length - 1][1];
  expect(tracked.activations["1-1"]).toBe(1);
  rerender(<MatchTools state={{ ...f.state }} busy={false} session={f.session} onCheckpoint={checkpoint} onSuspend={() => {}} />);
  expect(checkpoint.mock.calls[checkpoint.mock.calls.length - 1][1].activations["1-1"]).toBe(1);
  unmount(); checkpoint.mockClear();
  render(<MatchTools state={f.state} busy={false} session={tracked} onCheckpoint={checkpoint} onSuspend={() => {}} />);
  expect(screen.queryByRole("status")).toBeNull();
  expect(checkpoint.mock.calls[checkpoint.mock.calls.length - 1][1].activations["1-1"]).toBe(1);
});
it("CPU処理中の中断と保存失敗時の画面離脱を防ぐ", () => {
  const f = fixture(); const leave = vi.fn(); const checkpoint = vi.fn(() => false);
  const { rerender } = render(<MatchTools state={f.state} busy session={f.session} onCheckpoint={checkpoint} onSuspend={leave} />);
  expect((screen.getByText("保存して中断") as HTMLButtonElement).disabled).toBe(true);
  expect(checkpoint).not.toHaveBeenCalled();
  rerender(<MatchTools state={f.state} busy={false} session={f.session} onCheckpoint={checkpoint} onSuspend={leave} />);
  fireEvent.click(screen.getByText("保存して中断")); expect(leave).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeTruthy();
});
it("画面から中断して再開し、同じ手牌を復元できる", () => {
  render(<AkuukanGame />);
  fireEvent.click(screen.getByText("対局を開始"));
  const before = readFeatures().data.resume;
  expect(before).not.toBeNull();
  fireEvent.click(screen.getByText("保存して中断"));
  fireEvent.click(screen.getByText("続きから再開"));
  expect(readFeatures().data.resume?.state.round.players[0].hand).toEqual(before!.state.round.players[0].hand);
});
it("同じ半荘の計測結果は再保存しても二重加算されない", () => {
  const f = fixture(); f.state.round.phase = "matchEnd";
  f.state.matchResult = { provisionalLeaderId: "player-0", riichiPoolRecipientId: null, riichiPoolAward: 0,
    rankings: [{ rank: 1, playerId: f.state.round.players[0].id, seat: 0, pointsBeforePool: 25000, riichiPoolAward: 0, finalPoints: 25000 }] };
  expect(recordBalanceRun(f.state, f.session)).toBe(true);
  expect(recordBalanceRun(f.state, f.session)).toBe(true);
  expect(readFeatures().data.runs).toHaveLength(1);
  render(<BalanceDashboard onBack={() => {}} />);
  expect(screen.getAllByText("100.0%").length).toBeGreaterThan(0);
});
it("点数区分で演出を分ける", () => {
  const f = fixture();
  for (const [han, yakumanMultiplier, limitName, expected] of [[3, 0, null, "normal"], [5, 0, "満貫", "mangan"], [6, 0, "跳満", "haneman"], [8, 0, "倍満", "baiman"], [11, 0, "三倍満", "sanbaiman"], [0, 1, "役満", "yakuman"]] as const) {
    f.state.round.winResult = { han, yakumanMultiplier, limitName } as NonNullable<typeof f.state.round.winResult>;
    expect(winTier(f.state)).toBe(expected);
  }
});
