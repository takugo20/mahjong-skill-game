import { useEffect, useRef, useState } from "react";
import { playGameSound, setGameSoundVolume, unlockGameAudio } from "./lib/gameAudio";

const KEY = "mahjong-skill-game:presentation";
interface Preferences { volume: number; reducedMotion: boolean }
function readPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (value && typeof value.volume === "number" && Number.isFinite(value.volume)
      && typeof value.reducedMotion === "boolean") {
      return { volume: Math.max(0, Math.min(1, value.volume)), reducedMotion: value.reducedMotion };
    }
  } catch { /* 保存が使えない場合も設定を変更できる。 */ }
  return { volume: 0.65, reducedMotion: false };
}

export function PresentationSettings() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [saveFailed, setSaveFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setGameSoundVolume(preferences.volume);
    document.documentElement.dataset.motion = preferences.reducedMotion ? "reduced" : "full";
  }, [preferences]);

  function update(next: Preferences) {
    setPreferences(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaveFailed(false);
    } catch { setSaveFailed(true); }
  }

  return (
    <>
      <button className="presentation-launcher" ref={trigger} type="button"
        aria-label="音と演出の設定" onClick={() => dialog.current?.showModal()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6M16 14v6" /></svg>
        <span>設定</span>
      </button>
      <dialog className="presentation-dialog" ref={dialog} aria-labelledby="presentation-title"
        onClose={() => trigger.current?.focus()}>
        <form method="dialog">
          <header><div><span className="lobby-eyebrow">PREFERENCES</span><h2 id="presentation-title">音と演出</h2></div>
            <button type="submit" className="settings-close" aria-label="設定を閉じる">閉じる</button></header>
          <label className="settings-volume">効果音 <output>{Math.round(preferences.volume * 100)}%</output>
            <input aria-label="効果音の音量" type="range" min="0" max="100" step="5"
              value={Math.round(preferences.volume * 100)}
              onChange={e => update({ ...preferences, volume: Number(e.target.value) / 100 })} />
          </label>
          <button type="button" className="settings-preview" onClick={async () => {
            await unlockGameAudio(); playGameSound("drawTile");
          }}>音を確認</button>
          <label className="settings-motion"><span>演出を控えめにする<small>動きや点滅を抑えます。対局速度は変わりません。</small></span>
            <input type="checkbox" checked={preferences.reducedMotion}
              onChange={e => update({ ...preferences, reducedMotion: e.target.checked })} />
          </label>
          <p className="settings-note">端末の「視差効果を減らす」設定にも対応しています。</p>
          {saveFailed && <p role="status">この端末に設定を保存できません。現在の画面には反映しています。</p>}
        </form>
      </dialog>
    </>
  );
}
