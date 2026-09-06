import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_11,
  canActivatePlayerSkill3_11,
  createInitialGameState,
  discardTile,
  drawTile,
  getRonCandidates
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
    id: `engine-player-skill-3-11-${serialNumber}`,
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

function createNonWinningHand(): Tile[] {
  return [
    ...createTiles(
      "man",
      [1, 2, 4, 5, 7, 8]
    ),
    ...createTiles(
      "pin",
      [1, 2, 4, 5, 7, 8]
    ),
    createTile("honor", 2)
  ];
}

function createThirteenOrphansWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 1, 9]),
    ...createTiles("pin", [1, 9]),
    ...createTiles("sou", [1, 9]),
    ...createTiles(
      "honor",
      [2, 3, 4, 5, 6, 7]
    )
  ];
}

function setHand(
  state: GameState,
  seat: SeatIndex,
  hand: Tile[]
): void {
  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    discards: [],
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
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
        id: "3-11",
        level
      }]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.playerMp = playerMp;

  return state;
}

function prepareRonState(
  level: 1 | 2 | 3 | 4 | 5 = 2
): {
  readonly state: GameState;
  readonly discardTileId: string;
} {
  const state = createState(level);
  const discardedTile = createTile(
    "honor",
    1
  );

  setHand(
    state,
    0,
    [
      ...createNonWinningHand(),
      discardedTile
    ]
  );
  setHand(
    state,
    1,
    createNonWinningHand()
  );
  setHand(
    state,
    2,
    createThirteenOrphansWaitHand()
  );
  setHand(
    state,
    3,
    createNonWinningHand()
  );
  state.round.players[0].drawnTileId =
    discardedTile.id;
  state.round.players[0].drawnTileSource =
    "liveWall";

  return {
    state: activatePlayerSkill3_11(state),
    discardTileId: discardedTile.id
  };
}

describe("プレイヤースキル3-11 防御結界【改】のエンジン統合", () => {
  it("自分の打牌手番にMPを消費して発動する", () => {
    const state = createState();

    expect(
      canActivatePlayerSkill3_11(state)
    ).toBe(true);

    const activated =
      activatePlayerSkill3_11(state);

    expect(activated.playerMp).toBe(250);
    expect(
      activated.akuukan?.activeEffects[0]
        ?.sourceId
    ).toBe("player-skill:3-11");
    expect(
      canActivatePlayerSkill3_11(activated)
    ).toBe(false);
  });

  it("効果中の捨て牌を裏向きにして通常ロンを禁止する", () => {
    const prepared = prepareRonState();
    const discarded = discardTile(
      prepared.state,
      prepared.discardTileId
    );

    expect(
      discarded.round.lastDiscard
        ?.discard.faceDown
    ).toBe(true);
    expect(
      discarded.round.players[0]
        .discards[0]?.faceDown
    ).toBe(true);
    expect(getRonCandidates(discarded)).toEqual([]);

    const visibleState: GameState = {
      ...discarded,
      round: {
        ...discarded.round,
        lastDiscard:
          discarded.round.lastDiscard
            ? {
                ...discarded.round.lastDiscard,
                discard: {
                  ...discarded.round.lastDiscard
                    .discard,
                  faceDown: false
                }
              }
            : null
      }
    };

    expect(
      getRonCandidates(visibleState).some(
        (candidate) =>
          candidate.winnerSeat === 2
      )
    ).toBe(true);
  });

  it("効果終了時に河へ残る裏向き牌を表向きへ戻す", () => {
    const prepared = prepareRonState(1);
    const discarded = discardTile(
      prepared.state,
      prepared.discardTileId
    );
    const nextPlayerDraw = drawTile(
      {
        ...discarded,
        round: {
          ...discarded.round,
          currentSeat: 0,
          phase: "drawing"
        }
      },
      0,
      () => 0
    );

    expect(
      nextPlayerDraw.akuukan?.activeEffects
        .some(
          (effect) =>
            effect.sourceId ===
            "player-skill:3-11"
        )
    ).toBe(false);
    expect(
      nextPlayerDraw.round.players[0]
        .discards[0]?.faceDown
    ).toBe(false);
  });
});
