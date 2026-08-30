import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  AkuukanMatchSetup
} from "./types";
import {
  isAkuukanNotenRiichiAllowed,
  isAkuukanOpenRiichiAllowed,
  isAkuukanRiichiProhibited
} from "./riichiLegality";

function createAkuukan(
  setup: AkuukanMatchSetup
) {
  return createInitialAkuukanGameState(
    setup
  );
}

describe("亜空間麻雀の副露立直許可", () => {
  it("2-7を装備したプレイヤーだけに許可する", () => {
    const akuukan = createAkuukan({
      enemyId: "enemy-1",
      equippedSkills: [
        {
          id: "2-7",
          level: 1
        }
      ]
    });

    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan,
        owner: "player"
      })
    ).toBe(true);
    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan,
        owner: "normalOpponent"
      })
    ).toBe(false);
  });

  it("1-15は発動状態に関係なく副露立直を許可しない", () => {
    const base = createAkuukan({
      enemyId: "enemy-1",
      equippedSkills: [
        {
          id: "1-15",
          level: 1
        }
      ]
    });
    const akuukan = {
      ...base,
      activeEffects: [
        {
          instanceId: "menzen-kaiki",
          sourceId:
            "player-skill:1-15" as const,
          remainingTurns: 1
        }
      ]
    };

    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan,
        owner: "player"
      })
    ).toBe(false);
  });

  it("E-14は敵5本人だけに許可する", () => {
    const akuukan = createAkuukan({
      enemyId: "enemy-5",
      equippedSkills: []
    });

    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan,
        owner: "selectedEnemy"
      })
    ).toBe(true);
    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan,
        owner: "normalOpponent"
      })
    ).toBe(false);
    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan,
        owner: "player"
      })
    ).toBe(false);
  });

  it("無効化された2-7とE-14は許可を生成しない", () => {
    const playerAkuukan =
      disableAkuukanSource(
        createAkuukan({
          enemyId: "enemy-1",
          equippedSkills: [
            {
              id: "2-7",
              level: 1
            }
          ]
        }),
        "player-skill:2-7"
      );
    const enemyAkuukan =
      disableAkuukanSource(
        createAkuukan({
          enemyId: "enemy-5",
          equippedSkills: []
        }),
        "enemy-ability:E-14"
      );

    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan: playerAkuukan,
        owner: "player"
      })
    ).toBe(false);
    expect(
      isAkuukanOpenRiichiAllowed({
        akuukan: enemyAkuukan,
        owner: "selectedEnemy"
      })
    ).toBe(false);
  });

  it("E-9は敵3本人以外の立直を禁止する", () => {
    const akuukan = createAkuukan({
      enemyId: "enemy-3",
      equippedSkills: []
    });

    expect(
      isAkuukanRiichiProhibited({
        akuukan,
        owner: "player"
      })
    ).toBe(true);
    expect(
      isAkuukanRiichiProhibited({
        akuukan,
        owner: "normalOpponent"
      })
    ).toBe(true);
    expect(
      isAkuukanRiichiProhibited({
        akuukan,
        owner: "selectedEnemy"
      })
    ).toBe(false);
  });

  it("E-9が存在しないか無効なら立直を禁止しない", () => {
    const otherEnemy = createAkuukan({
      enemyId: "enemy-1",
      equippedSkills: []
    });
    const disabledE9 =
      disableAkuukanSource(
        createAkuukan({
          enemyId: "enemy-3",
          equippedSkills: []
        }),
        "enemy-ability:E-9"
      );

    expect(
      isAkuukanRiichiProhibited({
        akuukan: otherEnemy,
        owner: "player"
      })
    ).toBe(false);
    expect(
      isAkuukanRiichiProhibited({
        akuukan: disabledE9,
        owner: "player"
      })
    ).toBe(false);
  });
});

describe("亜空間麻雀のノーテン立直許可", () => {
  it("E-4は敵2本人だけに許可する", () => {
    const akuukan = createAkuukan({
      enemyId: "enemy-2",
      equippedSkills: []
    });

    expect(
      isAkuukanNotenRiichiAllowed({
        akuukan,
        owner: "selectedEnemy"
      })
    ).toBe(true);
    expect(
      isAkuukanNotenRiichiAllowed({
        akuukan,
        owner: "normalOpponent"
      })
    ).toBe(false);
    expect(
      isAkuukanNotenRiichiAllowed({
        akuukan,
        owner: "player"
      })
    ).toBe(false);
  });

  it("E-4が存在しないか無効なら許可しない", () => {
    const otherEnemy = createAkuukan({
      enemyId: "enemy-1",
      equippedSkills: []
    });
    const disabledE4 =
      disableAkuukanSource(
        createAkuukan({
          enemyId: "enemy-2",
          equippedSkills: []
        }),
        "enemy-ability:E-4"
      );

    expect(
      isAkuukanNotenRiichiAllowed({
        akuukan: otherEnemy,
        owner: "selectedEnemy"
      })
    ).toBe(false);
    expect(
      isAkuukanNotenRiichiAllowed({
        akuukan: disabledE4,
        owner: "selectedEnemy"
      })
    ).toBe(false);
  });
});
