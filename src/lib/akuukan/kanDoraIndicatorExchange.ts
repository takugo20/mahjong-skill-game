import type { Tile } from "../mahjong/types";
import {
  getAkuukanHandExchangeWallCandidates
} from "./handExchange";
import {
  selectAkuukanPlayerSkill5_3KanDoraIndicator
} from "./kanDoraIndicatorSelection";
import type {
  AkuukanPlayerSkill5_3IndicatorWeightInput
} from "./kanDoraIndicatorWeight";

const DORA_INDICATOR_INDEXES = [4, 6, 8, 10, 12] as const;

export interface AkuukanPlayerSkill5_3IndicatorExchangeInput
  extends Omit<
    AkuukanPlayerSkill5_3IndicatorWeightInput,
    "candidate"
  > {
  readonly liveWall: readonly Tile[];
  readonly deadWall: readonly Tile[];

  // 今回の槓ドラを追加する前の、確定済み表示牌数。
  readonly doraIndicatorCount: number;

  readonly rinshanDrawCount: number;
  readonly random: () => number;
}

export function exchangeAkuukanPlayerSkill5_3KanDoraIndicator(
  input: AkuukanPlayerSkill5_3IndicatorExchangeInput
): { liveWall: Tile[]; deadWall: Tile[] } {
  const liveWall = [...input.liveWall];
  const deadWall = [...input.deadWall];

  const wallCandidates =
    getAkuukanHandExchangeWallCandidates(input);

  if (
    !input.kanOwnerIsPlayer ||
    !input.kanEstablished ||
    !input.addsNewIndicator ||
    input.doraIndicatorCount >= DORA_INDICATOR_INDEXES.length
  ) {
    return { liveWall, deadWall };
  }

  const targetIndex =
    DORA_INDICATOR_INDEXES[input.doraIndicatorCount];

  const original = deadWall[targetIndex];

  if (!original) {
    throw new Error(
      "槓ドラ表示牌の位置に牌がありません。"
    );
  }

  const candidates = wallCandidates.filter(candidate =>
    candidate.source !== "deadWall" ||
    candidate.index !== targetIndex
  );

  const selected =
    selectAkuukanPlayerSkill5_3KanDoraIndicator({
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
        "選択された槓ドラ表示牌の取得元が不明です。"
      );
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
