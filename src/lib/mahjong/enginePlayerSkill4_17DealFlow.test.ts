import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_14,
  canActivatePlayerSkill4_17,
  createInitialGameState,
  skipPlayerSkill3_14
} from "./engine";
import type {
  GameState
} from "./types";

function withPlayerMp(
  state: GameState,
  playerMp: number
): GameState {
  return {
    ...state,
    playerMp
  };
}

describe("プレイヤースキル4-17の配牌時進行", () => {
  it("4-17だけを装備していれば配牌後に交換選択を待つ", () => {
    const state = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [
          { id: "4-17", level: 1 }
        ]
      }
    );

    expect(state.round.phase).toBe(
      "dealAction"
    );
    expect(
      canActivatePlayerSkill4_17(state)
    ).toBe(true);
    expect(state.notice).toContain(
      "手牌整理【序】で交換する牌を選んでください。"
    );
  });

  it("3-14と4-17を両方使える場合は3-14を先に提示する", () => {
    const initial = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [
          { id: "3-14", level: 5 },
          { id: "4-17", level: 5 }
        ]
      }
    );
    const state = withPlayerMp(initial, 900);

    expect(state.round.phase).toBe(
      "dealAction"
    );
    expect(initial.notice).toContain(
      "色即是空を発動するか選んでください。"
    );
  });

  it("3-14発動後もMPが足りれば4-17の選択へ進む", () => {
    const initial = withPlayerMp(
      createInitialGameState(
        () => 0.5,
        {
          enemyId: "enemy-1",
          equippedSkills: [
            { id: "3-14", level: 5 },
            { id: "4-17", level: 5 }
          ]
        }
      ),
      900
    );
    const result =
      activatePlayerSkill3_14(initial);

    expect(result.playerMp).toBe(550);
    expect(result.round.phase).toBe(
      "dealAction"
    );
    expect(
      canActivatePlayerSkill4_17(result)
    ).toBe(true);
    expect(result.notice).toContain(
      "続けて手牌整理【序】"
    );
  });

  it("3-14を見送った場合も4-17の選択へ進む", () => {
    const initial = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [
          { id: "3-14", level: 5 },
          { id: "4-17", level: 5 }
        ]
      }
    );
    const result =
      skipPlayerSkill3_14(initial);

    expect(result.playerMp).toBe(
      initial.playerMp
    );
    expect(result.round.phase).toBe(
      "dealAction"
    );
    expect(
      canActivatePlayerSkill4_17(result)
    ).toBe(true);
    expect(result.notice).toContain(
      "手牌整理【序】で交換する牌を選んでください。"
    );
  });

  it("3-14発動後にMP不足なら4-17を提示せず局を開始する", () => {
    const initial = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [
          { id: "3-14", level: 5 },
          { id: "4-17", level: 5 }
        ]
      }
    );
    const result =
      activatePlayerSkill3_14(initial);

    expect(result.playerMp).toBe(
      initial.playerMp - 350
    );
    expect(result.round.phase).not.toBe(
      "dealAction"
    );
    expect(
      canActivatePlayerSkill4_17(result)
    ).toBe(false);
  });
});
