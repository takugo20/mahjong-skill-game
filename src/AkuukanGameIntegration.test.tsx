// @vitest-environment jsdom

import { StrictMode } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  expect,
  it,
  vi
} from "vitest";
import { AkuukanGame } from "./AkuukanGame";
import {
  startNextRound
} from "./lib/mahjong/engine";
import * as matchStart from "./lib/akuukan/saveDataMatchStart";
import {
  createInitialAkuukanSaveData
} from "./lib/akuukan/saveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY as KEY
} from "./lib/akuukan/saveDataStorage";

beforeEach(() => {
  localStorage.clear();

  const save = createInitialAkuukanSaveData();

  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...save,
      equippedSkills: [{ id: "1-1", level: 1 }],
      playerSkillGrowth: {
        ...save.playerSkillGrowth,
        skills: {
          ...save.playerSkillGrowth.skills,
          "1-1": {
            isUnlocked: true,
            level: 1,
            currentExp: 5900
          }
        }
      },
      enemyProgress: {
        enemies: {
          ...save.enemyProgress.enemies,
          "enemy-1": {
            isUnlocked: true,
            firstPlaceCount: 2
          }
        }
      }
    })
  );

  const original =
    matchStart.tryStartAkuukanMatchFromSaveData;

  vi.spyOn(
    matchStart,
    "tryStartAkuukanMatchFromSaveData"
  ).mockImplementation((data, enemy) => {
    const result = original(data, enemy, () => 0.5);

    if (!result.succeeded) return result;

    // 対局を短縮し、実エンジンで飛び終了を確定させる。
    const state = result.gameState;
    state.round.phase = "roundEnd";

    state.round.players.forEach((player, index) => {
      player.score = [
        40000, 30000, 30100, -100
      ][index];
    });

    return {
      ...result,
      gameState: startNextRound(state, () => 0.5)
    };
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

function start() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "対局を開始"
    })
  );
}

it("実際の結果画面で成長を表示し、次の対局にも引き継ぐ", () => {
  render(
    <StrictMode>
      <AkuukanGame />
    </StrictMode>
  );

  start();

  expect(
    screen.getByText("レベルアップ！ Lv.1 → Lv.2")
  ).toBeTruthy();

  expect(
    screen.getByText("成長・解放結果を保存しました。")
  ).toBeTruthy();

  const first = JSON.parse(
    localStorage.getItem(KEY)!
  );

  expect(
    first.playerSkillGrowth.skills["1-1"].currentExp
  ).toBe(400);

  expect(first.equippedSkills).toEqual([
    { id: "1-1", level: 2 }
  ]);

  expect(
    first.enemyProgress.enemies["enemy-2"].isUnlocked
  ).toBe(true);

  const restart = screen.getAllByRole("button", {
    name: "新しい対局"
  });
  fireEvent.click(restart[restart.length - 1]);

  start();

  const second = JSON.parse(
    localStorage.getItem(KEY)!
  );

  expect(
    second.playerSkillGrowth.skills["1-1"].currentExp
  ).toBe(900);

  expect(
    second.enemyProgress.enemies["enemy-1"]
      .firstPlaceCount
  ).toBe(4);
});

it("実際の結果画面でも保存失敗中は再開を止め、再試行できる", () => {
  const previous = localStorage.getItem(KEY);
  const original = Storage.prototype.setItem;
  let fail = true;

  vi.spyOn(
    Storage.prototype,
    "setItem"
  ).mockImplementation(function (
    this: Storage,
    key,
    value
  ) {
    if (key === KEY && fail) {
      fail = false;
      throw new Error("保存失敗");
    }

    original.call(this, key, value);
  });

  render(
    <StrictMode>
      <AkuukanGame />
    </StrictMode>
  );

  start();

  expect(localStorage.getItem(KEY)).toBe(previous);

  const buttons = screen.getAllByRole("button", {
    name: "新しい対局"
  }) as HTMLButtonElement[];

  expect(
    buttons.every(button => button.disabled)
  ).toBe(true);

  fireEvent.click(
    screen.getByRole("button", {
      name: "保存を再試行"
    })
  );

  expect(
    screen.getByText("成長・解放結果を保存しました。")
  ).toBeTruthy();

  const saved = JSON.parse(
    localStorage.getItem(KEY)!
  );

  expect(
    saved.playerSkillGrowth.skills["1-1"].currentExp
  ).toBe(400);

  expect(
    saved.enemyProgress.enemies["enemy-1"]
      .firstPlaceCount
  ).toBe(3);

  expect(
    buttons.every(button => !button.disabled)
  ).toBe(true);
});
