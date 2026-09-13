import {
  describe,
  expect,
  it
} from "vitest";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  EnemyId
} from "../akuukan/types";
import {
  createInitialGameState,
  createPlayerDiscardProgression
} from "./engine";
import type {
  GameState,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id:
      `akuukan-information-` +
      serialNumber,
    suit,
    rank,
    red
  };
}

function setEmptyCpu(
  state: GameState,
  seat: 1 | 2 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

interface CreateCpuDiscardResult {
  readonly state: GameState;
  readonly playerDiscard: Tile;
  readonly doraTile: Tile;
  readonly nonDoraTile: Tile;
}

function createCpuDiscardState(
  enemyId: EnemyId,
  targetSeat: 1 | 2
): CreateCpuDiscardResult {
  const state = createInitialGameState(() => 0.5, {
    enemyId,
    equippedSkills: []
  });

  const playerDiscard = createTile("honor", 7);
  const doraTile = createTile("honor", 1);
  const nonDoraTile = createTile("honor", 2);

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [playerDiscard],
    melds: [],
    discards: [],
    drawnTileId: playerDiscard.id,
    drawnTileSource: "liveWall"
  };

  for (const seat of [1, 2, 3] as const) {
    setEmptyCpu(state, seat);
  }

  state.round.players[targetSeat] = {
    ...state.round.players[targetSeat],
    // 立直を避け、同じ向聴数・受け入れでドラ評価だけを比較する。
    score: 0,
    hand: [
      ...[1, 2, 3].map(rank => createTile("man", rank)),
      ...[1, 2, 3].map(rank => createTile("pin", rank)),
      ...[1, 2, 3, 7, 8, 9].map(
        rank => createTile("sou", rank)
      ),
      doraTile
    ]
  };

  state.round.deadWall[4] = createTile("honor", 4);
  state.round.doraIndicatorCount = 1;

  state.round.liveWall = [
    targetSeat === 1
      ? nonDoraTile
      : createTile("honor", 6),
    targetSeat === 2
      ? nonDoraTile
      : createTile("honor", 6),
    createTile("honor", 6),
    createTile("honor", 6)
  ];

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    playerDiscard,
    doraTile,
    nonDoraTile
  };
}

function getCpuDiscard(
  state: GameState,
  playerDiscard: Tile,
  targetSeat: SeatIndex
): Tile {
  const progression = createPlayerDiscardProgression(
    state,
    playerDiscard.id,
    () => 0
  );

  const actionStep = progression.cpuSteps.find(
    step => step.phase === "action" && step.seat === targetSeat
  );

  const discard = actionStep?.state.round.players[
    targetSeat
  ].discards[0]?.tile;

  if (!discard) {
    throw new Error("対象CPUの打牌を取得できません。");
  }

  return discard;
}

describe("E-1のCPUドラ情報", () => {
  it("通常CPUは見えないドラを特別扱いせず捨てる", () => {
    const {
      state,
      playerDiscard,
      doraTile
    } = createCpuDiscardState(
      "enemy-1",
      1
    );

    expect(
      getCpuDiscard(
        state,
        playerDiscard,
        1
      ).id
    ).toBe(doraTile.id);
  });

  it("敵1本人は見えるドラを残して別の牌を捨てる", () => {
    const {
      state,
      playerDiscard,
      nonDoraTile
    } = createCpuDiscardState(
      "enemy-1",
      2
    );

    expect(
      getCpuDiscard(
        state,
        playerDiscard,
        2
      ).id
    ).toBe(nonDoraTile.id);
  });

  it("E-1が無効なら通常CPUもドラを残す", () => {
    const {
      state,
      playerDiscard,
      nonDoraTile
    } = createCpuDiscardState(
      "enemy-1",
      1
    );

    if (!state.akuukan) {
      throw new Error(
        "亜空間状態がありません。"
      );
    }

    state.akuukan = disableAkuukanSource(
      state.akuukan,
      "enemy-ability:E-1"
    );

    expect(
      getCpuDiscard(
        state,
        playerDiscard,
        1
      ).id
    ).toBe(nonDoraTile.id);
  });

  it("E-1を持たない対局では通常どおりドラを残す", () => {
    const {
      state,
      playerDiscard,
      nonDoraTile
    } = createCpuDiscardState(
      "enemy-2",
      1
    );

    expect(
      getCpuDiscard(
        state,
        playerDiscard,
        1
      ).id
    ).toBe(nonDoraTile.id);
  });
});
