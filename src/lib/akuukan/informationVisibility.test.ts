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
  areAkuukanDoraIndicatorsVisible,
  areAkuukanHandTilesVisible,
  areAkuukanRiverTilesVisible
} from "./informationVisibility";

function createAkuukan(
  enemyId:
    | "enemy-1"
    | "enemy-2"
    | "enemy-6"
    | "enemy-8"
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

describe("E-10の手牌可視性", () => {
  it("全員が自分の手牌を見られる", () => {
    const akuukan = createAkuukan(
      "enemy-6"
    );

    for (const viewer of [
      "player",
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      expect(
        areAkuukanHandTilesVisible({
          akuukan,
          viewer,
          viewerIsHandOwner: true
        })
      ).toBe(true);
    }
  });

  it("敵6本人には他家の手牌を見せる", () => {
    const akuukan = createAkuukan(
      "enemy-6"
    );

    expect(
      areAkuukanHandTilesVisible({
        akuukan,
        viewer: "selectedEnemy",
        viewerIsHandOwner: false
      })
    ).toBe(true);
  });

  it("敵6戦でもプレイヤーと通常CPUには他家の手牌を見せない", () => {
    const akuukan = createAkuukan(
      "enemy-6"
    );

    for (const viewer of [
      "player",
      "normalOpponent"
    ] as const) {
      expect(
        areAkuukanHandTilesVisible({
          akuukan,
          viewer,
          viewerIsHandOwner: false
        })
      ).toBe(false);
    }
  });

  it("E-10を持たない敵本人には他家の手牌を見せない", () => {
    const akuukan = createAkuukan(
      "enemy-2"
    );

    expect(
      areAkuukanHandTilesVisible({
        akuukan,
        viewer: "selectedEnemy",
        viewerIsHandOwner: false
      })
    ).toBe(false);
  });

  it("E-10が無効なら敵6本人にも他家の手牌を見せない", () => {
    const akuukan =
      disableAkuukanSource(
        createAkuukan("enemy-6"),
        "enemy-ability:E-10"
      );

    expect(
      areAkuukanHandTilesVisible({
        akuukan,
        viewer: "selectedEnemy",
        viewerIsHandOwner: false
      })
    ).toBe(false);
  });
});

describe("E-13の河可視性", () => {
  it("プレイヤーには自分の河を見せる", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    expect(
      areAkuukanRiverTilesVisible({
        akuukan,
        viewer: "player",
        riverOwner: "player"
      })
    ).toBe(true);
  });

  it("プレイヤーには他家3人の河を見せない", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    for (const riverOwner of [
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      expect(
        areAkuukanRiverTilesVisible({
          akuukan,
          viewer: "player",
          riverOwner
        })
      ).toBe(false);
    }
  });

  it("CPUにはすべての河を見せる", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    for (const viewer of [
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      for (const riverOwner of [
        "player",
        "selectedEnemy",
        "normalOpponent"
      ] as const) {
        expect(
          areAkuukanRiverTilesVisible({
            akuukan,
            viewer,
            riverOwner
          })
        ).toBe(true);
      }
    }
  });

  it("E-13を持たない敵なら全員にすべての河を見せる", () => {
    const akuukan = createAkuukan(
      "enemy-2"
    );

    for (const viewer of [
      "player",
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      for (const riverOwner of [
        "player",
        "selectedEnemy",
        "normalOpponent"
      ] as const) {
        expect(
          areAkuukanRiverTilesVisible({
            akuukan,
            viewer,
            riverOwner
          })
        ).toBe(true);
      }
    }
  });

  it("E-13が無効なら全員にすべての河を見せる", () => {
    const akuukan =
      disableAkuukanSource(
        createAkuukan("enemy-8"),
        "enemy-ability:E-13"
      );

    for (const viewer of [
      "player",
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      for (const riverOwner of [
        "player",
        "selectedEnemy",
        "normalOpponent"
      ] as const) {
        expect(
          areAkuukanRiverTilesVisible({
            akuukan,
            viewer,
            riverOwner
          })
        ).toBe(true);
      }
    }
  });
});
