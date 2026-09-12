// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen
} from "@testing-library/react";
import {
  afterEach,
  expect,
  it
} from "vitest";
import { SkillLevelInfo } from "./SkillLevelInfo";
import {
  getPlayerSkillDefinition
} from "./lib/akuukan/playerSkillCatalog";

afterEach(cleanup);

it("アクティブの現在レベルと未解放時のMPを表示する", () => {
  const skill = getPlayerSkillDefinition("1-14");

  const { rerender, container } = render(
    <SkillLevelInfo
      skill={skill}
      currentLevel={3}
    />
  );

  expect(
    screen.getByText("現在の消費MP：60")
  ).toBeTruthy();

  expect(
    screen.getByText("3（現在）")
  ).toBeTruthy();

  expect(
    container.querySelectorAll("tbody tr")
  ).toHaveLength(5);

  expect(
    screen.getByText("2300")
  ).toBeTruthy();

  rerender(
    <SkillLevelInfo
      skill={skill}
      currentLevel={null}
    />
  );

  expect(
    screen.getByText("解放時の消費MP：80")
  ).toBeTruthy();

  expect(
    screen.queryByText("3（現在）")
  ).toBeNull();
});

it("固定レベルのスキルはLv.1だけ表示する", () => {
  const { container } = render(
    <SkillLevelInfo
      skill={getPlayerSkillDefinition("2-1")}
      currentLevel={1}
    />
  );

  expect(
    screen.getByText(
      "パッシブ：条件成立時に自動発動"
    )
  ).toBeTruthy();

  expect(
    container.querySelectorAll("tbody tr")
  ).toHaveLength(1);

  expect(
    screen.getByText("最大レベル")
  ).toBeTruthy();

  expect(
    screen.getByText("—")
  ).toBeTruthy();
});
