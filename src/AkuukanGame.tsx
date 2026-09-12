import { useCallback, useRef, useState } from "react";
import { SkillEquipment } from "./SkillEquipment";
import { GameBoard } from "./GameBoard";
import type { GameState } from "./lib/mahjong/types";
import type { EnemyId } from "./lib/akuukan/types";
import { ENEMY_CATALOG } from "./lib/akuukan/enemyCatalog";
import {
  loadAkuukanSaveDataFromBrowser
} from "./lib/akuukan/browserSaveData";
import {
  tryStartAkuukanMatchFromSaveData
} from "./lib/akuukan/saveDataMatchStart";
import {
  saveAkuukanMatchResultToBrowser
} from "./lib/akuukan/browserMatchResultSave";

export function AkuukanGame() {
  const [loaded, setLoaded] = useState(
    loadAkuukanSaveDataFromBrowser
  );
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [enemyId, setEnemyId] =
    useState<EnemyId>("enemy-1");
  const [initialState, setInitialState] =
    useState<GameState | null>(null);
  const [saveStatus, setSaveStatus] =
    useState<"idle" | "saved" | "failed">("idle");
  const [message, setMessage] = useState("");

  const finishedRef = useRef<GameState | null>(null);
  const saveRef = useRef(loaded.saveData);

  const persist = useCallback((finished: GameState) => {
    const result = saveAkuukanMatchResultToBrowser(
      saveRef.current,
      finished
    );

    saveRef.current = result.saveData;

    if (result.status === "saved") {
      setLoaded({
        saveData: result.saveData,
        source: "storage",
        failureReason: null
      });
      setSaveStatus("saved");
    } else {
      setSaveStatus("failed");
    }
  }, []);

  const handleMatchEnd = useCallback(
    (finished: GameState) => {
      if (finishedRef.current) return;

      finishedRef.current = finished;
      persist(finished);
    },
    [persist]
  );

  function start() {
    const result = tryStartAkuukanMatchFromSaveData(
      saveRef.current,
      enemyId
    );

    if (!result.succeeded) {
      setMessage(
        "対局を開始できません。対戦相手と装備を確認してください。"
      );
      return;
    }

    finishedRef.current = null;
    setSaveStatus("idle");
    setMessage("");
    setInitialState(result.gameState);
  }

  if (equipmentOpen) {
    return (
      <SkillEquipment
        saveData={saveRef.current}
        onSaved={saveData => {
          saveRef.current = saveData;
          setLoaded({
            saveData,
            source: "storage",
            failureReason: null
          });
          setMessage("装備を保存しました。");
          setEquipmentOpen(false);
        }}
        onCancel={() => setEquipmentOpen(false)}
      />
    );
  }

  if (initialState) {
    return (
      <GameBoard
        initialState={initialState}
        onMatchEnd={handleMatchEnd}
        restartDisabled={saveStatus !== "saved"}
        onRestart={() => {
          if (saveStatus === "saved") {
            setInitialState(null);
          }
        }}
        matchSavePanel={
          <div aria-live="polite">
            {saveStatus === "saved" ? (
              <p>成長・解放結果を保存しました。</p>
            ) : saveStatus === "failed" ? (
              <>
                <p role="alert">
                  保存できませんでした。結果を保持しています。
                  この画面を閉じずに再試行してください。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (finishedRef.current) {
                      persist(finishedRef.current);
                    }
                  }}
                >
                  保存を再試行
                </button>
              </>
            ) : (
              <p>対局結果を保存しています…</p>
            )}
          </div>
        }
      />
    );
  }

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: 24
      }}
    >
      <h1>亜空間麻雀</h1>

      {loaded.failureReason ? (
        <>
          <p role="alert">
            セーブデータを読み込めませんでした。
            再読み込みをお試しください。
          </p>
          <button
            type="button"
            onClick={() => {
              const result =
                loadAkuukanSaveDataFromBrowser();

              saveRef.current = result.saveData;
              setLoaded(result);
            }}
          >
            読み込みを再試行
          </button>
        </>
      ) : (
        <>
          <label htmlFor="enemy-select">
            対戦相手
          </label>{" "}
          <select
            id="enemy-select"
            value={enemyId}
            onChange={event =>
              setEnemyId(event.target.value as EnemyId)
            }
          >
            {ENEMY_CATALOG.map(enemy => (
              <option
                key={enemy.id}
                value={enemy.id}
                disabled={
                  !loaded.saveData.enemyProgress
                    .enemies[enemy.id].isUnlocked
                }
              >
                {enemy.displayName}
                {loaded.saveData.enemyProgress
                  .enemies[enemy.id].isUnlocked
                  ? ""
                  : "（未解放）"}
              </option>
            ))}
          </select>

          <p>
            装備スキル：
            {loaded.saveData.equippedSkills.length} / 10
          </p>

          <button
            type="button"
            onClick={() => setEquipmentOpen(true)}
          >
            スキル装備を変更
          </button>

          {message && <p role="alert">{message}</p>}

          <button
            type="button"
            className="primary-button"
            onClick={start}
          >
            対局を開始
          </button>
        </>
      )}
    </main>
  );
}
