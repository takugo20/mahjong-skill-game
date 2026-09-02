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
  getAkuukanNormalTurnActionCount,
  shouldStartAkuukanAdditionalNormalAction
} from "./turnCountChange";

function createState(
  enemyId: EnemyId = "enemy-13"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("E-25の通常手番回数", () => {
  it("選択中の敵13本人は通常行動を2回行う", () => {
    expect(
      getAkuukanNormalTurnActionCount({
        akuukan: createState(),
        actorIsSelectedEnemy: true
      })
    ).toBe(2);
  });

  it("敵13以外の打ち手は通常行動を1回だけ行う", () => {
    expect(
      getAkuukanNormalTurnActionCount({
        akuukan: createState(),
        actorIsSelectedEnemy: false
      })
    ).toBe(1);
  });

  it("E-25を持たない敵は通常行動を1回だけ行う", () => {
    expect(
      getAkuukanNormalTurnActionCount({
        akuukan: createState("enemy-12"),
        actorIsSelectedEnemy: true
      })
    ).toBe(1);
  });

  it("E-25が無効化されている場合は通常行動を1回だけ行う", () => {
    const disabled = disableAkuukanSource(
      createState(),
      "enemy-ability:E-25"
    );

    expect(
      getAkuukanNormalTurnActionCount({
        akuukan: disabled,
        actorIsSelectedEnemy: true
      })
    ).toBe(1);
  });
});

describe("E-25の追加通常行動判定", () => {
  it("1回目の打牌が中断されず完了した場合は2回目へ進む", () => {
    expect(
      shouldStartAkuukanAdditionalNormalAction({
        akuukan: createState(),
        actorIsSelectedEnemy: true,
        completedActionCount: 1,
        result: "uninterruptedDiscard"
      })
    ).toBe(true);
  });

  it("敵13以外の打ち手は2回目へ進まない", () => {
    expect(
      shouldStartAkuukanAdditionalNormalAction({
        akuukan: createState(),
        actorIsSelectedEnemy: false,
        completedActionCount: 1,
        result: "uninterruptedDiscard"
      })
    ).toBe(false);
  });

  it("2回目の完了後は3回目へ進まない", () => {
    expect(
      shouldStartAkuukanAdditionalNormalAction({
        akuukan: createState(),
        actorIsSelectedEnemy: true,
        completedActionCount: 2,
        result: "uninterruptedDiscard"
      })
    ).toBe(false);
  });

  it.each([
    "reactionPending",
    "tsumoWin",
    "ron",
    "call",
    "abortiveDraw",
    "exhaustiveDraw"
  ] as const)(
    "%sが発生した場合は直ちに2回目へ進まない",
    (result) => {
      expect(
        shouldStartAkuukanAdditionalNormalAction({
          akuukan: createState(),
          actorIsSelectedEnemy: true,
          completedActionCount: 1,
          result
        })
      ).toBe(false);
    }
  );
});
