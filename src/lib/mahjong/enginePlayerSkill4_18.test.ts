import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill4_18,
  canActivatePlayerSkill4_18,
  createInitialGameState,
  getPlayerSkill4_18MaximumExchangeTileCount,
  getPlayerSkill4_18SelectableTileIds
} from "./engine";
import type {
  GameState,
  Tile
} from "./types";

function createState(): GameState {
  const initial = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "4-18",
        level: 2
      }]
    }
  );

  const replacementTiles: Tile[] = [
    {
      id: "4-18-live-sou-1",
      suit: "sou",
      rank: 1,
      red: false
    },
    {
      id: "4-18-live-sou-2",
      suit: "sou",
      rank: 2,
      red: false
    },
    ...initial.round.liveWall
  ];

  return {
    ...initial,
    round: {
      ...initial.round,
      currentSeat: 0,
      phase: "discarding",
      liveWall: replacementTiles,
      players: initial.round.players.map(
        (currentPlayer) =>
          currentPlayer.seat === 0
            ? {
                ...currentPlayer,
                riichi: false,
                hand: [
                  {
                    id: "4-18-hand-man",
                    suit: "man",
                    rank: 1,
                    red: false
                  },
                  {
                    id: "4-18-hand-pin",
                    suit: "pin",
                    rank: 2,
                    red: false
                  },
                  {
                    id: "4-18-hand-sou",
                    suit: "sou",
                    rank: 3,
                    red: false
                  },
                  {
                    id: "4-18-hand-honor",
                    suit: "honor",
                    rank: 1,
                    red: false
                  }
                ],
                drawnTileId:
                  "4-18-hand-honor"
              }
            : currentPlayer
      )
    },
    playerMp: 390,
    notice: "4-18のテスト状態"
  };
}

describe("プレイヤースキル4-18のエンジン統合", () => {
  it("自分の打牌選択中に発動できる", () => {
    const state = createState();

    expect(
      canActivatePlayerSkill4_18(state)
    ).toBe(true);

    expect(
      getPlayerSkill4_18MaximumExchangeTileCount(
        state
      )
    ).toBe(2);
  });

  it("萬子と筒子だけを選択候補にする", () => {
    expect(
      getPlayerSkill4_18SelectableTileIds(
        createState()
      )
    ).toEqual([
      "4-18-hand-man",
      "4-18-hand-pin"
    ]);
  });

  it("選択牌を索子に交換してMPを消費する", () => {
    const state = createState();

    const result = activatePlayerSkill4_18(
      state,
      [
        "4-18-hand-man",
        "4-18-hand-pin"
      ],
      () => 0
    );

    const player = result.round.players[0];

    expect(result.playerMp).toBe(290);

    expect(
      player.hand.filter(
        (tile) =>
          tile.id.startsWith(
            "4-18-live-sou-"
          )
      )
    ).toHaveLength(2);

    expect(result.notice).toContain(
      "2枚を交換しました"
    );
  });

  it("CPU手番・立直中・同一手番の再発動を禁止する", () => {
    const state = createState();

    const cpuTurn = {
      ...state,
      round: {
        ...state.round,
        currentSeat: 1 as const
      }
    };

    const riichi = {
      ...state,
      round: {
        ...state.round,
        players: state.round.players.map(
          (player) =>
            player.seat === 0
              ? {
                  ...player,
                  riichi: true
                }
              : player
        )
      }
    };

    const first = activatePlayerSkill4_18(
      state,
      ["4-18-hand-man"],
      () => 0
    );

    expect(
      canActivatePlayerSkill4_18(cpuTurn)
    ).toBe(false);

    expect(
      canActivatePlayerSkill4_18(riichi)
    ).toBe(false);

    expect(
      canActivatePlayerSkill4_18({
        ...first,
        playerMp: 390
      })
    ).toBe(false);
  });
});
