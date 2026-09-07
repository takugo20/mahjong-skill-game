import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_12,
  canActivatePlayerSkill3_12,
  createInitialGameState,
  discardTile
} from "./engine";
import type {
  GameState
} from "./types";

function createState(
  playerMp = 500
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-12",
        level: 1
      }]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = playerMp;

  return state;
}

describe("プレイヤースキル3-12 透牌【全】のエンジン統合", () => {
  it("自分の打牌手番に相手1人を指定して発動する", () => {
    const state = createState();
    const target = state.round.players[2];
    const expectedTiles = target.hand.map(
      (tile) => ({ ...tile })
    );

    expect(
      canActivatePlayerSkill3_12(
        state,
        2
      )
    ).toBe(true);

    const activated =
      activatePlayerSkill3_12(
        state,
        2
      );

    expect(activated.playerMp).toBe(200);
    expect(
      activated.akuukan
        ?.playerSkill3_12Snapshot
    ).toEqual({
      playerId: target.id,
      tiles: expectedTiles
    });
    expect(
      activated.akuukan?.usedSources.turn
    ).toContain("player-skill:3-12");
    expect(activated.notice).toBe(
      `透牌【全】を発動し、${target.name}の手牌を記録しました。`
    );
    expect(
      canActivatePlayerSkill3_12(
        activated,
        1
      )
    ).toBe(false);
    expect(
      activatePlayerSkill3_12(
        activated,
        1
      )
    ).toBe(activated);
  });

  it("保存後に対象の実際の手牌が変化しても記録は変化しない", () => {
    const activated =
      activatePlayerSkill3_12(
        createState(),
        3
      );
    const snapshotBefore =
      activated.akuukan
        ?.playerSkill3_12Snapshot;
    const targetTile =
      activated.round.players[3]
        .hand[0];

    if (!targetTile) {
      throw new Error(
        "対象の手牌がありません。"
      );
    }

    targetTile.rank =
      targetTile.rank === 9
        ? 1
        : targetTile.rank + 1;
    activated.round.players[3]
      .hand.pop();

    expect(
      activated.akuukan
        ?.playerSkill3_12Snapshot
    ).toEqual(snapshotBefore);
  });

  it("プレイヤーが打牌すると保存した手牌を解除する", () => {
    const activated =
      activatePlayerSkill3_12(
        createState(),
        1
      );
    const discardTileId =
      activated.round.players[0]
        .hand[0]?.id;

    if (!discardTileId) {
      throw new Error(
        "プレイヤーの手牌がありません。"
      );
    }

    const discarded = discardTile(
      activated,
      discardTileId,
      false,
      () => 0.5
    );

    expect(
      discarded.akuukan
        ?.playerSkill3_12Snapshot
    ).toBeUndefined();
  });

  it("自分自身、CPU手番、リアクション中は発動できない", () => {
    const selfTarget = createState();
    const cpuTurn = createState();
    cpuTurn.round.currentSeat = 1;
    const reaction = createState();
    reaction.round.phase = "reaction";

    expect(
      canActivatePlayerSkill3_12(
        selfTarget,
        0
      )
    ).toBe(false);
    expect(
      activatePlayerSkill3_12(
        selfTarget,
        0
      )
    ).toBe(selfTarget);
    expect(
      canActivatePlayerSkill3_12(
        cpuTurn,
        2
      )
    ).toBe(false);
    expect(
      canActivatePlayerSkill3_12(
        reaction,
        2
      )
    ).toBe(false);
  });
});
