import { useState } from "react";
import type { AkuukanSaveData } from "./lib/akuukan/saveData";
import { readFeatures, updateFeatures } from "./lib/gameFeatures";
import type { EquippedPlayerSkill } from "./lib/akuukan/types";

export function EquipmentPresets({ draft, onLoad }: { draft: AkuukanSaveData; onLoad: (skills: EquippedPlayerSkill[]) => void }) {
  const [loaded, setLoaded] = useState(readFeatures);
  const [slot, setSlot] = useState(0);
  const [name, setName] = useState("");
  const [message, setMessage] = useState(loaded.error);
  function save() {
    const ok = updateFeatures(data => ({ ...data, presets: data.presets.map((p, i) => i === slot ?
      { name: name.trim() || `セット${slot + 1}`, ids: draft.equippedSkills.map(s => s.id) } : p) }));
    if (ok) setLoaded(readFeatures());
    setMessage(ok ? "選択中の装備をセットに保存しました。" : "セットを保存できませんでした。");
  }
  function load() {
    const preset = loaded.data.presets[slot];
    if (!preset) return;
    if (preset.ids.some(id => !draft.playerSkillGrowth.skills[id].isUnlocked)) {
      setMessage("未解放のスキルが含まれるため呼び出せません。"); return;
    }
    onLoad(preset.ids.map(id => ({ id, level: draft.playerSkillGrowth.skills[id].level! })));
    setMessage("セットを呼び出しました。「装備を保存」で対局に反映されます。");
  }
  return <section className="feature-panel" aria-label="装備セット">
    <h2>装備セット</h2>
    <label>保存先<select value={slot} onChange={e => { const i = Number(e.target.value); setSlot(i); setName(loaded.data.presets[i]?.name ?? ""); }}>
      {loaded.data.presets.map((p, i) => <option key={i} value={i}>{i + 1}：{p?.name ?? "未登録"}</option>)}
    </select></label>
    <label>セット名<input maxLength={24} value={name} onChange={e => setName(e.target.value)} placeholder="速度重視など" /></label>
    <div className="feature-actions"><button onClick={save}>{loaded.data.presets[slot] ? "選択中の装備で上書き" : "選択中の装備を登録"}</button>
    <button disabled={!loaded.data.presets[slot]} onClick={load}>セットを呼び出す</button></div>
    {message && <p role="status">{message}</p>}
  </section>;
}
