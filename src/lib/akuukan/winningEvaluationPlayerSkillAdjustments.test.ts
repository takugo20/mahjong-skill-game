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

interface YakuGrantCase {
  readonly skillId: PlayerSkillId;
  readonly yaku:
    readonly {
      readonly id: NormalYakuId;
      readonly han: number;
    }[];
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

const OPEN_REDUCTION_CASES:
  readonly HanAdditionCase[] = [
    {
      skillId: "2-1",
      yakuIds: ["sanshokuDoujun"]
    },
    {
      skillId: "2-2",
      yakuIds: ["ittsuu"]
    },
    {
      skillId: "2-3",
      yakuIds: [
        "chanta",
        "junchan"
      ]
    },
    {
      skillId: "2-4",
      yakuIds: [
        "honitsu",
        "chinitsu"
      ]
    }
  ];

const YAKU_GRANT_CASES:
  readonly YakuGrantCase[] = [
    {
      skillId: "2-5",
      yaku: [
        { id: "iipeikou", han: 1 },
        { id: "ryanpeikou", han: 3 }
      ]
    },
    {
      skillId: "2-6",
      yaku: [
        { id: "pinfu", han: 1 }
      ]
    },
    {
      skillId: "2-7",
      yaku: [
        { id: "riichi", han: 1 },
        { id: "ippatsu", han: 1 },
        { id: "menzenTsumo", han: 1 }
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

  it("2-1から2-4を対象役の喰い下がり無効へ変換する", () => {
    for (
      const testCase of
        OPEN_REDUCTION_CASES
    ) {
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
        openReductionCancellations:
          testCase.yakuIds.map(
            (yakuId) => ({
              yakuId,
              sourceId:
                `player-skill:${testCase.skillId}`
            })
          )
      });
    }
  });

  it("2-5から2-7を副露時の役成立許可へ変換する", () => {
    for (
      const testCase of
        YAKU_GRANT_CASES
    ) {
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
        normalYakuGrants:
          testCase.yaku.map(
            ({ id, han }) => ({
              yakuId: id,
              sourceId:
                `player-skill:${testCase.skillId}`,
              han
            })
          )
      });
    }
  });

  it("1-15は発動中だけ門前扱いの変更を生成する", () => {
    const equipped = createState([
      {
        id: "1-15",
        level: 3
      }
    ]);

    expect(
      createAkuukanPlayerSkillWinningYakuAdjustments(
        equipped
      )
    ).toEqual({});

    const active: AkuukanGameState = {
      ...equipped,
      activeEffects: [
        {
          instanceId: "menzen-kaiki",
          sourceId:
            "player-skill:1-15",
          remainingTurns: 2
        }
      ]
    };

    expect(
      createAkuukanPlayerSkillWinningYakuAdjustments(
        active
      )
    ).toEqual({
      normalYakuGrants: [
        ["riichi", 1],
        ["doubleRiichi", 2],
        ["ippatsu", 1],
        ["menzenTsumo", 1],
        ["pinfu", 1],
        ["iipeikou", 1],
        ["sevenPairs", 2],
        ["ryanpeikou", 3]
      ].map(([yakuId, han]) => ({
        yakuId,
        sourceId: "player-skill:1-15",
        han
      })),
      yakumanGrants: [
        ["tenhou", 1],
        ["chiihou", 1],
        ["thirteenOrphans", 1],
        [
          "thirteenOrphansThirteenSided",
          2
        ],
        ["fourConcealedTriplets", 1],
        [
          "fourConcealedTripletsSingleWait",
          2
        ],
        ["nineGates", 1],
        ["pureNineGates", 2]
      ].map(
        ([yakumanId, multiplier]) => ({
          yakumanId,
          sourceId:
            "player-skill:1-15",
          multiplier
        })
      ),
      openReductionCancellations: [
        "sanshokuDoujun",
        "ittsuu",
        "chanta",
        "junchan",
        "honitsu",
        "chinitsu"
      ].map((yakuId) => ({
        yakuId,
        sourceId: "player-skill:1-15"
      }))
    });
  });

  it("無効化中の1-15は発動効果が残っていても適用しない", () => {
    const initial = createState([
      {
        id: "1-15",
        level: 3
      }
    ]);
    const state: AkuukanGameState = {
      ...initial,
      disabledSources: [
        "player-skill:1-15"
      ],
      activeEffects: [
        {
          instanceId: "disabled-menzen-kaiki",
          sourceId:
            "player-skill:1-15",
          remainingTurns: 2
        }
      ]
    };

    expect(
      createAkuukanPlayerSkillWinningYakuAdjustments(
        state
      )
    ).toEqual({});
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
