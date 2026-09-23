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

const IOS_TEST_BANNER_ID =
    "ca-app-pub-3940256099942544/2435281174";

const IOS_TEST_INTERSTITIAL_ID =
    "ca-app-pub-3940256099942544/4411468910";

let initialized = false;
let adsAllowed = false;
let bannerVisible = false;
let interstitialReady = false;
let preparedInterstitialAdId: string | null = null;
let interstitialListenersInstalled = false;

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

async function initializeAds(): Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    if (initialized) {
        return adsAllowed;
    }

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
                    consentInfo.isConsentFormAvailable
            }
        );

        adsAllowed = consentInfo.canRequestAds;
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
            adId: IOS_TEST_BANNER_ID,
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
            IOS_TEST_INTERSTITIAL_ID
        );

        const info =
            await AdMob.prepareInterstitial({
                adId: IOS_TEST_INTERSTITIAL_ID,
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