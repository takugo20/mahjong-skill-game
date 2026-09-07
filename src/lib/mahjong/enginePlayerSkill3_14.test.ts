import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_14,
  canActivatePlayerSkill3_14,
  createInitialGameState,
  createNextRoundProgression,
  createPlayerDealActionProgression,
  skipPlayerSkill3_14
} from "./engine";
import type {
  GameState
} from "./types";

function createState(
  playerMp = 700
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-14",
        level: 5
      }]
    }
  );

  state.playerMp = playerMp;
  state.round.phase = "dealAction";

  return state;
}

describe("プレイヤースキル3-14のエンジン統合", () => {
  it("配牌時に発動してMPを消費し、打牌状態へ進む", () => {
    const state = createState();

    expect(
      canActivatePlayerSkill3_14(state)
    ).toBe(true);

    const activated =
      activatePlayerSkill3_14(state);

    expect(activated.playerMp).toBe(350);
    expect(activated.round.phase).toBe(
      "discarding"
    );
    expect(
      activated.akuukan?.activeEffects
    ).toContainEqual({
      instanceId:
        "player-skill:3-14:opponent-action-restriction",
      sourceId: "player-skill:3-14",
      remainingTurns: 6
    });
    expect(activated.notice).toContain(
      "色即是空を発動しました"
    );
  });

  it("発動を見送ってもMPを消費せず、打牌状態へ進む", () => {
    const state = createState();
    const skipped =
      skipPlayerSkill3_14(state);

    expect(skipped.playerMp).toBe(700);
    expect(skipped.round.phase).toBe(
      "discarding"
    );
    expect(
      skipped.akuukan?.activeEffects
    ).toEqual([]);
    expect(
      skipped.akuukan?.usedSources.round
    ).toEqual([]);
    expect(skipped.notice).toContain(
      "発動せず"
    );
  });

  it("親がCPUなら発動選択後にツモ状態へ進む", () => {
    const state = createState();

    state.round.currentSeat = 1;

    const activated =
      activatePlayerSkill3_14(state);

    expect(activated.round.phase).toBe(
      "drawing"
    );
  });

  it("配牌時以外またはMP不足では発動しない", () => {
    const normalTurn = createState();

    normalTurn.round.phase = "discarding";

    const insufficientMp = createState(349);

    expect(
      canActivatePlayerSkill3_14(normalTurn)
    ).toBe(false);
    expect(
      activatePlayerSkill3_14(normalTurn)
    ).toBe(normalTurn);
    expect(
      canActivatePlayerSkill3_14(
        insufficientMp
      )
    ).toBe(false);
    expect(
      activatePlayerSkill3_14(
        insufficientMp
      )
    ).toBe(insufficientMp);
  });

    it("次局のMP回復後に選択を待ち、CPU親でも選択後に進行する", () => {
    const state = skipPlayerSkill3_14(
      createState()
    );

    state.playerMp = 100;
    state.round.phase = "roundEnd";
    state.round.winResult = {
      winMethod: "tsumo",
      winnerSeat: 1,
      loserSeat: null,
      winningTile: {
        id: "player-skill-3-14-next-round-win",
        suit: "man",
        rank: 1,
        red: false
      },
      yakuNames: ["門前清自摸和"],
      han: 1,
      fu: 30,
      yakumanMultiplier: 0,
      limitName: null,
      totalPoints: 1000,
      pointChanges: []
    };

    const nextRound =
      createNextRoundProgression(
        state,
        () => 0.5
      );

    expect(
      nextRound.stateAfterStart.round.phase
    ).toBe("dealAction");
    expect(
      nextRound.stateAfterStart.round
        .currentSeat
    ).toBe(1);
    expect(
      nextRound.stateAfterStart.playerMp
    ).toBe(490);
    expect(nextRound.cpuSteps).toEqual([]);

    const activated =
      createPlayerDealActionProgression(
        nextRound.stateAfterStart,
        true,
        () => 0.5
      );

    expect(
      activated.stateAfterAction.playerMp
    ).toBe(140);
    expect(
      activated.stateAfterAction.round.phase
    ).toBe("drawing");
    expect(
      activated.cpuSteps.length
    ).toBeGreaterThan(0);
  });
});
