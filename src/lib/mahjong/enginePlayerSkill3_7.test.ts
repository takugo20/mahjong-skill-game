import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState,
  getPlayerSelfKanOptions,
  getRonCandidates,
  playPlayerSelfKan
} from "./engine";
import type {
  Discard,
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
    id: `engine-player-skill-3-7-${serialNumber}`,
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

function createDiscard(
  tile: Tile
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };
}

function createAkuukanState(): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-7",
        level: 1
      }]
    }
  );
}

function setPlayerHand(
  state: GameState,
  hand: Tile[],
  drawnTileId: string,
  melds: Meld[] = []
): void {
  state.round.players[0] = {
    ...state.round.players[0],
    hand,
    melds,
    drawnTileId,
    drawnTileSource: "liveWall"
  };
}

function createPinfuWaitHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [3, 4, 5, 6, 7]
    ),
    ...createTiles(
      "pin",
      [2, 3, 4]
    ),
    ...createTiles(
      "sou",
      [6, 7, 8]
    ),
    ...createTiles(
      "honor",
      [3, 3]
    )
  ];
}

describe("プレイヤースキル3-7 防御結界【槓】のエンジン統合", () => {
  it("加槓への槍槓と槓成立後の通常ロンを無効にする", () => {
    const state = createAkuukanState();
    const ponTiles = createTiles(
      "man",
      [2, 2, 2]
    );
    const addedTile = createTile(
      "man",
      2
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
      otherTiles[
        otherTiles.length - 1
      ].id,
      [pon]
    );
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPinfuWaitHand(),
      melds: [],
      discards: []
    };
    state.round.players[2].hand = [];
    state.round.players[3].hand = [];

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "加槓候補が見つかりません。"
      );
    }

    const result = playPlayerSelfKan(
      state,
      option.id
    );

    expect(result.round.winResult).toBeNull();
    expect(result.round.kanCount).toBe(1);
    expect(
      result.round.players[0].melds[0]
        .kind
    ).toBe("addedKan");
    expect(
      result.akuukan
        ?.playerSkill3_7RonImmunityActive
    ).toBe(true);

    const laterDiscard =
      createTile("man", 2);
    result.round.phase = "reaction";
    result.round.lastDiscard = {
      seat: 0,
      discard: createDiscard(laterDiscard)
    };
    result.round.players[0].discards.push(
      createDiscard(laterDiscard)
    );

    expect(getRonCandidates(result)).toEqual([]);
  });

  it("国士無双による暗槓への槍槓も無効にする", () => {
    const state = createAkuukanState();
    const kanTiles = createTiles(
      "honor",
      [1, 1, 1, 1]
    );
    const otherTiles = createTiles(
      "pin",
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 1]
    );

    setPlayerHand(
      state,
      [...kanTiles, ...otherTiles],
      otherTiles[
        otherTiles.length - 1
      ].id
    );
    state.round.players[1] = {
      ...state.round.players[1],
      hand: [
        ...createTiles("man", [1, 9]),
        ...createTiles("pin", [1, 9]),
        ...createTiles("sou", [1, 9]),
        ...createTiles(
          "honor",
          [2, 2, 3, 4, 5, 6, 7]
        )
      ],
      melds: [],
      discards: []
    };
    state.round.players[2].hand = [];
    state.round.players[3].hand = [];

    const option =
      getPlayerSelfKanOptions(state)[0];

    if (!option) {
      throw new Error(
        "暗槓候補が見つかりません。"
      );
    }

    const result = playPlayerSelfKan(
      state,
      option.id
    );

    expect(result.round.winResult).toBeNull();
    expect(result.round.kanCount).toBe(1);
    expect(
      result.round.players[0].melds[0]
        .kind
    ).toBe("closedKan");
    expect(
      result.akuukan
        ?.playerSkill3_7RonImmunityActive
    ).toBe(true);
  });
});
