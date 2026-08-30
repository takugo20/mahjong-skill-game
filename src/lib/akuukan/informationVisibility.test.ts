import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import {
  areAkuukanDoraIndicatorsVisible
} from "./informationVisibility";

function createAkuukan(
  enemyId: "enemy-1" | "enemy-2"
) {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("E-1のドラ表示牌可視性", () => {
  it("敵1本人にはドラ表示牌を見せる", () => {
    const akuukan = createAkuukan(
      "enemy-1"
    );

    expect(
      areAkuukanDoraIndicatorsVisible({
        akuukan,
        viewer: "selectedEnemy"
      })
    ).toBe(true);
  });

  it("プレイヤーにはドラ表示牌を見せない", () => {
    const akuukan = createAkuukan(
      "enemy-1"
    );

    expect(
      areAkuukanDoraIndicatorsVisible({
        akuukan,
        viewer: "player"
      })
    ).toBe(false);
  });

  it("通常CPUにはドラ表示牌を見せない", () => {
    const akuukan = createAkuukan(
      "enemy-1"
    );

    expect(
      areAkuukanDoraIndicatorsVisible({
        akuukan,
        viewer: "normalOpponent"
      })
    ).toBe(false);
  });

  it("E-1を持たない敵なら全員に見せる", () => {
    const akuukan = createAkuukan(
      "enemy-2"
    );

    for (const viewer of [
      "player",
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      expect(
        areAkuukanDoraIndicatorsVisible({
          akuukan,
          viewer
        })
      ).toBe(true);
    }
  });

  it("E-1が無効なら全員に見せる", () => {
    const akuukan =
      disableAkuukanSource(
        createAkuukan("enemy-1"),
        "enemy-ability:E-1"
      );

    for (const viewer of [
      "player",
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      expect(
        areAkuukanDoraIndicatorsVisible({
          akuukan,
          viewer
        })
      ).toBe(true);
    }
  });
});
