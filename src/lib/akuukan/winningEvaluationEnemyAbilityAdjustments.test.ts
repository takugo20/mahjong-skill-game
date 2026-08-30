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
  it("E-6は前回と同じ役を標準翻数の2倍に固定する", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "riichi",
          "sanshokuDoujun",
          "toitoi"
        ],
        structuralYakumanIds: [],
        isClosed: true
      });
    const akuukan: AkuukanGameState = {
      ...createState("enemy-3"),
      e6LastWinningNormalYakuIds: [
        "riichi",
        "sanshokuDoujun",
        "pinfu"
      ]
    };

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates,
        winnerIsSelectedEnemy: true
      }).fixedHanChanges
    ).toEqual([
      {
        yakuId: "riichi",
        sourceId: "enemy-ability:E-6",
        han: 2
      },
      {
        yakuId: "sanshokuDoujun",
        sourceId: "enemy-ability:E-6",
        han: 4
      }
    ]);
  });

  it("E-6は副露時の標準翻数を2倍にする", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "sanshokuDoujun",
          "honitsu"
        ],
        structuralYakumanIds: [],
        isClosed: false
      });
    const akuukan: AkuukanGameState = {
      ...createState("enemy-3"),
      e6LastWinningNormalYakuIds: [
        "sanshokuDoujun",
        "honitsu"
      ]
    };

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates,
        winnerIsSelectedEnemy: true
      }).fixedHanChanges
    ).toEqual([
      {
        yakuId: "sanshokuDoujun",
        sourceId: "enemy-ability:E-6",
        han: 2
      },
      {
        yakuId: "honitsu",
        sourceId: "enemy-ability:E-6",
        han: 4
      }
    ]);
  });

  it("E-6は初回和了と特殊敵本人以外には適用しない", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "riichi"
        ],
        structuralYakumanIds: [],
        isClosed: true
      });
    const initial = createState("enemy-3");
    const recorded: AkuukanGameState = {
      ...initial,
      e6LastWinningNormalYakuIds: [
        "riichi"
      ]
    };

    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: initial,
        candidates,
        winnerIsSelectedEnemy: true
      })
    ).toEqual({});
    expect(
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan: recorded,
        candidates,
        winnerIsSelectedEnemy: false
      })
    ).toEqual({});
  });

  it("E-6の2倍値を連続回数で累積させない", () => {
    const candidates =
      createAkuukanWinningYakuCandidates({
        structuralNormalYakuIds: [
          "ryanpeikou",
          "iipeikou"
        ],
        structuralYakumanIds: [],
        isClosed: true
      });
    const akuukan: AkuukanGameState = {
      ...createState("enemy-3"),
      e6LastWinningNormalYakuIds: [
        "ryanpeikou",
        "iipeikou"
      ]
    };
    const firstAdjustments =
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates,
        winnerIsSelectedEnemy: true
      });
    const first =
      applyAkuukanWinningYakuAdjustments(
        candidates,
        firstAdjustments
      );
    const secondAdjustments =
      createAkuukanEnemyAbilityWinningYakuAdjustments({
        akuukan,
        candidates: first,
        winnerIsSelectedEnemy: true
      });
    const second =
      applyAkuukanWinningYakuAdjustments(
        first,
        secondAdjustments
      );

    expect(
      first.normalYakuCandidates.find(
        (candidate) =>
          candidate.id === "ryanpeikou"
      )?.fixedHanChanges
    ).toEqual([
      {
        sourceId: "enemy-ability:E-6",
        han: 6
      }
    ]);
    expect(second).toBe(first);
  });
  
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
