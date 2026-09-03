import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  startNextRound
} from "./engine";
import type {
  GameState,
  Tile
} from "./types";

function createState(
  withSkill: boolean,
  enemyId: "enemy-1" | "enemy-6" =
    "enemy-1",
  random: () => number = () => 0
): GameState {
  return createInitialGameState(
    random,
    {
      enemyId,
      equippedSkills: withSkill
        ? [{
            id: "1-1",
            level: 1
          }]
        : []
    }
  );
}

function getRedChanges(
  baselineTiles: readonly Tile[],
  skilledTiles: readonly Tile[]
): Tile[] {
  const baselineRedById = new Map(
    baselineTiles.map((tile) => [
      tile.id,
      tile.red
    ])
  );

  return skilledTiles.filter(
    (tile) =>
      tile.red &&
      baselineRedById.get(tile.id) ===
        false
  );
}

function expectSameTileIds(
  left: readonly Tile[],
  right: readonly Tile[]
): void {
  expect(
    left.map((tile) => tile.id).sort()
  ).toEqual(
    right.map((tile) => tile.id).sort()
  );
}

function endRound(state: GameState): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      phase: "roundEnd",
      abortiveDrawResult: {
        reason: "nineTerminals",
        declarerSeat: 0,
        distinctYaochuCount: 9
      }
    }
  };
}

describe("プレイヤースキル1-1のエンジン統合", () => {
  it("初局の配牌13枚から未赤牌1枚を赤ドラ化する", () => {
    const baseline = createState(false);
    const skilled = createState(true);
    const baselinePlayer =
      baseline.round.players[0];
    const skilledPlayer =
      skilled.round.players[0];
    const changes = getRedChanges(
      baselinePlayer.hand,
      skilledPlayer.hand
    );

    expectSameTileIds(
      baselinePlayer.hand,
      skilledPlayer.hand
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].id).not.toBe(
      skilledPlayer.drawnTileId
    );
    expect(
      skilled.round.players.slice(1)
    ).toEqual(
      baseline.round.players.slice(1)
    );
    expect(skilled.round.liveWall).toEqual(
      baseline.round.liveWall
    );
    expect(skilled.round.deadWall).toEqual(
      baseline.round.deadWall
    );
  });

  it("レベル1の5パーセント判定に失敗すれば配牌を変更しない", () => {
    const baseline = createState(
      false,
      "enemy-1",
      () => 0.05
    );
    const skilled = createState(
      true,
      "enemy-1",
      () => 0.05
    );

    expect(skilled.round.players).toEqual(
      baseline.round.players
    );
    expect(skilled.round.liveWall).toEqual(
      baseline.round.liveWall
    );
    expect(skilled.round.deadWall).toEqual(
      baseline.round.deadWall
    );
  });

  it("敵6のE-18で無効化された1-1は配牌を変更しない", () => {
    const baseline = createState(
      false,
      "enemy-6"
    );
    const disabled = createState(
      true,
      "enemy-6"
    );

    expect(disabled.round.players).toEqual(
      baseline.round.players
    );
    expect(
      disabled.akuukan?.disabledSources
    ).toContain("player-skill:1-1");
  });

  it("次局でも新しい配牌13枚を対象に再判定する", () => {
    const baseline = startNextRound(
      endRound(createState(false)),
      () => 0
    );
    const skilled = startNextRound(
      endRound(createState(true)),
      () => 0
    );
    const baselinePlayer =
      baseline.round.players[0];
    const skilledPlayer =
      skilled.round.players[0];
    const changes = getRedChanges(
      baselinePlayer.hand,
      skilledPlayer.hand
    );

    expectSameTileIds(
      baselinePlayer.hand,
      skilledPlayer.hand
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].id).not.toBe(
      skilledPlayer.drawnTileId
    );
  });

  it("E-19の禁止牌指定より前に1-1を処理する", () => {
    const baseline =
      createInitialGameState(
        () => 0,
        {
          enemyId: "enemy-10",
          equippedSkills: []
        }
      );
    const skilled =
      createInitialGameState(
        () => 0,
        {
          enemyId: "enemy-10",
          equippedSkills: [{
            id: "1-1",
            level: 1
          }]
        }
      );
    const player =
      skilled.round.players[0];
    const changes =
      getRedChanges(
        baseline.round.players[0].hand,
        player.hand
      );
    const expectedForbiddenTileIds =
      player.hand
        .filter(
          (tile) =>
            tile.id !== player.drawnTileId
        )
        .slice(0, 3)
        .map((tile) => tile.id);
    const forbiddenTileIds =
      skilled.akuukan
        ?.e19DiscardRestrictions
        ?.filter(
          (restriction) =>
            restriction.playerId ===
            player.id
        )
        .map(
          (restriction) =>
            restriction.tileId
        );

    expect(
      skilled.akuukan
        ?.e19DiscardRestrictions
    ).toHaveLength(9);
    expect(changes).toHaveLength(1);
    expect(forbiddenTileIds).toEqual(
      expectedForbiddenTileIds
    );
  });
});
