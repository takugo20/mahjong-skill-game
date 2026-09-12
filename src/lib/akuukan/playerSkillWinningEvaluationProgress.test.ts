import { describe, expect, it } from "vitest";
import {
  evaluateWinningHand
} from "../mahjong/winning";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillWinningEvaluationProgress as record
} from "./playerSkillWinningEvaluationProgress";

function evaluate() {
  const evaluation = evaluateWinningHand({
    concealedTiles: [
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7
    ].map((rank, i) => ({
      id: `progress-${i}`,
      suit: "man" as const,
      rank,
      red: i < 5
    })),
    winningTile: { suit: "man", rank: 7 },
    winMethod: "tsumo",
    seatWind: "south",
    prevailingWind: "east",
    riichi: true,
    uraDoraIndicators: [
      { suit: "man", rank: 1 },
      { suit: "man", rank: 1 }
    ]
  });

  if (!evaluation.valid) {
    throw new Error("テストの和了判定に失敗しました。");
  }

  return evaluation;
}

describe("採用された和了構成から解放進捗を記録", () => {
  it("不採用の単騎・七対子構成を記録しない", () => {
    const evaluation = evaluate();
    const best = evaluation.candidates.find(
      candidate => candidate.waitType !== "tanki"
    )!;

    expect(best).toBeDefined();

    const result = record(
      createInitialPlayerSkillGrowthState(),
      {
        evaluation: { ...evaluation, best },
        winnerIsPlayer: true,
        winIsValid: true
      }
    );

    expect(
      result.unlockProgress["tanki-win-count"]
    ).toBe(0);
    expect(
      result.unlockProgress["chiitoitsu-win-count"]
    ).toBe(0);
    expect(
      result.unlockProgress["chinitsu-win-count"]
    ).toBe(1);
  });

  it("採用された単騎構成と赤ドラ5枚・裏ドラ4翻を記録する", () => {
    const evaluation = evaluate();
    const best = evaluation.candidates.find(
      candidate => candidate.waitType === "tanki"
    )!;

    expect(best).toBeDefined();

    const initial = createInitialPlayerSkillGrowthState();

    const result = record(initial, {
      evaluation: { ...evaluation, best },
      winnerIsPlayer: true,
      winIsValid: true
    });

    expect(
      result.unlockProgress["tanki-win-count"]
    ).toBe(1);
    expect(
      result.unlockProgress["win-with-at-least-5-red-dora"]
    ).toBe(1);
    expect(
      result.unlockProgress["win-with-at-least-4-ura-dora"]
    ).toBe(1);
    expect(
      initial.unlockProgress["tanki-win-count"]
    ).toBe(0);
    expect(result.skills).toBe(initial.skills);
  });

  it.each([
    {
      winnerIsPlayer: false,
      winIsValid: true
    },
    {
      winnerIsPlayer: true,
      winIsValid: false
    }
  ])(
    "CPUまたは無効化された和了は記録しない: %j",
    flags => {
      const initial = createInitialPlayerSkillGrowthState();

      expect(
        record(initial, {
          evaluation: evaluate(),
          ...flags
        })
      ).toBe(initial);
    }
  );

  it("和了判定が不成立なら記録しない", () => {
    const initial = createInitialPlayerSkillGrowthState();

    expect(
      record(initial, {
        evaluation: {
          valid: false,
          reason: "noYaku",
          candidates: []
        },
        winnerIsPlayer: true,
        winIsValid: true
      })
    ).toBe(initial);
  });
});
