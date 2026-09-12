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
import { EnemyGuide } from "./EnemyGuide";
import { AkuukanGame } from "./AkuukanGame";
import {
  createInitialAkuukanSaveData
} from "./lib/akuukan/saveData";
import {
  getEnemyDefinition
} from "./lib/akuukan/enemyCatalog";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY as KEY
} from "./lib/akuukan/saveDataStorage";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("選択中の敵の能力と順位別EXPを表示する", () => {
  render(
    <EnemyGuide
      selectedEnemyId="enemy-1"
      progress={
        createInitialAkuukanSaveData().enemyProgress
      }
    />
  );

  const details = screen
    .getByText("敵1（挑戦可能）・選択中")
    .closest("details")!;

  expect(details.open).toBe(true);

  const view = within(details);

  expect(
    view.getByText(
      getEnemyDefinition("enemy-1")
        .abilities[0].description
    )
  ).toBeTruthy();

  expect(
    view.getAllByRole("cell").map(
      cell => cell.textContent
    )
  ).toEqual(["500", "100", "50", "10"]);
});

it("未解放の敵は前の敵の1位回数を表示する", () => {
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

  const details = screen
    .getByText("敵2（未解放）")
    .closest("details")!;

  const view = within(details);

  expect(
    view.getByText(
      "解放条件：敵1との対局で3回1位を取る。"
    )
  ).toBeTruthy();

  expect(
    view.getByText("敵1での1位回数：2 / 3回")
  ).toBeTruthy();

  expect(
    view.getByText(
      "この敵との対局で1位になった回数：0回"
    )
  ).toBeTruthy();
});

it("対戦相手の選択に合わせて詳細が切り替わる", () => {
  const save = createInitialAkuukanSaveData();

  localStorage.setItem(
    KEY,
    JSON.stringify({
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
    })
  );

  render(<AkuukanGame />);

  fireEvent.change(
    screen.getByLabelText("対戦相手"),
    { target: { value: "enemy-2" } }
  );

  expect(
    screen
      .getByText("敵2（挑戦可能）・選択中")
      .closest("details")!
      .open
  ).toBe(true);

  expect(
    screen
      .getByText("敵1（挑戦可能）")
      .closest("details")!
      .open
  ).toBe(false);
});
