import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  discardTile
} from "./engine";
import type {
  GameState,
  Tile,
  TileSuit
} from "./types";

let nextTileId = 0;

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map((rank) => ({
    id: `skill-3-3-${nextTileId += 1}`,
    suit,
    rank,
    red: false
  }));
}

function createTenpaiHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles(
      "honor",
      [1, 1, 1, 2]
    )
  ];
}

function createNotenHand(): Tile[] {
  return [
    ...createTiles("man", [1, 4, 7]),
    ...createTiles("pin", [1, 4, 7]),
    ...createTiles("sou", [1, 4, 7]),
    ...createTiles(
      "honor",
      [1, 2, 3, 4]
    )
  ];
}

function prepareCpuDiscardState(): {
  state: GameState;
  discardTileId: string;
} {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-3",
        level: 5
      }]
    }
  );
  const extraTile =
    createTiles("honor", [7])[0];

  state.akuukan = {
    ...state.akuukan!,
    playerSkill3_3DamatenPlayerIds: []
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: [
      ...createTenpaiHand(),
      extraTile
    ],
    melds: [],
    riichi: false,
    drawnTileId: extraTile.id
  };
  state.round.players[2] = {
    ...state.round.players[2],
    hand: createNotenHand(),
    melds: [],
    riichi: false
  };
  state.round.players[3] = {
    ...state.round.players[3],
    hand: createNotenHand(),
    melds: [],
    riichi: false
  };
  state.round.currentSeat = 1;
  state.round.phase = "discarding";

  return {
    state,
    discardTileId: extraTile.id
  };
}

describe("プレイヤースキル3-3のエンジン統合", () => {
  it("CPUが打牌後に闇聴へ移行すると察知を通知する", () => {
    const prepared =
      prepareCpuDiscardState();
    const result = discardTile(
      prepared.state,
      prepared.discardTileId,
      false,
      () => 0
    );

    expect(
      result.akuukan
        ?.playerSkill3_3DamatenPlayerIds
    ).toEqual(["player-1"]);
    expect(result.notice).toContain(
      "【闇聴察知】CPU・右の闇聴を察知しました。"
    );
  });

  it("立直宣言牌の打牌では闇聴として察知しない", () => {
    const prepared =
      prepareCpuDiscardState();
    const result = discardTile(
      prepared.state,
      prepared.discardTileId,
      true,
      () => 0
    );

    expect(
      result.akuukan
        ?.playerSkill3_3DamatenPlayerIds
    ).toEqual([]);
    expect(result.notice).not.toContain(
      "【闇聴察知】"
    );
  });
});
