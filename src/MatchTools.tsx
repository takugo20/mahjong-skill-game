import { useEffect, useRef, useState } from "react";
import type { GameState } from "./lib/mahjong/types";
import { PLAYER_SKILL_CATALOG } from "./lib/akuukan/playerSkillCatalog";
import { recordBalanceRun, type MatchSession } from "./lib/gameFeatures";
import "./GameFeatures.css";

export function MatchTools({ state, busy, session, onCheckpoint, onSuspend }: {
  state: GameState; busy: boolean; session: MatchSession;
  onCheckpoint: (state: GameState, session: MatchSession) => boolean;
  onSuspend: () => void;
}) {
  const tracking = useRef<MatchSession>({ ...session, activations: { ...session.activations } });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const finished = useRef(false);
  const safe = !busy && state.round.phase !== "matchEnd" &&
    (state.round.currentSeat === 0 || state.round.phase === "dealAction" || state.round.phase === "reaction" || state.round.phase === "roundEnd");
  useEffect(() => {
    const fresh = (state.akuukan?.skillEvents ?? []).filter(e => e.sequence > tracking.current.seenEvent);
    if (fresh.length) {
      for (const e of fresh) {
        tracking.current.activations[e.skillId] = (tracking.current.activations[e.skillId] ?? 0) + 1;
        tracking.current.seenEvent = e.sequence;
      }
      setNotice(fresh.map(e => `${PLAYER_SKILL_CATALOG.find(s => s.id === e.skillId)?.name ?? e.skillId}：${e.detail}`).join(" ／ "));
    }
    if (state.round.phase === "matchEnd" && !finished.current) {
      finished.current = recordBalanceRun(state, tracking.current);
      if (!finished.current) setError("計測結果を保存できません。保存領域をご確認ください。");
    } else if (safe) {
      setError(onCheckpoint(state, tracking.current) ? "" : "中断データを保存できません。この画面を閉じずに保存を再試行してください。");
    }
  }, [state, safe, onCheckpoint]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  return <>
    <div className="match-tools">
      {state.round.phase !== "matchEnd" && <button disabled={!safe} onClick={() => {
        if (onCheckpoint(state, tracking.current)) onSuspend();
        else setError("中断データを保存できないため、対局を継続しています。");
      }}>保存して中断</button>}
    </div>
    {notice && <div className="skill-toast" role="status">{notice}</div>}
    {error && <div className="feature-error" role="alert">{error}<button onClick={() => {
      const ok = state.round.phase === "matchEnd" ? recordBalanceRun(state, tracking.current) : onCheckpoint(state, tracking.current);
      if (ok) { finished.current = state.round.phase === "matchEnd"; setError(""); }
    }}>保存を再試行</button></div>}
  </>;
}
