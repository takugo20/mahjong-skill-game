// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  expect,
  it,
  vi
} from "vitest";
import { SkillEquipment } from "./SkillEquipment";
import { AkuukanGame } from "./AkuukanGame";
import {
  createInitialAkuukanSaveData
} from "./lib/akuukan/saveData";
import {
  PLAYER_SKILL_CATALOG
} from "./lib/akuukan/playerSkillCatalog";
import {
  AKUUKAN_SAVE_DATA_STORAGE_KEY as KEY
} from "./lib/akuukan/saveDataStorage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it("装備を保存し、開き直して解除できる", () => {
  render(<AkuukanGame />);

  fireEvent.click(
    screen.getByText("スキル装備を変更")
  );
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /紅牌錬成【序】/
    })
  );
  fireEvent.click(screen.getByText("装備を保存"));

  expect(
    JSON.parse(localStorage.getItem(KEY)!)
      .equippedSkills
  ).toEqual([{ id: "1-1", level: 1 }]);

  fireEvent.click(
    screen.getByText("スキル装備を変更")
  );

  const checkbox = screen.getByRole("checkbox", {
    name: /紅牌錬成【序】/
  }) as HTMLInputElement;

  expect(checkbox.checked).toBe(true);

  fireEvent.click(checkbox);
  fireEvent.click(screen.getByText("装備を保存"));

  expect(
    JSON.parse(localStorage.getItem(KEY)!)
      .equippedSkills
  ).toEqual([]);
});

it("保存失敗では選択を保ち、再試行で保存する", () => {
  const onSaved = vi.fn();

  render(
    <SkillEquipment
      saveData={createInitialAkuukanSaveData()}
      onSaved={onSaved}
      onCancel={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /紅牌錬成【序】/
    })
  );

  vi.spyOn(
    Storage.prototype,
    "setItem"
  ).mockImplementationOnce(() => {
    throw new Error("失敗");
  });

  fireEvent.click(screen.getByText("装備を保存"));

  expect(onSaved).not.toHaveBeenCalled();
  expect(
    screen.getByRole("alert").textContent
  ).toContain("保存できませんでした");

  fireEvent.click(screen.getByText("装備を保存"));

  expect(
    onSaved.mock.calls[0][0].equippedSkills
  ).toEqual([{ id: "1-1", level: 1 }]);
});

it("10個で追加を止め、解除すると再び選択できる", () => {
  const save = createInitialAkuukanSaveData();
  const skills = {
    ...save.playerSkillGrowth.skills
  };

  PLAYER_SKILL_CATALOG.slice(0, 11).forEach(skill => {
    skills[skill.id] = {
      isUnlocked: true,
      level: 1,
      currentExp: 0
    };
  });

  render(
    <SkillEquipment
      saveData={{
        ...save,
        playerSkillGrowth: {
          ...save.playerSkillGrowth,
          skills
        }
      }}
      onSaved={() => {}}
      onCancel={() => {}}
    />
  );

  const boxes = screen.getAllByRole(
    "checkbox"
  ) as HTMLInputElement[];

  boxes.slice(0, 10).forEach(box => {
    fireEvent.click(box);
  });

  expect(boxes[10].disabled).toBe(true);
  expect(boxes[0].disabled).toBe(false);

  fireEvent.click(boxes[0]);

  expect(boxes[10].disabled).toBe(false);
});

it("変更を破棄すると保存済み装備が維持される", () => {
  const previous = JSON.stringify(
    createInitialAkuukanSaveData()
  );
  localStorage.setItem(KEY, previous);

  render(<AkuukanGame />);

  fireEvent.click(
    screen.getByText("スキル装備を変更")
  );
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: /紅牌錬成【序】/
    })
  );
  fireEvent.click(
    screen.getByText("変更を破棄して戻る")
  );

  expect(localStorage.getItem(KEY)).toBe(previous);

  fireEvent.click(
    screen.getByText("スキル装備を変更")
  );

  expect(
    (
      screen.getByRole("checkbox", {
        name: /紅牌錬成【序】/
      }) as HTMLInputElement
    ).checked
  ).toBe(false);
});
