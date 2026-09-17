import { useState } from "react";
import { readFeatures } from "./lib/gameFeatures";
import { ENEMY_CATALOG } from "./lib/akuukan/enemyCatalog";
import { ENEMY_NAMES } from "./enemy-art/EnemyPortrait";
import { PLAYER_SKILL_CATALOG } from "./lib/akuukan/playerSkillCatalog";
import "./GameFeatures.css";

export function BalanceDashboard({ onBack }: { onBack: () => void }) {
  const [loaded] = useState(readFeatures);
  const [enemy, setEnemy] = useState("all");
  const all = loaded.data.runs;
  const runs = all.filter(r => enemy === "all" || r.enemyId === enemy);
  const percent = (n: number, d: number) => d ? `${(100 * n / d).toFixed(1)}%` : "—";
  const summary = (data: typeof runs) => {
    const rounds = data.reduce((n, r) => n + (r.statistics?.rounds ?? 0), 0);
    return <><td>{data.length}</td><td>{data.length ? (data.reduce((n, r) => n + r.rank, 0) / data.length).toFixed(2) : "—"}</td>
      <td>{percent(data.filter(r => r.rank === 1).length, data.length)}</td>
      <td>{percent(data.reduce((n, r) => n + (r.statistics?.wins ?? 0), 0), rounds)}</td>
      <td>{percent(data.reduce((n, r) => n + (r.statistics?.dealIns ?? 0), 0), rounds)}</td></>;
  };
  return <main className="akuukan-skill-screen">
    <h1>実戦バランス計測</h1><button onClick={onBack}>開始画面に戻る</button>
    <p>直近500半荘を、この端末内に記録します。中断中・放棄した対局は含みません。</p>
    {loaded.error && <p role="alert">{loaded.error}</p>}
    <label>対戦相手<select value={enemy} onChange={e => setEnemy(e.target.value)}>
      <option value="all">全員</option>{ENEMY_CATALOG.map(e => <option key={e.id} value={e.id}>{ENEMY_NAMES[e.id]}</option>)}
    </select></label>
    <h2>敵別成績</h2><div className="feature-table"><table><thead><tr><th>対戦相手</th><th>対局数</th><th>平均順位</th><th>1位率</th><th>和了率</th><th>放銃率</th></tr></thead>
    <tbody><tr><th>合計</th>{summary(runs)}</tr>{ENEMY_CATALOG.filter(e => enemy === "all" || e.id === enemy).map(e =>
      <tr key={e.id}><th>{ENEMY_NAMES[e.id]}</th>{summary(runs.filter(r => r.enemyId === e.id))}</tr>)}</tbody></table></div>
    <h2>装備スキル別成績</h2><p>装備率は対象対局のうち装備した割合です。併用スキル・レベル・対戦相手による影響を含み、スキル単独の強さを示すものではありません。発動回数は手動発動・赤ドラ化・ドラ追加・闇聴察知・MP回復が対象です。常時補正など計測対象外は「—」です。</p>
    <div className="feature-table"><table><thead><tr><th>スキル</th><th>装備率</th><th>装備対局数</th><th>平均順位</th><th>1位率</th><th>和了率</th><th>放銃率</th><th>記録された発動</th></tr></thead><tbody>
    {PLAYER_SKILL_CATALOG.map(s => {
      const data = runs.filter(r => r.skills.some(v => v.id === s.id));
      if (!data.length) return null;
      const count = data.reduce((n, r) => n + (r.activations[s.id] ?? 0), 0);
      const tracked = s.kind === "active" || ["1-1", "1-2", "1-3", "1-5", "1-6", "3-3", "2-18"].includes(s.id);
      return <tr key={s.id}><th>{s.name}</th><td>{percent(data.length, runs.length)}</td>{summary(data)}<td>{tracked ? count : "—"}</td></tr>;
    })}</tbody></table></div>
    {!runs.length && <p>まだ記録がありません。対局を最後まで遊ぶと追加されます。</p>}
  </main>;
}
