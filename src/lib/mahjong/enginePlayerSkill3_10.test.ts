import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_10,
  canActivatePlayerSkill3_10,
  createInitialGameState,
  skipPlayerRon
} from "./engine";
import type {
  Discard,
  GameState,
  SeatIndex,
  Tile,
  TileSuit,
  Wind
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `engine-player-skill-3-10-${serialNumber}`,
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
    createTile("honor", 1)
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

function setDealer(
  state: GameState,
  dealerSeat: SeatIndex
): void {
  const windsByOffset: readonly Wind[] = [
    "east",
    "south",
    "west",
    "north"
  ];

  state.round.players =
    state.round.players.map((player) => {
      const offset =
        (player.seat - dealerSeat + 4) % 4;

      return {
        ...player,
        isDealer:
          player.seat === dealerSeat,
        seatWind: windsByOffset[offset]
      };
    });
}

function prepareSelectedEnemyRonState(
  winnerIsDealer = false,
  honba = 0,
  withPaymentMultiplier = false
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "3-10", level: 1 },
        ...(withPaymentMultiplier
          ? [{
              id: "1-10" as const,
              level: 5 as const
            }]
          : [])
      ]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.honba = honba;
  state.round.riichiPool = 0;
  state.playerMp = 500;

  const activated =
    activatePlayerSkill3_10(state);
  const winningTile = createTile(
    "honor",
    1
  );
  const discard = createDiscard(
    winningTile
  );

  setHand(
    activated,
    0,
    createNonWinningHand()
  );
  setHand(
    activated,
    1,
    createNonWinningHand()
  );
  setHand(
    activated,
    2,
    createThirteenOrphansWaitHand()
  );
  setHand(
    activated,
    3,
    createNonWinningHand()
  );

  if (winnerIsDealer) {
    setDealer(activated, 2);
  }

  activated.round.players[0].discards = [
    discard
  ];
  activated.round.currentSeat = 1;
  activated.round.phase = "reaction";
  activated.round.lastDiscard = {
    seat: 0,
    discard
  };

  return activated;
}

function getPointChange(
  state: GameState,
  seat: SeatIndex
): number {
  const change =
    state.round.winResult?.pointChanges.find(
      (entry) => entry.seat === seat
    );

  if (!change) {
    throw new Error(
      `座席${seat}の点数変動が見つかりません。`
    );
  }

  return change.change;
}

describe("プレイヤースキル3-10 防御結界【急】のエンジン統合", () => {
  it("自分の打牌手番にMPを消費して発動する", () => {
    const state = createInitialGameState(
      () => 0.5,
      {
        enemyId: "enemy-1",
        equippedSkills: [{
          id: "3-10",
          level: 1
        }]
      }
    );
    state.round.currentSeat = 0;
    state.round.phase = "discarding";
    state.playerMp = 500;

    expect(
      canActivatePlayerSkill3_10(state)
    ).toBe(true);

    const activated =
      activatePlayerSkill3_10(state);

    expect(activated.playerMp).toBe(360);
    expect(
      activated.akuukan?.activeEffects[0]
        ?.sourceId
    ).toBe("player-skill:3-10");
    expect(
      canActivatePlayerSkill3_10(activated)
    ).toBe(false);
  });

  it("子の役満ロンへの支払いを8000点に制限する", () => {
    const result = skipPlayerRon(
      prepareSelectedEnemyRonState()
    );

    expect(result.round.winResult).not.toBeNull();
    expect(getPointChange(result, 0)).toBe(-8000);
    expect(getPointChange(result, 2)).toBe(8000);
  });

  it("親の役満ロンへの支払いを12000点に制限する", () => {
    const result = skipPlayerRon(
      prepareSelectedEnemyRonState(true)
    );

    expect(getPointChange(result, 0)).toBe(-12000);
    expect(getPointChange(result, 2)).toBe(12000);
  });

  it("上限適用後に本場と支払倍率を反映する", () => {
    const result = skipPlayerRon(
      prepareSelectedEnemyRonState(
        false,
        2,
        true
      )
    );

    expect(getPointChange(result, 0)).toBe(-12900);
    expect(getPointChange(result, 2)).toBe(12900);
  });
});
