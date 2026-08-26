import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  createPlayerDiscardProgression,
  playPlayerDiscard
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
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `cpu-progression-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function emptyCpuHand(
  state: GameState,
  seat: SeatIndex
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createProgressionState(): {
  state: GameState;
  discardTile: Tile;
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const discardTile = createTile(
    "honor",
    7
  );

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [discardTile],
    melds: [],
    discards: [],
    drawnTileId: discardTile.id,
    drawnTileSource: "liveWall"
  };
  emptyCpuHand(state, 1);
  emptyCpuHand(state, 2);
  emptyCpuHand(state, 3);
  state.round.liveWall = [
    createTile("man", 1),
    createTile("pin", 2),
    createTile("sou", 3),
    createTile("honor", 4)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    discardTile
  };
}

describe("CPU進行の分割結果", () => {
  it("CPU3人のツモと行動を順番どおり個別状態として返す", () => {
    const {
      state,
      discardTile
    } = createProgressionState();

    const progression =
      createPlayerDiscardProgression(
        state,
        discardTile.id,
        () => 0.5
      );

    expect(
      progression.stateAfterDiscard.round
        .players[0].discards
    ).toHaveLength(1);
    expect(
      progression.stateAfterDiscard.round
        .currentSeat
    ).toBe(1);
    expect(
      progression.stateAfterDiscard.round
        .phase
    ).toBe("drawing");

    expect(
      progression.cpuSteps.map(
        (step) => ({
          phase: step.phase,
          seat: step.seat
        })
      )
    ).toEqual([
      { phase: "draw", seat: 1 },
      { phase: "action", seat: 1 },
      { phase: "draw", seat: 2 },
      { phase: "action", seat: 2 },
      { phase: "draw", seat: 3 },
      { phase: "action", seat: 3 }
    ]);

    expect(
      progression.cpuSteps[0].state.round
        .players[1].hand
    ).toHaveLength(1);
    expect(
      progression.cpuSteps[1].state.round
        .players[1].discards
    ).toHaveLength(1);
    expect(
      progression.finalState.round
        .currentSeat
    ).toBe(0);
    expect(
      progression.finalState.round.phase
    ).toBe("discarding");
  });

  it("分割進行後の最終状態を従来の一括進行と同一にする", () => {
    const {
      state,
      discardTile
    } = createProgressionState();

    const progression =
      createPlayerDiscardProgression(
        state,
        discardTile.id,
        () => 0.5
      );
    const normalResult = playPlayerDiscard(
      state,
      discardTile.id,
      () => 0.5
    );

    expect(progression.finalState).toEqual(
      normalResult
    );
    expect(
      state.round.players[0].discards
    ).toHaveLength(0);
  });
});
