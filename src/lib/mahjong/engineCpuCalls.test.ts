import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  getPlayerMeldCallOptions,
  playPlayerDiscard
} from "./engine";
import type {
  GameState,
  Meld,
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
    id: `engine-cpu-call-${serialNumber}`,
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

function createChiHand(
  discardAfterCall: Tile
): Tile[] {
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

function setEmptyCpuHand(
  state: GameState,
  seat: 1 | 2 | 3
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand: [],
    melds: [],
    drawnTileId: null
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

describe("CPU副露のゲーム進行", () => {
  it("プレイヤーの捨て牌をCPUがポンしてツモせず打牌する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const discardAfterCall =
      createTile("man", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    const caller = result.round.players[1];
    const meld = caller.melds[0];

    expect(meld?.kind).toBe("pon");
    expect(meld?.calledFrom).toBe(0);
    expect(meld?.calledTileId).toBe(
      calledTile.id
    );
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(true);
    expect(caller.discards[0].tile.id).toBe(
      discardAfterCall.id
    );
    expect(caller.hand).toHaveLength(10);
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
  });

  it("プレイヤーの捨て牌を下家CPUがチーして打牌する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("man", 4);
    const discardAfterCall =
      createTile("honor", 7);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createChiHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    const caller = result.round.players[1];
    const meld = caller.melds[0];

    expect(meld?.kind).toBe("chi");
    expect(meld?.calledFrom).toBe(0);
    expect(
      meld?.tiles.map((tile) => tile.rank)
    ).toEqual([4, 5, 6]);
    expect(caller.discards[0].tile.id).toBe(
      discardAfterCall.id
    );
    expect(caller.hand).toHaveLength(10);
  });

  it("複数CPUのポンが競合すると打牌者に最も近いCPUを優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const firstDiscard =
      createTile("man", 9);
    const secondDiscard =
      createTile("pin", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(firstDiscard),
      melds: [],
      drawnTileId: null
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: createPonHand(secondDiscard),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds
    ).toHaveLength(1);
    expect(
      result.round.players[1]
        .melds[0].calledTileId
    ).toBe(calledTile.id);
    expect(
      result.round.players[2].melds
    ).toHaveLength(0);
  });

  it("CPUが鳴くと全員の一発を消し鳴き後の打牌へ反応できる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const discardAfterCall =
      createTile("man", 9);
    const firstNine =
      createTile("man", 9);
    const secondNine =
      createTile("man", 9);
    const playerDiscardAfterCall =
      createTile("pin", 1);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        calledTile,
        firstNine,
        secondNine,
        playerDiscardAfterCall
      ],
      ippatsu: true,
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    state.round.players[2] = {
      ...state.round.players[2],
      hand: [],
      ippatsu: true,
      drawnTileId: null
    };
    state.round.players[3] = {
      ...state.round.players[3],
      hand: [],
      ippatsu: true,
      drawnTileId: null
    };
    setShortLiveWall(state);

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players.map(
        (player) => player.ippatsu
      )
    ).toEqual([
      false,
      false,
      false,
      false
    ]);
    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(
      getPlayerMeldCallOptions(result).map(
        (option) => option.kind
      )
    ).toEqual(["pon"]);
    expect(
      result.round.lastDiscard?.discard.tile.id
    ).toBe(discardAfterCall.id);
  });

  it("通常山が空になった後の打牌ではCPUは副露しない", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const discardAfterCall =
      createTile("man", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      discards: [
        {
          tile: createTile("man", 5),
          tsumogiri: false,
          riichiDeclaration: false,
          faceDown: false,
          called: false
        }
      ],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPonHand(
        discardAfterCall
      ),
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.liveWall = [];

    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );

    expect(
      result.round.players[1].melds
    ).toHaveLength(0);
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(false);
    expect(result.round.phase).toBe(
      "roundEnd"
    );
    expect(result.round.drawResult).not.toBeNull();
  });

    it("CPUのポンとプレイヤーのチーが競合するとCPUのポンを優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const initialDiscard =
      createTile("sou", 1);
    const calledTile =
      createTile("man", 4);
    const firstFour =
      createTile("man", 4);
    const secondFour =
      createTile("man", 4);
    const valueHonorTiles =
      createTiles("honor", [5, 5, 5]);
    const valueHonorMeld: Meld = {
      kind: "pon",
      tiles: valueHonorTiles,
      calledFrom: 0,
      calledTileId:
        valueHonorTiles[0].id
    };

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        initialDiscard,
        createTile("man", 5),
        createTile("man", 6),
        createTile("pin", 1)
      ],
      melds: [],
      drawnTileId: initialDiscard.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        firstFour,
        secondFour,
        ...createTiles(
          "pin",
          [2, 2, 2, 3, 4]
        ),
        ...createTiles("sou", [7, 8]),
        createTile("honor", 6)
      ],
      melds: [valueHonorMeld],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.liveWall = [
      createTile("honor", 7),
      createTile("honor", 1),
      calledTile,
      createTile("honor", 2),
      createTile("honor", 3),
      createTile("honor", 4)
    ];

    const result = playPlayerDiscard(
      state,
      initialDiscard.id,
      () => 0.5
    );

    const cpuPon =
      result.round.players[1]
        .melds.find(
          (meld) =>
            meld.calledTileId ===
            calledTile.id
        );

    expect(cpuPon?.kind).toBe("pon");
    expect(
      result.round.players[0].melds
    ).toHaveLength(0);
    expect(
      result.round.players[3]
        .discards.find(
          (discard) =>
            discard.tile.id ===
            calledTile.id
        )?.called
    ).toBe(true);
    expect(result.round.currentSeat).toBe(0);
    expect(result.round.phase).toBe(
      "discarding"
    );
  });

  it("プレイヤーのポンとCPUのチーが競合するとプレイヤーのポンを優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const initialDiscard =
      createTile("honor", 7);
    const calledTile =
      createTile("man", 4);
    const firstFour =
      createTile("man", 4);
    const secondFour =
      createTile("man", 4);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        initialDiscard,
        firstFour,
        secondFour,
        createTile("pin", 1)
      ],
      melds: [],
      drawnTileId: initialDiscard.id
    };
    setEmptyCpuHand(state, 1);
    setEmptyCpuHand(state, 2);
    state.round.players[3] = {
      ...state.round.players[3],
      hand: createChiHand(
        createTile("honor", 6)
      ),
      melds: [],
      drawnTileId: null
    };
    state.round.liveWall = [
      createTile("honor", 1),
      calledTile,
      createTile("honor", 2),
      createTile("honor", 3)
    ];

    const result = playPlayerDiscard(
      state,
      initialDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(
      result.round.lastDiscard?.seat
    ).toBe(2);
    expect(
      result.round.lastDiscard
        ?.discard.tile.id
    ).toBe(calledTile.id);
    expect(
      getPlayerMeldCallOptions(result).map(
        (option) => option.kind
      )
    ).toEqual(["pon"]);
    expect(
      result.round.players[3].melds
    ).toHaveLength(0);
  });
});

describe("CPU大明槓のゲーム進行", () => {
  it("プレイヤーの捨て牌をCPUが大明槓して嶺上牌をツモる", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const calledTile =
      createTile("honor", 5);
    const matchingTiles = createTiles(
      "honor",
      [5, 5, 5]
    );
    const discardAfterKan =
      createTile("man", 9);

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [calledTile],
      drawnTileId: calledTile.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...matchingTiles,
        ...createTiles("man", [2, 2]),
        discardAfterKan,
        ...createTiles(
          "pin",
          [1, 2, 3, 4, 5, 6]
        ),
        createTile("sou", 7)
      ],
      melds: [],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    setShortLiveWall(state);

    const initialLiveWallLength =
      state.round.liveWall.length;
    const result = playPlayerDiscard(
      state,
      calledTile.id,
      () => 0.5
    );
    const caller = result.round.players[1];
    const openKan = caller.melds[0];

    expect(openKan).toMatchObject({
      kind: "openKan",
      calledFrom: 0,
      calledTileId: calledTile.id
    });
    expect(openKan?.tiles).toHaveLength(4);
    expect(result.round.kanCount).toBe(1);
    expect(
      result.round.doraIndicatorCount
    ).toBe(2);
    expect(
      result.round.rinshanDrawCount
    ).toBe(1);
    expect(result.round.liveWall).toHaveLength(
      initialLiveWallLength - 4
    );
    expect(
      result.round.players[0]
        .discards[0].called
    ).toBe(true);
    expect(caller.discards).toHaveLength(1);
    expect(
      caller.discards[0].tile.id
    ).toBe(discardAfterKan.id);
  });

  it("CPUの大明槓とプレイヤーのチーが競合すると大明槓を優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const initialDiscard =
      createTile("sou", 1);
    const calledTile =
      createTile("man", 4);
    const matchingTiles = createTiles(
      "man",
      [4, 4, 4]
    );
    const valueHonorTiles =
      createTiles("honor", [5, 5, 5]);
    const valueHonorMeld: Meld = {
      kind: "pon",
      tiles: valueHonorTiles,
      calledFrom: 0,
      calledTileId:
        valueHonorTiles[0].id
    };

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        initialDiscard,
        createTile("man", 5),
        createTile("man", 6),
        createTile("pin", 1)
      ],
      melds: [],
      drawnTileId: initialDiscard.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...matchingTiles,
        ...createTiles(
          "pin",
          [2, 2, 2, 3, 4]
        ),
        ...createTiles("sou", [7, 8])
      ],
      melds: [valueHonorMeld],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.liveWall = [
      createTile("honor", 7),
      createTile("honor", 1),
      calledTile,
      createTile("honor", 2),
      createTile("honor", 3),
      createTile("honor", 4)
    ];

    const result = playPlayerDiscard(
      state,
      initialDiscard.id,
      () => 0.5
    );
    const cpuOpenKan =
      result.round.players[1]
        .melds.find(
          (meld) =>
            meld.calledTileId ===
            calledTile.id
        );

    expect(cpuOpenKan?.kind).toBe(
      "openKan"
    );
    expect(
      result.round.players[0].melds
    ).toHaveLength(0);
    expect(
      result.round.players[3]
        .discards.find(
          (discard) =>
            discard.tile.id ===
            calledTile.id
        )?.called
    ).toBe(true);
  });

  it("プレイヤーのポンがCPUの大明槓より打牌者に近ければプレイヤーを優先する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const initialDiscard =
      createTile("sou", 1);
    const calledTile =
      createTile("man", 4);
    const playerMatchingTiles =
      createTiles("man", [4, 4]);
    const cpuMatchingTiles =
      createTiles("man", [4, 4, 4]);
    const valueHonorTiles =
      createTiles("honor", [5, 5, 5]);
    const valueHonorMeld: Meld = {
      kind: "pon",
      tiles: valueHonorTiles,
      calledFrom: 0,
      calledTileId:
        valueHonorTiles[0].id
    };

    state.round.players[0] = {
      ...state.round.players[0],
      hand: [
        initialDiscard,
        ...playerMatchingTiles,
        createTile("pin", 1)
      ],
      melds: [],
      drawnTileId: initialDiscard.id
    };
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...cpuMatchingTiles,
        ...createTiles(
          "pin",
          [2, 2, 2, 3, 4]
        ),
        ...createTiles("sou", [7, 8])
      ],
      melds: [valueHonorMeld],
      drawnTileId: null
    };
    setEmptyCpuHand(state, 2);
    setEmptyCpuHand(state, 3);
    state.round.liveWall = [
      createTile("honor", 7),
      createTile("honor", 1),
      calledTile,
      createTile("honor", 2),
      createTile("honor", 3)
    ];

    const result = playPlayerDiscard(
      state,
      initialDiscard.id,
      () => 0.5
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(
      result.round.lastDiscard?.seat
    ).toBe(3);
    expect(
      getPlayerMeldCallOptions(result).map(
        (option) => option.kind
      )
    ).toContain("pon");
    expect(
      result.round.players[1].melds
    ).toHaveLength(1);
  });
});
