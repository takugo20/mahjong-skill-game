// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import type { ReactNode } from "react";
import type { GameState } from "./lib/mahjong/types";
import {
  startNextRound
} from "./lib/mahjong/engine";
import {
  createInitialAkuukanSaveData
} from "./lib/akuukan/saveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY as KEY
} from "./lib/akuukan/saveDataStorage";
import { AkuukanGame } from "./AkuukanGame";

vi.mock("./GameBoard", () => ({
  GameBoard: (props: {
    initialState: GameState;
    onMatchEnd: (state: GameState) => void;
    onRestart: () => void;
    restartDisabled: boolean;
    matchSavePanel: ReactNode;
  }) => (
    <>
      <button
        onClick={() => {
          const state = structuredClone(
            props.initialState
          );

          state.round.phase = "roundEnd";
          state.round.players.forEach((player, index) => {
            player.score = [
              40000, 30000, 30100, -100
            ][index];
          });

          props.onMatchEnd(
            startNextRound(state, () => 0.5)
          );
        }}
      >
        対局終了テスト
      </button>

      {props.matchSavePanel}

      <button
        disabled={props.restartDisabled}
        onClick={props.onRestart}
      >
        戻る
      </button>
    </>
  )
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...createInitialAkuukanSaveData(),
      equippedSkills: [{ id: "1-1", level: 1 }]
    })
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function startAndFinish() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "対局を開始"
    })
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "対局終了テスト"
    })
  );
}

describe("亜空間麻雀の開始・保存画面", () => {
  it("終了結果を保存して次の対局へ進める", () => {
    render(<AkuukanGame />);

    const lockedEnemy = screen.getByRole("option", {
      name: "敵2（未解放）"
    }) as HTMLOptionElement;

    expect(lockedEnemy.disabled).toBe(true);

    startAndFinish();

    expect(
      screen.getByText("成長・解放結果を保存しました。")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "戻る" })
    );

    startAndFinish();

    const saved = JSON.parse(
      localStorage.getItem(KEY)!
    );

    expect(
      saved.playerSkillGrowth.skills["1-1"].currentExp
    ).toBe(1000);
    expect(
      saved.enemyProgress.enemies["enemy-1"]
        .firstPlaceCount
    ).toBe(2);
  });

  it("保存失敗中は戻れず、再試行しても二重加算しない", () => {
    const previous = localStorage.getItem(KEY);

    vi.spyOn(
      Storage.prototype,
      "setItem"
    ).mockImplementationOnce(() => {
      throw new Error("保存失敗");
    });

    render(<AkuukanGame />);
    startAndFinish();

    const backButton = screen.getByRole("button", {
      name: "戻る"
    }) as HTMLButtonElement;

    expect(backButton.disabled).toBe(true);
    expect(localStorage.getItem(KEY)).toBe(previous);

    fireEvent.click(
      screen.getByRole("button", {
        name: "保存を再試行"
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "対局終了テスト"
      })
    );

    const saved = JSON.parse(
      localStorage.getItem(KEY)!
    );

    expect(
      saved.playerSkillGrowth.skills["1-1"].currentExp
    ).toBe(500);
    expect(
      saved.enemyProgress.enemies["enemy-1"]
        .firstPlaceCount
    ).toBe(1);

    expect(
      (
        screen.getByRole("button", {
          name: "戻る"
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it("読み込み失敗時は上書きせず、読み込みを再試行できる", () => {
    const previous = localStorage.getItem(KEY)!;
    localStorage.setItem(KEY, "broken");

    render(<AkuukanGame />);

    expect(
      screen.queryByRole("button", {
        name: "対局を開始"
      })
    ).toBeNull();
    expect(localStorage.getItem(KEY)).toBe("broken");

    localStorage.setItem(KEY, previous);

    fireEvent.click(
      screen.getByRole("button", {
        name: "読み込みを再試行"
      })
    );

    expect(
      screen.getByRole("button", {
        name: "対局を開始"
      })
    ).toBeTruthy();
  });
});
