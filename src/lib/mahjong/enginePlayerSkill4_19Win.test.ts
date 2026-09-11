import { describe, expect, it } from "vitest";
import {
  activatePlayerSkill4_19,
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerTsumo
} from "./engine";
import type { GameState, Tile } from "./types";

function createState(): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{ id: "4-19", level: 1 }]
    }
  );
  const faces: Array<[Tile["suit"], number]> = [
    ["man", 1], ["man", 2], ["man", 3],
    ["sou", 1], ["sou", 2], ["sou", 3],
    ["pin", 1], ["pin", 2], ["pin", 3],
    ["pin", 4], ["pin", 5],
    ["honor", 1], ["honor", 1]
  ];
  const hand: Tile[] = faces.map(
    ([suit, rank], index) => ({
      id: `4-19-win-hand-${index}`,
      suit,
      rank,
      red: false
    })
  );
  hand.push({
    id: "4-19-outgoing",
    suit: "man",
    rank: 9,
    red: false
  });

  state.playerMp = 390;
  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.turnNumber = 8;
  state.round.kanCount = 0;
  state.round.lastDiscard = null;
  state.round.handExchangeWinningTileIds = [];
  state.round.liveWall = [{
    id: "4-19-incoming",
    suit: "pin",
    rank: 6,
    red: false
  }];
  state.round.deadWall = Array.from(
    { length: 14 },
    (_, index): Tile => ({
      id: `4-19-dead-${index}`,
      suit: "honor",
      rank: 7,
      red: false
    })
  );
  state.round.doraIndicatorCount = 1;
  state.round.rinshanDrawCount = 0;
  state.round.players = state.round.players.map(
    (player) => ({
      ...player,
      melds: [],
      discards: [],
      riichi: false,
      doubleRiichi: false,
      ippatsu: false,
      ...(player.seat === 0
        ? {
            hand,
            drawnTileId: "4-19-outgoing",
            drawnTileSource: "liveWall" as const
          }
        : {})
    })
  );
  return state;
}

function exchange(state: GameState): GameState {
  return activatePlayerSkill4_19(
    state,
    ["4-19-outgoing"],
    () => 0
  );
}

describe("4-19の発動から交換和了まで", () => {
  it("元のツモ牌を交換しても取得した筒子で和了できる", () => {
    const before = createState();
    expect(canPlayerTsumo(before)).toBe(false);

    const after = exchange(before);
    expect(after.playerMp).toBe(280);
    expect(after.round.players[0].hand.some(
      (tile) => tile.id === "4-19-outgoing"
    )).toBe(false);
    expect(after.round.handExchangeWinningTileIds)
      .toEqual(["4-19-incoming"]);
    expect(canPlayerTsumo(after)).toBe(true);

    const result = declarePlayerTsumo(after);
    expect(result.round.phase).toBe("roundEnd");
    expect(result.round.winResult).toMatchObject({
      winnerSeat: 0,
      winMethod: "tsumo",
      winningTile: { id: "4-19-incoming" }
    });
    expect(result.round.winResult?.yakuNames)
      .not.toContain("天和");
  });

  it("親の第1ツモ直後の交換和了では天和を認める", () => {
    const state = createState();
    state.round.turnNumber = 0;
    state.round.players[0].isDealer = true;
    state.round.players[0].seatWind = "east";

    const result = declarePlayerTsumo(exchange(state));
    expect(result.round.phase).toBe("roundEnd");
    expect(result.round.winResult?.yakuNames)
      .toContain("天和");
  });

  it("通常山が空でも王牌から交換でき海底は付かない", () => {
    const state = createState();
    const incoming = state.round.liveWall[0];
    state.round.liveWall = [];
    state.round.deadWall[0] = incoming;

    const after = exchange(state);
    expect(after.playerMp).toBe(280);
    expect(after.round.liveWall).toHaveLength(0);
    expect(canPlayerTsumo(after)).toBe(true);

    const result = declarePlayerTsumo(after);
    expect(result.round.phase).toBe("roundEnd");
    expect(result.round.winResult?.winningTile.id)
      .toBe("4-19-incoming");
    expect(result.round.winResult?.yakuNames)
      .not.toContain("海底摸月");
  });
});
