import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanGameState
} from "./state";
import type {
  AkuukanGameState,
  EnemyId
} from "./types";
import {
  applyAkuukanWinningYakuAdjustments
} from "./winningEvaluationAdjustments";
import {
  createAkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import {
  createAkuukanEnemyAbilityWinningYakuAdjustments
} from "./winningEvaluationEnemyAbilityAdjustments";

function createState(
  enemyId: EnemyId
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("敵能力の役変更生成", () => {
  it("E-14は能力者本人だけを門前扱いにする", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "pinfu",
          "sanshokuDoujun"
        ],
        structuralYakumanIds: [
          "nineGates"
        ],
        isClosed: false
      });
    const akuukan =
      createState("enemy-5");

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates,
        winnerIsSelectedEnemy: false
      })
    ).toEqual({});

    const adjustments =
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates,
        winnerIsSelectedEnemy: true
      });

    expect(
      adjustments.normalYakuGrants
    ).toContainEqual({
      yakuId: "pinfu",
      sourceId: "enemy-ability:E-14",
      han: 1
    });
    expect(
      adjustments.yakumanGrants
    ).toContainEqual({
      yakumanId: "nineGates",
      sourceId: "enemy-ability:E-14",
      multiplier: 1
    });
    expect(
      adjustments
        .openReductionCancellations
    ).toContainEqual({
      yakuId: "sanshokuDoujun",
      sourceId: "enemy-ability:E-14"
    });
  });

  it("E-7は他家の標準2翻以上の役と役満を無効化する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "riichi",
          "sanshokuDoujun",
          "toitoi",
          "junchan"
        ],
        structuralYakumanIds: [
          "bigThreeDragons"
        ],
        isClosed: false
      });
    const akuukan =
      createState("enemy-7");
    const adjustments =
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates,
        winnerIsSelectedEnemy: false
      });

    expect(
      adjustments.normalYakuInvalidations
    ).toEqual([
      {
        yakuId: "toitoi",
        sourceId: "enemy-ability:E-7"
      },
      {
        yakuId: "junchan",
        sourceId: "enemy-ability:E-7"
      }
    ]);
    expect(
      adjustments.yakumanInvalidations
    ).toEqual([
      {
        yakumanId: "bigThreeDragons",
        sourceId: "enemy-ability:E-7"
      }
    ]);
  });

  it("E-7は能力者本人の役を無効化しない", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "sevenPairs"
        ],
        structuralYakumanIds: [
          "bigThreeDragons"
        ],
        isClosed: true
      });

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: createState("enemy-7"),
        candidates,
        winnerIsSelectedEnemy: true
      })
    ).toEqual({});
  });

  it("E-17は他家の立直以外の標準1翻役を無効化する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "riichi",
          "pinfu",
          "sanshokuDoujun"
        ],
        structuralYakumanIds: [],
        isClosed: true
      });
    const adjustments =
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: createState("enemy-9"),
        candidates,
        winnerIsSelectedEnemy: false
      });

    expect(
      adjustments.normalYakuInvalidations
    ).toEqual([
      {
        yakuId: "pinfu",
        sourceId: "enemy-ability:E-17"
      }
    ]);
    expect(
      adjustments.yakumanInvalidations
    ).toBeUndefined();
  });

  it("E-17は副露で標準1翻になった役を無効化する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "sanshokuDoujun",
          "ittsuu",
          "chanta"
        ],
        structuralYakumanIds: [],
        isClosed: false
      });

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: createState("enemy-9"),
        candidates,
        winnerIsSelectedEnemy: false
      }).normalYakuInvalidations
    ).toEqual([
      {
        yakuId: "sanshokuDoujun",
        sourceId: "enemy-ability:E-17"
      },
      {
        yakuId: "ittsuu",
        sourceId: "enemy-ability:E-17"
      },
      {
        yakuId: "chanta",
        sourceId: "enemy-ability:E-17"
      }
    ]);
  });

  it("成立許可後の門前時翻数をE-7・E-17の判定に使用する", () => {
    const baseCandidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "pinfu",
          "ryanpeikou"
        ],
        structuralYakumanIds: [],
        isClosed: false
      });
    const grantedCandidates =
      applyAkuukanWinningYakuAdjustments(
        baseCandidates,
        {
          normalYakuGrants: [
            {
              yakuId: "pinfu",
              sourceId:
                "player-skill:2-6",
              han: 1
            },
            {
              yakuId: "ryanpeikou",
              sourceId:
                "player-skill:2-5",
              han: 3
            }
          ]
        }
      );

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: createState("enemy-7"),
        candidates: grantedCandidates,
        winnerIsSelectedEnemy: false
      }).normalYakuInvalidations
    ).toEqual([
      {
        yakuId: "ryanpeikou",
        sourceId: "enemy-ability:E-7"
      }
    ]);
    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: createState("enemy-9"),
        candidates: grantedCandidates,
        winnerIsSelectedEnemy: false
      }).normalYakuInvalidations
    ).toEqual([
      {
        yakuId: "pinfu",
        sourceId: "enemy-ability:E-17"
      }
    ]);
  });

  it("追加翻と喰い下がり無効を標準翻数判定に含めない", () => {
    const baseCandidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "sanshokuDoujun"
        ],
        structuralYakumanIds: [],
        isClosed: false
      });
    const adjustedCandidates =
      applyAkuukanWinningYakuAdjustments(
        baseCandidates,
        {
          openReductionCancellations: [
            {
              yakuId: "sanshokuDoujun",
              sourceId:
                "player-skill:2-1"
            }
          ],
          hanAdditions: [
            {
              yakuId: "sanshokuDoujun",
              sourceId:
                "player-skill:2-8",
              han: 2
            }
          ]
        }
      );

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: createState("enemy-7"),
        candidates: adjustedCandidates,
        winnerIsSelectedEnemy: false
      })
    ).toEqual({});
    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: createState("enemy-9"),
        candidates: adjustedCandidates,
        winnerIsSelectedEnemy: false
      }).normalYakuInvalidations
    ).toEqual([
      {
        yakuId: "sanshokuDoujun",
        sourceId: "enemy-ability:E-17"
      }
    ]);
  });

  it("能力元が無効なら役変更を生成しない", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "sevenPairs"
        ],
        structuralYakumanIds: [],
        isClosed: true
      });
    const initial =
      createState("enemy-7");
    const akuukan: AkuukanGameState = {
      ...initial,
      disabledSources: [
        "enemy-ability:E-7"
      ]
    };

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates,
        winnerIsSelectedEnemy: false
      })
    ).toEqual({});
  });
});
