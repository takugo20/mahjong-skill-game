import type { Tile } from "../mahjong/types";
import { getAkuukanHandExchangeWallCandidates } from "./handExchange";
import {
  selectAkuukanPlayerSkill5_7RinshanTile,
  type AkuukanPlayerSkill5_7SelectionInput
} from "./rinshanWinningTileSelection";

export interface AkuukanPlayerSkill5_7ExchangeInput
  extends Omit<AkuukanPlayerSkill5_7SelectionInput, "candidates"> {
  readonly liveWall: readonly Tile[];
  readonly deadWall: readonly Tile[];

  // 今回の槓で追加される表示牌も含めた、確定済み表示牌数。
  readonly doraIndicatorCount: number;

  // 今回の嶺上牌を取得する前の回数。
  readonly rinshanDrawCount: number;
}

export function exchangeAkuukanPlayerSkill5_7RinshanTile(
  input: AkuukanPlayerSkill5_7ExchangeInput
): { liveWall: Tile[]; deadWall: Tile[] } {
  const liveWall = [...input.liveWall];
  const deadWall = [...input.deadWall];
  const wallCandidates = getAkuukanHandExchangeWallCandidates(input);

  if (
    !input.drawerIsPlayer ||
    !input.isRinshanDraw ||
    !input.tenpaiBeforeDraw ||
    input.rinshanDrawCount >= 4
  ) {
    return { liveWall, deadWall };
  }

  const targetIndex = input.rinshanDrawCount;
  const original = deadWall[targetIndex];

  if (!original) {
    throw new Error("取得予定の嶺上牌がありません。");
  }

  const candidates = wallCandidates.filter(candidate =>
    candidate.source !== "deadWall" ||
    candidate.index !== targetIndex
  );

  const selected = selectAkuukanPlayerSkill5_7RinshanTile({
    ...input,
    candidates: [
      original,
      ...candidates.map(({ tile }) => tile)
    ]
  });

  if (selected && selected !== original) {
    const source = candidates.find(
      ({ tile }) => tile === selected
    );

    if (!source) {
      throw new Error("選択された嶺上牌の取得元が不明です。");
    }

    if (source.source === "liveWall") {
      liveWall[source.index] = original;
    } else {
      deadWall[source.index] = original;
    }

    deadWall[targetIndex] = selected;
  }

  return { liveWall, deadWall };
}
