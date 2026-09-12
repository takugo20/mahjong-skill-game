import type { Tile } from "../mahjong/types";
import {
  getAkuukanPlayerSkill5_3IndicatorWeightMultiplier,
  type AkuukanPlayerSkill5_3IndicatorWeightInput
} from "./kanDoraIndicatorWeight";

export interface AkuukanPlayerSkill5_3IndicatorSelectionInput
  extends Omit<
    AkuukanPlayerSkill5_3IndicatorWeightInput,
    "candidate"
  > {
  // 先頭には、本来の槓ドラ表示牌を渡す。
  readonly candidates: readonly Tile[];
  readonly random: () => number;
}

export function selectAkuukanPlayerSkill5_3KanDoraIndicator(
  input: AkuukanPlayerSkill5_3IndicatorSelectionInput
): Tile | null {
  const firstCandidate = input.candidates[0];

  if (!firstCandidate) {
    return null;
  }

  const weightedCandidates = input.candidates.map(
    (candidate) => ({
      tile: candidate,
      weight:
        getAkuukanPlayerSkill5_3IndicatorWeightMultiplier({
          akuukan: input.akuukan,
          kanOwnerIsPlayer: input.kanOwnerIsPlayer,
          kanEstablished: input.kanEstablished,
          addsNewIndicator: input.addsNewIndicator,
          kanMeld: input.kanMeld,
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
