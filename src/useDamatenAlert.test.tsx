// @vitest-environment jsdom

import {
  StrictMode,
  type ReactNode
} from "react";
import {
  act,
  cleanup,
  renderHook
} from "@testing-library/react";
import {
  afterEach,
  expect,
  it,
  vi
} from "vitest";
import { useDamatenAlert } from "./useDamatenAlert";
import { playGameSound } from "./lib/gameAudio";

vi.mock("./lib/gameAudio", () => ({
  playGameSound: vi.fn()
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it("同じ察知では一度だけ鳴り、1.8秒で消灯して次の察知で再通知する", () => {
  vi.useFakeTimers();

  const { result, rerender } = renderHook(
    ({ sequence }) =>
      useDamatenAlert({
        sequence,
        playerIds: ["cpu-1"]
      }),
    {
      initialProps: { sequence: 1 },
      wrapper: ({
        children
      }: {
        children: ReactNode;
      }) => (
        <StrictMode>{children}</StrictMode>
      )
    }
  );

  expect(result.current).toEqual(["cpu-1"]);
  expect(playGameSound).toHaveBeenCalledTimes(1);

  rerender({ sequence: 1 });

  expect(playGameSound).toHaveBeenCalledTimes(1);

  act(() => {
    vi.advanceTimersByTime(1800);
  });

  expect(result.current).toEqual([]);

  rerender({ sequence: 2 });

  expect(result.current).toEqual(["cpu-1"]);
  expect(playGameSound).toHaveBeenCalledTimes(2);
});
