import { Capacitor } from "@capacitor/core";
import {
    AdMob,
    AdmobConsentStatus,
    BannerAdPluginEvents,
    BannerAdPosition,
    BannerAdSize,
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

async function initializeAds(): Promise<boolean> {
    if (!isNativeIOS()) {
        return false;
    }

    if (initialized) {
        return adsAllowed;
    }

    try {
        await AdMob.initialize();

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
    if (!isNativeIOS() || interstitialReady) {
        return;
    }

    const canShow = await initializeAds();

    if (!canShow) {
        return;
    }

    try {
        await AdMob.prepareInterstitial({
            adId: IOS_TEST_INTERSTITIAL_ID,
            isTesting: true
        });

        interstitialReady = true;
    } catch (error) {
        interstitialReady = false;

        console.error(
            "Interstitial preparation failed:",
            error
        );
    }
}

export async function showMatchEndInterstitial():
    Promise<void> {
    if (!isNativeIOS()) {
        return;
    }

    if (!interstitialReady) {
        await prepareMatchEndInterstitial();
    }

    if (!interstitialReady) {
        return;
    }

    try {
        await AdMob.showInterstitial({
            adId: IOS_TEST_INTERSTITIAL_ID
        });
    } catch (error) {
        console.error(
            "Interstitial display failed:",
            error
        );
    } finally {
        interstitialReady = false;

        void prepareMatchEndInterstitial();
    }
}