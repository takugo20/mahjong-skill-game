import { expect, it } from "vitest";
import { createInitialGameState } from "./engine";
import { ENEMY_IDS } from "../akuukan/types";
import {
  chooseEnemyRiichi
} from "../akuukan/enemyRiichiStrategy";
import { chooseCpuRiichi } from "./cpuRiichi";
import {
  createCpuDiscardInput,
  chooseStrategicCpuDiscard,
  evaluateCpuDiscards
} from "./cpuDiscard";
import {
  getNormalCpuLevel,
  selectNormalCpuCandidates
} from "./normalCpuLevel";
import type {
  NormalCpuLevel
} from "./normalCpuLevel";
import type { Tile, TileSuit } from "./types";

it.each(ENEMY_IDS)(
  "%sの段階と能力者の除外",
  enemyId => {
    const state = createInitialGameState(
      () => 0.5,
      { enemyId, equippedSkills: [] }
    );

    const expected = Math.ceil(
      Number(enemyId.split("-")[1]) / 4
    );

    expect(getNormalCpuLevel(state, 1)).toBe(expected);
    expect(getNormalCpuLevel(state, 3)).toBe(expected);

    // 能力者CPUとプレイヤーは弱体化対象外。
    expect(getNormalCpuLevel(state, 2)).toBe(4);
    expect(getNormalCpuLevel(state, 0)).toBe(4);
  }
);

it("同一候補群で段階ごとに精度を上げる", () => {
  const candidates = [
    16, 18, 19, 20, 21, 22, 23
  ].map(n => ({
    acceptance: n,
    discardedBonus: 0,
    score: n
  }));

  const accepted = (level: NormalCpuLevel) =>
    selectNormalCpuCandidates(
      candidates,
      level
    ).map(candidate => candidate.acceptance);

  expect(accepted(1)).toEqual([
    16, 18, 19, 20, 21, 22, 23
  ]);
  expect(accepted(2)).toEqual([20, 21, 22, 23]);
  expect(accepted(3)).toEqual([22, 23]);
  expect(accepted(4)).toEqual([23]);
});

let serial = 0;

function tile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  return {
    id: `level-${serial++}`,
    suit,
    rank,
    red
  };
}

function prepare(
  enemyId: typeof ENEMY_IDS[number] = "enemy-1"
) {
  const state = createInitialGameState(
    () => 0.5,
    { enemyId, equippedSkills: [] }
  );

  const player = state.round.players[1];

  player.hand = [
    ...[1, 2, 3].map(n => tile("man", n)),
    ...[1, 2, 3].map(n => tile("pin", n)),
    ...[1, 2, 3, 7, 8, 9].map(n => tile("sou", n)),
    tile("honor", 1),
    tile("honor", 2)
  ];

  player.drawnTileId = player.hand[13].id;

  const input = {
    player,
    riichiDiscardTileIds: player.hand
      .slice(12)
      .map(t => t.id),
    doraIndicators: [],
    visibleTiles: [tile("honor", 1)],
    random: () => 0.999
  };

  return { state, player, input };
}

it("初級者でも立直し、上位だけ細かい待ち枚数を優先する", () => {
  const { state, player, input } = prepare();

  expect(
    chooseEnemyRiichi(state, input)?.discardTileId
  ).toBe(player.hand[13].id);

  const advanced = prepare("enemy-13");

  expect(
    chooseEnemyRiichi(advanced.state, advanced.input)
  ).toEqual(
    chooseCpuRiichi(advanced.input)
  );

  expect(
    chooseEnemyRiichi(
      advanced.state,
      advanced.input
    )?.discardTileId
  ).toBe(advanced.player.hand[12].id);
});

it("弱い立直判断も合法候補だけに限定し、候補ゼロなら宣言しない", () => {
  const { state, player, input } = prepare();

  expect(
    chooseEnemyRiichi(state, {
      ...input,
      riichiDiscardTileIds: [player.hand[12].id]
    })?.discardTileId
  ).toBe(player.hand[12].id);

  expect(
    chooseEnemyRiichi(state, {
      ...input,
      riichiDiscardTileIds: []
    })
  ).toBeNull();
});

it.each([1, 2, 3, 4] as NormalCpuLevel[])(
  "段階%sでも最小向聴数・禁止牌・ドラを守る",
  level => {
    const { state, player } = prepare();

    player.hand[12].red = true;

    const input = {
      ...createCpuDiscardInput(state, player, []),
      normalCpuLevel: level
    };

    // 同じ形なら赤ドラを残す。
    expect(
      chooseStrategicCpuDiscard(input, () => 0).id
    ).toBe(player.hand[13].id);

    // 選んだ打牌で聴牌を維持する。
    const selected = chooseStrategicCpuDiscard(
      input,
      () => 0.999
    );

    expect(
      evaluateCpuDiscards(input).find(
        candidate => candidate.tile.id === selected.id
      )?.shanten
    ).toBe(0);

    // 禁止された牌は捨てない。
    expect(
      chooseStrategicCpuDiscard({
        ...input,
        forbiddenTileIds: [player.hand[13].id]
      }, () => 0).id
    ).toBe(player.hand[12].id);
  }
);

it("すごくつよいは従来の最大スコア選択と乱数消費が一致する", () => {
  const { state, player } = prepare("enemy-13");

  const input = createCpuDiscardInput(
    state,
    player,
    []
  );

  const candidates = evaluateCpuDiscards(input);

  const max = Math.max(
    ...candidates.map(candidate => candidate.score)
  );

  const best = candidates.filter(
    candidate => candidate.score === max
  );

  for (const r of [0, 0.3, 0.5, 0.999]) {
    let calls = 0;

    const selected = chooseStrategicCpuDiscard(
      input,
      () => {
        calls++;
        return r;
      }
    );

    expect(selected).toEqual(
      best[Math.floor(r * best.length)].tile
    );

    expect(calls).toBe(1);
  }
});
