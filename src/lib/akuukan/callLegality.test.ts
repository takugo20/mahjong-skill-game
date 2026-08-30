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
  isAkuukanCallAllowed
} from "./callLegality";

function createAkuukan(
  enemyId: "enemy-1" | "enemy-2"
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
