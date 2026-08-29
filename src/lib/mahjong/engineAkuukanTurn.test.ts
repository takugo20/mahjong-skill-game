import {
  describe,
  expect,
  it
} from "vitest";
import {
  markAkuukanSourceUsed
} from "../akuukan/state";
import type {
  AkuukanMatchSetup
} from "../akuukan/types";
import {
  createInitialGameState,
  declarePlayerMeldCall,
  declarePlayerOpenKan,
  drawTile,
  getPlayerOpenKanCallOptions
} from "./engine";
import type {
  Discard,
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
    id: `akuukan-turn-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createSetup(): AkuukanMatchSetup {
  return {
    enemyId: "enemy-1",
    equippedSkills: [
      {
        id: "1-1",
        level: 3
      }
    ]
  };
}

function createUsedAkuukanState(): GameState {
  let state = createInitialGameState(
    () => 0.5,
    createSetup()
  );

  if (!state.akuukan) {
    throw new Error(
      "亜空間状態が初期化されていません。"
    );
  }

  state = {
    ...state,
    akuukan: markAkuukanSourceUsed(
      markAkuukanSourceUsed(
        markAkuukanSourceUsed(
          state.akuukan,
          "match",
          "player-skill:1-1"
        ),
        "round",
        "player-skill:1-2"
      ),
      "turn",
      "enemy-ability:E-1"
    )
  };

  return state;
}

function emptyCpuHands(
  state: GameState
): void {
  for (const seat of [1, 2, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      drawnTileId: null
    };
  }
}

function expectOnlyTurnUsageReset(
  state: GameState
): void {
  expect(state.akuukan?.usedSources).toEqual({
    match: ["player-skill:1-1"],
    round: ["player-skill:1-2"],
    turn: []
  });
}

describe("亜空間麻雀の手番開始", () => {
  it("通常ツモ時に手番履歴だけを消去する", () => {
    const state = createUsedAkuukanState();

    state.round.phase = "drawing";
    state.round.currentSeat = 1;

    const result = drawTile(state, 1);

    expectOnlyTurnUsageReset(result);
  });

  it("チー・ポン成立時に手番履歴だけを消去する", () => {
    const state = createUsedAkuukanState();
    const calledTile = createTile("man", 3);
    const handTiles = [
      createTile("man", 3),
      createTile("man", 3)
    ];
    const discard: Discard = {
      tile: calledTile,
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    };

    emptyCpuHands(state);
    state.round.players[0] = {
      ...state.round.players[0],
      hand: handTiles,
      drawnTileId: null
    };
    state.round.players[1] = {
      ...state.round.players[1],
      discards: [discard]
    };
    state.round.phase = "reaction";
    state.round.lastDiscard = {
      seat: 1,
      discard
    };
    state.round.meldCallOptions = [
      {
        id: "akuukan-turn-pon",
        kind: "pon",
        callerSeat: 0,
        discarderSeat: 1,
        calledTileId: calledTile.id,
        handTileIds: [
          handTiles[0].id,
          handTiles[1].id
        ]
      }
    ];

    const result = declarePlayerMeldCall(
      state,
      "akuukan-turn-pon"
    );

    expect(result.round.phase).toBe(
      "discarding"
    );
    expectOnlyTurnUsageReset(result);
  });

  it("槓成立後の嶺上牌取得時に手番履歴だけを消去する", () => {
    const state = createUsedAkuukanState();
    const calledTile = createTile("pin", 4);
    const handTiles = [
      createTile("pin", 4),
      createTile("pin", 4),
      createTile("pin", 4)
    ];
    const discard: Discard = {
      tile: calledTile,
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    };

    emptyCpuHands(state);
    state.round.players[0] = {
      ...state.round.players[0],
      hand: handTiles,
      drawnTileId: null
    };
    state.round.players[1] = {
      ...state.round.players[1],
      discards: [discard]
    };
    state.round.phase = "reaction";
    state.round.lastDiscard = {
      seat: 1,
      discard
    };
    state.round.meldCallOptions = [
      {
        id: "akuukan-turn-kan-pon",
        kind: "pon",
        callerSeat: 0,
        discarderSeat: 1,
        calledTileId: calledTile.id,
        handTileIds: [
          handTiles[0].id,
          handTiles[1].id
        ]
      }
    ];

    const options =
      getPlayerOpenKanCallOptions(state);

    expect(options).toHaveLength(1);

    const result = declarePlayerOpenKan(
      state,
      options[0].id
    );

    expect(
      result.round.players[0]
        .drawnTileSource
    ).toBe("rinshan");
    expectOnlyTurnUsageReset(result);
  });

  it("通常麻雀には亜空間状態を追加しない", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    state.round.phase = "drawing";
    state.round.currentSeat = 1;

    const result = drawTile(state, 1);

    expect("akuukan" in result).toBe(false);
    expect(result.akuukan).toBeUndefined();
  });
});
