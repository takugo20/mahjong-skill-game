import {
  describe,
  expect,
  it
} from "vitest";
import {
  isAkuukanCallAllowed,
  isAkuukanRonAllowed
} from "./callLegality";
import {
  tryActivateAkuukanPlayerSkill3_14
} from "./opponentActionRestrictionPlayerSkill3_14";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

function createActiveAkuukan() {
  const result =
    tryActivateAkuukanPlayerSkill3_14({
      akuukan:
        createInitialAkuukanGameState({
          enemyId: "enemy-1",
          equippedSkills: [
            { id: "3-14", level: 5 }
          ]
        }),
      playerMp: 900,
      maxMp: 900
    });

  if (!result.succeeded) {
    throw new Error(
      "スキル3-14を発動できませんでした。"
    );
  }

  return result.state.akuukan;
}

describe("色即是空の副露制限", () => {
  it("効果中は全他家の5種類の副露を禁止する", () => {
    const akuukan = createActiveAkuukan();

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
            score: 25000
          })
        ).toBe(false);
      }
    }
  });

  it("効果中もプレイヤーの副露は制限しない", () => {
    const akuukan = createActiveAkuukan();

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
          owner: "player",
          kind,
          score: 25000
        })
      ).toBe(true);
    }
  });

  it("効果中も他家のロンは制限しない", () => {
    const akuukan = createActiveAkuukan();

    for (
      const winner of [
        "selectedEnemy",
        "normalOpponent"
      ] as const
    ) {
      expect(
        isAkuukanRonAllowed({
          akuukan,
          winner,
          discardOwner: "player"
        })
      ).toBe(true);
    }
  });

  it("発動元が無効化されたら他家の副露制限を解除する", () => {
    const akuukan = disableAkuukanSource(
      createActiveAkuukan(),
      "player-skill:3-14"
    );

    expect(
      isAkuukanCallAllowed({
        akuukan,
        owner: "selectedEnemy",
        kind: "pon",
        score: 25000
      })
    ).toBe(true);
    expect(
      isAkuukanCallAllowed({
        akuukan,
        owner: "normalOpponent",
        kind: "closedKan",
        score: 25000
      })
    ).toBe(true);
  });
});
