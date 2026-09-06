import {
  describe,
  expect,
  it
} from "vitest";
import type {
  FuCalculationResult
} from "../mahjong/fu";
import {
  adjustAkuukanPlayerSkill1_13HanFu
} from "./hanFuAdjustments";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

function createAkuukan(
  level: SkillLevel = 1,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{ id: "1-13", level }]
      : []
  });
}

function createFu(
  fu: number
): FuCalculationResult {
  return {
    fu,
    rawFu: fu,
    fixed: fu === 25,
    components: []
  };
}

function adjust(
  fu: number,
  level: SkillLevel = 1,
  options: {
    readonly winnerIsPlayer?: boolean;
    readonly hasValidYaku?: boolean;
  } = {}
) {
  return adjustAkuukanPlayerSkill1_13HanFu({
    akuukan: createAkuukan(level),
    winnerIsPlayer:
      options.winnerIsPlayer ?? true,
    hasValidYaku:
      options.hasValidYaku ?? true,
    fu: createFu(fu)
  });
}

describe("プレイヤースキル1-13の符・ボーナス翻調整", () => {
  it("20符を30符へ変更する", () => {
    const result = adjust(20);

    expect(result.fu.fu).toBe(30);
    expect(result.bonusHan).toBe(0);
  });

  it("25符と30符を40符へ変更する", () => {
    expect(adjust(25).fu.fu).toBe(40);
    expect(adjust(30).fu.fu).toBe(40);
    expect(adjust(25).bonusHan).toBe(0);
    expect(adjust(30).bonusHan).toBe(0);
  });

  it("変更前が40符以上ならレベル別のボーナス翻を加算する", () => {
    const cases: readonly {
      level: SkillLevel;
      expectedBonusHan: number;
    }[] = [
      { level: 1, expectedBonusHan: 1 },
      { level: 2, expectedBonusHan: 1 },
      { level: 3, expectedBonusHan: 1 },
      { level: 4, expectedBonusHan: 1 },
      { level: 5, expectedBonusHan: 2 }
    ];

    for (const currentCase of cases) {
      const result = adjust(
        40,
        currentCase.level
      );

      expect(result.fu.fu).toBe(40);
      expect(result.bonusHan).toBe(
        currentCase.expectedBonusHan
      );
    }
  });

  it("50符以上でも符を変更せずボーナス翻を加算する", () => {
    const result = adjust(70, 5);

    expect(result.fu.fu).toBe(70);
    expect(result.bonusHan).toBe(2);
  });

  it("CPUの和了または有効な役がない場合は適用しない", () => {
    const cpu = adjust(
      25,
      5,
      { winnerIsPlayer: false }
    );
    const noYaku = adjust(
      40,
      5,
      { hasValidYaku: false }
    );

    expect(cpu.fu.fu).toBe(25);
    expect(cpu.bonusHan).toBe(0);
    expect(noYaku.fu.fu).toBe(40);
    expect(noYaku.bonusHan).toBe(0);
  });

  it("未装備またはE-18による無効化中は適用しない", () => {
    const notEquipped =
      adjustAkuukanPlayerSkill1_13HanFu({
        akuukan: createAkuukan(5, false),
        winnerIsPlayer: true,
        hasValidYaku: true,
        fu: createFu(25)
      });
    const disabled =
      adjustAkuukanPlayerSkill1_13HanFu({
        akuukan: disableAkuukanSource(
          createAkuukan(5),
          "player-skill:1-13"
        ),
        winnerIsPlayer: true,
        hasValidYaku: true,
        fu: createFu(40)
      });

    expect(notEquipped.fu.fu).toBe(25);
    expect(notEquipped.bonusHan).toBe(0);
    expect(disabled.fu.fu).toBe(40);
    expect(disabled.bonusHan).toBe(0);
  });
});
