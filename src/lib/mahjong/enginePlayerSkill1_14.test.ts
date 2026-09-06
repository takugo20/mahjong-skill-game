import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill1_14,
  canActivatePlayerSkill1_14,
  createInitialGameState
} from "./engine";
import type {
  GameState
} from "./types";

function createState(
  level: 1 | 2 | 3 | 4 | 5 = 5,
  enemyId:
    "enemy-1" | "enemy-6" =
      "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: [
        { id: "1-14", level }
      ]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.honba = 2;
  state.playerMp = 420;

  return state;
}

describe("プレイヤースキル1-14のエンジン統合", () => {
  it("自分の打牌手番にMPを消費して本場を増やす", () => {
    const initial = createState(5);

    expect(
      canActivatePlayerSkill1_14(initial)
    ).toBe(true);

    const activated =
      activatePlayerSkill1_14(initial);

    expect(activated).not.toBe(initial);
    expect(activated.round.honba).toBe(3);
    expect(activated.playerMp).toBe(390);
    expect(
      activated.akuukan?.usedSources.turn
    ).toContain("player-skill:1-14");
    expect(activated.notice).toBe(
      "心頭滅却を発動し、本場を3本に増やしました。"
    );
    expect(initial.round.honba).toBe(2);
    expect(initial.playerMp).toBe(420);
  });

  it("同じ手番では2回発動できない", () => {
    const first = activatePlayerSkill1_14(
      createState(5)
    );

    expect(
      canActivatePlayerSkill1_14(first)
    ).toBe(false);

    const second =
      activatePlayerSkill1_14(first);

    expect(second).toBe(first);
    expect(second.round.honba).toBe(3);
    expect(second.playerMp).toBe(390);
  });

  it("CPU手番またはリアクション中は発動できない", () => {
    const cpuTurn = createState();
    cpuTurn.round.currentSeat = 1;
    const reaction = createState();
    reaction.round.phase = "reaction";

    expect(
      canActivatePlayerSkill1_14(cpuTurn)
    ).toBe(false);
    expect(
      activatePlayerSkill1_14(cpuTurn)
    ).toBe(cpuTurn);
    expect(
      canActivatePlayerSkill1_14(reaction)
    ).toBe(false);
    expect(
      activatePlayerSkill1_14(reaction)
    ).toBe(reaction);
  });

  it("MP不足では発動できない", () => {
    const initial = createState(1);
    initial.playerMp = 79;

    expect(
      canActivatePlayerSkill1_14(initial)
    ).toBe(false);

    const result =
      activatePlayerSkill1_14(initial);

    expect(result).toBe(initial);
    expect(result.round.honba).toBe(2);
    expect(result.playerMp).toBe(79);
  });

  it("敵6のE-18で無効化中は発動できない", () => {
    const initial = createState(
      5,
      "enemy-6"
    );

    expect(
      initial.akuukan?.disabledSources
    ).toContain("player-skill:1-14");
    expect(
      canActivatePlayerSkill1_14(initial)
    ).toBe(false);
    expect(
      activatePlayerSkill1_14(initial)
    ).toBe(initial);
  });
});
