import { ENEMY_NAMES, EnemyPortrait } from "./enemy-art/EnemyPortrait";
import { ENEMY_DESCRIPTIONS } from "./EnemyGuide";
import { PLAYER_SKILL_CATALOG } from "./lib/akuukan/playerSkillCatalog";
import { unlockGameAudio } from "./lib/gameAudio";
import { EnemyCatalog } from "./EnemyCatalog";
import { SkillCatalog } from "./SkillCatalog";
import { MatchGrowthResult } from "./MatchGrowthResult";
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import {
  hideTitleBanner,
  prepareMatchEndInterstitial,
  showTitleBanner
} from "./lib/monetization";
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
  const [enemyCatalogOpen, setEnemyCatalogOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [enemyId, setEnemyId] =
    useState<EnemyId>("enemy-1");
  const [initialState, setInitialState] =
    useState<GameState | null>(null);
  const [saveStatus, setSaveStatus] =
    useState<"idle" | "saved" | "failed">("idle");
  const [message, setMessage] = useState("");
  const [features, setFeatures] = useState(readFeatures);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [session, setSession] = useState<MatchSession | undefined>();
  const shouldShowMenuBanner =
    !initialState &&
    !balanceOpen;

  useEffect(() => {
    if (shouldShowMenuBanner) {
      void showTitleBanner();
      void prepareMatchEndInterstitial();
    } else {
      void hideTitleBanner();
    }

    return () => {
      void hideTitleBanner();
    };
  }, [shouldShowMenuBanner]);
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
      if (!updateFeatures(data => ({ ...data, resume: null }))) {
        setMessage("対局結果は保存済みですが、中断データを更新できませんでした。");
      }
      setFeatures(readFeatures());
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
    if (readFeatures().data.resume) {
      setMessage("中断中の対局を再開するか、破棄してから新しい対局を開始してください。");
      return;
    }
    void unlockGameAudio();
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
    setSession(createMatchSession());
    setInitialState(result.gameState);
  }

  const checkpoint = useCallback((state: GameState, currentSession: MatchSession) => {
    return updateFeatures(data => ({
      ...data, resume: {
        state, session: { ...currentSession, activations: { ...currentSession.activations } },
        savedAt: Date.now(), progressSignature: progressSignature(saveRef.current)
      }
    }));
  }, []);

  function resume() {
    const latest = readFeatures();
    const saved = latest.data.resume;
    if (!saved) { setMessage(latest.error || "中断データがありません。"); return; }
    const current = loadAkuukanSaveDataFromBrowser();
    if (current.failureReason || saved.progressSignature !== progressSignature(current.saveData) || latest.data.runs.some(r => r.id === saved.session.id)) {
      setMessage("成長データが更新されているため、この中断データは再開できません。破棄して新しい対局を開始してください。"); return;
    }
    void unlockGameAudio();
    saveRef.current = current.saveData;
    setLoaded(current);
    finishedRef.current = null;
    setSaveStatus("idle");
    setSession(saved.session);
    setInitialState(saved.state);
  }

  if (balanceOpen) return <BalanceDashboard onBack={() => setBalanceOpen(false)} />;

  if (enemyCatalogOpen) {
    return (
      <EnemyCatalog
        selectedEnemyId={enemyId}
        progress={loaded.saveData.enemyProgress}
        statistics={saveRef.current.statistics}
        onBack={() => setEnemyCatalogOpen(false)}
      />
    );
  }

  if (catalogOpen) {
    return (
      <SkillCatalog
        saveData={saveRef.current}
        onBack={() => setCatalogOpen(false)}
      />
    );
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
        featureSession={session}
        onCheckpoint={checkpoint}
        onSuspend={() => { setInitialState(null); setFeatures(readFeatures()); setMessage("対局を保存しました。"); }}
        onMatchEnd={handleMatchEnd}
        restartDisabled={saveStatus !== "saved"}
        onRestart={() => {
          if (saveStatus === "saved") {
            setInitialState(null);
          }
        }}
        matchSavePanel={
          <div aria-live="polite">
            <MatchGrowthResult
              settlement={
                finishedRef.current?.matchProgress?.settlement
              }
            />
            {message && <p role="status">{message}</p>}
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
    <main className="akuukan-lobby">
      <header className="akuukan-lobby-header">
        <span className="lobby-eyebrow">AKUUKAN MAHJONG</span>
        <h1>亜空間麻雀</h1>
        <div className="lobby-progress" aria-label="解放状況">
          <span>対戦相手 <b>{Object.values(loaded.saveData.enemyProgress.enemies).filter(e => e.isUnlocked).length}</b> / 16</span>
          <span>スキル <b>{PLAYER_SKILL_CATALOG.filter(s => loaded.saveData.playerSkillGrowth.skills[s.id].isUnlocked).length}</b> / 80</span>
        </div>
      </header>

      {features.error && <p role="alert">{features.error}</p>}
      {features.data.resume && <section className="feature-panel" aria-label="中断中の対局">
        <h2>中断中の対局</h2>
        <p>{ENEMY_NAMES[features.data.resume.state.akuukan!.setup.enemyId]} ／
          {features.data.resume.state.round.prevailingWind === "east" ? "東" : "南"}{features.data.resume.state.round.handNumber}局
          ・{new Date(features.data.resume.savedAt).toLocaleString("ja-JP")}</p>
        <div className="feature-actions"><button onClick={resume}>続きから再開</button>
          <button onClick={() => {
            if (updateFeatures(data => ({ ...data, resume: null }))) { setFeatures(readFeatures()); setMessage("中断対局を破棄しました。"); }
            else setMessage("中断データを破棄できませんでした。");
          }}>中断対局を破棄</button></div>
      </section>}
      <button onClick={() => setBalanceOpen(true)}>実戦バランス計測</button>

      {loaded.failureReason ? (
        <section className="akuukan-lobby-card">
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
        </section>
      ) : (
        <section
          className="akuukan-lobby-card"
          aria-label="対局の準備"
        >
          <div className="lobby-matchup">
            <aside className="lobby-opponent" aria-label="選択した対戦相手">
              <div className="lobby-portrait-stage" key={enemyId}>
                <EnemyPortrait enemyId={enemyId} size="hero" />
                <span className="lobby-portrait-caption">CHALLENGER</span>
              </div>
              <div className="lobby-opponent-copy" aria-live="polite">
                <span className="lobby-eyebrow">対戦相手</span>
                <h2>{ENEMY_NAMES[enemyId]}</h2>
                <p className="lobby-wins">勝利回数 <b>{loaded.saveData.enemyProgress.enemies[enemyId].firstPlaceCount}</b> 回</p>
                <ul>{ENEMY_DESCRIPTIONS[enemyId].map(text => <li key={text}>{text}</li>)}</ul>
              </div>
            </aside>
            <fieldset className="akuukan-enemy-picker">
              <legend>対戦相手を選択 <small>16 CHALLENGERS</small></legend>

              <div className="akuukan-enemy-buttons">
                {ENEMY_CATALOG.map(enemy => {
                  const unlocked =
                    loaded.saveData.enemyProgress
                      .enemies[enemy.id].isUnlocked;

                  return (
                    <button
                      key={enemy.id}
                      type="button"
                      className="akuukan-enemy-button"
                      disabled={!unlocked}
                      aria-pressed={enemyId === enemy.id}
                      aria-label={
                        `${ENEMY_NAMES[enemy.id]}${unlocked ? "" : "（未解放）"
                        }`
                      }
                      onClick={() => setEnemyId(enemy.id)}
                    >
                      <EnemyPortrait enemyId={enemy.id} size="roster" />
                      <span>{ENEMY_NAMES[enemy.id]}</span>

                      <small>
                        {!unlocked
                          ? "未解放"
                          : enemyId === enemy.id
                            ? "選択中"
                            : "挑戦可能"}
                      </small>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="lobby-dock">
            <div className="lobby-launch">
              <div>
                <p className="lobby-loadout">
                  装備スキル：
                  {loaded.saveData.equippedSkills.length} / 10
                </p>
                <span className="lobby-format">四人打ち・半荘戦・25,000点持ち</span>
              </div>

              <button
                type="button"
                className="akuukan-lobby-start"
                onClick={start}
              >
                対局を開始
              </button>
            </div>

            <div className="akuukan-lobby-actions akuukan-lobby-actions--three">
              <button
                type="button"
                onClick={() => setEquipmentOpen(true)}
              >
                装備スキル変更
              </button>

              <button
                type="button"
                onClick={() => setCatalogOpen(true)}
              >
                スキル図鑑
              </button>

              <button
                type="button"
                onClick={() => setEnemyCatalogOpen(true)}
              >
                敵図鑑
              </button>
            </div>

            {message && <p role="status">{message}</p>}
          </div>
        </section>
      )}
    </main>
  );
}
import { BalanceDashboard } from "./BalanceDashboard";
import { createMatchSession, progressSignature, readFeatures, updateFeatures, type MatchSession } from "./lib/gameFeatures";
import "./GameFeatures.css";
