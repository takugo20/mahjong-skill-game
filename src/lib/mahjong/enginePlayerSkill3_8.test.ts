import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_8,
  canActivatePlayerSkill3_8,
  createInitialGameState
} from "./engine";
import type {
  GameState,
  Tile
} from "./types";

function createTile(rank: number): Tile {
  return {
    id: `engine-player-skill-3-8-${rank}`,
    suit: "man",
    rank,
    red: false
  };
}

function createState(
  level: 1 | 2 | 3 | 4 | 5 = 5,
  playerMp = 300
): GameState {
  const state = createInitialGameState(
    () => 0.5,
    {
      enemyId: "enemy-1",
      equippedSkills: [{
        id: "3-8",
        level
      }]
    }
  );

  state.round.currentSeat = 0;
  state.round.phase = "discarding";
  state.round.liveWall = [
    createTile(1),
    createTile(2),
    createTile(3),
    createTile(4)
  ];
  state.playerMp = playerMp;

  return state;
}

describe("プレイヤースキル3-8 山牌封印のエンジン統合", () => {
  it("自分の打牌手番にMPを消費して通常山末尾を除外する", () => {
    const initial = createState(5);
    const deadWallBefore = [
      ...initial.round.deadWall
    ];

    expect(
      canActivatePlayerSkill3_8(initial)
    ).toBe(true);

    const activated =
      activatePlayerSkill3_8(initial);

    expect(activated).not.toBe(initial);
    expect(
      activated.round.liveWall.map(
        (tile) => tile.id
      )
    ).toEqual([
      "engine-player-skill-3-8-1"
    ]);
    expect(activated.round.deadWall).toEqual(
      deadWallBefore
    );
    expect(activated.playerMp).toBe(240);
    expect(
      activated.akuukan?.usedSources.turn
    ).toContain("player-skill:3-8");
    expect(activated.notice).toBe(
      "山牌封印を発動し、通常山から3枚を除外しました。"
    );
    expect(initial.round.liveWall).toHaveLength(4);
    expect(initial.playerMp).toBe(300);
  });

  it("同じ手番では2回発動できない", () => {
    const first = activatePlayerSkill3_8(
      createState(1)
    );

    expect(first.round.liveWall).toHaveLength(3);
    expect(
      canActivatePlayerSkill3_8(first)
    ).toBe(false);

    const second =
      activatePlayerSkill3_8(first);

    expect(second).toBe(first);
    expect(second.round.liveWall).toHaveLength(3);
    expect(second.playerMp).toBe(180);
  });

  it("CPU手番またはリアクション中は発動できない", () => {
    const cpuTurn = createState();
    cpuTurn.round.currentSeat = 1;
    const reaction = createState();
    reaction.round.phase = "reaction";

    expect(
      canActivatePlayerSkill3_8(cpuTurn)
    ).toBe(false);
    expect(
      activatePlayerSkill3_8(cpuTurn)
    ).toBe(cpuTurn);
    expect(
      canActivatePlayerSkill3_8(reaction)
    ).toBe(false);
    expect(
      activatePlayerSkill3_8(reaction)
    ).toBe(reaction);
  });

  it("MP不足では発動できない", () => {
    const initial = createState(1, 119);

    expect(
      canActivatePlayerSkill3_8(initial)
    ).toBe(false);

    const result =
      activatePlayerSkill3_8(initial);

    expect(result).toBe(initial);
    expect(result.round.liveWall).toHaveLength(4);
    expect(result.playerMp).toBe(119);
  });
});
