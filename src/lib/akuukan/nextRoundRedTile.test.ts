import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID,
  applyAkuukanPlayerSkill1_6AtDeal,
  reserveAkuukanPlayerSkill1_6AfterWin
} from "./nextRoundRedTile";
import {
  beginAkuukanRound,
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `next-round-red-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createAkuukan(
  level: SkillLevel = 5,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{
          id: "1-6",
          level
        }]
      : []
  });
}

function createRandom(
  values: readonly number[]
): {
  readonly random: () => number;
  readonly getCallCount: () => number;
} {
  let callCount = 0;

  return {
    random: () => {
      const value = values[callCount] ?? 0;
      callCount += 1;
      return value;
    },
    getCallCount: () => callCount
  };
}

describe("プレイヤースキル1-6の次局予約", () => {
  it("装備中に和了すると次局効果を1件予約する", () => {
    const result =
      reserveAkuukanPlayerSkill1_6AfterWin(
        createAkuukan()
      );

    expect(result.nextRoundEffects).toEqual([
      {
        instanceId:
          AKUUKAN_PLAYER_SKILL_1_6_INSTANCE_ID,
        sourceId: "player-skill:1-6",
        remainingTurns: null
      }
    ]);
    expect(result.activeEffects).toEqual([]);
  });

  it("未装備またはE-18による無効化中は予約しない", () => {
    const notEquipped = createAkuukan(
      1,
      false
    );
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:1-6"
    );

    expect(
      reserveAkuukanPlayerSkill1_6AfterWin(
        notEquipped
      )
    ).toBe(notEquipped);
    expect(
      reserveAkuukanPlayerSkill1_6AfterWin(
        disabled
      )
    ).toBe(disabled);
  });

  it("同じ次局効果を重複して予約しない", () => {
    const first =
      reserveAkuukanPlayerSkill1_6AfterWin(
        createAkuukan()
      );
    const second =
      reserveAkuukanPlayerSkill1_6AfterWin(
        first
      );

    expect(second).toBe(first);
    expect(second.nextRoundEffects).toHaveLength(
      1
    );
  });

  it("次局開始前の予約状態では配牌へ適用しない", () => {
    const reserved =
      reserveAkuukanPlayerSkill1_6AfterWin(
        createAkuukan()
      );
    const tile = createTile("man", 1);
    const random = createRandom([0, 0]);
    const result =
      applyAkuukanPlayerSkill1_6AtDeal({
        akuukan: reserved,
        tiles: [tile],
        random: random.random
      });

    expect(result.consumed).toBe(false);
    expect(result.transformedTileId).toBeNull();
    expect(result.tiles).toEqual([tile]);
    expect(result.akuukan).toBe(reserved);
    expect(random.getCallCount()).toBe(0);
  });

  it("次局配牌でレベル5の80パーセント判定に成功して予約を消費する", () => {
    const active = beginAkuukanRound(
      reserveAkuukanPlayerSkill1_6AfterWin(
        createAkuukan()
      )
    );
    const firstTile = createTile("man", 1);
    const secondTile = createTile("honor", 7);
    const random = createRandom([
      0.799,
      0.999
    ]);
    const result =
      applyAkuukanPlayerSkill1_6AtDeal({
        akuukan: active,
        tiles: [firstTile, secondTile],
        random: random.random
      });

    expect(result.consumed).toBe(true);
    expect(result.transformedTileId).toBe(
      secondTile.id
    );
    expect(
      result.tiles.map((tile) => tile.red)
    ).toEqual([false, true]);
    expect(result.akuukan.activeEffects).toEqual(
      []
    );
    expect(random.getCallCount()).toBe(2);
  });

  it("確率判定に失敗しても予約を消費する", () => {
    const active = beginAkuukanRound(
      reserveAkuukanPlayerSkill1_6AfterWin(
        createAkuukan()
      )
    );
    const tile = createTile("pin", 3);
    const random = createRandom([0.8]);
    const result =
      applyAkuukanPlayerSkill1_6AtDeal({
        akuukan: active,
        tiles: [tile],
        random: random.random
      });

    expect(result.consumed).toBe(true);
    expect(result.transformedTileId).toBeNull();
    expect(result.tiles).toEqual([tile]);
    expect(result.akuukan.activeEffects).toEqual(
      []
    );
    expect(random.getCallCount()).toBe(1);
  });

  it("全牌がすでに赤でも乱数を使わず予約を消費する", () => {
    const active = beginAkuukanRound(
      reserveAkuukanPlayerSkill1_6AfterWin(
        createAkuukan()
      )
    );
    const tiles = [
      createTile("sou", 5, true),
      createTile("honor", 1, true)
    ];
    const random = createRandom([0, 0]);
    const result =
      applyAkuukanPlayerSkill1_6AtDeal({
        akuukan: active,
        tiles,
        random: random.random
      });

    expect(result.consumed).toBe(true);
    expect(result.transformedTileId).toBeNull();
    expect(result.tiles).toEqual(tiles);
    expect(result.akuukan.activeEffects).toEqual(
      []
    );
    expect(random.getCallCount()).toBe(0);
  });
});
