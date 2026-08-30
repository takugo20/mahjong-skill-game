import {
  describe,
  expect,
  it
} from "vitest";
import type {
  NormalYakuId
} from "../mahjong/yaku";
import {
  createInitialAkuukanGameState
} from "./state";
import type {
  AkuukanGameState,
  EquippedPlayerSkill,
  PlayerSkillId
} from "./types";
import {
  createAkuukanPlayerSkillWinningYakuAdjustments
} from "./winningEvaluationPlayerSkillAdjustments";

interface HanAdditionCase {
  readonly skillId: PlayerSkillId;
  readonly yakuIds:
    readonly NormalYakuId[];
}

const HAN_ADDITION_CASES:
  readonly HanAdditionCase[] = [
    {
      skillId: "2-8",
      yakuIds: ["sanshokuDoujun"]
    },
    {
      skillId: "2-9",
      yakuIds: ["ittsuu"]
    },
    {
      skillId: "2-10",
      yakuIds: ["chanta"]
    },
    {
      skillId: "2-11",
      yakuIds: ["junchan"]
    },
    {
      skillId: "2-12",
      yakuIds: ["honitsu"]
    },
    {
      skillId: "2-13",
      yakuIds: ["chinitsu"]
    },
    {
      skillId: "2-14",
      yakuIds: ["sevenPairs"]
    },
    {
      skillId: "2-15",
      yakuIds: [
        "iipeikou",
        "ryanpeikou"
      ]
    },
    {
      skillId: "2-16",
      yakuIds: [
        "toitoi",
        "sanshokuDoukou",
        "sanankou",
        "sankantsu"
      ]
    },
    {
      skillId: "2-17",
      yakuIds: [
        "rinshan",
        "haitei",
        "houtei"
      ]
    }
  ];

function createState(
  equippedSkills:
    readonly EquippedPlayerSkill[]
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills:
      equippedSkills.map((skill) => ({
        ...skill
      }))
  });
}

describe("プレイヤースキルの役変更生成", () => {
  it("対象外の装備だけなら変更を生成しない", () => {
    const state = createState([
      {
        id: "1-1",
        level: 1
      }
    ]);

    expect(
      createAkuukanPlayerSkillWinningYakuAdjustments(
        state
      )
    ).toEqual({});
  });

  it("2-8から2-17を対象役の加算へ変換する", () => {
    for (const testCase of HAN_ADDITION_CASES) {
      const state = createState([
        {
          id: testCase.skillId,
          level: 1
        }
      ]);

      expect(
        createAkuukanPlayerSkillWinningYakuAdjustments(
          state
        )
      ).toEqual({
        hanAdditions:
          testCase.yakuIds.map(
            (yakuId) => ({
              yakuId,
              sourceId:
                `player-skill:${testCase.skillId}`,
              han: 1
            })
          )
      });
    }
  });

  it("装備レベルに対応する加算翻を使用する", () => {
    const state = createState([
      {
        id: "2-8",
        level: 5
      }
    ]);

    expect(
      createAkuukanPlayerSkillWinningYakuAdjustments(
        state
      )
    ).toEqual({
      hanAdditions: [
        {
          yakuId: "sanshokuDoujun",
          sourceId:
            "player-skill:2-8",
          han: 2
        }
      ]
    });
  });

  it("無効化中の装備スキルを除外する", () => {
    const initial = createState([
      {
        id: "2-8",
        level: 5
      }
    ]);
    const state: AkuukanGameState = {
      ...initial,
      disabledSources: [
        "player-skill:2-8"
      ]
    };

    expect(
      createAkuukanPlayerSkillWinningYakuAdjustments(
        state
      )
    ).toEqual({});
  });
});
