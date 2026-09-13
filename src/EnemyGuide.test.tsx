// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { EnemyGuide } from "./EnemyGuide";
import { AkuukanGame } from "./AkuukanGame";
import { createInitialAkuukanSaveData } from "./lib/akuukan/saveData";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY as KEY
} from "./lib/akuukan/saveDataStorage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("勝利回数と短い能力説明だけを表示する", () => {
  const save = createInitialAkuukanSaveData();
  const progress = {
    enemies: {
      ...save.enemyProgress.enemies,
      "enemy-1": {
        isUnlocked: true,
        firstPlaceCount: 2
      }
    }
  };

  render(
    <EnemyGuide
      selectedEnemyId="enemy-1"
      progress={progress}
    />
  );

  const details = screen.getByText("敵1").closest("details")!;
  expect(details.open).toBe(true);

  const view = within(details);
  expect(view.getByText("勝利回数：")).toBeTruthy();
  expect(view.getByText("2回")).toBeTruthy();
  expect(
    view.getByText("他家にはドラ表示牌が裏返しに見える。")
  ).toBeTruthy();
  expect(view.getAllByRole("listitem")).toHaveLength(2);

  expect(
    screen.queryByText(/EXP|解放条件|打ち方の傾向/)
  ).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
});

it("未解放の敵はタップしても説明を開けない", () => {
  const save = createInitialAkuukanSaveData();

  const { container } = render(
    <EnemyGuide
      selectedEnemyId="enemy-2"
      progress={save.enemyProgress}
    />
  );

  const locked = screen.getByRole("button", {
    name: "敵2（未解放）"
  }) as HTMLButtonElement;

  expect(locked.disabled).toBe(true);
  fireEvent.click(locked);

  expect(locked.closest("details")).toBeNull();
  expect(container.querySelectorAll("details")).toHaveLength(1);
  expect(
    screen.queryByText("他家は1,000点を供託しないと副露できない。")
  ).toBeNull();
  expect(
    screen.getAllByRole("button", { name: /未解放/ })
  ).toHaveLength(15);
});

it("対戦相手の選択に合わせて詳細が切り替わる", () => {
  const save = createInitialAkuukanSaveData();

  localStorage.setItem(KEY, JSON.stringify({
    ...save,
    enemyProgress: {
      enemies: {
        ...save.enemyProgress.enemies,
        "enemy-1": {
          isUnlocked: true,
          firstPlaceCount: 3
        },
        "enemy-2": {
          isUnlocked: true,
          firstPlaceCount: 0
        }
      }
    }
  }));

  render(<AkuukanGame />);

  expect(
    screen.getAllByRole("button", { name: /^敵\d/ })
  ).toHaveLength(16);

  fireEvent.click(
    screen.getByRole("button", { name: "敵3（未解放）" })
  );

  expect(
    screen.getByRole("button", { name: "敵1" })
      .getAttribute("aria-pressed")
  ).toBe("true");

  fireEvent.click(
    screen.getByRole("button", { name: "敵2" })
  );

  expect(
    screen.getByRole("button", { name: "敵2" })
      .getAttribute("aria-pressed")
  ).toBe("true");

  expect(screen.queryByText("対戦相手の情報")).toBeNull();

  fireEvent.click(
    screen.getByRole("button", { name: "敵図鑑" })
  );

  expect(
    screen.getByText("敵2").closest("details")!.open
  ).toBe(true);
  expect(
    screen.getByText("敵1").closest("details")!.open
  ).toBe(false);

  fireEvent.click(
    screen.getByRole("button", { name: "タイトルに戻る" })
  );

  expect(
    screen.getByRole("button", { name: "敵2" })
      .getAttribute("aria-pressed")
  ).toBe("true");
});
