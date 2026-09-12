import type { Tile } from "../mahjong/types";
import type {
  AkuukanHandExchangeWallCandidate
} from "./handExchange";
import {
  getAkuukanPlayerSkill5_8HaiteiCandidates,
  type AkuukanPlayerSkill5_8CandidateInput
} from "./haiteiDrawCandidates";

export interface AkuukanPlayerSkill5_8ExchangeInput
  extends AkuukanPlayerSkill5_8CandidateInput {
  readonly selected: AkuukanHandExchangeWallCandidate | null;
}

export function exchangeAkuukanPlayerSkill5_8HaiteiTile(
  input: AkuukanPlayerSkill5_8ExchangeInput
): { liveWall: Tile[]; deadWall: Tile[] } {
  const liveWall = [...input.liveWall];
  const deadWall = [...input.deadWall];
  const selected = input.selected;

  if (!selected) {
    return { liveWall, deadWall };
  }

  const candidates =
    getAkuukanPlayerSkill5_8HaiteiCandidates(input);

  if (candidates.length === 0) {
    return { liveWall, deadWall };
  }

  const source = candidates.find(candidate =>
    candidate.source === selected.source &&
    candidate.index === selected.index &&
    candidate.tile.id === selected.tile.id
  );

  if (!source) {
    throw new Error(
      "選択された海底牌は現在の抽選候補にありません。"
    );
  }

  if (source.source === "deadWall") {
    const original = liveWall[0];
    liveWall[0] = source.tile;
    deadWall[source.index] = original;
  }

  // 牌の取得とMP加算は、この交換後に通常ツモ処理で行う。
  return { liveWall, deadWall };
}
