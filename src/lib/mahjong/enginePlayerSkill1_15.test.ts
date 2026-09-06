import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill1_15,
  canActivatePlayerSkill1_15,
  createInitialGameState,
  discardTile,
  drawTile
} from "./engine";
import type {
  GameState
} from "./types";

function createState(
  level: 1 | 2 | 3 | 4 | 5 = 2,
  enemyId:
    "enemy-1" | "enemy-6" =
      "enemy-1"
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: [
        { id: "1-15", level }
      ]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = 500;

  return state;
}

function getRemainingTurns(
  state: GameState
): number | null | undefined {
  return state.akuukan?.activeEffects.find(
    (effect) =>
      effect.sourceId ===
      "player-skill:1-15"
  )?.remainingTurns;
}

describe("プレイヤースキル1-15のエンジン統合", () => {
  it("自分の打牌手番にMPを消費して門前回帰を開始する", () => {
    const initial = createState(2);

    expect(
      canActivatePlayerSkill1_15(initial)
    ).toBe(true);

    const activated =
      activatePlayerSkill1_15(initial);

    expect(activated).not.toBe(initial);
    expect(activated.playerMp).toBe(270);
    expect(getRemainingTurns(activated)).toBe(2);
    expect(activated.notice).toBe(
      "門前回帰を発動しました。効果中の和了は門前扱いになります。"
    );
    expect(initial.playerMp).toBe(500);
  });

  it("プレイヤーの正常な打牌ごとに残り巡数を1減らす", () => {
    const activated =
      activatePlayerSkill1_15(
        createState(2)
      );
    const tileId =
      activated.round.players[0]
        .hand[0].id;
    const discarded = discardTile(
      activated,
      tileId
    );

    expect(
      discarded.round.turnNumber
    ).toBe(
      activated.round.turnNumber + 1
    );
    expect(getRemainingTurns(discarded)).toBe(1);
  });

  it("Lv.1は発動後最初の正常な打牌で効果を終了する", () => {
    const activated =
      activatePlayerSkill1_15(
        createState(1)
      );
    const tileId =
      activated.round.players[0]
        .hand[0].id;
    const discarded = discardTile(
      activated,
      tileId
    );

    expect(getRemainingTurns(discarded)).toBeUndefined();
    expect(
      discarded.akuukan?.activeEffects.some(
        (effect) =>
          effect.sourceId ===
          "player-skill:1-15"
      )
    ).toBe(false);
  });

  it("CPUの手番開始では残り巡数を減らさない", () => {
    const activated =
      activatePlayerSkill1_15(
        createState(2)
      );
    const tileId =
      activated.round.players[0]
        .hand[0].id;
    const discarded = discardTile(
      activated,
      tileId
    );
    const cpuDrawn = drawTile(
      discarded,
      1,
      () => 0.5
    );

    expect(getRemainingTurns(discarded)).toBe(1);
    expect(getRemainingTurns(cpuDrawn)).toBe(1);
  });

  it("失敗した打牌では残り巡数を減らさない", () => {
    const activated =
      activatePlayerSkill1_15(
        createState(2)
      );
    const failed = discardTile(
      activated,
      "missing-tile"
    );

    expect(failed.round.turnNumber).toBe(
      activated.round.turnNumber
    );
    expect(getRemainingTurns(failed)).toBe(2);
  });

  it("CPU手番、リアクション中、MP不足では発動できない", () => {
    const cpuTurn = createState();
    cpuTurn.round.currentSeat = 1;
    const reaction = createState();
    reaction.round.phase = "reaction";
    const insufficient = createState(1);
    insufficient.playerMp = 249;

    expect(
      canActivatePlayerSkill1_15(cpuTurn)
    ).toBe(false);
    expect(
      activatePlayerSkill1_15(cpuTurn)
    ).toBe(cpuTurn);
    expect(
      canActivatePlayerSkill1_15(reaction)
    ).toBe(false);
    expect(
      canActivatePlayerSkill1_15(insufficient)
    ).toBe(false);
  });

  it("敵6のE-18で無効化中は発動できない", () => {
    const initial = createState(
      5,
      "enemy-6"
    );

    expect(
      initial.akuukan?.disabledSources
    ).toContain("player-skill:1-15");
    expect(
      canActivatePlayerSkill1_15(initial)
    ).toBe(false);
    expect(
      activatePlayerSkill1_15(initial)
    ).toBe(initial);
  });
});
