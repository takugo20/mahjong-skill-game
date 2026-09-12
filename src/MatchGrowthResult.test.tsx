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
import { MatchGrowthResult } from "./MatchGrowthResult";
import {
  createInitialAkuukanSaveData
} from "./lib/akuukan/saveData";
import {
  settleAkuukanMatchProgress
} from "./lib/akuukan/matchProgressSettlement";
import {
  getPlayerSkillDefinition
} from "./lib/akuukan/playerSkillCatalog";

function result(maximum = false, empty = false) {
  const save = createInitialAkuukanSaveData();

  return settleAkuukanMatchProgress({
    matchIsFinalized: true,
    finalRank: 1,
    setup: {
      enemyId: "enemy-1",
      equippedSkills: empty
        ? []
        : [{
            id: "1-1",
            level: maximum ? 5 : 1
          }]
    },
    growth: {
      ...save.playerSkillGrowth,
      skills: {
        ...save.playerSkillGrowth.skills,
        "1-1": {
          isUnlocked: true,
          level: maximum ? 5 : 1,
          currentExp: maximum ? 0 : 5900
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
  })!;
}

afterEach(cleanup);

it("経験値・レベルアップ・新規解放を表示する", () => {
  const settlement = result();
  const before = JSON.stringify(settlement);

  const { rerender } = render(
    <MatchGrowthResult settlement={settlement} />
  );

  expect(
    screen.getByText("獲得EXP：+500")
  ).toBeTruthy();

  expect(
    screen.getByText("レベルアップ！ Lv.1 → Lv.2")
  ).toBeTruthy();

  expect(
    screen.getByText(
      "次のレベルまで：あと11600 EXP"
    )
  ).toBeTruthy();

  expect(
    screen.getByText(
      `${getPlayerSkillDefinition("1-5").name}（Lv.1）`
    )
  ).toBeTruthy();

  expect(
    screen.getByText(
      "新しい対戦相手：敵2 を解放しました！"
    )
  ).toBeTruthy();

  rerender(
    <MatchGrowthResult settlement={settlement} />
  );

  expect(JSON.stringify(settlement)).toBe(before);
});

it("最大レベルでは経験値を獲得したと表示しない", () => {
  render(
    <MatchGrowthResult settlement={result(true)} />
  );

  expect(
    screen.getByText(
      "最大レベルのためEXP加算なし"
    )
  ).toBeTruthy();

  expect(
    screen.queryByText("獲得EXP：+500")
  ).toBeNull();
});

it("装備なしと終了前を表示し分ける", () => {
  const { rerender, container } = render(
    <MatchGrowthResult />
  );

  expect(container.textContent).toBe("");

  rerender(
    <MatchGrowthResult settlement={result(false, true)} />
  );

  expect(
    screen.getByText(
      "装備スキルがないため、経験値の付与はありません。"
    )
  ).toBeTruthy();
});
