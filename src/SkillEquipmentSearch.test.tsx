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
import {
  createInitialAkuukanSaveData
} from "./lib/akuukan/saveData";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("検索で非表示になった装備も保存される", () => {
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

  fireEvent.change(
    screen.getByLabelText("装備スキル検索"),
    { target: { value: "存在しない名前" } }
  );

  expect(
    screen.queryAllByRole("checkbox")
  ).toHaveLength(0);

  expect(
    screen.getByText("選択中：1 / 10")
  ).toBeTruthy();

  fireEvent.click(screen.getByText("装備を保存"));

  expect(
    onSaved.mock.calls[0][0].equippedSkills
  ).toEqual([{ id: "1-1", level: 1 }]);
});

it("装備中だけに絞って解除し、全表示に戻して再装備できる", () => {
  render(
    <SkillEquipment
      saveData={{
        ...createInitialAkuukanSaveData(),
        equippedSkills: [{ id: "1-1", level: 1 }]
      }}
      onSaved={() => {}}
      onCancel={() => {}}
    />
  );

  fireEvent.change(
    screen.getByLabelText("装備一覧の表示対象"),
    { target: { value: "equipped" } }
  );

  expect(
    screen.getAllByRole("checkbox")
  ).toHaveLength(1);

  fireEvent.click(screen.getByRole("checkbox"));

  expect(
    screen.queryAllByRole("checkbox")
  ).toHaveLength(0);

  expect(
    screen.getByText("選択中：0 / 10")
  ).toBeTruthy();

  fireEvent.change(
    screen.getByLabelText("装備一覧の表示対象"),
    { target: { value: "all" } }
  );

  fireEvent.change(
    screen.getByLabelText("装備スキル検索"),
    { target: { value: "紅牌錬成【序】" } }
  );

  fireEvent.click(screen.getByRole("checkbox"));

  expect(
    screen.getByText("選択中：1 / 10")
  ).toBeTruthy();
});
