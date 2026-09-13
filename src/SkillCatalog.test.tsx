// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SkillCatalog } from "./SkillCatalog";
import { AkuukanGame } from "./AkuukanGame";
import { createInitialAkuukanSaveData } from "./lib/akuukan/saveData";
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

  expect(screen.getAllByRole("article")).toHaveLength(80);

  fireEvent.change(screen.getByLabelText("表示対象"), {
    target: { value: "locked" }
  });

  expect(
    screen.queryByRole("article", { name: "紅牌錬成【序】" })
  ).toBeNull();

  fireEvent.change(screen.getByLabelText("スキル検索"), {
    target: { value: "紅牌錬成【破】" }
  });

  expect(screen.getAllByRole("article")).toHaveLength(1);

  const locked = screen.getByRole("article", {
    name: "紅牌錬成【破】"
  });

  expect(locked.textContent).toContain("解放条件：");
  expect(
    locked.querySelector(".player-skill-description")
  ).toBeNull();
  expect(
    locked.querySelector(".player-skill-level")
  ).toBeNull();

  fireEvent.change(screen.getByLabelText("スキル検索"), {
    target: { value: "存在しないスキル" }
  });

  expect(
    screen.getByText("該当するスキルはありません。")
  ).toBeTruthy();
});

it("現在レベルだけを強調し、開発用情報を表示しない", () => {
  const save = createInitialAkuukanSaveData();
  const changed = {
    ...save,
    playerSkillGrowth: {
      ...save.playerSkillGrowth,
      skills: {
        ...save.playerSkillGrowth.skills,
        "1-1": {
          isUnlocked: true as const,
          level: 3 as const,
          currentExp: 500
        }
      }
    }
  };

  const before = JSON.stringify(changed);

  render(
    <SkillCatalog saveData={changed} onBack={() => {}} />
  );

  const first = screen.getByRole("article", {
    name: "紅牌錬成【序】"
  });

  expect(within(first).getByText("Lv.3")).toBeTruthy();
  expect(
    first.querySelector(".player-skill-value--current")?.textContent
  ).toBe("20");
  expect(
    first.querySelectorAll(".player-skill-value")
  ).toHaveLength(4);
  expect(first.textContent).toContain("[5/10/20/30/50]%");

  expect(
    screen.queryByText(/経験値：|必要EXP|評価：|パッシブ|アクティブ/)
  ).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
  expect(
    screen.getByPlaceholderText("番号・スキル名")
  ).toBeTruthy();
  expect(JSON.stringify(changed)).toBe(before);
});

it("開始画面から往復してもセーブを書き換えない", () => {
  const previous = JSON.stringify(createInitialAkuukanSaveData());
  localStorage.setItem(KEY, previous);

  render(<AkuukanGame />);

  fireEvent.click(screen.getByText("スキル図鑑"));
  expect(
    screen.getByRole("heading", { name: "スキル図鑑" })
  ).toBeTruthy();

  fireEvent.click(screen.getByText("開始画面に戻る"));
  expect(screen.getByText("対局を開始")).toBeTruthy();
  expect(localStorage.getItem(KEY)).toBe(previous);
});
