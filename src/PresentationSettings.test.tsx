// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PresentationSettings } from "./PresentationSettings";
import { setGameSoundVolume } from "./lib/gameAudio";

vi.mock("./lib/gameAudio", () => ({
  setGameSoundVolume: vi.fn(),
  unlockGameAudio: vi.fn(async () => { }),
  playGameSound: vi.fn()
}));
const key = "mahjong-skill-game:presentation";
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); delete document.documentElement.dataset.motion; });

it("音量を保存し、開き直しても復元する", () => {
  const first = render(<PresentationSettings />);

  fireEvent.change(
    screen.getByRole("slider", { hidden: true }),
    {
      target: {
        value: "0"
      }
    }
  );

  expect(
    setGameSoundVolume
  ).toHaveBeenLastCalledWith(0);

  expect(
    document.documentElement.dataset.motion
  ).toBe("full");

  first.unmount();

  render(<PresentationSettings />);

  expect(
    (
      screen.getByRole(
        "slider",
        { hidden: true }
      ) as HTMLInputElement
    ).value
  ).toBe("0");
});

it("壊れた設定を読んでも操作でき、保存エラーを通知する", () => {
  localStorage.setItem(key, "broken");
  render(<PresentationSettings />);
  expect(setGameSoundVolume).toHaveBeenLastCalledWith(.65);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("storage blocked"); });
  fireEvent.change(screen.getByRole("slider", { hidden: true }), { target: { value: "25" } });
  expect(setGameSoundVolume).toHaveBeenLastCalledWith(.25);
  expect(screen.getByText(/この端末に設定を保存できません/)).toBeTruthy();
});
