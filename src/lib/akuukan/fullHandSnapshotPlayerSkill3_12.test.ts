import {
  describe,
  expect,
  it
} from "vitest";
import {
  clearAkuukanPlayerSkill3_12Snapshot,
  getAkuukanPlayerSkill3_12Snapshot,
  tryActivateAkuukanPlayerSkill3_12
} from "./fullHandSnapshot";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

function createState(
  level: SkillLevel | null = 1,
  playerMp = 500
) {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "3-12", level }]
      }),
    playerMp,
    maxMp: 900,
    marker: "preserved"
  };
}

const targetTiles = [
  {
    id: "target-1",
    suit: "man" as const,
    rank: 1,
    red: false
  },
  {
    id: "target-2",
    suit: "pin" as const,
    rank: 5,
    red: true
  }
];

describe("プレイヤースキル3-12 透牌【全】", () => {
  it("各レベルのMPを消費し、指定相手の手牌を保存する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
    }[] = [
      { level: 1, mpCost: 300 },
      { level: 2, mpCost: 290 },
      { level: 3, mpCost: 280 },
      { level: 4, mpCost: 270 },
      { level: 5, mpCost: 250 }
    ];

    for (const currentCase of cases) {
      const result =
        tryActivateAkuukanPlayerSkill3_12(
          createState(currentCase.level),
          "player-2",
          targetTiles
        );

      expect(result.succeeded).toBe(true);
      expect(result.failureReason).toBeNull();
      expect(result.state.playerMp).toBe(
        500 - currentCase.mpCost
      );
      expect(result.state.marker).toBe(
        "preserved"
      );
      expect(
        getAkuukanPlayerSkill3_12Snapshot(
          result.state.akuukan
        )
      ).toEqual({
        playerId: "player-2",
        tiles: targetTiles
      });
    }
  });

  it("発動後に元の牌が変化しても保存内容は追従しない", () => {
    const mutableTiles = targetTiles.map(
      (tile) => ({ ...tile })
    );
    const result =
      tryActivateAkuukanPlayerSkill3_12(
        createState(),
        "player-3",
        mutableTiles
      );

    mutableTiles[0]!.rank = 9;
    mutableTiles.splice(1, 1);

    expect(
      getAkuukanPlayerSkill3_12Snapshot(
        result.state.akuukan
      )
    ).toEqual({
      playerId: "player-3",
      tiles: targetTiles
    });
  });

  it("保存した手牌を自分の手番終了時に解除できる", () => {
    const result =
      tryActivateAkuukanPlayerSkill3_12(
        createState(),
        "player-1",
        targetTiles
      );
    const cleared =
      clearAkuukanPlayerSkill3_12Snapshot(
        result.state.akuukan
      );

    expect(
      getAkuukanPlayerSkill3_12Snapshot(
        cleared
      )
    ).toBeNull();
  });

  it("MP不足、未装備、E-18無効化中は発動しない", () => {
    const insufficient =
      tryActivateAkuukanPlayerSkill3_12(
        createState(1, 299),
        "player-1",
        targetTiles
      );
    const notEquipped =
      tryActivateAkuukanPlayerSkill3_12(
        createState(null),
        "player-1",
        targetTiles
      );
    const enabled = createState(5);
    const disabled =
      tryActivateAkuukanPlayerSkill3_12(
        {
          ...enabled,
          akuukan: disableAkuukanSource(
            enabled.akuukan,
            "player-skill:3-12"
          )
        },
        "player-1",
        targetTiles
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
