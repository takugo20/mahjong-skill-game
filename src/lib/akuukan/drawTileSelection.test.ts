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
  AkuukanGameState,
  EnemyId
} from "./types";
import {
  activateAkuukanE2DrawRestriction,
  clearAkuukanE2DrawRestriction,
  getAkuukanE2RestrictedPlayerIds,
  isAkuukanE2DrawRestricted
} from "./drawTileSelection";

function createAkuukan(
  enemyId: EnemyId = "enemy-1"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

function activateE2(
  akuukan: AkuukanGameState,
  priorRiichiPlayerIds:
    readonly string[],
  declarerIsSelectedEnemy = true
): AkuukanGameState {
  return activateAkuukanE2DrawRestriction({
    akuukan,
    declarerIsSelectedEnemy,
    priorRiichiPlayerIds
  });
}

describe("E-2のツモ制限対象記録", () => {
  it("敵1本人の追っかけ立直で先行立直者を重複なく記録する", () => {
    const initial = createAkuukan();
    const priorIds = [
      "player-0",
      "player-1",
      "player-0"
    ];
    const activated = activateE2(
      initial,
      priorIds
    );

    expect(activated).not.toBe(initial);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        activated
      )
    ).toEqual([
      "player-0",
      "player-1"
    ]);

    priorIds.push("player-3");

    expect(
      getAkuukanE2RestrictedPlayerIds(
        activated
      )
    ).toEqual([
      "player-0",
      "player-1"
    ]);
  });

  it("特殊能力者本人以外の立直では発動しない", () => {
    const initial = createAkuukan();
    const result = activateE2(
      initial,
      ["player-0"],
      false
    );

    expect(result).toBe(initial);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        result
      )
    ).toEqual([]);
  });

  it("先行立直者がいないかE-2を持たない敵なら発動しない", () => {
    const noPriorRiichi = createAkuukan();
    const otherEnemy = createAkuukan(
      "enemy-2"
    );

    expect(
      activateE2(noPriorRiichi, [])
    ).toBe(noPriorRiichi);
    expect(
      activateE2(
        otherEnemy,
        ["player-0"]
      )
    ).toBe(otherEnemy);
  });

  it("E-2が無効なら発動しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "enemy-ability:E-2"
    );

    expect(
      activateE2(
        disabled,
        ["player-0"]
      )
    ).toBe(disabled);
  });

  it("発動後に立直した者を制限対象へ追加しない", () => {
    const activated = activateE2(
      createAkuukan(),
      ["player-0"]
    );
    const duplicateActivation = activateE2(
      activated,
      ["player-0", "player-3"]
    );

    expect(duplicateActivation).toBe(
      activated
    );
    expect(
      getAkuukanE2RestrictedPlayerIds(
        duplicateActivation
      )
    ).toEqual(["player-0"]);
  });

  it("記録されたプレイヤーだけを制限対象と判定する", () => {
    const akuukan = activateE2(
      createAkuukan(),
      ["player-0", "player-1"]
    );

    expect(
      isAkuukanE2DrawRestricted({
        akuukan,
        playerId: "player-0"
      })
    ).toBe(true);
    expect(
      isAkuukanE2DrawRestricted({
        akuukan,
        playerId: "player-3"
      })
    ).toBe(false);
  });

  it("発動後でもE-2が無効なら制限しない", () => {
    const activated = activateE2(
      createAkuukan(),
      ["player-0"]
    );
    const disabled = disableAkuukanSource(
      activated,
      "enemy-ability:E-2"
    );

    expect(
      isAkuukanE2DrawRestricted({
        akuukan: disabled,
        playerId: "player-0"
      })
    ).toBe(false);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        disabled
      )
    ).toEqual(["player-0"]);
  });

  it("次局用の解除で対象記録を空にする", () => {
    const activated = activateE2(
      createAkuukan(),
      ["player-0"]
    );
    const cleared =
      clearAkuukanE2DrawRestriction(
        activated
      );
    const duplicateClear =
      clearAkuukanE2DrawRestriction(
        cleared
      );

    expect(cleared).not.toBe(activated);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        cleared
      )
    ).toEqual([]);
    expect(duplicateClear).toBe(cleared);
  });
});
