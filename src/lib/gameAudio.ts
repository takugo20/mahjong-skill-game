export type GameSound =
  | "drawTile"
  | "discardTile"
  | "chi"
  | "pon"
  | "kan"
  | "riichi"
  | "riichiStick"
  | "tsumo"
  | "ron"
  | "roundDraw"
  | "matchEnd";

interface SoundTone {
  frequency: number;
  duration: number;
  volume: number;
  wave: OscillatorType;
  delay: number;
  endFrequency?: number;
}

type AudioContextConstructor =
  new () => AudioContext;

function tone(
  frequency: number,
  duration: number,
  volume: number,
  wave: OscillatorType = "triangle",
  delay = 0,
  endFrequency?: number
): SoundTone {
  return {
    frequency,
    duration,
    volume,
    wave,
    delay,
    endFrequency
  };
}

const SOUND_PATTERNS:
  Record<GameSound, readonly SoundTone[]> = {
    drawTile: [
      tone(420, 0.055, 0.12, "triangle", 0, 260)
    ],
    discardTile: [
      tone(210, 0.07, 0.1, "square", 0, 105)
    ],
    chi: [
      tone(620, 0.09, 0.11, "triangle", 0, 760),
      tone(830, 0.12, 0.12, "triangle", 0.075)
    ],
    pon: [
      tone(420, 0.1, 0.1, "square"),
      tone(315, 0.13, 0.14, "triangle", 0.08)
    ],
    kan: [
      tone(300, 0.11, 0.11, "square"),
      tone(210, 0.15, 0.15, "triangle", 0.085)
    ],
    riichi: [
      tone(520, 0.1, 0.12, "triangle", 0, 680),
      tone(780, 0.15, 0.15, "sine", 0.085)
    ],
    riichiStick: [
      tone(1180, 0.045, 0.09, "square", 0, 720)
    ],
    tsumo: [
      tone(520, 0.13, 0.12),
      tone(660, 0.15, 0.14, "triangle", 0.1),
      tone(880, 0.2, 0.16, "sine", 0.21)
    ],
    ron: [
      tone(220, 0.14, 0.12, "square"),
      tone(440, 0.18, 0.16, "triangle", 0.09),
      tone(660, 0.22, 0.17, "sine", 0.2)
    ],
    roundDraw: [
      tone(440, 0.18, 0.11),
      tone(330, 0.2, 0.12, "triangle", 0.14),
      tone(220, 0.24, 0.14, "sine", 0.3)
    ],
    matchEnd: [
      tone(392, 0.18, 0.1),
      tone(523, 0.2, 0.12, "triangle", 0.14),
      tone(784, 0.28, 0.15, "sine", 0.29)
    ]
  };

let audioContext: AudioContext | null = null;

function getAudioContextConstructor():
  AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const audioWindow = window as Window & {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?:
      AudioContextConstructor;
  };

  return (
    audioWindow.AudioContext ??
    audioWindow.webkitAudioContext ??
    null
  );
}

function getAudioContext(): AudioContext | null {
  if (audioContext?.state === "closed") {
    audioContext = null;
  }

  if (audioContext) {
    return audioContext;
  }

  const AudioContextClass =
    getAudioContextConstructor();

  if (!AudioContextClass) {
    return null;
  }

  try {
    audioContext = new AudioContextClass();
  } catch {
    audioContext = null;
  }

  return audioContext;
}

function scheduleTone(
  context: AudioContext,
  soundStartTime: number,
  soundTone: SoundTone
): void {
  const oscillator =
    context.createOscillator();
  const gain = context.createGain();
  const startTime =
    soundStartTime + soundTone.delay;
  const attackEndTime = Math.min(
    startTime + 0.008,
    startTime + soundTone.duration / 2
  );
  const endTime =
    startTime + soundTone.duration;

  oscillator.type = soundTone.wave;
  oscillator.frequency.setValueAtTime(
    soundTone.frequency,
    startTime
  );

  if (soundTone.endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      soundTone.endFrequency,
      endTime
    );
  }

  gain.gain.setValueAtTime(
    0.0001,
    startTime
  );
  gain.gain.exponentialRampToValueAtTime(
    soundTone.volume,
    attackEndTime
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    endTime
  );

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.01);
}

function scheduleSound(
  context: AudioContext,
  sound: GameSound
): void {
  const soundStartTime =
    context.currentTime + 0.005;

  SOUND_PATTERNS[sound].forEach(
    (soundTone) => {
      scheduleTone(
        context,
        soundStartTime,
        soundTone
      );
    }
  );
}

export async function unlockGameAudio():
  Promise<void> {
  const context = getAudioContext();

  if (!context || context.state === "running") {
    return;
  }

  try {
    await context.resume();
  } catch {
    // 次のユーザー操作で再度有効化する。
  }
}

export function playGameSound(
  sound: GameSound
): void {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "running") {
    scheduleSound(context, sound);
    return;
  }

  void context
    .resume()
    .then(() => {
      if (context.state === "running") {
        scheduleSound(context, sound);
      }
    })
    .catch(() => {
      // 次のユーザー操作で再度有効化する。
    });
}
