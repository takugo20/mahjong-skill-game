import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanGameState
} from "./state";
import type {
  AkuukanGameState
} from "./types";
import {
  createAkuukanWinningYakuCandidates
} from "./winningEvaluationCandidates";
import {
  clearAkuukanE6WinningYakuAfterNagashiMangan,
  getAkuukanE6LastWinningNormalYakuIds,
  isAkuukanE6Enabled,
  recordAkuukanE6WinningYaku,
  recordAkuukanE6WinningYakuAfterWin
} from "./winningEvaluationEnemyAbilityHistory";
import {
  resolveAkuukanWinningYaku
} from "./winningEvaluationResolution";

function createE6State(): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId: "enemy-3",
    equippedSkills: []
  });
}

describe("E-6の前回和了役記録", () => {
  it("敵3の特殊敵本人が和了した役を記録する", () => {
    const initial = createE6State();
    const recorded =
      recordAkuukanE6WinningYaku({
        akuukan: initial,
        winnerIsSelectedEnemy: true,
        normalYakuIds: [
          "riichi",
          "pinfu",
          "riichi"
        ]
      });

    expect(isAkuukanE6Enabled(initial)).toBe(
      true
    );
    expect(
      getAkuukanE6LastWinningNormalYakuIds(
        recorded
      )
    ).toEqual(["riichi", "pinfu"]);
    expect(
      initial.e6LastWinningNormalYakuIds
    ).toBeUndefined();
  });

  it("次の有効な和了では今回の役へ上書きする", () => {
    const first =
      recordAkuukanE6WinningYaku({
        akuukan: createE6State(),
        winnerIsSelectedEnemy: true,
        normalYakuIds: [
          "riichi",
          "pinfu"
        ]
      });
    const second =
      recordAkuukanE6WinningYaku({
        akuukan: first,
        winnerIsSelectedEnemy: true,
        normalYakuIds: ["tanyao"]
      });

    expect(
      getAkuukanE6LastWinningNormalYakuIds(
        second
      )
    ).toEqual(["tanyao"]);
    expect(
      getAkuukanE6LastWinningNormalYakuIds(
        first
      )
    ).toEqual(["riichi", "pinfu"]);
  });

  it("特殊敵本人以外の和了では記録を変更しない", () => {
    const initial: AkuukanGameState = {
      ...createE6State(),
      e6LastWinningNormalYakuIds: [
        "riichi"
      ]
    };
    const unchanged =
      recordAkuukanE6WinningYaku({
        akuukan: initial,
        winnerIsSelectedEnemy: false,
        normalYakuIds: ["pinfu"]
      });

    expect(unchanged).toBe(initial);
  });

  it("E-6を持たない敵または無効化中は記録しない", () => {
    const otherEnemy =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });
    const disabled: AkuukanGameState = {
      ...createE6State(),
      disabledSources: [
        "enemy-ability:E-6"
      ]
    };

    expect(
      recordAkuukanE6WinningYaku({
        akuukan: otherEnemy,
        winnerIsSelectedEnemy: true,
        normalYakuIds: ["riichi"]
      })
    ).toBe(otherEnemy);
    expect(
      recordAkuukanE6WinningYaku({
        akuukan: disabled,
        winnerIsSelectedEnemy: true,
        normalYakuIds: ["riichi"]
      })
    ).toBe(disabled);
  });

  it("同じ記録内容なら状態を作り直さない", () => {
    const initial: AkuukanGameState = {
      ...createE6State(),
      e6LastWinningNormalYakuIds: [
        "riichi",
        "pinfu"
      ]
    };

    expect(
      recordAkuukanE6WinningYaku({
        akuukan: initial,
        winnerIsSelectedEnemy: true,
        normalYakuIds: [
          "riichi",
          "pinfu",
          "riichi"
        ]
      })
    ).toBe(initial);
  });

  it("確定した有効役だけを和了結果から記録する", () => {
    const resolution =
      resolveAkuukanWinningYaku(
        createAkuukanWinningYakuCandidates({
          structuralNormalYakuIds: [
            "doubleRiichi",
            "riichi",
            "ryanpeikou",
            "iipeikou"
          ],
          structuralYakumanIds: [],
          isClosed: true
        })
      );
    const recorded =
      recordAkuukanE6WinningYakuAfterWin({
        akuukan: createE6State(),
        winnerIsSelectedEnemy: true,
        winIsValid: true,
        resolution
      });

    expect(
      getAkuukanE6LastWinningNormalYakuIds(
        recorded
      )
    ).toEqual([
      "doubleRiichi",
      "ryanpeikou"
    ]);
  });

  it("無効な和了または有効役なしでは記録を更新しない", () => {
    const initial: AkuukanGameState = {
      ...createE6State(),
      e6LastWinningNormalYakuIds: [
        "riichi"
      ]
    };
    const validResolution =
      resolveAkuukanWinningYaku(
        createAkuukanWinningYakuCandidates({
          structuralNormalYakuIds: [
            "pinfu"
          ],
          structuralYakumanIds: [],
          isClosed: true
        })
      );
    const noYakuResolution =
      resolveAkuukanWinningYaku(
        createAkuukanWinningYakuCandidates({
          structuralNormalYakuIds: [
            "pinfu"
          ],
          structuralYakumanIds: [],
          isClosed: false
        })
      );

    expect(
      recordAkuukanE6WinningYakuAfterWin({
        akuukan: initial,
        winnerIsSelectedEnemy: true,
        winIsValid: false,
        resolution: validResolution
      })
    ).toBe(initial);
    expect(
      recordAkuukanE6WinningYakuAfterWin({
        akuukan: initial,
        winnerIsSelectedEnemy: true,
        winIsValid: true,
        resolution: noYakuResolution
      })
    ).toBe(initial);
  });

  it("役満時も採用構成の有効な通常役を記録する", () => {
    const resolution =
      resolveAkuukanWinningYaku(
        createAkuukanWinningYakuCandidates({
          structuralNormalYakuIds: [
            "menzenTsumo"
          ],
          structuralYakumanIds: [
            "bigThreeDragons"
          ],
          isClosed: true
        })
      );
    const recorded =
      recordAkuukanE6WinningYakuAfterWin({
        akuukan: createE6State(),
        winnerIsSelectedEnemy: true,
        winIsValid: true,
        resolution
      });

    expect(resolution.usesYakumanScoring).toBe(
      true
    );
    expect(
      getAkuukanE6LastWinningNormalYakuIds(
        recorded
      )
    ).toEqual(["menzenTsumo"]);
  });
  
  it("特殊敵本人の流し満貫では記録を空にする", () => {
    const initial: AkuukanGameState = {
      ...createE6State(),
      e6LastWinningNormalYakuIds: [
        "riichi",
        "pinfu"
      ]
    };
    const cleared =
      clearAkuukanE6WinningYakuAfterNagashiMangan(
        {
          akuukan: initial,
          winnerIsSelectedEnemy: true
        }
      );

    expect(
      getAkuukanE6LastWinningNormalYakuIds(
        cleared
      )
    ).toEqual([]);
    expect(
      getAkuukanE6LastWinningNormalYakuIds(
        initial
      )
    ).toEqual(["riichi", "pinfu"]);
  });

  it("他家の流し満貫では記録を消去しない", () => {
    const initial: AkuukanGameState = {
      ...createE6State(),
      e6LastWinningNormalYakuIds: [
        "riichi"
      ]
    };

    expect(
      clearAkuukanE6WinningYakuAfterNagashiMangan(
        {
          akuukan: initial,
          winnerIsSelectedEnemy: false
        }
      )
    ).toBe(initial);
  });
});
