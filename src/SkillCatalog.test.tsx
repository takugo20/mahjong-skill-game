// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";
import {
  afterEach,
  expect,
  it
} from "vitest";
import { SkillCatalog } from "./SkillCatalog";
import { AkuukanGame } from "./AkuukanGame";
import {
  createInitialAkuukanSaveData
} from "./lib/akuukan/saveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY as KEY
} from "./lib/akuukan/saveDataStorage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("全80件を表示し、未解放と検索を組み合わせられる", () => {
  render(
    <SkillCatalog
      saveData={createInitialAkuukanSaveData()}
      onBack={() => {}}
    />
  );

  expect(
    screen.getAllByRole("article")
  ).toHaveLength(80);

  fireEvent.change(
    screen.getByLabelText("表示対象"),
    { target: { value: "locked" } }
  );

  expect(
    screen.queryByRole("article", {
      name: "紅牌錬成【序】"
    })
  ).toBeNull();

  fireEvent.change(
    screen.getByLabelText("スキル検索"),
    { target: { value: "紅牌錬成【破】" } }
  );

  expect(
    screen.getAllByRole("article")
  ).toHaveLength(1);

  expect(
    screen.getByText("達成数：0 / 1")
  ).toBeTruthy();

  fireEvent.change(
    screen.getByLabelText("スキル検索"),
    { target: { value: "存在しないスキル" } }
  );

  expect(
    screen.getByText("該当するスキルはありません。")
  ).toBeTruthy();
});

it("保存済みの経験値・装備・達成数を表示する", () => {
  const save = createInitialAkuukanSaveData();

  const changed = {
    ...save,
    equippedSkills: [{
      id: "1-1" as const,
      level: 1 as const
    }],
    playerSkillGrowth: {
      ...save.playerSkillGrowth,
      skills: {
        ...save.playerSkillGrowth.skills,
        "1-1": {
          isUnlocked: true as const,
          level: 1 as const,
          currentExp: 500
        }
      },
      unlockProgress: {
        ...save.playerSkillGrowth.unlockProgress,
        "enemy-8-first-place-count": 1
      }
    }
  };

  const before = JSON.stringify(changed);

  render(
    <SkillCatalog
      saveData={changed}
      onBack={() => {}}
    />
  );

  const first = within(
    screen.getByRole("article", {
      name: "紅牌錬成【序】"
    })
  );

  expect(
    first.getByText("解放済み・Lv.1・装備中")
  ).toBeTruthy();

  expect(
    first.getByText("経験値：500 / 6000 EXP")
  ).toBeTruthy();

  const second = within(
    screen.getByRole("article", {
      name: "紅牌錬成【破】"
    })
  );

  expect(
    second.getByText("達成数：1 / 1")
  ).toBeTruthy();

  expect(JSON.stringify(changed)).toBe(before);
});

it("開始画面から往復してもセーブを書き換えない", () => {
  const previous = JSON.stringify(
    createInitialAkuukanSaveData()
  );
  localStorage.setItem(KEY, previous);

  render(<AkuukanGame />);

  fireEvent.click(
    screen.getByText("スキル図鑑を見る")
  );

  expect(
    screen.getByRole("heading", {
      name: "スキル図鑑"
    })
  ).toBeTruthy();

  fireEvent.click(
    screen.getByText("開始画面に戻る")
  );

  expect(
    screen.getByText("対局を開始")
  ).toBeTruthy();

  expect(localStorage.getItem(KEY)).toBe(previous);
});
