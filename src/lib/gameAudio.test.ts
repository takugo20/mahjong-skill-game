// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

let initialContextState:
  AudioContextState = "running";

const frequencySetValueAtTime = vi.fn();
const frequencyRampToValueAtTime = vi.fn();
const gainSetValueAtTime = vi.fn();
const gainRampToValueAtTime = vi.fn();
const oscillatorConnect = vi.fn();
const oscillatorStart = vi.fn();
const oscillatorStop = vi.fn();
const gainConnect = vi.fn();

class FakeAudioContext {
  state: AudioContextState;
  currentTime = 1;
  destination = {};

  resume = vi.fn(async () => {
    this.state = "running";
  });

  createOscillator = vi.fn(() => ({
    type: "sine" as OscillatorType,
    frequency: {
      setValueAtTime:
        frequencySetValueAtTime,
      exponentialRampToValueAtTime:
        frequencyRampToValueAtTime
    },
    connect: oscillatorConnect,
    start: oscillatorStart,
    stop: oscillatorStop
  }));

  createGain = vi.fn(() => ({
    gain: {
      setValueAtTime:
        gainSetValueAtTime,
      exponentialRampToValueAtTime:
        gainRampToValueAtTime
    },
    connect: gainConnect
  }));

  constructor() {
    this.state = initialContextState;
    fakeAudioContexts.push(this);
  }
}

const fakeAudioContexts:
  FakeAudioContext[] = [];

function installAudioContext(
  state: AudioContextState = "running"
): void {
  initialContextState = state;
  vi.stubGlobal(
    "AudioContext",
    FakeAudioContext
  );
}

function installWebkitAudioContext(
  state: AudioContextState = "suspended"
): void {
  initialContextState = state;
  vi.stubGlobal("AudioContext", undefined);

  Object.defineProperty(
    window,
    "webkitAudioContext",
    {
      configurable: true,
      value: FakeAudioContext
    }
  );
}

describe("ゲーム効果音", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fakeAudioContexts.length = 0;
    initialContextState = "running";
    vi.stubGlobal("AudioContext", undefined);
    Reflect.deleteProperty(
      window,
      "webkitAudioContext"
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(
      window,
      "webkitAudioContext"
    );
  });

  it("音声非対応環境では何もせず終了する", async () => {
    const {
      playGameSound,
      unlockGameAudio
    } = await import("./gameAudio");

    expect(() => {
      playGameSound("pon");
    }).not.toThrow();
    await expect(
      unlockGameAudio()
    ).resolves.toBeUndefined();
    expect(fakeAudioContexts).toHaveLength(0);
  });

  it("初回操作で停止中の音声を再開する", async () => {
    installAudioContext("suspended");

    const {
      unlockGameAudio
    } = await import("./gameAudio");

    await unlockGameAudio();

    expect(fakeAudioContexts).toHaveLength(1);
    expect(
      fakeAudioContexts[0].resume
    ).toHaveBeenCalledTimes(1);
    expect(
      fakeAudioContexts[0].state
    ).toBe("running");
  });

  it("iPad向けのwebkitAudioContextにも対応する", async () => {
    installWebkitAudioContext();

    const {
      unlockGameAudio
    } = await import("./gameAudio");

    await unlockGameAudio();

    expect(fakeAudioContexts).toHaveLength(1);
    expect(
      fakeAudioContexts[0].resume
    ).toHaveBeenCalledTimes(1);
  });

  it("稼働中なら指定した効果音を構成する", async () => {
    installAudioContext();

    const {
      playGameSound
    } = await import("./gameAudio");

    playGameSound("discardTile");

    const context = fakeAudioContexts[0];

    expect(
      context.createOscillator
    ).toHaveBeenCalledTimes(1);
    expect(
      context.createGain
    ).toHaveBeenCalledTimes(1);
    expect(
      frequencySetValueAtTime
    ).toHaveBeenCalledWith(210, 1.005);
    expect(oscillatorStart)
      .toHaveBeenCalledWith(1.005);
    expect(oscillatorStop)
      .toHaveBeenCalledTimes(1);
    expect(oscillatorConnect)
      .toHaveBeenCalledTimes(1);
    expect(gainConnect)
      .toHaveBeenCalledTimes(1);
  });

  it("停止中の再生要求は再開後に実行する", async () => {
    installAudioContext("suspended");

    const {
      playGameSound
    } = await import("./gameAudio");

    playGameSound("chi");

    const context = fakeAudioContexts[0];

    expect(context.resume)
      .toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(
        context.createOscillator
      ).toHaveBeenCalledTimes(2);
    });
  });
});
