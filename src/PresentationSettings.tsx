import { useEffect, useRef, useState } from "react";
import { playGameSound, setGameSoundVolume, unlockGameAudio } from "./lib/gameAudio";
import {
  getRemoveAdsProductInfo,
  isAdPrivacyOptionsRequired,
  isNativeIOSApp,
  purchaseRemoveAds,
  restoreRemoveAdsPurchase,
  showAdPrivacyOptions,
  type RemoveAdsProductInfo
} from "./lib/monetization";

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
  const [removeAdsInfo, setRemoveAdsInfo] =
    useState<RemoveAdsProductInfo | null>(null);

  const [purchaseBusy, setPurchaseBusy] =
    useState(false);

  const [purchaseMessage, setPurchaseMessage] =
    useState("");
  const [adPrivacyOptionsAvailable, setAdPrivacyOptionsAvailable] =
    useState(false);
  const [adPrivacyBusy, setAdPrivacyBusy] =
    useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setGameSoundVolume(preferences.volume);

    /*
     * 「演出を控えめにする」設定は廃止したため、
     * 過去に保存された設定が残っていても通常演出へ戻す。
     */
    document.documentElement.dataset.motion = "full";
  }, [preferences.volume]);

  function update(next: Preferences) {
    setPreferences(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaveFailed(false);
    } catch { setSaveFailed(true); }
  } async function loadPurchaseInfo() {
    if (!isNativeIOSApp()) {
      return;
    }

    setPurchaseMessage("");

    try {
      const info =
        await getRemoveAdsProductInfo();

      setRemoveAdsInfo(info);
    } catch (error) {
      console.error(
        "[AKUUKAN-IAP] product info load failed",
        error
      );

      setPurchaseMessage(
        "商品情報を取得できませんでした。"
      );
    }
  }

  async function handleRemoveAdsPurchase() {
    if (purchaseBusy) {
      return;
    }

    setPurchaseBusy(true);
    setPurchaseMessage("");

    try {
      const purchased =
        await purchaseRemoveAds();

      if (purchased) {
        setRemoveAdsInfo(previous =>
          previous
            ? {
              ...previous,
              purchased: true
            }
            : previous
        );

        setPurchaseMessage(
          "広告を削除しました。"
        );
      }
    } catch (error) {
      console.error(
        "[AKUUKAN-IAP] purchase failed",
        error
      );

      setPurchaseMessage(
        "購入は完了しませんでした。"
      );
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function handleRestorePurchase() {
    if (purchaseBusy) {
      return;
    }

    setPurchaseBusy(true);
    setPurchaseMessage("");

    try {
      const restored =
        await restoreRemoveAdsPurchase();

      if (restored) {
        setRemoveAdsInfo(previous =>
          previous
            ? {
              ...previous,
              purchased: true
            }
            : previous
        );

        setPurchaseMessage(
          "広告削除の購入を復元しました。"
        );
      } else {
        setPurchaseMessage(
          "復元できる購入はありませんでした。"
        );
      }
    } catch (error) {
      console.error(
        "[AKUUKAN-IAP] restore failed",
        error
      );

      setPurchaseMessage(
        "購入情報を復元できませんでした。"
      );
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function loadAdPrivacyOptionsAvailability() {
    if (!isNativeIOSApp()) {
      return;
    }

    try {
      const required =
        await isAdPrivacyOptionsRequired();

      setAdPrivacyOptionsAvailable(required);
    } catch (error) {
      console.error(
        "[AKUUKAN-ADS] privacy options check failed",
        error
      );

      setAdPrivacyOptionsAvailable(false);
    }
  }

  async function handleAdPrivacyOptions() {
    if (adPrivacyBusy) {
      return;
    }

    setAdPrivacyBusy(true);

    try {
      await showAdPrivacyOptions();

      /*
       * フォームを閉じた後、現在の状態を再確認する。
       */
      const required =
        await isAdPrivacyOptionsRequired();

      setAdPrivacyOptionsAvailable(required);
    } catch (error) {
      console.error(
        "[AKUUKAN-ADS] privacy options failed",
        error
      );
    } finally {
      setAdPrivacyBusy(false);
    }
  }

  return (
    <>
      <button className="presentation-launcher" ref={trigger} type="button"
        aria-label="設定"
        onClick={() => {
          dialog.current?.showModal();

          if (!isNativeIOSApp()) {
            return;
          }

          if (removeAdsInfo === null) {
            void loadPurchaseInfo();
          }

          void loadAdPrivacyOptionsAvailability();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 17h16M9 4v6M16 14v6" /></svg>
        <span>設定</span>
      </button>
      <dialog className="presentation-dialog"
        ref={dialog} aria-labelledby="presentation-title"
        onClose={() => trigger.current?.focus()}>
        <form method="dialog">
          <header><div><span className="lobby-eyebrow">PREFERENCES</span><h2 id="presentation-title">設定</h2></div>
            <button type="submit" className="settings-close" aria-label="設定を閉じる">閉じる</button></header>
          <label className="settings-volume">効果音 <output>{Math.round(preferences.volume * 100)}%</output>
            <input aria-label="効果音の音量" type="range" min="0" max="100" step="5"
              value={Math.round(preferences.volume * 100)}
              onChange={e => update({ ...preferences, volume: Number(e.target.value) / 100 })} />
          </label>
          <button type="button" className="settings-preview" onClick={async () => {
            await unlockGameAudio(); playGameSound("drawTile");
          }}>音を確認</button>
          {isNativeIOSApp() && (
            <section
              className="settings-purchases"
              aria-label="広告と購入"
            >
              <h3>広告</h3>

              {removeAdsInfo === null ? (
                <p className="settings-note">
                  商品情報を読み込んでいます…
                </p>
              ) : removeAdsInfo.purchased ? (
                <p className="settings-purchase-owned">
                  広告削除を購入済みです。
                </p>
              ) : removeAdsInfo.available ? (
                <div className="settings-product-info">
                  <strong>
                    {removeAdsInfo.title}
                  </strong>

                  <span>
                    {removeAdsInfo.priceString}
                  </span>
                </div>
              ) : (
                <p className="settings-note">
                  商品情報を取得できませんでした。
                </p>
              )}

              <div className="settings-purchase-actions">
                <button
                  type="button"
                  disabled={
                    purchaseBusy ||
                    removeAdsInfo === null ||
                    !removeAdsInfo.available ||
                    removeAdsInfo.purchased
                  }
                  onClick={() => {
                    void handleRemoveAdsPurchase();
                  }}
                >
                  {removeAdsInfo?.purchased
                    ? "広告削除済み"
                    : "広告を削除"}
                </button>

                <button
                  type="button"
                  disabled={purchaseBusy}
                  onClick={() => {
                    void handleRestorePurchase();
                  }}
                >
                  購入を復元
                </button>
                {adPrivacyOptionsAvailable && (
                  <button
                    type="button"
                    className="settings-privacy-button"
                    disabled={adPrivacyBusy}
                    onClick={() => {
                      void handleAdPrivacyOptions();
                    }}
                  >
                    {adPrivacyBusy
                      ? "プライバシー設定を開いています…"
                      : "広告のプライバシー設定"}
                  </button>
                )}
              </div>

              {purchaseMessage && (
                <p
                  className="settings-purchase-status"
                  role="status"
                >
                  {purchaseMessage}
                </p>
              )}
            </section>
          )}
          {saveFailed && <p role="status">この端末に設定を保存できません。現在の画面には反映しています。</p>}
        </form>
      </dialog>
    </>
  );
}
