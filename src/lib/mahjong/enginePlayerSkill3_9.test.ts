import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_9,
  canActivatePlayerSkill3_9,
  completePlayerSelfKan,
  createInitialGameState,
  declarePlayerSelfKan,
  drawTile,
  getPlayerSelfKanOptions,
  getRonCandidates
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
    id: `engine-player-skill-3-9-${serialNumber}`,
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
  level: 1 | 2 | 3 | 4 | 5 = 1,
  playerMp = 500
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-9",
        level
      }]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = playerMp;

  return state;
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

describe("プレイヤースキル3-9 防御結界【破】のエンジン統合", () => {
  it("自分の打牌手番にMPを消費して発動する", () => {
    const initial = createState(1);

    expect(
      canActivatePlayerSkill3_9(initial)
    ).toBe(true);

    const activated =
      activatePlayerSkill3_9(initial);

    expect(activated).not.toBe(initial);
    expect(activated.playerMp).toBe(140);
    expect(
      activated.akuukan?.activeEffects
    ).toEqual([
      {
        instanceId:
          "player-skill:3-9:ron-immunity",
        sourceId: "player-skill:3-9",
        remainingTurns: 1
      }
    ]);
    expect(
      canActivatePlayerSkill3_9(activated)
    ).toBe(false);
    expect(activated.notice).toBe(
      "防御結界【破】を発動しました。効果中はロンされません。"
    );
  });

  it("効果中は自分の捨て牌に対する通常ロンを無効にする", () => {
    const state = createState(2);
    const winningTile = createTile(
      "man",
      2
    );

    state.round.phase = "reaction";
    state.round.lastDiscard = {
      seat: 0,
      discard: createDiscard(winningTile)
    };
    state.round.players[0].discards.push(
      createDiscard(winningTile)
    );
    state.round.players[1] = {
      ...state.round.players[1],
      hand: createPinfuWaitHand(),
      melds: [],
      discards: []
    };
    state.round.players[2].hand = [];
    state.round.players[3].hand = [];

    expect(getRonCandidates(state)).toHaveLength(1);

    state.round.phase = "discarding";
    const activated =
      activatePlayerSkill3_9(state);
    activated.round.phase = "reaction";

    expect(getRonCandidates(activated)).toEqual([]);
  });

  it("効果中は加槓への槍槓を無効にする", () => {
    const state = createState(1);
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

    const activated =
      activatePlayerSkill3_9(state);
    const option =
      getPlayerSelfKanOptions(activated)[0];

    if (!option) {
      throw new Error(
        "加槓候補が見つかりません。"
      );
    }

    const declared = declarePlayerSelfKan(
      activated,
      option.id
    );

    expect(declared.round.pendingKan).not.toBeNull();
    expect(getRonCandidates(declared)).toEqual([]);
  });

  it("嶺上ツモでは巡数を重複して減らさない", () => {
    const state = createState(2);
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

    const activated =
      activatePlayerSkill3_9(state);
    const option =
      getPlayerSelfKanOptions(activated)[0];

    if (!option) {
      throw new Error(
        "暗槓候補が見つかりません。"
      );
    }

    const declared = declarePlayerSelfKan(
      activated,
      option.id
    );
    const completed =
      completePlayerSelfKan(declared);

    expect(
      completed.akuukan?.activeEffects[0]
        ?.remainingTurns
    ).toBe(2);

    completed.round.phase = "drawing";
    completed.round.currentSeat = 0;
    const nextPlayerAction = drawTile(
      completed,
      0,
      () => 0.5
    );

    expect(
      nextPlayerAction.akuukan
        ?.activeEffects[0]?.remainingTurns
    ).toBe(1);
  });
});
