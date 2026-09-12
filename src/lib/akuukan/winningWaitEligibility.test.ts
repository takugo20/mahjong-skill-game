import { describe, expect, it } from "vitest";
import {
  evaluateWinningHand
} from "../mahjong/winning";
import type { Tile } from "../mahjong/types";
import {
  hasAkuukanLegalWinningWait as hasWait
} from "./winningWaitEligibility";

function evaluate(ranks: number[]) {
  const concealedTiles: Tile[] = ranks.map(
    (rank, i) => ({
      id: `wait-${i}`,
      suit: "man",
      rank,
      red: false
    })
  );

  return evaluateWinningHand({
    concealedTiles,
    winningTile: { suit: "man", rank: 7 },
    winMethod: "tsumo",
    seatWind: "south",
    prevailingWind: "east"
  });
}

describe("合法な和了構成の待ち判定", () => {
  it("最高得点の構成以外にある単騎待ちも認める", () => {
    const evaluation = evaluate([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7
    ]);

    expect(evaluation.valid).toBe(true);

    if (!evaluation.valid) {
      throw new Error("和了形ではありません。");
    }

    const nonTanki = evaluation.candidates.find(
      candidate => candidate.waitType !== "tanki"
    );

    expect(nonTanki).toBeDefined();

    expect(
      hasWait(
        {
          ...evaluation,
          best: nonTanki!
        },
        ["tanki"]
      )
    ).toBe(true);
  });

  it("単騎以外の構成だけなら対象にしない", () => {
    const evaluation = evaluate([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7
    ]);

    if (!evaluation.valid) {
      throw new Error("和了形ではありません。");
    }

    const candidates = evaluation.candidates.filter(
      candidate => candidate.waitType !== "tanki"
    );

    expect(candidates.length).toBeGreaterThan(0);

    expect(
      hasWait(
        {
          ...evaluation,
          best: candidates[0],
          candidates
        },
        ["tanki"]
      )
    ).toBe(false);
  });

  it("和了できない牌姿は対象にしない", () => {
    expect(
      hasWait(evaluate([1, 2, 3]), ["tanki"])
    ).toBe(false);
  });

  it("判定結果や対象の待ちがなければ対象にしない", () => {
    expect(hasWait(null, ["tanki"])).toBe(false);
    expect(hasWait(undefined, ["tanki"])).toBe(false);

    expect(
      hasWait(
        evaluate([
          1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7
        ]),
        []
      )
    ).toBe(false);
  });
});
