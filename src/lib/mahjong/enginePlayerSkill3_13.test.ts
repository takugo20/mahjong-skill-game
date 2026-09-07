import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_13,
  canActivatePlayerSkill3_13,
  createInitialGameState,
  createPlayerDiscardProgression,
  playPlayerDiscard
} from "./engine";
import type {
  GameState,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-3-13-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createState(
  level: 1 | 2 | 3 | 4 | 5 = 2,
  playerMp = 700
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-13",
        level
      }]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = playerMp;

  return state;
}

function setEmptyCpuHand(
  state: GameState,
  seat: 1 | 2 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

function setShortLiveWall(
  state: GameState
): void {
  state.round.liveWall = [
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4)
  ];
}

function createPonHand(
  discardAfterCall: Tile
): Tile[] {
  return [
    ...createTiles("honor", [5, 5]),
    ...createTiles("man", [2, 2]),
    discardAfterCall,
    ...createTiles(
      "pin",
      [1, 2, 3, 4, 5, 6]
    ),
    ...createTiles("sou", [7, 8])
  ];
}

function setPlayerDiscardOnly(
  state: GameState,
  tile: Tile
): void {
  state.round.players[0] = {
    ...state.round.players[0],
    hand: [tile],
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: tile.id,
    drawnTileSource: "liveWall"
  };
}

describe("プレイヤースキル3-13 河牌転送のエンジン統合", () => {
  it("自分の打牌手番に相手1人を指定して発動する", () => {
    const state = createState();
    const target = state.round.players[2];

    expect(
      canActivatePlayerSkill3_13(
        state,
        2
      )
    ).toBe(true);

    const activated =
      activatePlayerSkill3_13(
        state,
        2
      );

    expect(activated.playerMp).toBe(340);
    expect(
      activated.akuukan
        ?.playerSkill3_13Transfer
    ).toEqual({
      targetPlayerId: target.id,
      remainingCollectionTurns: 2,
      reservedTiles: []
    });
    expect(
      canActivatePlayerSkill3_13(
        activated,
        1
      )
    ).toBe(false);
  });

  it("誰にも利用されない捨て牌を河から除き、対象者が山を減らさずツモる", () => {
    const state = createState(1);
    const transferredTile =
      createTile("honor", 7);

    setPlayerDiscardOnly(
      state,
      transferredTile
    );
    setEmptyCpuHand(state, 1);
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const activated =
      activatePlayerSkill3_13(
        state,
        1
      );
    const progression =
      createPlayerDiscardProgression(
        activated,
        transferredTile.id,
        () => 0.5
      );
    const targetDrawStep =
      progression.cpuSteps.find(
        (step) =>
          step.phase === "draw" &&
          step.seat === 1
      );

    expect(targetDrawStep).toBeDefined();
    expect(
      targetDrawStep?.state.round
        .players[1].hand.some(
          (tile) =>
            tile.id === transferredTile.id
        )
    ).toBe(true);
    expect(
      targetDrawStep?.state.round
        .players[1].drawnTileId
    ).toBe(transferredTile.id);
    expect(
      targetDrawStep?.state.round
        .players[1].drawnTileSource
    ).toBe("river");
    expect(
      targetDrawStep?.state.round.liveWall
    ).toHaveLength(
      progression.stateAfterDiscard.round
        .liveWall.length
    );
    expect(
      targetDrawStep?.state.playerMp
    ).toBe(320);
    expect(
      targetDrawStep?.state.round
        .players[0].discards[0]
        .removedFromRiver
    ).toBe(true);
  });

  it("CPUが副露したプレイヤーの捨て牌は予約しない", () => {
    const state = createState(2);
    const calledTile =
      createTile("honor", 5);
    const discardAfterCall =
      createTile("man", 9);

    setPlayerDiscardOnly(
      state,
      calledTile
    );
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const activated =
      activatePlayerSkill3_13(
        state,
        2
      );
    const result = playPlayerDiscard(
      activated,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(true);
    expect(
      result.round.players[0]
        .discards[0].removedFromRiver
    ).not.toBe(true);
    expect(
      result.akuukan
        ?.playerSkill3_13Transfer
    ).toEqual({
      targetPlayerId:
        state.round.players[2].id,
      remainingCollectionTurns: 1,
      reservedTiles: []
    });
  });

  it("自分自身、CPU手番、MP不足では発動できない", () => {
    const selfTarget = createState();
    const cpuTurn = createState();
    cpuTurn.round.currentSeat = 1;
    const insufficient = createState(
      1,
      379
    );

    expect(
      canActivatePlayerSkill3_13(
        selfTarget,
        0
      )
    ).toBe(false);
    expect(
      activatePlayerSkill3_13(
        selfTarget,
        0
      )
    ).toBe(selfTarget);
    expect(
      canActivatePlayerSkill3_13(
        cpuTurn,
        2
      )
    ).toBe(false);
    expect(
      canActivatePlayerSkill3_13(
        insufficient,
        2
      )
    ).toBe(false);
  });
});
