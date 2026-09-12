import {
  useEffect,
  useRef,
  useState
} from "react";
import type {
  GameState
} from "./lib/mahjong/types";
import {
  playGameSound
} from "./lib/gameAudio";

export function useDamatenAlert(
  event: GameState["damatenAlert"]
) {
  const seen = useRef<number | null>(null);

  const [active, setActive] =
    useState<GameState["damatenAlert"]>();

  useEffect(() => {
    if (!event) {
      seen.current = null;
      setActive(undefined);
      return;
    }

    if (seen.current === event.sequence) return;

    seen.current = event.sequence;
    setActive(event);
    playGameSound("damatenAlert");
  }, [event]);

  useEffect(() => {
    if (!active) return;

    const timer = window.setTimeout(
      () => setActive(undefined),
      1800
    );

    return () => window.clearTimeout(timer);
  }, [active]);

  return active?.playerIds ?? [];
}
