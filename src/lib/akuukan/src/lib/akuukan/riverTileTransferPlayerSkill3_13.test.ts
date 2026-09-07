import {
  describe,
  expect,
  it
} from "vitest";
import {
  clearAkuukanPlayerSkill3_13Transfer,
  completeAkuukanPlayerSkill3_13Discard,
  hasAkuukanPlayerSkill3_13Transfer,
  takeAkuukanPlayerSkill3_13ReservedTile,
  tryActivateAkuukanPlayerSkill3_13
} from "./riverTileTransfer";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource,
  resetAkuukanTurnUsage
} from "./state";
import type {
  AkuukanGameState,
  SkillLevel
} from "./types";

function createState(
  level: SkillLevel | null = 1,
  playerMp = 700
) {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "3-13", level }]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

const firstTile = {
  id: "transfer-1",
  suit: "man" as const,
  rank: 1,
  red: false
};

const secondTile = {
  id: "transfer-2",
  suit: "pin" as const,
  rank: 5,
  red: true
};

function activate(
  level: SkillLevel = 2
): AkuukanGameState {
  const result =
    tryActivateAkuukanPlayerSkill3_13(
      createState(level),
      "target-player"
    );

  if (!result.succeeded) {
    throw new Error(
      "河牌転送を発動できませんでした。"
    );
  }

  return result.state.akuukan;
}

describe("プレイヤースキル3-13 河牌転送", () => {
  it("各レベルのMPと収集巡数を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      durationTurns: number;
    }[] = [
      { level: 1, mpCost: 380, durationTurns: 1 },
      { level: 2, mpCost: 360, durationTurns: 2 },
      { level: 3, mpCost: 340, durationTurns: 3 },
      { level: 4, mpCost: 320, durationTurns: 4 },
      { level: 5, mpCost: 280, durationTurns: 6 }
    ];

    for (const currentCase of cases) {
      const result =
        tryActivateAkuukanPlayerSkill3_13(
          createState(currentCase.level),
          "target-player"
        );

      expect(result.succeeded).toBe(true);
      expect(result.failureReason).toBeNull();
      expect(result.state.playerMp).toBe(
        700 - currentCase.mpCost
      );
      expect(result.state.marker).toBe(
        "preserved"
      );
      expect(
        result.state.akuukan
          .playerSkill3_13Transfer
      ).toEqual({
        targetPlayerId: "target-player",
        remainingCollectionTurns:
          currentCase.durationTurns,
        reservedTiles: []
      });
    }
  });

  it("未使用の捨て牌を順番どおり予約し、収集巡数を減らす", () => {
    const initial = activate(2);
    const afterFirst =
      completeAkuukanPlayerSkill3_13Discard(
        initial,
        firstTile
      );
    const afterSecond =
      completeAkuukanPlayerSkill3_13Discard(
        afterFirst,
        secondTile
      );

    expect(
      afterSecond.playerSkill3_13Transfer
    ).toEqual({
      targetPlayerId: "target-player",
      remainingCollectionTurns: 0,
      reservedTiles: [
        firstTile,
        secondTile
      ]
    });
  });

  it("対象者の通常ツモへFIFOで渡し、最後の予約処理後に状態を除く", () => {
    const queued =
      completeAkuukanPlayerSkill3_13Discard(
        completeAkuukanPlayerSkill3_13Discard(
          activate(2),
          firstTile
        ),
        secondTile
      );

    expect(
      takeAkuukanPlayerSkill3_13ReservedTile(
        queued,
        "other-player"
      )
    ).toBeNull();

    const firstDraw =
      takeAkuukanPlayerSkill3_13ReservedTile(
        queued,
        "target-player"
      );

    expect(firstDraw?.tile).toEqual(
      firstTile
    );
    expect(
      firstDraw?.akuukan
        .playerSkill3_13Transfer
        ?.reservedTiles
    ).toEqual([secondTile]);

    const secondDraw = firstDraw
      ? takeAkuukanPlayerSkill3_13ReservedTile(
          firstDraw.akuukan,
          "target-player"
        )
      : null;

    expect(secondDraw?.tile).toEqual(
      secondTile
    );
    expect(
      secondDraw?.akuukan
        .playerSkill3_13Transfer
    ).toBeUndefined();
  });

  it("副露された捨て牌は予約せず、収集期間だけを進める", () => {
    const completed =
      completeAkuukanPlayerSkill3_13Discard(
        activate(1),
        null
      );

    expect(
      hasAkuukanPlayerSkill3_13Transfer(
        completed
      )
    ).toBe(false);
  });

  it("収集期間または予約牌が残っている間は再発動できない", () => {
    const active = activate(1);
    const withResetUsage =
      resetAkuukanTurnUsage(active);
    const whileCollecting =
      tryActivateAkuukanPlayerSkill3_13(
        {
          ...createState(1),
          akuukan: withResetUsage
        },
        "another-player"
      );
    const queued =
      completeAkuukanPlayerSkill3_13Discard(
        active,
        firstTile
      );
    const whileQueued =
      tryActivateAkuukanPlayerSkill3_13(
        {
          ...createState(1),
          akuukan: resetAkuukanTurnUsage(
            queued
          )
        },
        "another-player"
      );

    expect(
      whileCollecting.failureReason
    ).toBe("sourceUnavailable");
    expect(
      whileQueued.failureReason
    ).toBe("sourceUnavailable");
  });

  it("局終了時に収集期間と未処理予約を消去できる", () => {
    const queued =
      completeAkuukanPlayerSkill3_13Discard(
        activate(2),
        firstTile
      );
    const cleared =
      clearAkuukanPlayerSkill3_13Transfer(
        queued
      );

    expect(
      cleared.playerSkill3_13Transfer
    ).toBeUndefined();
  });

  it("MP不足、未装備、E-18無効化中は発動しない", () => {
    const insufficient =
      tryActivateAkuukanPlayerSkill3_13(
        createState(1, 379),
        "target-player"
      );
    const notEquipped =
      tryActivateAkuukanPlayerSkill3_13(
        createState(null),
        "target-player"
      );
    const enabled = createState(5);
    const disabled =
      tryActivateAkuukanPlayerSkill3_13(
        {
          ...enabled,
          akuukan: disableAkuukanSource(
            enabled.akuukan,
            "player-skill:3-13"
          )
        },
        "target-player"
      );

    expect(insufficient.failureReason).toBe(
      "insufficientMp"
    );
    expect(notEquipped.failureReason).toBe(
      "skillNotEquipped"
    );
    expect(disabled.failureReason).toBe(
      "sourceUnavailable"
    );
  });
});
