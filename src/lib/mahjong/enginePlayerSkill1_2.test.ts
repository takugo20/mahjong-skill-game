import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  declarePlayerMeldCall,
  playPlayerDiscard
} from "./engine";
import type {
  Discard,
  GameState,
  Tile,
  TileSuit
} from "./types";

type TargetCallKind =
  | "chi"
  | "pon"
  | "openKan";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-1-2-${serialNumber}`,
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

function createDiscard(tile: Tile): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createState(
  withSkill: boolean,
  enemyId: "enemy-6" | "enemy-14" =
    "enemy-14"
): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: withSkill
        ? [{
            id: "1-2",
            level: 1
          }]
        : []
    }
  );
}

function createCpuCallHand(
  kind: TargetCallKind,
  discardAfterCall: Tile
): Tile[] {
  if (kind === "chi") {
    return [
      ...createTiles("man", [5, 6, 7, 8]),
      ...createTiles(
        "pin",
        [2, 2, 2, 3, 4]
      ),
      ...createTiles("sou", [5, 6, 7]),
      discardAfterCall
    ];
  }

  const matchingTiles = createTiles(
    "honor",
    kind === "openKan"
      ? [5, 5, 5]
      : [5, 5]
  );

  return [
    ...matchingTiles,
    ...createTiles("man", [2, 2]),
    discardAfterCall,
    ...createTiles(
      "pin",
      [1, 2, 3, 4, 5, 6]
    ),
    ...(
      kind === "openKan"
        ? createTiles("sou", [7])
        : createTiles("sou", [7, 8])
    )
  ];
}

function prepareCpuCall(
  kind: TargetCallKind,
  withSkill = true,
  enemyId: "enemy-6" | "enemy-14" =
    "enemy-14"
): {
  readonly state: GameState;
  readonly calledTile: Tile;
  readonly retainedTileIds:
    readonly string[];
} {
  const state = createState(
    withSkill,
    enemyId
  );
  const calledTile =
    kind === "chi"
      ? createTile("man", 4)
      : createTile("honor", 5);
  const retainedTiles = [
    createTile("pin", 7),
    createTile("honor", 7)
  ];
  const discardAfterCall =
    kind === "chi"
      ? createTile("honor", 7)
      : createTile("man", 9);

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      calledTile,
      ...retainedTiles
    ],
    melds: [],
    discards: [],
    drawnTileId: calledTile.id,
    drawnTileSource: "liveWall"
  };
  state.round.players[1] = {
    ...state.round.players[1],
    hand: createCpuCallHand(
      kind,
      discardAfterCall
    ),
    melds: [],
    discards: [],
    drawnTileId: null,
    drawnTileSource: null
  };

  for (const seat of [2, 3] as const) {
    state.round.players[seat] = {
      ...state.round.players[seat],
      hand: [],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
  }

  state.round.liveWall = [
    createTile("honor", 1),
    createTile("honor", 2),
    createTile("honor", 3),
    createTile("honor", 4),
    createTile("man", 1),
    createTile("pin", 9),
    createTile("sou", 1),
    createTile("sou", 9)
  ];
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.lastDiscard = null;

  return {
    state,
    calledTile,
    retainedTileIds:
      retainedTiles.map(
        (tile) => tile.id
      )
  };
}

function getRedRetainedTileIds(
  state: GameState,
  retainedTileIds: readonly string[]
): string[] {
  return state.round.players[0].hand
    .filter(
      (tile) =>
        retainedTileIds.includes(tile.id) &&
        tile.red
    )
    .map((tile) => tile.id);
}

describe("プレイヤースキル1-2のエンジン統合", () => {
  it.each([
    "chi",
    "pon",
    "openKan"
  ] as const)(
    "他家の%s成立後に未赤牌1枚を赤ドラ化する",
    (kind) => {
      const prepared = prepareCpuCall(kind);
      const result = playPlayerDiscard(
        prepared.state,
        prepared.calledTile.id,
        () => 0
      );

      expect(
        result.round.players[1].melds.some(
          (meld) => meld.kind === kind
        )
      ).toBe(true);
      expect(
        getRedRetainedTileIds(
          result,
          prepared.retainedTileIds
        )
      ).toHaveLength(1);
    }
  );

  it("レベル1の3パーセント判定に失敗すれば赤ドラ化しない", () => {
    const prepared = prepareCpuCall("pon");
    const result = playPlayerDiscard(
      prepared.state,
      prepared.calledTile.id,
      () => 0.03
    );

    expect(
      result.round.players[1].melds[0]
        ?.kind
    ).toBe("pon");
    expect(
      getRedRetainedTileIds(
        result,
        prepared.retainedTileIds
      )
    ).toEqual([]);
  });

  it("敵6のE-18で無効化されていれば他家がポンしても発動しない", () => {
    const prepared = prepareCpuCall(
      "pon",
      true,
      "enemy-6"
    );
    const result = playPlayerDiscard(
      prepared.state,
      prepared.calledTile.id,
      () => 0
    );

    expect(
      result.round.players[1].melds[0]
        ?.kind
    ).toBe("pon");
    expect(
      getRedRetainedTileIds(
        result,
        prepared.retainedTileIds
      )
    ).toEqual([]);
  });

  it("プレイヤー自身のポンでは発動しない", () => {
    const state = createState(true);
    const calledTile = createTile(
      "honor",
      5
    );
    const handTiles = createTiles(
      "honor",
      [5, 5]
    );
    const retainedTile = createTile(
      "man",
      3
    );
    const discard = createDiscard(
      calledTile
    );

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        ...handTiles,
        retainedTile
      ],
      melds: [],
      discards: [],
      drawnTileId: null,
      drawnTileSource: null
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [],
      melds: [],
      discards: [discard]
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: [],
      melds: []
    };
    state.round.players[3] = {
      ...state.round.players[3],
      hand: [],
      melds: []
    };
    state.round.currentSeat = 1;
    state.round.phase = "reaction";
    state.round.lastDiscard = {
      seat: 1,
      discard
    };
    state.round.meldCallOptions = [{
      id: "player-skill-1-2-own-pon",
      kind: "pon",
      callerSeat: 0,
      discarderSeat: 1,
      calledTileId: calledTile.id,
      handTileIds: [
        handTiles[0].id,
        handTiles[1].id
      ]
    }];

    const option =
      state.round.meldCallOptions.find(
        (candidate) =>
          candidate.kind === "pon"
      );

    if (!option) {
      throw new Error(
        "プレイヤーのポン候補がありません。"
      );
    }

    const result = declarePlayerMeldCall(
      state,
      option.id
    );
    const player = result.round.players[0];

    expect(player.melds[0]).toMatchObject({
      kind: "pon"
    });
    expect(
      player.hand.find(
        (tile) =>
          tile.id === retainedTile.id
      )?.red
    ).toBe(false);
    expect(
      player.melds[0].tiles.every(
        (tile) => !tile.red
      )
    ).toBe(true);
  });
});
