import type { Tile } from "../mahjong/types";
import {
  getAkuukanHandExchangeWallCandidates
} from "./handExchange";
import {
  selectAkuukanPlayerSkill5_2UraDoraIndicator
} from "./uraDoraIndicatorSelection";
import type {
  AkuukanPlayerSkill5_2IndicatorWeightInput
} from "./uraDoraIndicatorWeight";

const URA_INDICATOR_INDEXES = [5, 7, 9, 11, 13] as const;

export interface AkuukanPlayerSkill5_2IndicatorExchangeInput
  extends Omit<
    AkuukanPlayerSkill5_2IndicatorWeightInput,
    "candidate"
  > {
  readonly liveWall: readonly Tile[];
  readonly deadWall: readonly Tile[];
  readonly doraIndicatorCount: number;
  readonly rinshanDrawCount: number;
  readonly random: () => number;
}

export function exchangeAkuukanPlayerSkill5_2UraDoraIndicators(
  input: AkuukanPlayerSkill5_2IndicatorExchangeInput
): { liveWall: Tile[]; deadWall: Tile[] } {
  const liveWall = [...input.liveWall];
  const deadWall = [...input.deadWall];
  const confirmedUraIndexes = new Set<number>();

  // 既存の候補取得処理で、枚数などの入力値も検証する。
  getAkuukanHandExchangeWallCandidates(input);

  for (
    const targetIndex of URA_INDICATOR_INDEXES.slice(
      0,
      input.doraIndicatorCount
    )
  ) {
    const original = deadWall[targetIndex];

    if (!original) {
      throw new Error(
        "裏ドラ表示牌の位置に牌がありません。"
      );
    }

    const candidates =
      getAkuukanHandExchangeWallCandidates({
        ...input,
        liveWall,
        deadWall
      }).filter((candidate) =>
        candidate.source !== "deadWall" ||
        (
          candidate.index !== targetIndex &&
          !confirmedUraIndexes.has(candidate.index)
        )
      );

    const selected =
      selectAkuukanPlayerSkill5_2UraDoraIndicator({
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
        throw new Error(
          "選択された裏ドラ表示牌の取得元が不明です。"
        );
      }

      if (source.source === "liveWall") {
        liveWall[source.index] = original;
      } else {
        deadWall[source.index] = original;
      }

      deadWall[targetIndex] = selected;
    }

    confirmedUraIndexes.add(targetIndex);
  }

  return { liveWall, deadWall };
}
