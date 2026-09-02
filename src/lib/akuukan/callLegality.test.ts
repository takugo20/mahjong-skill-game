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
  getAkuukanCallDeposit,
  isAkuukanCallAllowed,
  isAkuukanRonAllowed
} from "./callLegality";

function createAkuukan(
  enemyId:
    | "enemy-1"
    | "enemy-2"
    | "enemy-4"
    | "enemy-8"
    | "enemy-12"
) {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("E-3の副露可否", () => {
  it("他家は1000点以上ならチー・ポン・大明槓できる", () => {
    const akuukan = createAkuukan(
      "enemy-2"
    );

    for (
      const kind of [
        "chi",
        "pon",
        "openKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 1000
        })
      ).toBe(true);
      expect(
        getAkuukanCallDeposit({
          akuukan,
          owner: "normalOpponent",
          kind,
          score: 25000
        })
      ).toBe(1000);
    }
  });

  it("他家は1000点未満ならチー・ポン・大明槓できない", () => {
    const akuukan = createAkuukan(
      "enemy-2"
    );

    for (
      const owner of [
        "player",
        "normalOpponent"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner,
          kind: "pon",
          score: 999
        })
      ).toBe(false);
      expect(
        getAkuukanCallDeposit({
          akuukan,
          owner,
          kind: "openKan",
          score: 999
        })
      ).toBe(0);
    }
  });

  it("E-3所有者本人の副露には点数制限も供託もない", () => {
    const akuukan = createAkuukan(
      "enemy-2"
    );

    expect(
      isAkuukanCallAllowed({
        akuukan,
        owner: "selectedEnemy",
        kind: "pon",
        score: 0
      })
    ).toBe(true);
    expect(
      getAkuukanCallDeposit({
        akuukan,
        owner: "selectedEnemy",
        kind: "openKan",
        score: 25000
      })
    ).toBe(0);
  });

  it("暗槓と加槓はE-3の対象外にする", () => {
    const akuukan = createAkuukan(
      "enemy-2"
    );

    for (
      const kind of [
        "closedKan",
        "addedKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 0
        })
      ).toBe(true);
      expect(
        getAkuukanCallDeposit({
          akuukan,
          owner: "normalOpponent",
          kind,
          score: 25000
        })
      ).toBe(0);
    }
  });

  it("E-3が存在しないか無効なら制限も供託もない", () => {
    const otherEnemy = createAkuukan(
      "enemy-1"
    );
    const disabledE3 =
      disableAkuukanSource(
        createAkuukan("enemy-2"),
        "enemy-ability:E-3"
      );

    for (const akuukan of [
      otherEnemy,
      disabledE3
    ]) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind: "chi",
          score: 0
        })
      ).toBe(true);
      expect(
        getAkuukanCallDeposit({
          akuukan,
          owner: "player",
          kind: "chi",
          score: 25000
        })
      ).toBe(0);
    }
  });
});

describe("E-8の副露・暗槓禁止", () => {
  it("敵4以外の家はチー・ポン・大明槓・暗槓できない", () => {
    const akuukan = createAkuukan(
      "enemy-4"
    );

    for (
      const owner of [
        "player",
        "normalOpponent"
      ] as const
    ) {
      for (
        const kind of [
          "chi",
          "pon",
          "openKan",
          "closedKan"
        ] as const
      ) {
        expect(
          isAkuukanCallAllowed({
            akuukan,
            owner,
            kind,
            score: 25000
          })
        ).toBe(false);
      }
    }
  });

  it("敵4本人はすべての副露・槓を宣言できる", () => {
    const akuukan = createAkuukan(
      "enemy-4"
    );

    for (
      const kind of [
        "chi",
        "pon",
        "openKan",
        "closedKan",
        "addedKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "selectedEnemy",
          kind,
          score: 0
        })
      ).toBe(true);
    }
  });

  it("敵4以外の家でも加槓はできる", () => {
    const akuukan = createAkuukan(
      "enemy-4"
    );

    for (
      const owner of [
        "player",
        "normalOpponent"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner,
          kind: "addedKan",
          score: 0
        })
      ).toBe(true);
      expect(
        getAkuukanCallDeposit({
          akuukan,
          owner,
          kind: "addedKan",
          score: 25000
        })
      ).toBe(0);
    }
  });

  it("E-8が存在しないか無効なら副露・暗槓を禁止しない", () => {
    const otherEnemy = createAkuukan(
      "enemy-1"
    );
    const disabledE8 =
      disableAkuukanSource(
        createAkuukan("enemy-4"),
        "enemy-ability:E-8"
      );

    for (const akuukan of [
      otherEnemy,
      disabledE8
    ]) {
      for (
        const kind of [
          "chi",
          "pon",
          "openKan",
          "closedKan"
        ] as const
      ) {
        expect(
          isAkuukanCallAllowed({
            akuukan,
            owner: "player",
            kind,
            score: 0
          })
        ).toBe(true);
      }
    }
  });
});

describe("E-13のプレイヤー副露禁止", () => {
  it("プレイヤーはチー・ポン・大明槓できない", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    for (
      const kind of [
        "chi",
        "pon",
        "openKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 25000
        })
      ).toBe(false);
    }
  });

  it("プレイヤー自身の暗槓・加槓はできる", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    for (
      const kind of [
        "closedKan",
        "addedKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 0
        })
      ).toBe(true);
    }
  });

  it("敵8と通常CPUはすべての副露・槓を宣言できる", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    for (
      const owner of [
        "selectedEnemy",
        "normalOpponent"
      ] as const
    ) {
      for (
        const kind of [
          "chi",
          "pon",
          "openKan",
          "closedKan",
          "addedKan"
        ] as const
      ) {
        expect(
          isAkuukanCallAllowed({
            akuukan,
            owner,
            kind,
            score: 0
          })
        ).toBe(true);
      }
    }
  });

  it("E-13が無効ならプレイヤーの副露を禁止しない", () => {
    const akuukan =
      disableAkuukanSource(
        createAkuukan("enemy-8"),
        "enemy-ability:E-13"
      );

    for (
      const kind of [
        "chi",
        "pon",
        "openKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 0
        })
      ).toBe(true);
    }
  });

  it("E-13を持たない敵ならプレイヤーの副露を禁止しない", () => {
    const akuukan = createAkuukan(
      "enemy-1"
    );

    for (
      const kind of [
        "chi",
        "pon",
        "openKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 0
        })
      ).toBe(true);
    }
  });
});

describe("E-13のプレイヤーロン禁止", () => {
  it("プレイヤーはロンできない", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    expect(
      isAkuukanRonAllowed({
        akuukan,
        winner: "player"
      })
    ).toBe(false);
  });

  it("敵8と通常CPUはロンできる", () => {
    const akuukan = createAkuukan(
      "enemy-8"
    );

    for (const winner of [
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      expect(
        isAkuukanRonAllowed({
          akuukan,
          winner
        })
      ).toBe(true);
    }
  });

  it("E-13が無効ならプレイヤーもロンできる", () => {
    const akuukan =
      disableAkuukanSource(
        createAkuukan("enemy-8"),
        "enemy-ability:E-13"
      );

    expect(
      isAkuukanRonAllowed({
        akuukan,
        winner: "player"
      })
    ).toBe(true);
  });

  it("E-13を持たない敵ならプレイヤーもロンできる", () => {
    const akuukan = createAkuukan(
      "enemy-1"
    );

    expect(
      isAkuukanRonAllowed({
        akuukan,
        winner: "player"
      })
    ).toBe(true);
  });
});

describe("E-24の捨て牌への反応禁止", () => {
  it("敵12の捨て牌にはチー・ポン・大明槓できない", () => {
    const akuukan = createAkuukan(
      "enemy-12"
    );

    for (
      const owner of [
        "player",
        "normalOpponent"
      ] as const
    ) {
      for (
        const kind of [
          "chi",
          "pon",
          "openKan"
        ] as const
      ) {
        expect(
          isAkuukanCallAllowed({
            akuukan,
            owner,
            kind,
            score: 25000,
            discardOwner:
              "selectedEnemy"
          })
        ).toBe(false);
      }
    }
  });

  it("敵12以外の捨て牌には通常どおり副露できる", () => {
    const akuukan = createAkuukan(
      "enemy-12"
    );

    for (
      const kind of [
        "chi",
        "pon",
        "openKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 25000,
          discardOwner:
            "normalOpponent"
        })
      ).toBe(true);
    }
  });

  it("暗槓と加槓は敵12の能力の対象外にする", () => {
    const akuukan = createAkuukan(
      "enemy-12"
    );

    for (
      const kind of [
        "closedKan",
        "addedKan"
      ] as const
    ) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind,
          score: 0
        })
      ).toBe(true);
    }
  });

  it("E-24が存在しないか無効なら副露を禁止しない", () => {
    const otherEnemy = createAkuukan(
      "enemy-1"
    );
    const disabledE24 =
      disableAkuukanSource(
        createAkuukan("enemy-12"),
        "enemy-ability:E-24"
      );

    for (const akuukan of [
      otherEnemy,
      disabledE24
    ]) {
      expect(
        isAkuukanCallAllowed({
          akuukan,
          owner: "player",
          kind: "pon",
          score: 25000,
          discardOwner:
            "selectedEnemy"
        })
      ).toBe(true);
    }
  });

  it("敵12の捨て牌にはどの家もロンできない", () => {
    const akuukan = createAkuukan(
      "enemy-12"
    );

    for (const winner of [
      "player",
      "selectedEnemy",
      "normalOpponent"
    ] as const) {
      expect(
        isAkuukanRonAllowed({
          akuukan,
          winner,
          discardOwner:
            "selectedEnemy"
        })
      ).toBe(false);
    }
  });

  it("他家の捨て牌と槍槓では通常どおりロンできる", () => {
    const akuukan = createAkuukan(
      "enemy-12"
    );

    expect(
      isAkuukanRonAllowed({
        akuukan,
        winner: "player",
        discardOwner:
          "normalOpponent"
      })
    ).toBe(true);
    expect(
      isAkuukanRonAllowed({
        akuukan,
        winner: "player"
      })
    ).toBe(true);
  });

  it("E-24が存在しないか無効ならロンを禁止しない", () => {
    const otherEnemy = createAkuukan(
      "enemy-1"
    );
    const disabledE24 =
      disableAkuukanSource(
        createAkuukan("enemy-12"),
        "enemy-ability:E-24"
      );

    for (const akuukan of [
      otherEnemy,
      disabledE24
    ]) {
      expect(
        isAkuukanRonAllowed({
          akuukan,
          winner: "player",
          discardOwner:
            "selectedEnemy"
        })
      ).toBe(true);
    }
  });
});
