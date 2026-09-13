// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PlayerSkillCard } from "./PlayerSkillCard";
import { PLAYER_SKILL_CATALOG } from "./lib/akuukan/playerSkillCatalog";
import { PLAYER_SKILL_DESCRIPTIONS } from "./lib/akuukan/playerSkillDescriptions";
import { PLAYER_SKILL_LEVELS } from "./lib/akuukan/playerSkillCatalogTypes";

afterEach(cleanup);

it("全80件の説明とレベル別数値が実装に対応する", () => {
  expect(Object.keys(PLAYER_SKILL_DESCRIPTIONS)).toHaveLength(80);

  for (const skill of PLAYER_SKILL_CATALOG) {
    const description = PLAYER_SKILL_DESCRIPTIONS[skill.catalogNumber];
    expect(description, skill.name).toBeTruthy();

    const sequences = [
      PLAYER_SKILL_LEVELS.map(level => skill.levels[level].mpCost),
      ...Object.keys(skill.levels[1].effectValues).map(key =>
        PLAYER_SKILL_LEVELS.map(
          level => skill.levels[level].effectValues[key]
        )
      )
    ];

    for (const match of description.matchAll(/\[([\d./]+)\]/g)) {
      const values = match[1].split("/").map(Number);
      expect(values, skill.name).toHaveLength(5);
      expect(sequences, skill.name).toContainEqual(values);
    }
  }
});

it("同じ数値が続く場合も現在レベルの位置だけを強調する", () => {
  const skill = PLAYER_SKILL_CATALOG.find(
    item => item.catalogNumber === 5
  )!;

  const { container } = render(
    <PlayerSkillCard
      skill={skill}
      progress={{ isUnlocked: true, level: 4, currentExp: 0 }}
    />
  );

  const groups = container.querySelectorAll(".player-skill-values");

  expect(groups).toHaveLength(2);
  expect(
    groups[0].querySelector(".player-skill-value--current")?.textContent
  ).toBe("35");
  expect(
    groups[1].querySelectorAll(".player-skill-value--current")
  ).toHaveLength(1);
  expect(
    groups[1].children[3]
      .querySelector(".player-skill-value--current")?.textContent
  ).toBe("2");
});

it("レベル固定スキルにはLvを表示しない", () => {
  const skill = PLAYER_SKILL_CATALOG.find(
    item => item.catalogNumber === 16
  )!;

  render(
    <PlayerSkillCard
      skill={skill}
      progress={{ isUnlocked: true, level: 1, currentExp: 0 }}
    />
  );

  expect(screen.queryByText(/Lv\./)).toBeNull();
  expect(
    screen.getByText("三色同順が喰い下がりしなくなる。")
  ).toBeTruthy();
});
