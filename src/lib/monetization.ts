import { Capacitor } from "@capacitor/core";
import {
    AdMob,
    AdmobConsentStatus,
    BannerAdPluginEvents,
    BannerAdPosition,
    BannerAdSize,
    InterstitialAdPluginEvents,
    type AdMobBannerSize
} from "@capacitor-community/admob";
import {
    NativePurchases,
    PURCHASE_TYPE
} from "@capgo/native-purchases";

const IOS_BANNER_ID =
    "ca-app-pub-3940256099942544/2435281174";

const IOS_INTERSTITIAL_ID =
    "ca-app-pub-3940256099942544/4411468910";

export const REMOVE_ADS_PRODUCT_ID =
    "com.takugo20.akuukanmahjong.removeads";

export interface RemoveAdsProductInfo {
    available: boolean;
    purchased: boolean;
    title: string;
    priceString: string;
}

let initialized = false;
let adsAllowed = false;
let privacyOptionsRequired = false;
let bannerVisible = false;
let interstitialReady = false;
let preparedInterstitialAdId: string | null = null;
let interstitialListenersInstalled = false;
let adsRemoved = false;
let purchaseStateInitialized = false;
let adInitializationPromise:
    Promise<boolean> | null = null;

let purchaseStatePromise:
    Promise<boolean> | null = null;

let productInfoPromise:
    Promise<RemoveAdsProductInfo> | null = null;

let bannerSizeListenerInstalled = false;

function setTitleBannerInset(height: number): void {
    const root = document.documentElement;

    if (height > 0) {
        root.style.setProperty(
            "--title-banner-height",
            `${Math.ceil(height)}px`
        );

        root.style.setProperty(
            "--title-banner-dialog-shift",
            `${Math.ceil(height / 2)}px`
        );

        root.dataset.titleBanner = "visible";
    } else {
        root.style.removeProperty(
            "--title-banner-height"
        );

        root.style.removeProperty(
            "--title-banner-dialog-shift"
        );

        delete root.dataset.titleBanner;
    }
}

async function ensureBannerSizeListener():
    Promise<void> {
    if (
        !isNativeIOS() ||
        bannerSizeListenerInstalled
    ) {
        return;
    }

    try {
        await AdMob.addListener(
            BannerAdPluginEvents.SizeChanged,
            (size: AdMobBannerSize) => {
                setTitleBannerInset(size.height);
            }
        );

        bannerSizeListenerInstalled = true;
    } catch (error) {
        console.error(
            "Banner size listener failed:",
            error
        );
    }
}

function isNativeIOS(): boolean {
    return (
        Capacitor.isNativePlatform() &&
        Capacitor.getPlatform() === "ios"
    );
}

async function ensureInterstitialDebugListeners():
    Promise<void> {
    if (
        !isNativeIOS() ||
        interstitialListenersInstalled
    ) {
        return;
    }

    await AdMob.addListener(
        InterstitialAdPluginEvents.Loaded,
        info => {
            console.log(
                "[AKUUKAN-ADS] interstitial Loaded",
                info
            );
        }
    );

    await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToLoad,
        error => {
            console.error(
                "[AKUUKAN-ADS] interstitial FailedToLoad",
                {
                    code: error.code,
                    message: error.message
                }
            );
        }
    );

    await AdMob.addListener(
        InterstitialAdPluginEvents.Showed,
        () => {
            console.log(
                "[AKUUKAN-ADS] interstitial Showed"
            );
        }
    );

    await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToShow,
        error => {
            console.error(
                "[AKUUKAN-ADS] interstitial FailedToShow",
                {
                    code: error.code,
                    message: error.message
                }
            );
        }
    );

    await AdMob.addListener(
        InterstitialAdPluginEvents.AdImpression,
        data => {
            console.log(
                "[AKUUKAN-ADS] interstitial AdImpression",
                data
            );
        }
    );

    await AdMob.addListener(
        InterstitialAdPluginEvents.Dismissed,
        () => {
            console.log(
                "[AKUUKAN-ADS] interstitial Dismissed"
            );
        }
    );

    interstitialListenersInstalled = true;

    console.log(
        "[AKUUKAN-ADS] interstitial listeners installed"
    );
}

export function isNativeIOSApp(): boolean {
    return isNativeIOS();
}

async function queryRemoveAdsEntitlement():
    Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    const billing =
        await NativePurchases.isBillingSupported();

    if (!billing.isBillingSupported) {
        return false;
    }

    const { purchases } =
        await NativePurchases.getPurchases({
            productType: PURCHASE_TYPE.INAPP,
            onlyCurrentEntitlements: true
        });

    return purchases.some(
        purchase =>
            purchase.productIdentifier ===
            REMOVE_ADS_PRODUCT_ID &&
            !purchase.revocationDate
    );
}

async function initializePurchaseState():
    Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    if (purchaseStateInitialized) {
        return adsRemoved;
    }

    if (purchaseStatePromise) {
        return purchaseStatePromise;
    }

    purchaseStatePromise = (async () => {
        try {
            adsRemoved =
                await queryRemoveAdsEntitlement();

            purchaseStateInitialized = true;

            console.log(
                "[AKUUKAN-IAP] purchase state",
                {
                    adsRemoved
                }
            );

            return adsRemoved;
        } catch (error) {
            console.error(
                "[AKUUKAN-IAP] purchase state check failed",
                error
            );

            /*
             * StoreKitの確認に失敗しただけで
             * アプリ自体を止めない。
             */
            adsRemoved = false;
            purchaseStateInitialized = true;

            return false;
        } finally {
            purchaseStatePromise = null;
        }
    })();

    return purchaseStatePromise;
}

async function disableAdsAfterPurchase():
    Promise<void> {
    adsRemoved = true;
    purchaseStateInitialized = true;

    /*
     * すでに読み込んである全画面広告も
     * 今後表示させない。
     */
    interstitialReady = false;
    preparedInterstitialAdId = null;

    /*
     * 現在表示中のバナーも即座に消す。
     */
    await hideTitleBanner();
}

export async function refreshRemoveAdsStatus():
    Promise<boolean> {
    purchaseStateInitialized = false;

    const purchased =
        await initializePurchaseState();

    if (purchased) {
        await disableAdsAfterPurchase();
    }

    return purchased;
}

export async function getRemoveAdsProductInfo():
    Promise<RemoveAdsProductInfo> {
    if (!isNativeIOS()) {
        return {
            available: false,
            purchased: false,
            title: "広告を削除",
            priceString: ""
        };
    }

    if (productInfoPromise) {
        return productInfoPromise;
    }

    productInfoPromise = (async () => {
        const purchased =
            await initializePurchaseState();

        try {
            const billing =
                await NativePurchases
                    .isBillingSupported();

            if (!billing.isBillingSupported) {
                return {
                    available: false,
                    purchased,
                    title: "広告を削除",
                    priceString: ""
                };
            }

            const { product } =
                await NativePurchases.getProduct({
                    productIdentifier:
                        REMOVE_ADS_PRODUCT_ID,
                    productType:
                        PURCHASE_TYPE.INAPP
                });

            console.log(
                "[AKUUKAN-IAP] product loaded",
                {
                    identifier:
                        product.identifier,
                    title:
                        product.title,
                    priceString:
                        product.priceString
                }
            );

            return {
                available: true,
                purchased,
                title: product.title,
                priceString:
                    product.priceString
            };
        } catch (error) {
            console.error(
                "[AKUUKAN-IAP] product load failed",
                error
            );

            return {
                available: false,
                purchased,
                title: "広告を削除",
                priceString: ""
            };
        }
    })();

    try {
        return await productInfoPromise;
    } finally {
        productInfoPromise = null;
    }
}

export async function purchaseRemoveAds():
    Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    const billing =
        await NativePurchases.isBillingSupported();

    if (!billing.isBillingSupported) {
        throw new Error(
            "この端末ではアプリ内課金を利用できません。"
        );
    }

    console.log(
        "[AKUUKAN-IAP] purchase start",
        REMOVE_ADS_PRODUCT_ID
    );

    const transaction =
        await NativePurchases.purchaseProduct({
            productIdentifier:
                REMOVE_ADS_PRODUCT_ID,
            productType:
                PURCHASE_TYPE.INAPP,
            quantity: 1
        });

    console.log(
        "[AKUUKAN-IAP] purchase completed",
        {
            productIdentifier:
                transaction.productIdentifier,
            transactionId:
                transaction.transactionId,
            revocationDate:
                transaction.revocationDate
        }
    );

    if (
        transaction.productIdentifier !==
        REMOVE_ADS_PRODUCT_ID ||
        transaction.revocationDate
    ) {
        throw new Error(
            "広告削除の購入を確認できませんでした。"
        );
    }

    await disableAdsAfterPurchase();

    return true;
}

export async function restoreRemoveAdsPurchase():
    Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    console.log(
        "[AKUUKAN-IAP] restore start"
    );

    await NativePurchases.restorePurchases();

    const purchased =
        await refreshRemoveAdsStatus();

    console.log(
        "[AKUUKAN-IAP] restore completed",
        {
            purchased
        }
    );

    return purchased;
}

async function initializeAds(): Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    const removeAdsPurchased =
        await initializePurchaseState();

    if (removeAdsPurchased) {
        console.log(
            "[AKUUKAN-ADS] ads skipped: remove ads purchased"
        );

        return false;
    }

    if (initialized) {
        return adsAllowed;
    }

    /*
     * バナーと全画面広告から同時に呼ばれても、
     * AdMob初期化は1回だけ実行する。
     */
    if (adInitializationPromise) {
        return adInitializationPromise;
    }

    adInitializationPromise = (async () => {
        console.log(
            "[AKUUKAN-ADS] initializeAds start"
        );

        try {
            await AdMob.initialize();

            console.log(
                "[AKUUKAN-ADS] AdMob.initialize completed"
            );

            await ensureInterstitialDebugListeners();

            let consentInfo =
                await AdMob.requestConsentInfo();

            if (
                consentInfo.isConsentFormAvailable &&
                consentInfo.status ===
                AdmobConsentStatus.REQUIRED
            ) {
                consentInfo =
                    await AdMob.showConsentForm();
            }

            console.log(
                "[AKUUKAN-ADS] consent result",
                {
                    status: consentInfo.status,
                    canRequestAds: consentInfo.canRequestAds,
                    isConsentFormAvailable:
                        consentInfo.isConsentFormAvailable,
                    privacyOptionsRequirementStatus:
                        consentInfo
                            .privacyOptionsRequirementStatus
                }
            );

            adsAllowed = consentInfo.canRequestAds;

            privacyOptionsRequired =
                consentInfo.privacyOptionsRequirementStatus ===
                "REQUIRED";

            initialized = true;

            return adsAllowed;
        } catch (error) {
            console.error(
                "AdMob initialization failed:",
                error
            );

            initialized = true;
            adsAllowed = false;

            return false;
        } finally {
            adInitializationPromise = null;
        }
    })();

    return adInitializationPromise;
}

export async function isAdPrivacyOptionsRequired():
    Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    await initializeAds();

    return privacyOptionsRequired;
}

export async function showAdPrivacyOptions():
    Promise<void> {
    if (!isNativeIOS()) {
        return;
    }

    await initializeAds();

    if (!privacyOptionsRequired) {
        console.log(
            "[AKUUKAN-ADS] privacy options not required"
        );
        return;
    }

    console.log(
        "[AKUUKAN-ADS] show privacy options"
    );

    await AdMob.showPrivacyOptionsForm();

    /*
     * ユーザーが広告設定を変更した可能性があるため、
     * 最新の同意状態を取得し直す。
     */
    const consentInfo =
        await AdMob.requestConsentInfo();

    adsAllowed =
        consentInfo.canRequestAds;

    privacyOptionsRequired =
        consentInfo.privacyOptionsRequirementStatus ===
        "REQUIRED";

    console.log(
        "[AKUUKAN-ADS] privacy options updated",
        {
            canRequestAds:
                consentInfo.canRequestAds,
            privacyOptionsRequirementStatus:
                consentInfo
                    .privacyOptionsRequirementStatus
        }
    );

    /*
     * 設定変更後に広告を要求できなくなった場合は、
     * 表示中のバナーも消す。
     */
    if (!adsAllowed) {
        await hideTitleBanner();
    }
}

export async function showTitleBanner():
    Promise<void> {
    if (!isNativeIOS() || bannerVisible) {
        return;
    }

    const canShow = await initializeAds();

    if (!canShow) {
        return;
    }

    try {
        await ensureBannerSizeListener();

        /*
         * SizeChangedが返ってくるまでの一瞬も
         * タイトルが広告の下に入らないよう、
         * 仮の高さを確保する。
         */
        setTitleBannerInset(60);

        await AdMob.showBanner({
            adId: IOS_BANNER_ID,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.TOP_CENTER,
            margin: 0,
            isTesting: true
        });

        bannerVisible = true;
    } catch (error) {
        setTitleBannerInset(0);

        console.error(
            "Banner ad failed:",
            error
        );
    }
}

export async function hideTitleBanner():
    Promise<void> {
    if (!isNativeIOS()) {
        return;
    }

    if (!bannerVisible) {
        setTitleBannerInset(0);
        return;
    }

    try {
        await AdMob.removeBanner();
    } catch (error) {
        console.error(
            "Banner removal failed:",
            error
        );
    } finally {
        bannerVisible = false;
        setTitleBannerInset(0);
    }
}

export async function prepareMatchEndInterstitial():
    Promise<void> {
    console.log(
        "[AKUUKAN-ADS] prepareMatchEndInterstitial called",
        {
            nativeIOS: isNativeIOS(),
            interstitialReady
        }
    );

    if (!isNativeIOS()) {
        console.log(
            "[AKUUKAN-ADS] prepare skipped: not native iOS"
        );
        return;
    }

    if (interstitialReady) {
        console.log(
            "[AKUUKAN-ADS] prepare skipped: already ready",
            preparedInterstitialAdId
        );
        return;
    }

    const canShow = await initializeAds();

    console.log(
        "[AKUUKAN-ADS] prepare consent check",
        {
            canShow
        }
    );

    if (!canShow) {
        console.log(
            "[AKUUKAN-ADS] prepare aborted: ads not allowed"
        );
        return;
    }

    try {
        console.log(
            "[AKUUKAN-ADS] prepareInterstitial start",
            IOS_INTERSTITIAL_ID
        );

        const info =
            await AdMob.prepareInterstitial({
                adId: IOS_INTERSTITIAL_ID,
                isTesting: true
            });

        preparedInterstitialAdId =
            info.adUnitId;

        interstitialReady = true;

        console.log(
            "[AKUUKAN-ADS] prepareInterstitial resolved",
            {
                adUnitId:
                    preparedInterstitialAdId
            }
        );
    } catch (error) {
        interstitialReady = false;
        preparedInterstitialAdId = null;

        console.error(
            "[AKUUKAN-ADS] prepareInterstitial threw",
            error
        );
    }
}

export async function showMatchEndInterstitial():
    Promise<void> {
    console.log(
        "[AKUUKAN-ADS] showMatchEndInterstitial called",
        {
            nativeIOS: isNativeIOS(),
            interstitialReady,
            preparedInterstitialAdId
        }
    );

    if (!isNativeIOS()) {
        console.log(
            "[AKUUKAN-ADS] show skipped: not native iOS"
        );
        return;
    }

    if (await initializePurchaseState()) {
        console.log(
            "[AKUUKAN-ADS] show skipped: ads removed"
        );

        return;
    }

    if (!interstitialReady) {
        console.log(
            "[AKUUKAN-ADS] ad not ready; preparing now"
        );

        await prepareMatchEndInterstitial();
    }

    if (
        !interstitialReady ||
        !preparedInterstitialAdId
    ) {
        console.error(
            "[AKUUKAN-ADS] show aborted: interstitial unavailable",
            {
                interstitialReady,
                preparedInterstitialAdId
            }
        );

        return;
    }

    try {
        console.log(
            "[AKUUKAN-ADS] showInterstitial start",
            preparedInterstitialAdId
        );

        await AdMob.showInterstitial({
            adId: preparedInterstitialAdId
        });

        console.log(
            "[AKUUKAN-ADS] showInterstitial promise resolved"
        );
    } catch (error) {
        console.error(
            "[AKUUKAN-ADS] showInterstitial threw",
            error
        );
    } finally {
        interstitialReady = false;
        preparedInterstitialAdId = null;

        console.log(
            "[AKUUKAN-ADS] interstitial state reset"
        );

        void prepareMatchEndInterstitial();
    }
}