import {
  MAX_KAN_COUNT,
  MAX_RINSHAN_DRAW_COUNT
} from "./kan";
import type {
  Tile
} from "./types";

export interface KanWallInput {
  liveWall: readonly Tile[];
  deadWall: readonly Tile[];
  kanCount: number;
  doraIndicatorCount: number;
  rinshanDrawCount: number;
}

export interface KanWallResult {
  liveWall: Tile[];
  deadWall: Tile[];
  kanCount: number;
  doraIndicatorCount: number;
  rinshanDrawCount: number;
  rinshanTile: Tile;
  replacementTile: Tile;
}

function validateCount(
  value: number,
  maximum: number,
  label: string
): void {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new Error(
      `${label}が不正です。`
    );
  }
}

function validateInput(
  input: KanWallInput
): void {
  validateCount(
    input.kanCount,
    MAX_KAN_COUNT,
    "槓回数"
  );
  validateCount(
    input.rinshanDrawCount,
    MAX_RINSHAN_DRAW_COUNT,
    "嶺上牌取得回数"
  );
  validateCount(
    input.doraIndicatorCount,
    5,
    "ドラ表示牌数"
  );

  if (
    input.kanCount >= MAX_KAN_COUNT ||
    input.rinshanDrawCount >=
      MAX_RINSHAN_DRAW_COUNT
  ) {
    throw new Error(
      "これ以上は槓できません。"
    );
  }
}

export function advanceKanWall(
  input: KanWallInput
): KanWallResult {
  validateInput(input);

  const rinshanIndex =
    input.rinshanDrawCount;
  const rinshanTile =
    input.deadWall[rinshanIndex];
  const replacementTile =
    input.liveWall[
      input.liveWall.length - 1
    ];

  if (!rinshanTile) {
    throw new Error(
      "嶺上牌が不足しています。"
    );
  }

  if (!replacementTile) {
    throw new Error(
      "王牌へ補充する通常山牌がありません。"
    );
  }

  const deadWall = [...input.deadWall];
  deadWall[rinshanIndex] =
    replacementTile;

  return {
    liveWall: input.liveWall.slice(0, -1),
    deadWall,
    kanCount: input.kanCount + 1,
    doraIndicatorCount: Math.min(
      5,
      input.doraIndicatorCount + 1
    ),
    rinshanDrawCount:
      input.rinshanDrawCount + 1,
    rinshanTile,
    replacementTile
  };
}
