import type { Tile } from "../mahjong/types";
import {
  getAkuukanPlayerSkill5_2IndicatorWeightMultiplier,
  type AkuukanPlayerSkill5_2IndicatorWeightInput
} from "./uraDoraIndicatorWeight";

export interface AkuukanPlayerSkill5_2IndicatorSelectionInput
  extends Omit<
    AkuukanPlayerSkill5_2IndicatorWeightInput,
    "candidate"
  > {
  // 先頭には、本来の裏ドラ表示牌を渡す。
  readonly candidates: readonly Tile[];
  readonly random: () => number;
}

export function selectAkuukanPlayerSkill5_2UraDoraIndicator(
  input: AkuukanPlayerSkill5_2IndicatorSelectionInput
): Tile | null {
  const firstCandidate = input.candidates[0];

  if (!firstCandidate) {
    return null;
  }

  const weightedCandidates = input.candidates.map(
    (candidate) => ({
      tile: candidate,
      weight:
        getAkuukanPlayerSkill5_2IndicatorWeightMultiplier({
          akuukan: input.akuukan,
          winnerIsPlayer: input.winnerIsPlayer,
          riichiEstablished: input.riichiEstablished,
          hand: input.hand,
          melds: input.melds,
          candidate
        })
    })
  );

  const firstWeight = weightedCandidates[0].weight;

  if (
    weightedCandidates.every(
      ({ weight }) => weight === firstWeight
    )
  ) {
    return firstCandidate;
  }

  const totalWeight = weightedCandidates.reduce(
    (total, candidate) => total + candidate.weight,
    0
  );

  const targetWeight = input.random() * totalWeight;
  let accumulatedWeight = 0;

  for (const candidate of weightedCandidates) {
    accumulatedWeight += candidate.weight;

    if (targetWeight < accumulatedWeight) {
      return candidate.tile;
    }
  }

  return weightedCandidates[
    weightedCandidates.length - 1
  ].tile;
}
