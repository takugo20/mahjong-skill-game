import {
  describe,
  expect,
  it
} from "vitest";
import {
  completePlayerSelfKan,
  createInitialGameState,
  declarePlayerSelfKan,
  getPlayerSelfKanOptions
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
    id: `engine-kan-${serialNumber}`,
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

function setPlayerHand(
  state: GameState,
  hand: Tile[],
  drawnTileId: string | null,
  melds: Meld[] = []
): void {
  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds,
    drawnTileId,
    drawnTileSource:
      drawnTileId === null
        ? null
        : "liveWall"
  };
}

function createClosedKanState(): {
  state: GameState;
  kanTiles: Tile[];
} {
  const state = createInitialGameState(
    () => 0.5
  );
  const kanTiles = createTiles(
    "man",
    [5, 5, 5, 5]
  );
  const otherTiles = createTiles(
    "pin",
    [
      1, 2, 3, 4, 6,
      7, 8, 9, 1, 2
    ]
  );

  setPlayerHand(
    state,
    [...kanTiles, ...otherTiles],
    otherTiles[
      otherTiles.length - 1
    ].id
  );

  return {
    state,
    kanTiles
  };
}

describe("プレイヤーの槓候補", () => {
  it("ツモ後に同じ牌4枚があれば暗槓候補を返す", () => {
    const { state, kanTiles } =
      createClosedKanState();

    const options =
      getPlayerSelfKanOptions(state);

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "closedKan",
      tileIds: kanTiles.map(
        (tile) => tile.id
      )
    });
  });

  it("ポンと同じ牌を持っていれば加槓候補を返す", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const ponTiles = createTiles(
      "honor",
      [6, 6, 6]
    );
    const addedTile = createTile(
      "honor",
      6
    );
    const otherTiles = createTiles(
      "sou",
      [
        1, 2, 3, 4, 5,
        6, 7, 8, 9, 1
      ]
    );
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    setPlayerHand(
      state,
      [addedTile, ...otherTiles],
      otherTiles[
        otherTiles.length - 1
      ].id,
      [pon]
    );

    const options =
      getPlayerSelfKanOptions(state);

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: "addedKan",
      meldIndex: 0,
      tileId: addedTile.id
    });
  });

  it("自分のツモ後の打牌段階以外では候補を返さない", () => {
    const { state } =
      createClosedKanState();

    state.round.players[0]
      .drawnTileId = null;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.players[0]
      .drawnTileId =
        state.round.players[0]
          .hand[0].id;
    state.round.phase = "reaction";

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.phase = "discarding";
    state.round.currentSeat = 1;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);
  });

  it("槓上限または王牌補充用の通常山不足では候補を返さない", () => {
    const { state } =
      createClosedKanState();

    state.round.kanCount = 4;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.kanCount = 0;
    state.round.rinshanDrawCount = 4;

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);

    state.round.rinshanDrawCount = 0;
    state.round.liveWall = [];

    expect(
      getPlayerSelfKanOptions(state)
    ).toEqual([]);
  });
});

describe("プレイヤーの槓宣言", () => {
  it("暗槓を成立前の保留状態にする", () => {
    const { state, kanTiles } =
      createClosedKanState();

    state.round.players[0].drawnTileId =
      kanTiles[3].id;

    for (const player of state.round.players) {
      player.ippatsu = true;
    }

    const handTileIds =
      state.round.players[0].hand.map(
        (tile) => tile.id
      );
    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "暗槓候補が見つかりません。"
      );
    }

    const result = declarePlayerSelfKan(
      state,
      option.id
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(result.round.pendingKan).toEqual({
      ...option,
      declarerSeat: 0,
      chankanTileId: kanTiles[3].id
    });
    expect(
      result.round.players[0].hand.map(
        (tile) => tile.id
      )
    ).toEqual(handTileIds);
    expect(
      result.round.players[0].melds
    ).toEqual([]);
    expect(
      result.round.players.map(
        (player) => player.ippatsu
      )
    ).toEqual([true, true, true, true]);
    expect(result.notice).toBe(
      "暗槓を宣言しました。槍槓を確認します。"
    );
  });

  it("加槓する牌を槍槓確認用に保持する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const ponTiles = createTiles(
      "honor",
      [6, 6, 6]
    );
    const addedTile = createTile(
      "honor",
      6
    );
    const otherTiles = createTiles(
      "sou",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    );
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    setPlayerHand(
      state,
      [addedTile, ...otherTiles],
      otherTiles[otherTiles.length - 1].id,
      [pon]
    );

    const handTileIds =
      state.round.players[0].hand.map(
        (tile) => tile.id
      );
    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "加槓候補が見つかりません。"
      );
    }

    const result = declarePlayerSelfKan(
      state,
      option.id
    );

    expect(result.round.phase).toBe(
      "reaction"
    );
    expect(result.round.pendingKan).toEqual({
      ...option,
      declarerSeat: 0,
      chankanTileId: addedTile.id
    });
    expect(
      result.round.players[0].hand.map(
        (tile) => tile.id
      )
    ).toEqual(handTileIds);
    expect(
      result.round.players[0].melds
    ).toEqual([pon]);
    expect(result.notice).toBe(
      "加槓を宣言しました。槍槓を確認します。"
    );
  });

  it("利用できない候補IDでは状態を変更しない", () => {
    const { state } =
      createClosedKanState();

    const result = declarePlayerSelfKan(
      state,
      "unknown-kan-option"
    );

    expect(result.round).toBe(state.round);
    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(
      result.round.pendingKan
    ).toBeNull();
    expect(result.notice).toBe(
      "選択した槓候補は利用できません。"
    );
  });
});

describe("プレイヤーの槓成立", () => {
  it("暗槓成立後に槓ドラを増やして嶺上牌をツモる", () => {
    const { state, kanTiles } =
      createClosedKanState();

    for (const player of state.round.players) {
      player.ippatsu = true;
    }

    const rinshanTile =
      state.round.deadWall[0];
    const replacementTile =
      state.round.liveWall[
        state.round.liveWall.length - 1
      ];
    const liveWallLength =
      state.round.liveWall.length;
    const kanCount = state.round.kanCount;
    const doraIndicatorCount =
      state.round.doraIndicatorCount;
    const rinshanDrawCount =
      state.round.rinshanDrawCount;
    const option =
      getPlayerSelfKanOptions(state)[0];

    if (
      !rinshanTile ||
      !replacementTile ||
      !option
    ) {
      throw new Error(
        "暗槓成立テストの準備に失敗しました。"
      );
    }

    const declared = declarePlayerSelfKan(
      state,
      option.id
    );
    const result = completePlayerSelfKan(
      declared
    );
    const player = result.round.players[0];

    expect(result.round.phase).toBe(
      "discarding"
    );
    expect(result.round.pendingKan).toBeNull();
    expect(player.hand).toHaveLength(11);
    expect(
      player.hand.some(
        (tile) =>
          kanTiles.some(
            (kanTile) =>
              kanTile.id === tile.id
          )
      )
    ).toBe(false);
    expect(player.melds).toHaveLength(1);
    expect(player.melds[0]).toMatchObject({
      kind: "closedKan"
    });
    expect(player.melds[0].tiles).toHaveLength(4);
    expect(player.drawnTileId).toBe(
      rinshanTile.id
    );
    expect(player.drawnTileSource).toBe(
      "rinshan"
    );
    expect(
      player.hand.some(
        (tile) => tile.id === rinshanTile.id
      )
    ).toBe(true);
    expect(result.round.liveWall).toHaveLength(
      liveWallLength - 1
    );
    expect(result.round.deadWall[0].id).toBe(
      replacementTile.id
    );
    expect(result.round.kanCount).toBe(
      kanCount + 1
    );
    expect(
      result.round.doraIndicatorCount
    ).toBe(doraIndicatorCount + 1);
    expect(result.round.rinshanDrawCount).toBe(
      rinshanDrawCount + 1
    );
    expect(
      result.round.players.map(
        (roundPlayer) =>
          roundPlayer.ippatsu
      )
    ).toEqual([false, false, false, false]);
    expect(result.notice).toContain(
      "暗槓が成立し、"
    );
    expect(result.notice).toContain(
      "嶺上牌としてツモりました。"
    );
  });

  it("加槓成立後にポンを加槓へ変更する", () => {
    const state = createInitialGameState(
      () => 0.5
    );
    const ponTiles = createTiles(
      "honor",
      [6, 6, 6]
    );
    const addedTile = createTile(
      "honor",
      6
    );
    const otherTiles = createTiles(
      "sou",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    );
    const pon: Meld = {
      kind: "pon",
      tiles: ponTiles,
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    };

    setPlayerHand(
      state,
      [addedTile, ...otherTiles],
      otherTiles[otherTiles.length - 1].id,
      [pon]
    );

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "加槓候補が見つかりません。"
      );
    }

    const declared = declarePlayerSelfKan(
      state,
      option.id
    );
    const result = completePlayerSelfKan(
      declared
    );
    const player = result.round.players[0];
    const addedMeld = player.melds[0];

    expect(player.melds).toHaveLength(1);
    expect(addedMeld).toMatchObject({
      kind: "addedKan",
      calledFrom: 3,
      calledTileId: ponTiles[0].id
    });
    expect(addedMeld.tiles).toHaveLength(4);
    expect(
      addedMeld.tiles.map(
        (tile) => tile.id
      )
    ).toEqual(
      expect.arrayContaining([
        ...ponTiles.map(
          (tile) => tile.id
        ),
        addedTile.id
      ])
    );
    expect(
      player.hand.some(
        (tile) => tile.id === addedTile.id
      )
    ).toBe(false);
    expect(player.drawnTileSource).toBe(
      "rinshan"
    );
    expect(result.round.pendingKan).toBeNull();
    expect(result.notice).toContain(
      "加槓が成立し、"
    );
  });

  it("保留中の槓がなければ局面を変更しない", () => {
    const state = createInitialGameState(
      () => 0.5
    );

    const result = completePlayerSelfKan(
      state
    );

    expect(result.round).toBe(state.round);
    expect(result.notice).toBe(
      "成立待ちの槓はありません。"
    );
  });
});
