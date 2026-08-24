import {
  useEffect,
  useState
} from "react";
import { GameBoard } from "./GameBoard";
import "./styles.css";

type DeviceType =
  | "iphone"
  | "ipad"
  | "other";

function detectDeviceType(): DeviceType {
  const userAgent = navigator.userAgent;

  if (/iPhone|iPod/i.test(userAgent)) {
    return "iphone";
  }

  const isIPad =
    /iPad/i.test(userAgent) ||
    (
      /Macintosh/i.test(userAgent) &&
      navigator.maxTouchPoints > 1
    );

  if (isIPad) {
    return "ipad";
  }

  return "other";
}

function detectPortrait(): boolean {
  return window.matchMedia(
    "(orientation: portrait)"
  ).matches;
}

export default function App() {
  const [deviceType] = useState<DeviceType>(
    detectDeviceType
  );

  const [
    isPortrait,
    setIsPortrait
  ] = useState(detectPortrait);

  useEffect(() => {
    const orientationQuery =
      window.matchMedia(
        "(orientation: portrait)"
      );

    function updateOrientation() {
      setIsPortrait(
        orientationQuery.matches
      );
    }

    orientationQuery.addEventListener(
      "change",
      updateOrientation
    );

    window.addEventListener(
      "resize",
      updateOrientation
    );

    return () => {
      orientationQuery.removeEventListener(
        "change",
        updateOrientation
      );

      window.removeEventListener(
        "resize",
        updateOrientation
      );
    };
  }, []);

    const orientationMismatch =
    (
      deviceType === "iphone" ||
      deviceType === "ipad"
    ) &&
    isPortrait;

  const requiredOrientation = "landscape";

  const requiredOrientation =
    deviceType === "iphone"
      ? "portrait"
      : "landscape";

  return (
    <>
      <GameBoard />

      {orientationMismatch && (
        <div
          className="orientation-overlay"
          role="alert"
          aria-live="assertive"
        >
          <div className="orientation-card">
            <div
              className={
                `orientation-device ` +
                `orientation-device--${requiredOrientation}`
              }
              aria-hidden="true"
            >
              <span />
            </div>

            <strong>
              端末の向きを変更してください
            </strong>

            <p>
              iPhone・iPadは横向きでプレイします。
            </p>
          </div>
        </div>
      )}
    </>
  );
}
