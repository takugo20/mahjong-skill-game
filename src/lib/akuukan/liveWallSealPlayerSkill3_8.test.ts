import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Tile
} from "../mahjong/types";
import {
  tryActivateAkuukanPlayerSkill3_8
} from "./liveWallSeal";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource,
  resetAkuukanTurnUsage
} from "./state";
import type {
  SkillLevel
} from "./types";

function createTile(rank: number): Tile {
  return {
    id: `wall-seal-${rank}`,
    suit: "man",
    rank,
    red: false
  };
}

function createState(
  level: SkillLevel | null = 1,
  playerMp = 300,
  wallLength = 5
) {
  return {
    akuukan:
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: level === null
          ? []
          : [{ id: "3-8", level }]
      }),
    playerMp,
    maxMp: 900,
    liveWall: Array.from(
      { length: wallLength },
      (_, index) => createTile(index + 1)
    ),
    marker: "preserved"
  };
}

describe("プレイヤースキル3-8 山牌封印", () => {
  it("各レベルのMPと除外枚数を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      mpCost: number;
      removedCount: number;
    }[] = [
      { level: 1, mpCost: 120, removedCount: 1 },
      { level: 2, mpCost: 110, removedCount: 1 },
      { level: 3, mpCost: 100, removedCount: 2 },
      { level: 4, mpCost: 80, removedCount: 2 },
      { level: 5, mpCost: 60, removedCount: 3 }
    ];

    for (const currentCase of cases) {
      const initial = createState(
        currentCase.level
      );
      const result =
        tryActivateAkuukanPlayerSkill3_8(
          initial
        );

      expect(result.succeeded).toBe(true);
      expect(result.failureReason).toBeNull();
      expect(result.state.playerMp).toBe(
        300 - currentCase.mpCost
      );
      expect(result.state.liveWall).toEqual(
        initial.liveWall.slice(
          0,
          -currentCase.removedCount
        )
      );
      expect(result.state.marker).toBe(
        "preserved"
      );
      expect(
        result.state.akuukan.usedSources.turn
      ).toContain("player-skill:3-8");
      expect(initial.liveWall).toHaveLength(5);
      expect(initial.playerMp).toBe(300);
    }
  });

  it("通常山の残数未満なら残っている牌だけを除外する", () => {
    const result =
      tryActivateAkuukanPlayerSkill3_8(
        createState(5, 300, 2)
      );

    expect(result.succeeded).toBe(true);
    expect(result.state.liveWall).toEqual([]);
    expect(result.state.playerMp).toBe(240);
  });

  it("同じ手番では2回発動せず次の手番では再発動できる", () => {
    const first =
      tryActivateAkuukanPlayerSkill3_8(
        createState(1, 300, 5)
      );
    const second =
      tryActivateAkuukanPlayerSkill3_8(
        first.state
      );
    const nextTurnState = {
      ...first.state,
      akuukan: resetAkuukanTurnUsage(
        first.state.akuukan
      )
    };
    const third =
      tryActivateAkuukanPlayerSkill3_8(
        nextTurnState
      );

    expect(first.succeeded).toBe(true);
    expect(second.succeeded).toBe(false);
    expect(second.failureReason).toBe(
      "sourceUnavailable"
    );
    expect(second.state.liveWall).toHaveLength(4);
    expect(third.succeeded).toBe(true);
    expect(third.state.liveWall).toHaveLength(3);
  });

  it("MP不足では山牌を除外せず使用済みにしない", () => {
    const initial = createState(1, 119);
    const result =
      tryActivateAkuukanPlayerSkill3_8(
        initial
      );

    expect(result.succeeded).toBe(false);
    expect(result.failureReason).toBe(
      "insufficientMp"
    );
    expect(result.state).toBe(initial);
    expect(result.state.liveWall).toHaveLength(5);
    expect(result.state.playerMp).toBe(119);
    expect(
      result.state.akuukan.usedSources.turn
    ).toEqual([]);
  });

  it("未装備または無効化中は発動しない", () => {
    const notEquipped = createState(null);
    const enabled = createState(5);
    const disabled = {
      ...enabled,
      akuukan: disableAkuukanSource(
        enabled.akuukan,
        "player-skill:3-8"
      )
    };
    const notEquippedResult =
      tryActivateAkuukanPlayerSkill3_8(
        notEquipped
      );
    const disabledResult =
      tryActivateAkuukanPlayerSkill3_8(
        disabled
      );

    expect(
      notEquippedResult.failureReason
    ).toBe("skillNotEquipped");
    expect(
      disabledResult.failureReason
    ).toBe("sourceUnavailable");
    expect(
      notEquippedResult.state.liveWall
    ).toHaveLength(5);
    expect(
      disabledResult.state.liveWall
    ).toHaveLength(5);
    expect(disabledResult.state.playerMp).toBe(300);
  });
});
